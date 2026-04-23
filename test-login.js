const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: 'iaharb+sv@gmail.com', password: 'password123' });
  console.log(data, error);
}
test();
