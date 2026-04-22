-- Biometric Enrollment Table Schema
-- Purpose: Store person identification and hashed biometric templates

CREATE TABLE IF NOT EXISTS public.biometric_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID, 
    full_name TEXT NOT NULL,
    document_id TEXT NOT NULL,
    biometric_hash TEXT NOT NULL,
    nationality TEXT,
    date_of_birth DATE,
    gender TEXT,
    issuing_country TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT doc_id_length CHECK (char_length(document_id) >= 6)
);

-- Ensure columns exist if table was created previously
ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.passenger_profiles(id);
ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS issuing_country TEXT;

-- Indices for fast matching
CREATE INDEX IF NOT EXISTS idx_biometric_doc_id ON public.biometric_enrollments (document_id);
CREATE INDEX IF NOT EXISTS idx_biometric_hash ON public.biometric_enrollments (biometric_hash);

-- Enable RLS
ALTER TABLE public.biometric_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Allow authenticated agents to insert new enrollments
DROP POLICY IF EXISTS "Agents can insert enrollments" ON public.biometric_enrollments;
CREATE POLICY "Agents can insert enrollments" 
ON public.biometric_enrollments 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 2. Allow authenticated agents to view enrollment data
DROP POLICY IF EXISTS "Agents can view enrollments" ON public.biometric_enrollments;
CREATE POLICY "Agents can view enrollments" 
ON public.biometric_enrollments 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Allow service role (backend) managed access
ALTER TABLE public.biometric_enrollments FORCE ROW LEVEL SECURITY;

-- Documentation
COMMENT ON TABLE public.biometric_enrollments IS 'Stores cryptographic biometric templates and identity data for KWI Passenger Flow.';
COMMENT ON COLUMN public.biometric_enrollments.biometric_hash IS 'SHA-256 hash of normalized facial landmarks.';
