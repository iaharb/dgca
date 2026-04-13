import { supabase } from '../lib/supabase';

export const seedOperationalData = async () => {
  console.log('[SEED-OPS] Initiating Clean Operational Seeding...');

  try {
    // 1. CLEANUP PHASE: Remove old records with NULL resources to clear the path
    await supabase.from('resource_allocations').delete().is('resource_id', null);
    await supabase.from('resource_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Full clear for fresh start
    await supabase.from('scheduled_flights').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. SEED TERMINALS
    const terminals = [
      { name: 'Terminal 4', operator: 'KAC' },
      { name: 'Terminal 1', operator: 'DGCA' }
    ];

    for (const t of terminals) {
      await supabase.from('terminals').upsert(t, { onConflict: 'name' });
    }
    const { data: termData } = await supabase.from('terminals').select('id, name');
    const termMap = termData?.reduce((acc: any, t) => ({ ...acc, [t.name]: t.id }), {});

    // 3. SEED RESOURCES
    const gates = [
      { terminal_id: termMap['Terminal 4'], resource_type: 'gate', identifier: 'G-01' },
      { terminal_id: termMap['Terminal 4'], resource_type: 'gate', identifier: 'G-02' },
      { terminal_id: termMap['Terminal 1'], resource_type: 'gate', identifier: 'G-04' },
      { terminal_id: termMap['Terminal 1'], resource_type: 'gate', identifier: 'G-05' }
    ];

    for (const g of gates) {
      if (g.terminal_id) await supabase.from('resources').upsert(g, { onConflict: 'identifier' });
    }

    // Capture the valid Gate IDs
    const { data: gateRecords } = await supabase.from('resources').select('id').eq('resource_type', 'gate');
    const gateIds = gateRecords?.map(r => r.id) || [];

    // 4. SEED FLIGHTS & ALLOCATIONS (2 airlines x 4 months)
    const { data: airlines } = await supabase.from('airlines').select('id, iata_code').in('iata_code', ['KU', 'J9']);

    if (airlines && gateIds.length > 0) {
      for (let month = 8; month <= 11; month++) {
        for (const airline of airlines) {
          for (let day = 1; day <= 10; day++) { // 10 days of history
            const flightNum = `${airline.iata_code}${100 + day + month}`;
            const baseTime = new Date(2026, month, day + 10, 10, 0, 0);

            const { data: flight } = await supabase.from('scheduled_flights').upsert({
              airline_id: airline.id,
              flight_number: flightNum,
              aircraft_type: 'B777',
              scheduled_time: baseTime.toISOString()
            }, { onConflict: 'flight_number' }).select().single();

            if (flight) {
              const selectedGate = gateIds[Math.floor(Math.random() * gateIds.length)];
              await supabase.from('resource_allocations').upsert({
                flight_id: flight.id,
                resource_id: selectedGate,
                start_time: baseTime.toISOString(),
                end_time: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString()
              }, { onConflict: 'flight_id' });
            }
          }
        }
      }
    }

    console.log('[SEED-OPS] Operational Bridge Restored Successfully.');
  } catch (err) {
    console.error('[SEED-OPS] Fatal error:', err);
  }
};
