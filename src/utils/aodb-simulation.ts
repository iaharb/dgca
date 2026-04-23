import { supabase } from '../lib/supabase';

/**
 * VII2-BRIDGE Logic Simulation:
 * When a "Flight Closed" message is received from Collins AODB, 
 * this utility updates the Partner Portal's financial and operational ledger.
 */
export const simulateAODBFeed = async (
  airlineCode: string, 
  paxCount: number, 
  options: { terminal?: string; gate?: string; flightNum?: string; dateStr?: string } = {}
) => {
  console.log(`[VII2-BRIDGE] Processing high-integrity feed for ${airlineCode}: ${paxCount} pax`);

  // 1. Get carrier ID safely
  const { data: carrier } = await supabase
    .from('carriers')
    .select('id')
    .eq('iata_code', airlineCode)
    .maybeSingle();

  if (!carrier) {
     console.error(`[VII2-BRIDGE] No carrier found for ${airlineCode}. Integration rejected.`);
     return { success: false, msg: 'Carrier not found' };
  }

  // Use provided date or fallback to today
  const targetDate = options.dateStr ? new Date(options.dateStr) : new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);
  
  // Randomize the time slightly within the day if it's a historical date
  if (options.dateStr) {
    targetDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  }
  const isoTime = targetDate.toISOString();

  let penaltyApplied = false;
  let delayMins = 0;

  // 2. Financial Update: Pax Metering
  try {
    const { error: paxError } = await supabase.from('pax_metering').insert({
      carrier_id: carrier.id,
      flight_no: options.flightNum || `${airlineCode}${Math.floor(100 + Math.random() * 900)}`,
      pax_count: paxCount,
      workstation_hours: (Math.random() * 3 + 1).toFixed(1),
      date_recorded: dateStr
    });
    if (paxError) throw paxError;
  } catch (e) {
    console.warn('[VII2-BRIDGE] Financial metering failed.');
  }

  // 3. Operational Update: Flight Movements with Realistic Delays
  try {
    const flightNumber = options.flightNum || `${airlineCode}${Math.floor(Math.random() * 900) + 100}`;
    
    // Simulate Realistic Delay (0 to 120 minutes)
    const rand = Math.random();
    if (rand < 0.6) delayMins = Math.floor(Math.random() * 15); // 60% On Time/Small Delay
    else if (rand < 0.85) delayMins = Math.floor(Math.random() * 30) + 15; // 25% Medium Delay
    else delayMins = Math.floor(Math.random() * 75) + 45; // 15% Significant Delay

    const ataTime = new Date(targetDate.getTime() + delayMins * 60000).toISOString();

    const { data: movement, error: movError } = await supabase.from('flight_movements').insert({
      carrier_id: carrier.id,
      flight_no: flightNumber,
      movement_type: Math.random() > 0.5 ? 'ARRIVAL' : 'DEPARTURE',
      sta: isoTime,
      ata: ataTime,
      status: 'CLOSED'
    }).select().single();

    if (movError) throw movError;

    // 4. Delay Penalty (Bucket-based realistic aviation penalties)
    if (delayMins > 30) {
      penaltyApplied = true;
      const penaltyAmount = delayMins > 60 ? 250.000 : 100.000;
      await supabase.from('penalty_ledger').insert({
        airline_id: carrier.id,
        amount_kd: penaltyAmount,
        description: `Operational Delay Penalty (${delayMins} min) - Flight ${flightNumber}`,
        annex_reference: 'ANNEX-DELTA-4.2',
      });
    }

    if (movement && options.gate) {
      // Find Infrastructure Node (e.g. T4-GATE-01)
      const { data: node } = await supabase.from('infrastructure_nodes').select('id').eq('node_id', options.gate).maybeSingle();
      
      if (node) {
        await supabase.from('resource_allocations').insert({
          flight_id: movement.id,
          infrastructure_id: node.id,
          start_time: isoTime,
          end_time: ataTime // Occupied until actual arrival/closure
        });
      }
    }
  } catch (e) {
    console.warn('[VII2-BRIDGE] Operational state update skipped.', e);
  }

  // 5. Consumables Usage (Triggered per flight transaction)
  try {
    const { data: inventory } = await supabase.from('inventory_items').select('id, type');
    if (inventory) {
      const btp = inventory.find(i => i.type === 'BTP');
      const btag = inventory.find(i => i.type === 'BTAG');

      if (btp) {
        await supabase.from('consumables_usage').insert({
          airline_id: carrier.id,
          item_id: btp.id,
          quantity: Math.ceil(paxCount * 1.05), // Boarding passes per pax
          usage_date: dateStr
        });
      }
      if (btag) {
        await supabase.from('consumables_usage').insert({
          airline_id: carrier.id,
          item_id: btag.id,
          quantity: Math.ceil(paxCount * 1.4), // Bag tags per pax
          usage_date: dateStr
        });
      }
    }
  } catch (e) {
    console.warn('[VII2-BRIDGE] Consumables logging failed.');
  }
  
  console.log(`[VII2-BRIDGE] Sync complete for ${airlineCode}. ${penaltyApplied ? 'Penalty Applied.' : 'No Penalties.'}`);
  return { success: true, delayMins, penaltyApplied };
};

export const checkDeemedAcceptance = async () => {
  const { error } = await supabase.rpc('process_deemed_acceptance');
  if (error) console.error('[AUDIT] Deemed acceptance failed:', error);
};
