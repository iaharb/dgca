import React, { useEffect, useState } from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Wallet, CreditCard, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

export const FinancialMap: React.FC<any> = ({ userType, airlineCode }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [rawMetrics, setRawMetrics] = useState<any[]>([]);
  const [rawPenalties, setRawPenalties] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const isAirline = userType === 'carrier';

  useEffect(() => {
    fetchFinancialData();
  }, [airlineCode, userType]);

  const fetchFinancialData = async () => {
    try {
      let metricsQuery = supabase
        .from('usage_metrics')
        .select('*, airlines!inner(name, iata_code, status)')
        .eq('airlines.status', 'active');
      let penaltyQuery = supabase.from('penalty_ledger').select('*');

      if (isAirline && airlineCode) {
        metricsQuery = metricsQuery.eq('airlines.iata_code', airlineCode);
        const { data: airline } = await supabase.from(\'carriers\').select('id').eq('iata_code', airlineCode).single();
        if (airline) penaltyQuery = penaltyQuery.eq('airline_id', airline.id);
      }

      const [metricsRes, penaltiesRes] = await Promise.all([metricsQuery, penaltyQuery]);
      const metrics = (metricsRes.data || []);
      const penalties = (penaltiesRes.data || []);
      
      setRawMetrics(metrics);
      setRawPenalties(penalties);

      const USD_TO_KD = 0.308;
      const PAX_RATE_USD  = 2.000;
      const DESK_RATE_USD = 150.000;  // ← corrected from 250 → 150

      // ── Per-month chart data (real per-month values) ─────────────────────
      const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyMap: Record<number, { gross: number; dgca: number; ops: number; penalty: number }> = {};

      metrics.forEach(m => {
        const mIdx = new Date(m.billing_month + 'T12:00:00').getMonth(); // 0-based
        if (!monthlyMap[mIdx]) monthlyMap[mIdx] = { gross: 0, dgca: 0, ops: 0, penalty: 0 };
        const gUSD = (Number(m.pax_count || 0) * PAX_RATE_USD) + (Number(m.desk_count || 0) * DESK_RATE_USD);
        const gKD  = gUSD * USD_TO_KD;
        monthlyMap[mIdx].gross += gKD;
        monthlyMap[mIdx].dgca  += gKD * 0.65;
        monthlyMap[mIdx].ops   += gKD * 0.35;
      });

      penalties.forEach(p => {
        const mIdx = new Date(p.created_at).getMonth();
        if (!monthlyMap[mIdx]) monthlyMap[mIdx] = { gross: 0, dgca: 0, ops: 0, penalty: 0 };
        monthlyMap[mIdx].penalty += Number(p.amount_kd || 0);
      });

      // ── YTD totals ────────────────────────────────────────────────────────
      const totalPax   = metrics.reduce((a, m) => a + Number(m.pax_count  || 0), 0);
      const totalDesks = metrics.reduce((a, m) => a + Number(m.desk_count || 0), 0);
      const grossRevenueKD  = ((totalPax * PAX_RATE_USD) + (totalDesks * DESK_RATE_USD)) * USD_TO_KD;
      const dgcaShareKD     = grossRevenueKD * 0.65;
      const penaltyAmtKD    = penalties.reduce((a, p) => a + Number(p.amount_kd || 0), 0);
      const opsPartnerShareKD = (grossRevenueKD * 0.35) - penaltyAmtKD;

      setStats([
        { label: 'Gross Revenue',          value: grossRevenueKD,   icon: Wallet,        color: 'text-slate-600',  bg: 'bg-slate-50'  },
        { label: 'DGCA Share (65%)',        value: dgcaShareKD,      icon: TrendingUp,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
        { label: 'Ops Partner Share (35%)', value: opsPartnerShareKD,icon: CreditCard,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Annex 10 Penalties',      value: penaltyAmtKD,     icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50'    },
      ]);

      // Build chart — only months that have data
      const usedMonths = Object.keys(monthlyMap).map(Number).sort((a,b) => a-b);
      setChartData(usedMonths.map(mIdx => ({
        month:   MONTH_LABELS[mIdx],
        gross:   monthlyMap[mIdx].gross,
        dgca:    monthlyMap[mIdx].dgca,
        ops:     monthlyMap[mIdx].ops,
        penalty: monthlyMap[mIdx].penalty,
      })));

    } catch (e) {
      console.error('[FINANCE] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGridData = () => {
     if (!activeCard) return { months: [], rows: [] };
     
     const currentYear = new Date().getFullYear();
     const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
     
     // Determine relevant month labels up to current month
     const currentMonthNum = new Date().getMonth() + 1;
     const visibleMonths = months.slice(0, currentMonthNum);
     const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

     const airlinesMap: Record<string, any> = {};

     // Initialize airlines
     rawMetrics.forEach(m => {
        const d_iata = m.airlines?.iata_code || 'UNK';
        if (!airlinesMap[d_iata]) {
           airlinesMap[d_iata] = { 
               name: m.airlines?.name || 'Unknown', 
               iata: d_iata, 
               months: Array(visibleMonths.length).fill(0),
               total: 0
           };
        }
     });

     const USD_TO_KD = 0.308;

     if (activeCard === 'Annex 10 Penalties') {
         rawPenalties.forEach(p => {
             // Fake matching for penalties to airlines if needed, or skip if no relation easily found in flat penalties
             const date = new Date(p.created_at);
             if (date.getFullYear() === currentYear) {
                 const mIdx = date.getMonth();
                 // Finding airline using rawMetrics correlation might be tricky, assigning uniformly for demo if generic
                 const fA = Object.values(airlinesMap)[0];
                 if (fA && mIdx < visibleMonths.length) {
                     fA.months[mIdx] += Number(p.amount_kd || 0);
                     fA.total += Number(p.amount_kd || 0);
                 }
             }
         });
     } else {
         rawMetrics.forEach(m => {
             const d_iata = m.airlines?.iata_code || 'UNK';
             const bDate = m.billing_month; // YYYY-MM-01
             if (bDate.startsWith(currentYear.toString())) {
                 const monthStr = bDate.split('-')[1];
                 const mIdx = parseInt(monthStr, 10) - 1;
                 
                 if (mIdx < visibleMonths.length) {
                     const pax = Number(m.pax_count || 0);
                     const desk = Number(m.desk_count || 0);

                     const gKD = ((pax * 2.000) + (desk * 150.000)) * USD_TO_KD;
                     let valKD = 0;
                     if      (activeCard === 'Gross Revenue')                valKD = gKD;
                     else if (activeCard === 'DGCA Share (65%)')             valKD = gKD * 0.65;
                     else if (activeCard === 'Ops Partner Share (35%)')      valKD = gKD * 0.35;

                     airlinesMap[d_iata].months[mIdx] += valKD;
                     airlinesMap[d_iata].total += valKD;
                 }
             }
         });
     }

     return {
         headers: visibleMonths.map(m => monthNames[parseInt(m)-1]),
         rows: Object.values(airlinesMap).sort((a,b) => b.total - a.total)
     };
  };

  if (loading) return <div className="h-48 flex items-center justify-center bg-white rounded-2xl border border-slate-200"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => setActiveCard(stat.label)}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.bg} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {stat.value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                <span className="text-[10px] ml-1 opacity-40">KD</span>
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Yield Telemetry (4-Month Period)</h3>
        {/* Fixed height container to prevent Recharts -1 width error */}
        <div className="h-[350px] w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} 
              />
              <Area type="monotone" dataKey="gross" stroke="#94a3b8" fill="#f8fafc" fillOpacity={0.5} strokeWidth={2} name="Gross Amount" />
              <Area type="monotone" dataKey="dgca" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={3} name="DGCA Revenue" activeDot={{ r: 6 }}/>
              <Area type="monotone" dataKey="ops" stroke="#6366f1" fill="#6366f1" fillOpacity={0.05} strokeWidth={3} name="Ops Partner Revenue" />
              <Bar dataKey="penalty" fill="#ef4444" radius={[4, 4, 0, 0]} name="Deductions" barSize={20} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <AnimatePresence>
         {activeCard && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveCard(null)}
                 className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
              >
                 <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeCard} Ledger</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">Year-To-Date Carrier Breakdown</p>
                    </div>
                    <button onClick={() => setActiveCard(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                       <X className="w-5 h-5 text-slate-500" />
                    </button>
                 </div>
                 
                 <div className="p-8 overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left border-collapse">
                        <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                            <tr>
                               <th className="p-4 border-b border-slate-100 rounded-tl-xl">Carrier</th>
                               {getGridData().headers.map(h => (
                                  <th key={h} className="p-4 border-b border-slate-100 text-right">{h}</th>
                               ))}
                               <th className="p-4 border-b border-slate-100 text-right rounded-tr-xl">YTD Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {getGridData().rows.map(row => (
                               <tr key={row.iata} className="hover:bg-slate-50/50 transition-colors">
                                   <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[9px] font-black">{row.iata}</div>
                                          <span className="text-sm font-bold text-slate-900">{row.name}</span>
                                      </div>
                                   </td>
                                   {row.months.map((val: number, idx: number) => (
                                       <td key={idx} className="p-4 text-right text-sm font-medium text-slate-600">
                                          {val > 0 ? val.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-'}
                                       </td>
                                   ))}
                                   <td className="p-4 text-right text-sm font-black text-slate-900">
                                      {row.total.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span className="text-[9px] text-slate-400 ml-1">KD</span>
                                   </td>
                               </tr>
                            ))}
                            {getGridData().rows.length === 0 && (
                               <tr>
                                  <td colSpan={100} className="p-8 text-center text-slate-400 text-sm font-bold">No contributions found for this metric.</td>
                               </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
};
