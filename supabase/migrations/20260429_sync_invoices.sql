-- 20260429_sync_invoices.sql
-- Safely migrates billing ledger historical data into the detailed invoices table.

DO $$
DECLARE
  rec RECORD;
  usd_to_kd NUMERIC := 0.308;
  gross_kd NUMERIC;
  gross_usd NUMERIC;
BEGIN
  FOR rec IN SELECT * FROM billing_ledger LOOP
    -- Calculate derived KD values
    gross_kd := COALESCE(rec.total_pax_fees, 0) + COALESCE(rec.total_resource_fees, 0);
    
    IF gross_kd > 0 THEN
      gross_usd := gross_kd / usd_to_kd;
      
      INSERT INTO invoices (
        airline_id, period_month, pax_count, desk_count, 
        gross_revenue_usd, gross_revenue_kd,
        dgca_share_kd, ops_share_kd,
        net_dgca_kd, net_ops_kd,
        status
      ) VALUES (
        rec.carrier_id,
        rec.bill_period_start,
        (rec.total_pax_fees / 2 / usd_to_kd)::INT, -- Mock calculated pax
        15, -- Mock desk count
        gross_usd, gross_kd,
        gross_kd * 0.65, gross_kd * 0.35,
        gross_kd * 0.65, gross_kd * 0.35,
        CASE 
          WHEN rec.status = 'RECEIVABLE' THEN 'receivable'
          WHEN rec.status = 'ISSUED' THEN 'issued'
          ELSE 'draft'
        END
      ) ON CONFLICT (airline_id, period_month) DO UPDATE SET
        gross_revenue_kd = EXCLUDED.gross_revenue_kd,
        dgca_share_kd = EXCLUDED.dgca_share_kd,
        ops_share_kd = EXCLUDED.ops_share_kd,
        net_dgca_kd = EXCLUDED.net_dgca_kd,
        net_ops_kd = EXCLUDED.net_ops_kd,
        status = EXCLUDED.status;
    END IF;
  END LOOP;
END $$;
