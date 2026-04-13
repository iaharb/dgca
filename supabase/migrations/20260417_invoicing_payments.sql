-- =============================================================================
-- MIGRATION: Invoicing & Payments Module
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. INVOICES  (one row per carrier per month)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id          UUID REFERENCES public.airlines(id),
  period_month        DATE NOT NULL,          -- first day of billing month
  pax_count           INTEGER DEFAULT 0,
  desk_count          INTEGER DEFAULT 0,
  gross_revenue_usd   NUMERIC(14,3) DEFAULT 0,
  gross_revenue_kd    NUMERIC(14,3) DEFAULT 0,
  dgca_share_kd       NUMERIC(14,3) DEFAULT 0, -- 65 %
  ops_share_kd        NUMERIC(14,3) DEFAULT 0, -- 35 %
  sna_deductions_kd   NUMERIC(14,3) DEFAULT 0, -- deducted from ops share
  late_fees_kd        NUMERIC(14,3) DEFAULT 0, -- KD 1 000 / day late payment
  net_dgca_kd         NUMERIC(14,3) DEFAULT 0, -- dgca_share + late_fees
  net_ops_kd          NUMERIC(14,3) DEFAULT 0, -- ops_share  - sna_deductions
  -- Workflow
  status              TEXT DEFAULT 'draft',    -- draft | submitted | dgca_approved | paid | rejected
  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID,
  paid_at             TIMESTAMPTZ,
  rejection_reason    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (airline_id, period_month)
);

-- ---------------------------------------------------------------------------
-- 2. SNA PENALTIES  (System Not Available — owed by Ops Partner)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sna_penalties (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_month        DATE NOT NULL,
  incident_date       TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER NOT NULL DEFAULT 0,
  affected_systems    TEXT,
  amount_kd           NUMERIC(14,3) NOT NULL,
  annex_reference     TEXT DEFAULT 'Annex 10 § 7.4',
  responsible_party   TEXT DEFAULT 'operations_partner',
  description         TEXT,
  status              TEXT DEFAULT 'pending',  -- pending | applied | waived
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. PAYMENTS  (individual payment legs requiring DGCA approval)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id          UUID REFERENCES public.invoices(id),
  airline_id          UUID REFERENCES public.airlines(id),
  payment_type        TEXT NOT NULL,   -- revenue_dgca | revenue_ops | sna_penalty | late_fee
  description         TEXT,
  amount_kd           NUMERIC(14,3) NOT NULL,
  direction           TEXT NOT NULL,   -- carrier_to_ops | ops_to_dgca | dgca_to_carrier
  status              TEXT DEFAULT 'pending_approval', -- pending_approval | approved | rejected | processed
  dgca_approved_by    UUID,
  dgca_approved_at    TIMESTAMPTZ,
  rejection_reason    TEXT,
  payment_date        DATE,
  bank_reference      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sna_penalties  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  CREATE POLICY "Auth read invoices"      ON public.invoices      FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Auth insert invoices"    ON public.invoices      FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth update invoices"    ON public.invoices      FOR UPDATE TO authenticated USING (true);

  CREATE POLICY "Auth read sna"           ON public.sna_penalties FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Auth insert sna"         ON public.sna_penalties FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth update sna"         ON public.sna_penalties FOR UPDATE TO authenticated USING (true);

  CREATE POLICY "Auth read payments"      ON public.payments      FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Auth insert payments"    ON public.payments      FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth update payments"    ON public.payments      FOR UPDATE TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;
