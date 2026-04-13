const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function seed() {
  console.log('--- FORCED OPS SEED STARTING ---');
  
  // 1. Terminals
  const terminals = [{ name: 'Terminal 4', operator: 'KAC' }, { name: 'Terminal 1', operator: 'DGCA' }];
  for (const t of terminals) {
    await supabase.from('terminals').upsert(t, { onConflict: 'name' });
  }
  const { data: termData } = await supabase.from('terminals').select('id');
  const termIds = termData.map(t => t.id);

  // 2. Resources
  const gates = [
    { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-01' },
    { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-02' },
    { terminal_id: termIds[1], resource_type: 'gate', identifier: 'G-04' }
  ];
  for (const g of gates) {
    await supabase.from('resources').upsert(g, { onConflict: 'identifier' });
  }

  // 3. Allocations
  const { data: airlines } = await supabase.from('airlines').select('id').in('iata_code', ['KU', 'J9']);
  const { data: resData } = await supabase.from('resources').select('id');
  
  if (airlines && resData) {
    for (const airline of airlines) {
      const flightNum = `F-FORCED-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
      const { data: flight } = await supabase.from('scheduled_flights').insert({
        airline_id: airline.id,
        flight_number: flightNum,
        aircraft_type: 'B777',
        scheduled_time: new Date().toISOString()
      }).select().single();

      if (flight) {
        await supabase.from('resource_allocations').insert({
          flight_id: flight.id,
          resource_id: resData[0].id,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString()
        });
      }
    }
  }

  console.log('--- FORCED OPS SEED COMPLETE ---');
}

seed();
