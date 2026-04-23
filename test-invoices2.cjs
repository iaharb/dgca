const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('invoices').select('*');
  console.log('Invoices Count:', data ? data.length : 0);
  const { data: b, error: eb } = await supabase.from('billing_ledger').select('*');
  console.log('Billing Ledger Count:', b ? b.length : 0);
}
test();
