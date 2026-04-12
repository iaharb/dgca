import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const m = await supabase.from('integration_milestones').select('*');
  console.log("Milestones:", m.data?.length, JSON.stringify(m.data));
  const u = await supabase.from('usage_metrics').select('*');
  console.log("Usage:", u.data?.length, JSON.stringify(u.data));
}
check();
