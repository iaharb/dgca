-- ABMS Project Financial Management Schema
-- Handles Project Expenditures (Burn) and Revenue/Penalty Tracking (Earn)

-- 1. Project Expenditures Ledger
CREATE TABLE IF NOT EXISTS abms_expenditures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
