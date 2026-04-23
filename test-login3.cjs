const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('profiles').select('id, auth_users:id()').eq('email', 'iaharb+ku@gmail.com');
  console.log(data, error);
}
test();
