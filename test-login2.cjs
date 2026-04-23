const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: 'iaharb+ku@gmail.com', password: 'password123' });
  console.log(data, error);
}
test();
