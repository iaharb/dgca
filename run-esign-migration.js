// run-esign-migration.js
// Adds e-signature columns to agreements table via Supabase SQL exec
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS signer_name   TEXT,
  ADD COLUMN IF NOT EXISTS signer_title  TEXT,
  ADD COLUMN IF NOT EXISTS signer_date   DATE,
  ADD COLUMN IF NOT EXISTS signature_data TEXT;
`;

const { error } = await supabase.rpc('execute_sql', { sql }).catch(() => ({ error: 'rpc not available' }));

if (error) {
  // Fallback: try direct query (requires service role)
  console.log('RPC not available, trying direct approach...');
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ sql })
  });
  console.log('Status:', res.status);
}

console.log('Done. Check Supabase dashboard if columns were not added.');
