-- 20260423_aodb_restructure.sql

-- 1. Create/Setup carriers table
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airlines') THEN
    ALTER TABLE airlines RENAME TO carriers;
  ELSE
    CREATE TABLE IF NOT EXISTS carriers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      iata_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- 2. Add extra columns to carriers individually
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='icao_code') THEN
    ALTER TABLE carriers ADD COLUMN icao_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='airline_name') THEN
    ALTER TABLE carriers ADD COLUMN airline_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='country_origin') THEN
    ALTER TABLE carriers ADD COLUMN country_origin TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='onboarding_status') THEN
    ALTER TABLE carriers ADD COLUMN onboarding_status TEXT;
  END IF;
END $$;

-- Update airline_name from name if null
UPDATE carriers SET airline_name = name WHERE airline_name IS NULL;

-- 2. Master Data: aircraft_types
CREATE TABLE IF NOT EXISTS aircraft_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_code TEXT UNIQUE NOT NULL, -- e.g. A320, B777
  manufacturer TEXT,
  capacity_pax INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Master Data: infrastructure_nodes
CREATE TABLE IF NOT EXISTS infrastructure_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT UNIQUE NOT NULL, -- e.g. T4-GATE-01
  terminal TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('GATE', 'CHECKIN', 'LOUNGE', 'PARKING')),
  status TEXT DEFAULT 'HEALTHY',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Operations: flight_movements
CREATE TABLE IF NOT EXISTS flight_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id),
  flight_no TEXT NOT NULL,
  aircraft_type_id UUID REFERENCES aircraft_types(id),
  movement_type TEXT CHECK (movement_type IN ('ARRIVAL', 'DEPARTURE')),
  sta TIMESTAMPTZ NOT NULL, -- Scheduled Time of Arrival
  ata TIMESTAMPTZ,          -- Actual Time of Arrival
  std TIMESTAMPTZ,          -- Scheduled Time of Departure
  atd TIMESTAMPTZ,          -- Actual Time of Departure
  status TEXT DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Operations: resource_allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID REFERENCES flight_movements(id) ON DELETE CASCADE,
  infrastructure_id UUID REFERENCES infrastructure_nodes(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Financial: billing_rules
CREATE TABLE IF NOT EXISTS billing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- e.g. PAX_FEE, GATE_FEE
  charge_per_unit DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'KWD'
);

-- 7. Financial: pax_metering
CREATE TABLE IF NOT EXISTS pax_metering (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id),
  flight_no TEXT NOT NULL,
  pax_count INTEGER NOT NULL,
  workstation_hours DECIMAL(5,2),
  date_recorded DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Financial: workstation_sessions
CREATE TABLE IF NOT EXISTS workstation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id),
  workstation_id TEXT NOT NULL, -- references infrastructure_nodes(node_id)
  login_time TIMESTAMPTZ NOT NULL,
  logout_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Financial: billing_ledger
CREATE TABLE IF NOT EXISTS billing_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id),
  bill_period_start DATE NOT NULL,
  bill_period_end DATE NOT NULL,
  total_pax_fees DECIMAL(15,3),
  total_resource_fees DECIMAL(15,3),
  penalties DECIMAL(15,3) DEFAULT 0,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, PAID
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. View Layer: vw_carrier_efficiency
CREATE OR REPLACE VIEW vw_carrier_efficiency AS
SELECT 
  c.airline_name,
  f.flight_no,
  f.movement_type,
  f.sta,
  f.ata,
  EXTRACT(EPOCH FROM (f.ata - f.sta)) / 60 as delay_minutes
FROM flight_movements f
JOIN carriers c ON f.carrier_id = c.id
WHERE f.ata IS NOT NULL;

-- 2. View Layer: vw_daily_revenue_projection
CREATE OR REPLACE VIEW vw_daily_revenue_projection AS
SELECT 
  p.date_recorded,
  c.airline_name,
  SUM(p.pax_count * r.charge_per_unit) as projected_revenue
FROM pax_metering p
JOIN carriers c ON p.carrier_id = c.id
JOIN billing_rules r ON r.rule_type = 'PAX_FEE'
GROUP BY p.date_recorded, c.airline_name;

-- 3. Security (RLS)
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pax_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;

-- If carrier_users exists, restrict selection
-- Assuming profile/user has a carrier_id field
CREATE POLICY "Carriers can see their own movements" ON flight_movements 
FOR SELECT USING (carrier_id = (SELECT carrier_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Carriers can see their own pax data" ON pax_metering 
FOR SELECT USING (carrier_id = (SELECT carrier_id FROM profiles WHERE id = auth.uid()));

-- SEED DATA
-- 1. Carriers Table (Middle East Focus)
INSERT INTO carriers (iata_code, icao_code, name, airline_name, country_origin, onboarding_status) VALUES
('KU', 'KAC', 'Kuwait Airways', 'Kuwait Airways', 'Kuwait', 'INTEGRATION_STAGE_1'),
('J9', 'JZR', 'Jazeera Airways', 'Jazeera Airways', 'Kuwait', 'INTEGRATION_STAGE_1'),
('QR', 'QTR', 'Qatar Airways', 'Qatar Airways', 'Qatar', 'INTEGRATION_STAGE_1'),
('EK', 'UAE', 'Emirates', 'Emirates', 'UAE', 'AGREEMENT_SIGNED'),
('EY', 'ETD', 'Etihad Airways', 'Etihad Airways', 'UAE', 'AGREEMENT_SENT'),
('SV', 'SVA', 'Saudia', 'Saudia', 'Saudi Arabia', 'APPROVED')
ON CONFLICT (iata_code) DO UPDATE SET 
  onboarding_status = EXCLUDED.onboarding_status,
  airline_name = EXCLUDED.airline_name;

-- 2. Infrastructure Nodes (KWI Terminal 4 Focus)
INSERT INTO infrastructure_nodes (node_id, terminal, node_type, status) VALUES
('T4-GATE-01', 'T4', 'GATE', 'HEALTHY'),
('T4-GATE-02', 'T4', 'GATE', 'HEALTHY'),
('T4-CNTR-A1', 'T4', 'CHECKIN', 'HEALTHY'),
('T4-CNTR-A2', 'T4', 'CHECKIN', 'LOW_STOCK'), 
('T4-CNTR-B1', 'T4', 'CHECKIN', 'HEALTHY')
ON CONFLICT (node_id) DO NOTHING;

-- 3. Billing Rules
INSERT INTO billing_rules (rule_name, rule_type, charge_per_unit) VALUES
('Passenger Facility Charge', 'PAX_FEE', 3.500),
('Gate Occupancy Fee', 'GATE_FEE', 15.000)
ON CONFLICT DO NOTHING;

-- 4. Operational Metering (Simulated Usage for Invoicing)
INSERT INTO pax_metering (carrier_id, flight_no, pax_count, workstation_hours, date_recorded) VALUES
((SELECT id FROM carriers WHERE iata_code = 'KU'), 'KU101', 285, 4.5, '2026-04-14'),
((SELECT id FROM carriers WHERE iata_code = 'J9'), 'J9254', 162, 3.0, '2026-04-14'),
((SELECT id FROM carriers WHERE iata_code = 'QR'), 'QR1070', 310, 5.0, '2026-04-14')
ON CONFLICT DO NOTHING;
