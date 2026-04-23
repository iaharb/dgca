-- 20260429_historical_seeding.sql
-- Phase 2: Historical Seeding & Integration Simulation

-- Drop old check constraints that limit onboarding_status
ALTER TABLE carriers DROP CONSTRAINT IF EXISTS airlines_onboarding_status_check;
ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_onboarding_status_check;

-- 1. Ensure basic master data exists
INSERT INTO aircraft_types (type_code, manufacturer, capacity_pax) VALUES 
('A320', 'Airbus', 180), ('A380', 'Airbus', 500), ('B777', 'Boeing', 350) 
ON CONFLICT DO NOTHING;

-- 2. Insert 15-20 Carriers at various stages
INSERT INTO carriers (iata_code, icao_code, name, airline_name, country_origin, onboarding_status, status) VALUES
('AA', 'AAL', 'American Airlines', 'American Airlines', 'USA', 'CERTIFIED', 'active'),
('DL', 'DAL', 'Delta Air Lines', 'Delta Air Lines', 'USA', 'CERTIFIED', 'active'),
('LH', 'DLH', 'Lufthansa', 'Lufthansa', 'Germany', 'CERTIFIED', 'active'),
('AF', 'AFR', 'Air France', 'Air France', 'France', 'CERTIFIED', 'active'),
('KL', 'KLM', 'KLM', 'KLM', 'Netherlands', 'CERTIFIED', 'active'),
('CX', 'CPA', 'Cathay Pacific', 'Cathay Pacific', 'Hong Kong', 'CERTIFIED', 'active'),
('SQ', 'SIA', 'Singapore Airlines', 'Singapore Airlines', 'Singapore', 'CERTIFIED', 'active'),
('NH', 'ANA', 'All Nippon Airways', 'All Nippon Airways', 'Japan', 'CERTIFIED', 'active'),
('JL', 'JAL', 'Japan Airlines', 'Japan Airlines', 'Japan', 'CERTIFIED', 'active'),
('AC', 'ACA', 'Air Canada', 'Air Canada', 'Canada', 'CERTIFIED', 'active'),
('MS', 'MSR', 'EgyptAir', 'EgyptAir', 'Egypt', 'CERTIFIED', 'active'),
('GF', 'GFA', 'Gulf Air', 'Gulf Air', 'Bahrain', 'CERTIFIED', 'active'),
('TK', 'THY', 'Turkish Airlines', 'Turkish Airlines', 'Turkey', 'CERTIFIED', 'active'),
('WY', 'OMA', 'Oman Air', 'Oman Air', 'Oman', 'CERTIFIED', 'active'),

-- TEST CARRIERS (At different stages)
('RJ', 'RJA', 'Royal Jordanian', 'Royal Jordanian', 'Jordan', 'SIGNATURE_SUBMITTED', 'inactive'),
('ME', 'MEA', 'Middle East Airlines', 'Middle East Airlines', 'Lebanon', 'INTEGRATION_TESTING', 'inactive')
ON CONFLICT (iata_code) DO UPDATE SET 
  onboarding_status = EXCLUDED.onboarding_status,
  status = EXCLUDED.status;

-- 3. Provision Users and Profiles for all carriers
DO $$
DECLARE
  rec RECORD;
  new_user_id UUID;
  generated_email TEXT;
  encrypted_pw TEXT := crypt('password123', gen_salt('bf'));
