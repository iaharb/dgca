-- 20260422_agreement_workflow.sql

-- 1. Create workflow_audit_logs table
CREATE TABLE IF NOT EXISTS workflow_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES airlines(id),
  officer_id UUID, -- References profiles(id)
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add signature token fields to airlines
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airlines' AND column_name='signature_token') THEN
    ALTER TABLE airlines ADD COLUMN signature_token UUID DEFAULT uuid_generate_v4();
    ALTER TABLE airlines ADD COLUMN token_expiry TIMESTAMPTZ;
    ALTER TABLE airlines ADD COLUMN contract_end_date DATE;
  END IF;
END $$;

-- 3. Stored Procedure for Carrier Acknowledgement/Approval
CREATE OR REPLACE FUNCTION handle_carrier_acknowledgement(target_carrier_id UUID, performing_officer_id UUID)
RETURNS void AS $$
BEGIN
  -- Update airline status and metadata
  UPDATE airlines
  SET onboarding_status = 'AGREEMENT_SENT',
      status = 'inactive', -- Not yet fully operational until signed
      signature_token = uuid_generate_v4(),
      token_expiry = now() + interval '7 days',
      contract_start_date = '2026-06-01',
      contract_end_date = '2031-06-01',
      updated_at = now()
  WHERE id = target_carrier_id;

  -- Log the action
  INSERT INTO workflow_audit_logs (carrier_id, officer_id, action_type, details)
  VALUES (
    target_carrier_id, 
    performing_officer_id, 
    'APPROVE_AND_SEND_AGREEMENT', 
    jsonb_build_object(
      'contract_start', '2026-06-01',
      'contract_end', '2031-06-01',
      'expiry', now() + interval '7 days'
    )
  );

  -- Create the agreement record in the Ledger
  INSERT INTO agreements (airline_id, agreement_type, status, start_date, expiry_date)
  VALUES (
    target_carrier_id,
    'Operational Framework (Annex 10)',
    'sent',
    '2026-06-01',
    '2031-06-01'
  )
  ON CONFLICT (airline_id) DO UPDATE 
  SET status = 'sent', start_date = '2026-06-01', expiry_date = '2031-06-01';

END;
$$ LANGUAGE plpgsql;

-- 4. Enable RLS and Policies for audit logs
ALTER TABLE workflow_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DGCA and Ops can read all logs" ON workflow_audit_logs FOR SELECT TO authenticated USING (true);
