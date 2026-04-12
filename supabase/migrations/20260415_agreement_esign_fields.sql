-- Add e-signature fields to agreements table
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS signer_name   TEXT,
  ADD COLUMN IF NOT EXISTS signer_title  TEXT,
  ADD COLUMN IF NOT EXISTS signer_date   DATE,
  ADD COLUMN IF NOT EXISTS signature_data TEXT;  -- base64 canvas PNG or typed name
