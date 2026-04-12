import { supabase } from '../lib/supabase';

export const simulateAODBFeed = async (airlineCode: string, paxCount: number) => {
  console.log(`[AODB SIM] Processing feed for ${airlineCode}: +${paxCount} pax`);

  // 1. Get airline ID safely
  const { data: airline, error: airlineError } = await supabase
    .from('airlines')
    .select('id')
    .eq('iata_code', airlineCode)
    .maybeSingle();

  if (airlineError || !airline) {
    console.warn(`[AODB SIM] Carrier ${airlineCode} not found in nodes. Skipping feed.`);
    return;
  }

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  // 2. Fetch existing for month
  const { data: existing } = await supabase
    .from('usage_metrics')
    .select('id, pax_count')
    .eq('airline_id', airline.id)
    .eq('billing_month', currentMonth)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('usage_metrics')
      .update({ pax_count: (existing.pax_count || 0) + paxCount })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('usage_metrics')
      .insert({
        airline_id: airline.id,
        billing_month: currentMonth,
        pax_count: paxCount,
        consumables_usage: {
          "Thermal Tags": { usage: Math.floor(paxCount * 0.4), limit: 20000, trend: '+1%', category: 'Ticketing' },
          "ATB Boarding Passes": { usage: Math.floor(paxCount * 0.2), limit: 10000, trend: '0%', category: 'Ticketing' }
        }
      });
  }
  
  console.log(`[AODB SIM] Sync complete for ${airlineCode}`);
};

export const checkDeemedAcceptance = async () => {
  // Mock logic for the audit trigger
  console.log('[AUDIT] Scanning for stagnant milestones...');
};
