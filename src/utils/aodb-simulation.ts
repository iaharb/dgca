import { supabase } from '../lib/supabase';

export const simulateAODBFeed = async (
  airlineCode: string, 
  paxCount: number, 
  options: { terminal?: string; gate?: string; flightNum?: string } = {}
) => {
  console.log(`[AODB SIM] Processing granular feed for ${airlineCode}: ${paxCount} pax`);

  // 1. Get airline ID safely
  const { data: airline } = await supabase
    .from('airlines')
    .select('id')
    .eq('iata_code', airlineCode)
    .maybeSingle();

  if (!airline) return;

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  // 2. Financial Update (Billing Engine)
  const { data: existing } = await supabase
    .from('usage_metrics')
    .select('id, pax_count')
    .eq('airline_id', airline.id)
    .eq('billing_month', currentMonth)
    .maybeSingle();

  if (existing) {
    await supabase.from('usage_metrics').update({ pax_count: (existing.pax_count || 0) + paxCount }).eq('id', existing.id);
  } else {
    await supabase.from('usage_metrics').insert({
      airline_id: airline.id,
      billing_month: currentMonth,
      pax_count: paxCount,
      consumables_usage: {
        "Thermal Tags": { usage: Math.floor(paxCount * 0.4), limit: 20000, trend: '+0.5%', category: 'Ticketing' },
        "ATB Boarding Passes": { usage: Math.floor(paxCount * 0.2), limit: 10000, trend: '0%', category: 'Ticketing' }
      }
    });
  }

  // 3. Operational Update (RMS Engine - New Schema)
  try {
    const flightNumber = options.flightNum || `${airlineCode}${Math.floor(Math.random() * 900) + 100}`;
    
    // Create/Find Scheduled Flight
    const { data: flight } = await supabase.from('scheduled_flights').insert({
      airline_id: airline.id,
      flight_number: flightNumber,
      aircraft_type: Math.random() > 0.5 ? 'B777-300' : 'A320neo',
      scheduled_time: new Date().toISOString(),
      actual_time: new Date().toISOString(),
    }).select().single();

    if (flight && options.gate) {
      // Find Resource ID (assuming identifier is passed)
      const { data: resource } = await supabase.from('resources').select('id').eq('identifier', options.gate).maybeSingle();
      
      if (resource) {
        await supabase.from('resource_allocations').insert({
          flight_id: flight.id,
          resource_id: resource.id,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 7200000).toISOString(), // 2hr block
          is_ai_suggested: false
        });
      }
    }
  } catch (e) {
    console.warn('[AODB SIM] Operational tables not found or error occurred. Financials updated only.', e);
  }
  
  console.log(`[AODB SIM] Sync complete for ${airlineCode}`);
};

export const checkDeemedAcceptance = async () => {
  console.log('[AUDIT] Scanning for stagnant milestones...');
  const { data, error } = await supabase.rpc('process_deemed_acceptance');
  if (error) console.error('[AUDIT] Failed:', error);
};
