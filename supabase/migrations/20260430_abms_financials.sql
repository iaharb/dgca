-- 0. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Project Expenditures Ledger
CREATE TABLE IF NOT EXISTS abms_expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'Hardware CAPEX', 'Logistics', 'Resources', 'Fixed Costs', 'Advanced Payments'
  item_name TEXT NOT NULL,
  amount_usd DECIMAL(15,2) NOT NULL,
  amount_kd DECIMAL(15,3) NOT NULL,
  date_incurred DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'budgeted'
  description TEXT,
  reference_no TEXT, -- e.g., BOQ Item ID or Invoice #
  document_type TEXT, -- 'PO', 'DO', 'Invoice', 'Timesheet'
  man_days DECIMAL(10,2), -- Only for 'Resources' category
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Revenue & Penalty Tracker
-- Aggregates monthly revenue streams based on the 35/65 split formula
CREATE TABLE IF NOT EXISTS abms_revenue_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month DATE NOT NULL UNIQUE,
  
  -- Passenger breakdown for pricing logic
  pax_leaving_count INTEGER DEFAULT 0,         -- $2.00
  pax_coming_count INTEGER DEFAULT 0,          -- $2.00
  pax_transit_plane_count INTEGER DEFAULT 0,   -- $2.00
  pax_transit_no_plane_count INTEGER DEFAULT 0,-- $1.00
  pax_transit_no_entry_count INTEGER DEFAULT 0, -- $0.00
  
  -- Deductions
  consumables_cost_kd DECIMAL(15,3) DEFAULT 0,
  penalties_kd DECIMAL(15,3) DEFAULT 0,        -- Liquidated Damages (Service stoppages, etc.)
  
  -- Financial results
  gross_revenue_usd DECIMAL(15,2) DEFAULT 0,
  net_panworld_kd DECIMAL(15,3) DEFAULT 0,     -- 35% share
  net_dgca_kd DECIMAL(15,3) DEFAULT 0,         -- 65% share
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Risk Impact Register
-- Used for the Risk Impact Overlay on the Break-Even dashboard
CREATE TABLE IF NOT EXISTS abms_risk_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_code TEXT UNIQUE, -- e.g., 'R-001' (Hardware Delivery), 'R-002' (VPN Readiness)
  title TEXT NOT NULL,
  probability DECIMAL(3,2), -- 0.0 to 1.0
  delay_weeks INTEGER DEFAULT 0,
  cost_impact_kd DECIMAL(15,3) DEFAULT 0,
  mitigation_status TEXT DEFAULT 'unmitigated',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_abms_exp_date ON abms_expenditures(date_incurred);
CREATE INDEX IF NOT EXISTS idx_abms_rev_month ON abms_revenue_summary(period_month);

-- 4. Enable RLS and add policies
ALTER TABLE abms_expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE abms_revenue_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE abms_risk_impacts ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  -- Expenditures
  CREATE POLICY "Allow Auth All" ON abms_expenditures FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow Public Select" ON abms_expenditures FOR SELECT TO anon USING (true);

  -- Revenue Summary
  CREATE POLICY "Allow Auth All" ON abms_revenue_summary FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow Public Select" ON abms_revenue_summary FOR SELECT TO anon USING (true);

  -- Risk Impacts
  CREATE POLICY "Allow Auth All" ON abms_risk_impacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow Public Select" ON abms_risk_impacts FOR SELECT TO anon USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;

-- View for Cumulative Financials (Lucrative Status)
CREATE OR REPLACE VIEW v_abms_lucrative_status AS
WITH burn AS (
  SELECT COALESCE(SUM(amount_kd), 0) as total_expenditure FROM abms_expenditures
),
earnings AS (
  SELECT COALESCE(SUM(net_panworld_kd), 0) as total_panworld_revenue FROM abms_revenue_summary
)
SELECT 
  b.total_expenditure,
  e.total_panworld_revenue,
  (e.total_panworld_revenue - b.total_expenditure) as net_position_kd,
  CASE WHEN e.total_panworld_revenue > b.total_expenditure THEN true ELSE false END as is_lucrative
FROM burn b, earnings e;
