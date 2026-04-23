import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  AlertCircle, 
  TrendingDown, 
  CheckCircle2, 
  Plane, 
  BarChart3, 
  Zap,
  Activity,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../lib/supabase';

interface EfficiencyStat {
  carrier_id: string;
  iata_code: string;
  name: string;
  avg_delay: number;
  on_time_rate: number;
  total_penalties: number;
  flight_count: number;
}

export const EfficiencyMetrics: React.FC<{ airlineCode?: string }> = ({ airlineCode }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EfficiencyStat[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<EfficiencyStat | null>(null);
  const [delayHistory, setDelayHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchEfficiencyData();
  }, [airlineCode]);

  const fetchEfficiencyData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Flight Movements
      let movementsQuery = supabase
        .from('flight_movements')
        .select('*, carriers(name, iata_code)')
        .order('ata', { ascending: false });
      
      if (airlineCode) {
        movementsQuery = movementsQuery.eq('carriers.iata_code', airlineCode);
      }

      const { data: movements } = await movementsQuery;

      // 2. Fetch Penalties
      const { data: penalties } = await supabase
        .from('penalty_ledger')
        .select('*');

      if (!movements) return;

      // Process Stats
      const carrierMap: Record<string, any> = {};
      
      movements.forEach(m => {
        const iata = m.carriers?.iata_code || 'UNK';
        if (!carrierMap[iata]) {
          carrierMap[iata] = {
            carrier_id: m.carrier_id,
            iata_code: iata,
            name: m.carriers?.name || 'Unknown',
            total_delay: 0,
            on_time_count: 0,
            flight_count: 0,
            penalties: 0
          };
        }

        const sta = new Date(m.sta);
        const ata = new Date(m.ata);
        const delay = Math.max(0, (ata.getTime() - sta.getTime()) / 60000);
        
        carrierMap[iata].total_delay += delay;
        carrierMap[iata].flight_count += 1;
        if (delay <= 15) carrierMap[iata].on_time_count += 1;
      });

      // Add penalties
      penalties?.forEach(p => {
        // Find carrier IATA from ID (simplified for this view)
        const carrier = Object.values(carrierMap).find((c: any) => c.carrier_id === p.airline_id);
        if (carrier) {
          carrier.penalties += Number(p.amount_kd || 0);
        }
      });

      const processedStats: EfficiencyStat[] = Object.values(carrierMap).map((c: any) => ({
        carrier_id: c.carrier_id,
        iata_code: c.iata_code,
        name: c.name,
        avg_delay: Math.round(c.total_delay / c.flight_count),
        on_time_rate: Math.round((c.on_time_count / c.flight_count) * 100),
        total_penalties: c.penalties,
        flight_count: c.flight_count
      })).sort((a, b) => b.avg_delay - a.avg_delay);

      setStats(processedStats);
      if (processedStats.length > 0) setSelectedCarrier(processedStats[0]);

      // Mock delay history for the chart
      const history = movements.slice(0, 20).reverse().map(m => {
        const sta = new Date(m.sta);
        const ata = new Date(m.ata);
        return {
          flight: m.flight_no,
          delay: Math.max(0, (ata.getTime() - sta.getTime()) / 60000)
        };
      });
      setDelayHistory(history);

    } catch (e) {
      console.error('Efficiency Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="text-[10px] font-black uppercase tracking-widest">Analyzing Flight Efficiency...</span>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-20 h-20 -rotate-12" />
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Fleet Delay</p>
          <h4 className="text-3xl font-black text-slate-900 mt-1">
            {Math.round(stats.reduce((a, b) => a + b.avg_delay, 0) / (stats.length || 1))}
            <span className="text-xs ml-1 text-slate-400 font-bold uppercase">mins</span>
          </h4>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-20 h-20 -rotate-12" />
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On-Time Performance</p>
          <h4 className="text-3xl font-black text-slate-900 mt-1">
             {Math.round(stats.reduce((a, b) => a + b.on_time_rate, 0) / (stats.length || 1))}%
          </h4>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-20 h-20 -rotate-12" />
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-4">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accumulated Penalties</p>
          <h4 className="text-3xl font-black text-slate-900 mt-1">
            {stats.reduce((a, b) => a + b.total_penalties, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })}
            <span className="text-xs ml-1 text-slate-400 font-bold uppercase">KD</span>
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Leaderboard */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Activity className="w-5 h-5 text-blue-600" />
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Carrier Efficiency</h3>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             {stats.map((s, i) => (
               <button 
                 key={s.iata_code}
                 onClick={() => setSelectedCarrier(s)}
                 className={`w-full p-6 flex items-center gap-4 transition-all border-b border-slate-50 text-left ${selectedCarrier?.iata_code === s.iata_code ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
               >
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${s.on_time_rate > 85 ? 'bg-emerald-100 text-emerald-700' : s.on_time_rate > 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                   {s.iata_code}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">OTP: {s.on_time_rate}%</span>
                       <span className="w-1 h-1 bg-slate-300 rounded-full" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase">{s.avg_delay}m Avg</span>
                    </div>
                 </div>
                 {s.total_penalties > 0 && (
                    <div className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black">
                       -{s.total_penalties.toFixed(0)} KD
                    </div>
                 )}
               </button>
             ))}
          </div>
        </div>

        {/* Detailed Chart */}
        <div className="lg:col-span-2 bg-slate-950 rounded-[32px] p-8 text-white shadow-xl flex flex-col min-h-[500px]">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight uppercase">Operational Latency Profile</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Real-time telemetry • {selectedCarrier?.name}</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={delayHistory}>
                    <defs>
                       <linearGradient id="colorDelay" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="flight" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                      unit="m"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 800, fontSize: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 900 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="delay" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorDelay)" 
                      name="Delay Minutes" 
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>

           <div className="mt-8 grid grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Max Delay</p>
                 <p className="text-lg font-black">{Math.max(...delayHistory.map(d => d.delay), 0)}m</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Flights</p>
                 <p className="text-lg font-black">{selectedCarrier?.flight_count || 0}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Penalty Hits</p>
                 <p className="text-lg font-black text-red-400">{Math.floor((selectedCarrier?.total_penalties || 0) / 100)}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Efficiency</p>
                 <p className="text-lg font-black text-emerald-400">{selectedCarrier?.on_time_rate}%</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
