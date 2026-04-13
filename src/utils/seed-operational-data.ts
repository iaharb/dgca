import { supabase } from '../lib/supabase';

export const seedOperationalData = async () => {
  console.log('[SEED-OPS] Initiating Operational Infrastructure Seeding...');

  try {
    // 1. Seed/Fetch Terminals
    const terminals = [
      { name: 'Terminal 4', operator: 'KAC' },
      { name: 'Terminal 1', operator: 'DGCA' }
    ];

    const termIds: string[] = [];
    for (const t of terminals) {
      // First try to insert, then fetch (to handle both new and existing)
      await supabase.from('terminals').upsert(t, { onConflict: 'name' });
      const { data } = await supabase.from('terminals').select('id').eq('name', t.name).single();
      if (data) termIds.push(data.id);
    }

    if (termIds.length === 0) throw new Error("Could not initialize Terminals.");

    // 2. Seed/Fetch Resources (5 Gates)
    const gates = [
      { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-01' },
      { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-02' },
      { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-03' },
      { terminal_id: termIds[1], resource_type: 'gate', identifier: 'G-04' },
      { terminal_id: termIds[1], resource_type: 'gate', identifier: 'G-05' }
    ];

    const gateIds: string[] = [];
    for (const g of gates) {
      await supabase.from('resources').upsert(g, { onConflict: 'identifier' });
      const { data } = await supabase.from('resources').select('id').eq('identifier', g.identifier).single();
      if (data) gateIds.push(data.id);
    }

    // 3. Seed MUSE Desks (10 Desks)
    for (let i = 1; i <= 10; i++) {
      await supabase.from('resources').upsert({
        terminal_id: termIds[0],
        resource_type: 'checkin_counter',
        identifier: `MUSE-C${i.toString().padStart(2, '0')}`
      }, { onConflict: 'identifier' });
    }

    // 4. Fetch Certified Airlines (KU & J9)
    const { data: airlines } = await supabase.from('airlines').select('id, iata_code').in('iata_code', ['KU', 'J9']);

    if (airlines && gateIds.length > 0) {
      console.log(`[SEED-OPS] Found ${airlines.length} airlines and ${gateIds.length} gates. Generating history...`);

      // 5. Seed 4 Months of Historical Data (Sept - Dec 2026)
      for (let month = 8; month <= 11; month++) {
        for (const airline of airlines) {
          for (let day = 1; day <= 2; day++) { // 2 flights per day to prevent throttle
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

    console.log('[SEED-OPS] Operational tables success!');
  } catch (err) {
    console.error('[SEED-OPS] Fatal sync error:', err);
  }
};