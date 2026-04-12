import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:54321', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');

async function cleanMEA() {
  // Get MEA airline id
  const { data: airline } = await supabase.from('airlines').select('id').eq('iata_code', 'ME').maybeSingle();
  if (!airline) { console.log('MEA not found'); return; }

  const { error, count } = await supabase.from('usage_metrics').delete({ count: 'exact' }).eq('airline_id', airline.id);
  if (error) console.error('Error:', error.message);
  else console.log(`Deleted ${count} MEA usage_metrics rows.`);
}

cleanMEA();
