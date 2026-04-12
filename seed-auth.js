import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding Auth...");
  const users = [
    { email: 'iaharb+dgca@gmail.com', first_name: 'Yousif', last_name: 'Al-Hamad', role: 'dgca' },
    { email: 'iaharb+ops@gmail.com', first_name: 'Lead', last_name: 'Systems Architect', role: 'operations_partner' },
    { email: 'iaharb+ku@gmail.com', first_name: 'Kuwait Airways', last_name: 'Admin', role: 'carrier', code: 'KU' }
  ];
  
  for (const u of users) {
     const { data, error } = await supabase.auth.admin.createUser({
       email: u.email,
       password: 'password123',
       email_confirm: true
     });
     if (error && !error.message.includes('already exists')) {
       console.error(u.email, error.message);
     } else {
       const user = data?.user;
       if (user) {
         console.log("Created Auth", u.email, user.id);
         await supabase.from('profiles').upsert({
            id: user.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            role: u.role,
            airline_code: u.code || null
         });
         console.log("Inserted Profile", u.email);
       }
     }
  }
}

seed();
