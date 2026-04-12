import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseKey);

const seedDemoData = async () => {
  console.log('[SEED] Finalizing synchronization...');

  const airlines = [
    { name: 'Kuwait Airways', iata_code: 'KU', status: 'active' },
    { name: 'Jazeera Airways', iata_code: 'J9', status: 'active' },
    { name: 'Qatar Airways', iata_code: 'QR', status: 'active' },
    { name: 'Middle East Airlines', iata_code: 'ME', status: 'pending_onboarding' },
  ];

  for (const airline of airlines) {
    const { data: existingAirline } = await supabase.from('airlines').select('id').eq('iata_code', airline.iata_code).maybeSingle();
    let airlineId = existingAirline?.id;

    if (!airlineId) {
      const { data: newAirline } = await supabase.from('airlines').insert(airline).select().single();
      airlineId = newAirline?.id;
    }

    if (airlineId) {
      // 1. Force Sync Agreement
      const { data: existingAgreement } = await supabase.from('agreements').select('id').eq('airline_id', airlineId).maybeSingle();
      let agreementId = existingAgreement?.id;
      
      if (!agreementId) {
        const { data: newAgreement, error: err } = await supabase.from('agreements').insert({
          airline_id: airlineId,
          version: '1.0',
          status: airline.status === 'active' ? 'active' : 'draft',
        }).select().single();
        
        if (err) console.error(`[SEED] Agreement write fail:`, err.message);
        else agreementId = newAgreement.id;
      }

      // 1.5 Sync SAT Milestones
      if (agreementId && airline.status === 'active') {
         // Check if milestone exists to avoid duplication
         const { data: existingMs } = await supabase.from('integration_milestones')
           .select('id')
           .eq('agreement_id', agreementId)
           .eq('milestone_type', 'certified')
           .maybeSingle();
           
         if (!existingMs) {
            await supabase.from('integration_milestones').insert({
                agreement_id: agreementId,
                milestone_type: 'certified',
                status: 'completed',  // UI looks for 'completed'
                completed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            });
         }
      }

      // Only seed usage metrics for active (certified) carriers
      if (airline.status !== 'active') {
        console.log(`[SEED] Skipping usage metrics for pending carrier ${airline.iata_code}`);
        continue;
      }

      // 2. Force Sync Usage with Resource Data (To fix AWAITING SAT)
      const pax = airline.iata_code === 'KU' ? 14200 : (airline.iata_code === 'J9' ? 9500 : 7500);
      const desks = airline.iata_code === 'KU' ? 12 : (airline.iata_code === 'J9' ? 8 : 4);

      // Loop for last 3 months
      for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthVar = d.toISOString().slice(0, 7) + '-01';
        
        const { data: existingUsage } = await supabase.from('usage_metrics')
          .select('id')
          .eq('airline_id', airlineId)
          .eq('billing_month', monthVar)
          .maybeSingle();

        const varPax = Math.floor(pax * (1 + (Math.random() * 0.2 - 0.1)));
        const payload = {
          airline_id: airlineId,
          billing_month: monthVar,
          pax_count: varPax,
          desk_count: desks,
          consumables_usage: {
            "Thermal Bag Tags": { usage: Math.floor(varPax * 0.7), limit: 20000, trend: i === 0 ? '+5%' : '+1%', category: 'Inventory' },
            "Boarding Passes": { usage: Math.floor(varPax * 0.4), limit: 15000, trend: i === 0 ? '-2%' : '0%', category: 'Inventory' },
            "Lounge Vouchers": { usage: airline.iata_code === 'KU' ? 850 : 320, limit: 1000, trend: '0%', category: 'VIP' }
          }
        };

        if (!existingUsage) {
            await supabase.from('usage_metrics').insert(payload);
        } else {
            await supabase.from('usage_metrics').update(payload).eq('id', existingUsage.id);
        }
      }
    }
  }
  
  console.log('[SEED] All nodes synchronized and resource telemetry active.');
};

seedDemoData();
