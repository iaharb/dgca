import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseKey);

const updateConsumables = async () => {
  console.log('[UPDATE] Adjusting April thresholds and metrics...');

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  
  const { data: metrics } = await supabase.from('usage_metrics').select('*').eq('billing_month', currentMonth);

  if (metrics) {
      for (const m of metrics) {
          // Update the limits significantly, and lower current April usage to 5%
          const updatedConsumables = {
            "Thermal Bag Tags": { 
                usage: Math.floor((m.consumables_usage?.["Thermal Bag Tags"]?.usage || 5000) * 0.05), 
                limit: 45000, 
                trend: '-8%', 
                category: 'Inventory' 
            },
            "Boarding Passes": { 
                usage: Math.floor((m.consumables_usage?.["Boarding Passes"]?.usage || 3000) * 0.05), 
                limit: 35000, 
                trend: '-5%', 
                category: 'Inventory' 
            },
            "Lounge Vouchers": { 
                usage: Math.floor((m.consumables_usage?.["Lounge Vouchers"]?.usage || 500) * 0.05), 
                limit: 3000, 
                trend: '-2%', 
                category: 'VIP' 
            }
          };

          // Lower pax_count for April to reflect the beginning of the month
          const updatedPaxCount = Math.floor(m.pax_count * 0.05);

          await supabase.from('usage_metrics')
            .update({ 
                consumables_usage: updatedConsumables,
                pax_count: updatedPaxCount
            })
            .eq('id', m.id);
      }
  }

  console.log('[UPDATE] Monthly reset applied.');
};

updateConsumables();
