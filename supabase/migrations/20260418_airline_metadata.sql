-- Add metadata columns if they don't exist
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS fleet INTEGER DEFAULT 0;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS routes INTEGER DEFAULT 0;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS preferred_terminal TEXT;

-- Create airline contacts table for interactivity
CREATE TABLE IF NOT EXISTS airline_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'IT', 'LGL', 'FIN'
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update J9 (Jazeera)
UPDATE airlines SET preferred_terminal = 'T5', fleet = 17, routes = 35 WHERE iata_code = 'J9';

-- Update KU (Kuwait Airways) -> KA as requested
UPDATE airlines SET iata_code = 'KA', preferred_terminal = 'T4', fleet = 32, routes = 48 WHERE iata_code = 'KU';

-- Distribute others to T1 and T2 (assuming they exist or will be added)
UPDATE airlines SET preferred_terminal = 'T1', fleet = 12, routes = 15 WHERE iata_code NOT IN ('J9', 'KA', 'KU');
UPDATE airlines SET preferred_terminal = 'T2' WHERE iata_code IN ('ME', 'QR'); -- Middle East and Qatar

-- Seed some contacts
INSERT INTO airline_contacts (airline_id, role, full_name, email, phone)
SELECT id, 'IT', 'Ahmad Tech', 'it@' || iata_code || '.com', '+965 9000 0001' FROM airlines
ON CONFLICT DO NOTHING;

INSERT INTO airline_contacts (airline_id, role, full_name, email, phone)
SELECT id, 'LGL', 'Sara Law', 'legal@' || iata_code || '.com', '+965 9000 0002' FROM airlines
ON CONFLICT DO NOTHING;

INSERT INTO airline_contacts (airline_id, role, full_name, email, phone)
SELECT id, 'FIN', 'Finance Pro', 'finance@' || iata_code || '.com', '+965 9000 0003' FROM airlines
ON CONFLICT DO NOTHING;
