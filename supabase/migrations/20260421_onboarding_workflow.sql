-- 20260421_onboarding_workflow.sql
-- 1. Create onboarding_requests table
CREATE TABLE IF NOT EXISTS onboarding_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  official_email TEXT NOT NULL,
  phone TEXT,
  airline_name TEXT NOT NULL,
  iata_code TEXT NOT NULL,
  job_title TEXT,
  status TEXT DEFAULT 'PENDING_REQUEST' CHECK (status IN ('PENDING_REQUEST', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update airlines table to support the onboarding state-machine
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airlines' AND column_name='onboarding_status') THEN
    ALTER TABLE airlines ADD COLUMN onboarding_status TEXT DEFAULT 'PENDING_REQUEST' 
    CHECK (onboarding_status IN ('PENDING_REQUEST', 'APPROVED', 'AGREEMENT_SENT', 'AGREEMENT_SIGNED', 'INTEGRATION_STAGE_1'));
  END IF;
END $$;

-- 3. Add contract fields to airlines
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airlines' AND column_name='contract_start_date') THEN
    ALTER TABLE airlines ADD COLUMN contract_start_date DATE;
    ALTER TABLE airlines ADD COLUMN signed_at TIMESTAMPTZ;
    ALTER TABLE airlines ADD COLUMN signature_data TEXT; -- Base64 or string representation of the signature
  END IF;
END $$;

-- 4. Set RLS and Policies for onboarding_requests
ALTER TABLE onboarding_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for onboarding_requests" ON onboarding_requests;
CREATE POLICY "Allow public insert for onboarding_requests" ON onboarding_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow DGCA read all onboarding_requests" ON onboarding_requests;
CREATE POLICY "Allow DGCA read all onboarding_requests" ON onboarding_requests FOR SELECT TO authenticated USING (true); -- Ideally filter by dgca role

-- 5. Helper Function to Approve Request and Initialize Airline
CREATE OR REPLACE FUNCTION approve_airline_onboarding(request_id UUID)
RETURNS void AS $$
DECLARE
  req_record RECORD;
  new_airline_id UUID;
BEGIN
  -- Get the request data
  SELECT * INTO req_record FROM onboarding_requests WHERE id = request_id;
  
  -- Update request status
  UPDATE onboarding_requests SET status = 'APPROVED' WHERE id = request_id;
  
  -- Insert into airlines (or update if already exists)
  INSERT INTO airlines (name, iata_code, onboarding_status, status)
  VALUES (req_record.airline_name, req_record.iata_code, 'APPROVED', 'inactive')
  ON CONFLICT (iata_code) DO UPDATE 
  SET onboarding_status = 'APPROVED'
  RETURNING id INTO new_airline_id;

  -- Logic for account creation would typically be handled by the app via Supabase Auth API
END;
$$ LANGUAGE plpgsql;
