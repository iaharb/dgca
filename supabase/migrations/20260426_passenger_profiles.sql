-- Passenger Profiles Table
-- Purpose: Store biographic identity data for KWI Passenger Flow

CREATE TABLE IF NOT EXISTS public.passenger_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    nationality TEXT,
    date_of_birth DATE,
    gender TEXT,
    document_type TEXT CHECK (document_type IN ('CIVIL_ID', 'PASSPORT')),
    document_number TEXT UNIQUE NOT NULL, -- Stores Civil ID 12-digit or Passport ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_passenger_doc ON public.passenger_profiles (document_number);

-- Link Biometric Enrollments to Passenger Profiles
-- We add passenger_id to link the biometric template to a specific person
ALTER TABLE public.biometric_enrollments 
ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.passenger_profiles(id);

-- Enable RLS
ALTER TABLE public.passenger_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Agents
DROP POLICY IF EXISTS "Agents can manage passenger profiles" ON public.passenger_profiles;
CREATE POLICY "Agents can manage passenger profiles" 
ON public.passenger_profiles 
FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Documentation
COMMENT ON TABLE public.passenger_profiles IS 'Master biographical data for passengers at KWI.';
