-- 1. Setup Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tables
CREATE TABLE airlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  iata_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id),
  version TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  file_path TEXT,
  support_term_years INTEGER DEFAULT 10,
  validity_days INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE integration_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID REFERENCES agreements(id),
  milestone_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  details JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id),
  pax_rate NUMERIC DEFAULT 0.500,
  workstation_rate NUMERIC DEFAULT 150.000,
  effective_from TIMESTAMPTZ DEFAULT now(),
  UNIQUE(airline_id)
);

CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id),
  billing_month DATE NOT NULL,
  pax_count INTEGER DEFAULT 0,
  workstation_count INTEGER DEFAULT 0,
  consumables_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE penalty_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id),
  amount_kd NUMERIC NOT NULL,
  description TEXT,
  annex_reference TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Functions
CREATE OR REPLACE FUNCTION process_deemed_acceptance()
RETURNS void AS $func$
BEGIN
  UPDATE integration_milestones
  SET status = 'deemed_accepted',
      completed_at = now()
  WHERE milestone_type = 'sat_sign_off'
    AND status = 'pending'
    AND created_at < (now() - interval '14 days');
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_monthly_due(tgt_airline_id UUID, tgt_month DATE)
RETURNS NUMERIC AS $func$
DECLARE
  total_due NUMERIC;
  pax_val INTEGER;
  p_rate NUMERIC;
  scu_total NUMERIC;
BEGIN
  SELECT pax_count INTO pax_val FROM usage_metrics WHERE airline_id = tgt_airline_id AND billing_month = tgt_month;
  IF pax_val IS NULL THEN pax_val := 0; END IF;
  SELECT pax_rate INTO p_rate FROM billing_rates WHERE airline_id = tgt_airline_id;
  IF p_rate IS NULL THEN p_rate := 0.500; END IF;
  SELECT COALESCE(SUM(amount_kd), 0) INTO scu_total FROM penalty_ledger WHERE airline_id = tgt_airline_id AND status = 'pending';
  total_due := (pax_val * p_rate) - scu_total;
  RETURN total_due;
END;
$func$ LANGUAGE plpgsql;

-- 4. Policies
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_ledger ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  CREATE POLICY "Public Read" ON airlines FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Public Read" ON agreements FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Public Read" ON integration_milestones FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Public Read" ON penalty_ledger FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;
