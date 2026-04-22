CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION approve_airline_onboarding(request_id UUID)
RETURNS void AS $$
DECLARE
  req_record RECORD;
  new_airline_id UUID;
  new_user_id UUID;
  encrypted_pw TEXT;
  generated_email TEXT;
BEGIN
  -- Get the request data
  SELECT * INTO req_record FROM onboarding_requests WHERE id = request_id;
  
  -- Update request status
  UPDATE onboarding_requests SET status = 'APPROVED' WHERE id = request_id;
  
  -- Insert into carriers (or update if already exists)
  INSERT INTO carriers (name, iata_code, onboarding_status, status)
  VALUES (req_record.airline_name, req_record.iata_code, 'APPROVED', 'inactive')
  ON CONFLICT (iata_code) DO UPDATE 
  SET onboarding_status = 'APPROVED'
  RETURNING id INTO new_airline_id;

  -- Logic for account creation
  generated_email := 'iaharb+' || lower(req_record.iata_code) || '@gmail.com';
  
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = generated_email;
  
  IF new_user_id IS NULL THEN
    new_user_id := gen_random_uuid();
    encrypted_pw := crypt('password123', gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', generated_email, encrypted_pw, now(), now(), now(), 
      '{"provider":"email","providers":["email"]}', 
      jsonb_build_object('first_name', split_part(req_record.full_name, ' ', 1), 'last_name', split_part(req_record.full_name, ' ', 2), 'role', 'carrier', 'airline_code', req_record.iata_code),
      false
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      new_user_id, new_user_id, new_user_id::text, jsonb_build_object('sub', new_user_id::text, 'email', generated_email), 'email', now(), now()
    );

    INSERT INTO public.profiles (
      id, first_name, last_name, email, role, airline_code
    ) VALUES (
      new_user_id, split_part(req_record.full_name, ' ', 1), split_part(req_record.full_name, ' ', 2), generated_email, 'carrier', req_record.iata_code
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

