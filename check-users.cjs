const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.auth.admin.listUsers();
  const ku = data.users.find(u => u.email === 'iaharb+ku@gmail.com');
  const sv = data.users.find(u => u.email === 'iaharb+sv@gmail.com');
  console.log('KU:', JSON.stringify(ku, null, 2));
  console.log('SV:', JSON.stringify(sv, null, 2));
}
test();
