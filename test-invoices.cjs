const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('invoices').select('*, airlines(name, iata_code)');
  console.log('Error:', error);
  console.log('Data count:', data ? data.length : 0);
  if (error) {
    const { data: d2, error: e2 } = await supabase.from('invoices').select('*, carriers(name, iata_code)');
    console.log('With carriers Error:', e2);
    console.log('With carriers count:', d2 ? d2.length : 0);
  }
}
test();
