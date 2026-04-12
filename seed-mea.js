import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:54321', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');

async function seedMEA() {
  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'iaharb+mea@gmail.com',
    password: 'password123',
    email_confirm: true
  });

  if (error) { console.error('Auth error:', error.message); return; }
  
  const userId = data.user?.id;
  console.log('Created Auth:', userId);

  // Insert profile
  const { error: pErr } = await supabase.from('profiles').upsert({
    id: userId,
    first_name: 'Middle East',
    last_name: 'Airlines',
    email: 'iaharb+mea@gmail.com',
    role: 'carrier',
    airline_code: 'ME'
  });
  if (pErr) console.error('Profile error:', pErr.message);
  else console.log('Profile created for MEA (ME)');
}

seedMEA();
