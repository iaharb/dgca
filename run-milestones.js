import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseKey);

const backfillMilestones = async () => {
  console.log('[SEED] Backfilling historical integration milestones...');

  const { data: milestones } = await supabase.from('integration_milestones').select('agreement_id');
  const agreementsWithCertified = Array.from(new Set(milestones?.map(m => m.agreement_id)));

  if (agreementsWithCertified.length > 0) {
     const previousStages = ['agreement_sent', 'hardware_verified', 'network_ready', 'sat_sign_off'];
     
     for (const aid of agreementsWithCertified) {
        for (let i = 0; i < previousStages.length; i++) {
           const type = previousStages[i];
           // Backdate them sequentially so they lead up to the 30-day "certified" mark
           const completedAt = new Date(Date.now() - (60 - (i * 7)) * 24 * 60 * 60 * 1000).toISOString();
           
           const { data: existing } = await supabase.from('integration_milestones')
              .select('id')
              .eq('agreement_id', aid)
              .eq('milestone_type', type)
              .maybeSingle();

           if (!existing) {
              await supabase.from('integration_milestones').insert({
                 agreement_id: aid,
                 milestone_type: type,
                 status: 'completed',
                 completed_at: completedAt
              });
           }
        }
     }
  }

  console.log('[SEED] Backfill complete.');
};

backfillMilestones();