BEGIN
  FOR rec IN SELECT * FROM carriers WHERE onboarding_status IN ('SIGNATURE_SUBMITTED', 'SIGNATURE_APPROVED', 'INTEGRATION_TESTING', 'CERTIFIED') LOOP
    generated_email := 'iaharb+' || lower(rec.iata_code) || '@gmail.com';
    SELECT id INTO new_user_id FROM auth.users WHERE email = generated_email;
    
    IF new_user_id IS NULL THEN
      new_user_id := gen_random_uuid();
      
      -- Insert into auth.users with correct defaults to prevent GoTrue crash
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, 
        raw_app_meta_data, raw_user_meta_data, is_super_admin, 
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', generated_email, encrypted_pw, now(), now(), now(), 
        '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('first_name', 'Integration', 'last_name', 'Manager', 'role', 'carrier', 'airline_code', rec.iata_code),
        false, '', '', '', ''
      );

      -- Insert identity
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at) 
      VALUES (gen_random_uuid(), new_user_id, new_user_id::text, jsonb_build_object('sub', new_user_id::text, 'email', generated_email), 'email', now(), now());

      -- Insert profile
      INSERT INTO public.profiles (id, first_name, last_name, email, role, airline_code)
      VALUES (new_user_id, 'Integration', 'Manager', generated_email, 'carrier', rec.iata_code);
    END IF;

    -- Create Agreement Document
    IF NOT EXISTS (SELECT 1 FROM agreements WHERE airline_id = rec.id) THEN
      INSERT INTO agreements (airline_id, version, status) 
      VALUES (
        rec.id, 
        '1.0',
        CASE 
          WHEN rec.onboarding_status = 'SIGNATURE_SUBMITTED' THEN 'PENDING_DGCA'
          ELSE 'SIGNED'
        END
      );
    END IF;

    -- Create Integration Milestones
    IF rec.onboarding_status IN ('INTEGRATION_TESTING', 'CERTIFIED') THEN
       INSERT INTO integration_milestones (agreement_id, milestone_type, status, completed_at)
       SELECT id, 'network_test', 'completed', now() - interval '3 months' FROM agreements WHERE airline_id = rec.id
       ON CONFLICT DO NOTHING;
       
       INSERT INTO integration_milestones (agreement_id, milestone_type, status, completed_at)
       SELECT id, 'hardware_test', 'completed', now() - interval '2 months' FROM agreements WHERE airline_id = rec.id
       ON CONFLICT DO NOTHING;
       
       IF rec.onboarding_status = 'CERTIFIED' THEN
         INSERT INTO integration_milestones (agreement_id, milestone_type, status, completed_at)
         SELECT id, 'sat_sign_off', 'completed', now() - interval '1 month' FROM agreements WHERE airline_id = rec.id
         ON CONFLICT DO NOTHING;
         
         INSERT INTO integration_milestones (agreement_id, milestone_type, status, completed_at)
         SELECT id, 'certified', 'completed', now() - interval '1 month' FROM agreements WHERE airline_id = rec.id
         ON CONFLICT DO NOTHING;
       END IF;
    END IF;

  END LOOP;
END $$;

-- 4. Insert Mock Flight Operations & Pax Metering (Jan - March 2026)
DO $$
DECLARE
  carrier_rec RECORD;
  d DATE;
  fl_uuid UUID;
  pax INT;
  flight_num TEXT;
  ac_id UUID;
BEGIN
  SELECT id INTO ac_id FROM aircraft_types LIMIT 1;

  FOR carrier_rec IN SELECT * FROM carriers WHERE onboarding_status = 'CERTIFIED' LOOP
    FOR i IN 0..89 LOOP -- Jan 1 to Mar 31
      d := '2026-01-01'::DATE + i;
      
      -- Generate 1 to 2 flights per day per carrier
      FOR j IN 1..((random() * 1 + 1)::INT) LOOP
        fl_uuid := gen_random_uuid();
        flight_num := carrier_rec.iata_code || (100 + j)::TEXT;
        pax := (random() * 200 + 50)::INT;
        
        INSERT INTO flight_movements (id, carrier_id, flight_no, aircraft_type_id, movement_type, sta, ata, status, created_at)
        VALUES (fl_uuid, carrier_rec.id, flight_num, ac_id, 'ARRIVAL', d + time '10:00', d + time '10:05', 'COMPLETED', d);
        
        INSERT INTO pax_metering (carrier_id, flight_no, pax_count, workstation_hours, date_recorded, created_at)
        VALUES (carrier_rec.id, flight_num, pax, 2.5, d, d);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 5. Insert Invoicing Data (Billing Ledger)
-- January -> RECEIVABLE
-- February -> ISSUED
-- March -> DRAFT
DO $$
DECLARE
  carrier_rec RECORD;
BEGIN
  FOR carrier_rec IN SELECT * FROM carriers WHERE onboarding_status = 'CERTIFIED' LOOP
    -- January Invoice (RECEIVABLE)
    INSERT INTO billing_ledger (carrier_id, bill_period_start, bill_period_end, total_pax_fees, total_resource_fees, status)
    VALUES (carrier_rec.id, '2026-01-01', '2026-01-31', (random() * 30000 + 10000), (random() * 5000 + 1000), 'RECEIVABLE');
    
    -- February Invoice (ISSUED)
    INSERT INTO billing_ledger (carrier_id, bill_period_start, bill_period_end, total_pax_fees, total_resource_fees, status)
    VALUES (carrier_rec.id, '2026-02-01', '2026-02-28', (random() * 30000 + 10000), (random() * 5000 + 1000), 'ISSUED');
    
    -- March Invoice (DRAFT)
    INSERT INTO billing_ledger (carrier_id, bill_period_start, bill_period_end, total_pax_fees, total_resource_fees, status)
    VALUES (carrier_rec.id, '2026-03-01', '2026-03-31', (random() * 30000 + 10000), (random() * 5000 + 1000), 'DRAFT');
  END LOOP;
END $$;
