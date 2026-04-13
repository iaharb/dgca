import { supabase } from '../lib/supabase';

export const seedOperationalData = async () => {
  console.log('[SEED-OPS] Initiating Operational Infrastructure Seeding...');

  // 1. Seed Terminals
  const terminals = [
    { name: 'Terminal 4', operator: 'KAC' },
    { name: 'Terminal 1', operator: 'DGCA' }
  ];

  const termIds: string[] = [];
  for (const t of terminals) {
    const { data } = await supabase.from('terminals').upsert(t, { onConflict: 'name' }).select().single();
    if (data) termIds.push(data.id);
  }

  // 2. Seed Resources (5 Gates)
  const gates = [
    { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-01' },
    { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-02' },
    { terminal_id: termIds[0], resource_type: 'gate', identifier: 'G-03' },
    { terminal_id: termIds[1], resource_type: 'gate', identifier: 'G-04' },
    { terminal_id: termIds[1], resource_type: 'gate', identifier: 'G-05' }
  ];
  
  const gateIds: string[] = [];
  for (const g of gates) {
    const { data } = await supabase.from('resources').upsert(g, { onConflict: 'identifier' }).select().single();
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
  if (!airlines || airlines.length < 2) {
    console.error('[SEED-OPS] Certified airlines KU/J9 not found. Please run base seed first.');
    return;
  }

  // 5. Seed 4 Months of Historical Data (Sept - Dec 2026)
  console.log('[SEED-OPS] Generating 4 months of operational history...');
  
  for (let month = 8; month <= 11; month++) { // Sept (8) to Dec (11)
    const year = 2026;
    
    for (const airline of airlines) {
      // Simulate 5 flights per day for each airline
      for (let day = 1; day <= 5; day++) {
        const flightNum = `${airline.iata_code}${100 + day + month}`;
        const baseTime = new Date(year, month, day + 10, 10, 0, 0);

        // a. Create Flight
        const { data: flight } = await supabase.from('scheduled_flights').insert({
          airline_id: airline.id,
          flight_number: flightNum,
          aircraft_type: day % 2 === 0 ? 'B777' : 'A320',
          scheduled_time: baseTime.toISOString(),
          actual_time: baseTime.toISOString()
        }).select().single();

        if (flight) {
          // b. Allocate Gate
          const selectedGate = gateIds[Math.floor(Math.random() * gateIds.length)];
          await supabase.from('resource_allocations').insert({
            flight_id: flight.id,
            resource_id: selectedGate,
            start_time: baseTime.toISOString(),
            end_time: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            is_ai_suggested: false
          });
        }
      }
    }
  }

  console.log('[SEED-OPS] Operational table synchronization complete.');
};
