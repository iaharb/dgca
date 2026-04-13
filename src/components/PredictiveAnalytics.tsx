import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  TrendingUp, 
  Clock, 
  Cpu, 
  Database, 
  Zap, 
  LayoutGrid, 
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Rectangle } from 'recharts';
import { supabase } from '../lib/supabase';

// Helper to get day name for the chart labels
const getDayLabel = (offset: number) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date();
  d.setDate(d.getDate() - (6 - offset));
  return days[d.getDay()];
};

export const PredictiveAnalytics: React.FC<{ userType?: string }> = ({ userType }) => {
  const [selectedCloud, setSelectedCloud] = useState<'gcp' | 'aws'>('gcp');
  const [isAutoAllocate, setIsAutoAllocate] = useState(false);
  const [approvals, setApprovals] = useState<number[]>([]);
  const [isSwapping, setIsSwapping] = useState(false);
  const [historicalPax, setHistoricalPax] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch real AODB simulated data from usage_metrics
  useEffect(() => {
    fetchAODBData();
    
    // Subscribe to changes so the graph updates in real-time when the simulator runs
    const subscription = supabase
      .channel('realtime_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_metrics' }, () => {
        fetchAODBData();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  const fetchAODBData = async () => {
    try {
      // Fetch data for the last 7 days of simulated traffic (simulated via usage_metrics sum)
      const { data } = await supabase
        .from('usage_metrics')
        .select('pax_count, billing_month')
        .order('billing_month', { ascending: false })
        .limit(7);

      if (data) {
        // Map available data points, fallback to random if history is short
        const counts = data.map(d => d.pax_count).reverse();
        setHistoricalPax(counts.length >= 7 ? counts : [...Array(7)].map((_, i) => counts[i % counts.length] || 12000 + (Math.random() * 2000)));
      }
    } catch (e) {
      console.error('Failed to fetch AODB analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Reactive Data Synthesis
  const forecastData = useMemo(() => {
    const engineMult = selectedCloud === 'gcp' ? 1.2 : 1.15;
    return historicalPax.map((val, i) => ({
      day: getDayLabel(i),
      historical: val,
      predicted: Math.floor(val * (engineMult + (Math.random() * 0.1 - 0.05))),
      confidence: 85 + Math.floor(Math.random() * 10)
    }));
  }, [historicalPax, selectedCloud]);

  const heatmapData = useMemo(() => {
    const baseLoad = historicalPax[historicalPax.length - 1] / 300; // Normalize
    return ['G01', 'G02', 'G03', 'G04', 'G05'].map(gate => ({
      gate,
      hours: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map(h => ({ 
        hour: h, 
        load: Math.min(100, Math.floor(baseLoad * (0.8 + Math.random() * 0.4) * 100)) 
      }))
    }));
  }, [historicalPax]);

  const handleCloudSwitch = (cloud: 'gcp' | 'aws') => {
    setIsSwapping(true);
    setTimeout(() => {
      setSelectedCloud(cloud);
      setIsSwapping(false);
    }, 600);
  };

  const themeColor = selectedCloud === 'gcp' ? '#2563eb' : '#f97316';

  if (isLoading) return (
    <div className="h-[500px] flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <span className="text-xs font-black uppercase tracking-widest">Inference Engine Booting...</span>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Analytics Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Cloud Engine', 
            value: selectedCloud === 'gcp' ? 'BigQuery ML' : 'SageMaker', 
            sub: selectedCloud === 'gcp' ? 'Connected to AODB' : 'AWS Redshift Sync', 
            icon: Database, 
            color: selectedCloud === 'gcp' ? 'text-blue-600' : 'text-orange-600', 
            bg: selectedCloud === 'gcp' ? 'bg-blue-50' : 'bg-orange-50' 
          },
          { label: 'Forecast Confidence', value: selectedCloud === 'gcp' ? '94.2%' : '91.8%', sub: 'Real-time Telemetry', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Auto-Allocations', value: '142', sub: 'Pending Review', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Simulated Load', value: historicalPax[historicalPax.length - 1]?.toLocaleString(), sub: 'Current Pax Count', icon: RefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i + selectedCloud}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4 transition-colors`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
            <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
               <ArrowUpRight className="w-3 h-3 text-emerald-500" /> {stat.sub}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Auto-Allocation Governance Toggle */}
      <div className={`${selectedCloud === 'gcp' ? 'bg-blue-600' : 'bg-orange-600'} rounded-[28px] p-6 text-white flex items-center justify-between shadow-xl transition-colors duration-500`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black tracking-tight uppercase">Autonomous RMS Governance</h4>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Driven by real-time AODB simulated feeds</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAutoAllocate(!isAutoAllocate)}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.1em] transition-all ${
            isAutoAllocate ? 'bg-white text-slate-900' : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          {isAutoAllocate ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {isAutoAllocate ? 'Auto-Allocation Live' : 'Enable Auto-Pilot'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Forecasting Graph */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm relative overflow-hidden">
          <AnimatePresence>
            {isSwapping && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center"
              >
                <Loader2 className={`w-8 h-8 animate-spin ${selectedCloud === 'gcp' ? 'text-orange-500' : 'text-blue-500'}`} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 text-slate-900">Syncing AODB historicals...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <BrainCircuit className={`w-6 h-6 ${selectedCloud === 'gcp' ? 'text-blue-600' : 'text-orange-600'}`} />
                Real-Time Flow Forecast
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1 font-mono">
                Source: select sum(pax_count) from usage_metrics
              </p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => handleCloudSwitch('gcp')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCloud === 'gcp' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
              >
                GCP Engine
              </button>
              <button 
                onClick={() => handleCloudSwitch('aws')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCloud === 'aws' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`}
              >
                AWS Engine
              </button>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColor} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="historical" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" name="Historical Load" />
                <Area type="monotone" dataKey="predicted" stroke={themeColor} strokeWidth={3} fillOpacity={1} fill="url(#colorPredicted)" name="AI Prediction" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className={`mt-6 flex items-center gap-6 p-4 rounded-2xl border transition-colors ${selectedCloud === 'gcp' ? 'bg-blue-50/50 border-blue-100/50' : 'bg-orange-50/50 border-orange-100/50'}`}>
             <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${selectedCloud === 'gcp' ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
               <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">AI Forecast</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-300 border-2 border-dashed border-slate-400"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical (Simulated)</span>
             </div>
             <div className={`ml-auto text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${selectedCloud === 'gcp' ? 'text-blue-600 bg-blue-100' : 'text-orange-600 bg-orange-100'}`}>
                Active Sync: Supabase Realtime
             </div>
          </div>
        </div>

        {/* AI Allocation Suggestions & Heatmap */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-900/20 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${selectedCloud === 'gcp' ? 'bg-blue-500/20 border-blue-500/30' : 'bg-orange-500/20 border-orange-500/30'}`}>
              <Sparkles className={`w-5 h-5 ${selectedCloud === 'gcp' ? 'text-blue-400' : 'text-orange-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight uppercase text-white">Capacity Heatmap</h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Driven by AODB metrics</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
             <div className="flex items-center text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                <div className="w-10">Gate</div>
                <div className="flex-1 flex justify-around">
                   {['00:00', '08:00', '16:00', '23:00'].map(h => <span key={h}>{h}</span>)}
                </div>
             </div>
             {heatmapData.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                   <span className="w-10 text-[10px] font-bold text-slate-400">{row.gate}</span>
                   <div className="flex-1 flex gap-1">
                      {row.hours.map((h, j) => (
                         <div 
                           key={j} 
                           className={`h-8 flex-1 rounded-md transition-all cursor-help ${
                             h.load > 85 ? 'bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                             h.load > 60 ? 'bg-orange-500/60' : 
                             h.load > 40 ? (selectedCloud === 'gcp' ? 'bg-blue-500/40' : 'bg-orange-500/40') : 'bg-slate-800'
                           }`}
                           title={`${row.gate} @ ${h.hour}: ${h.load}% load`}
                         />
                      ))}
                   </div>
                </div>
             ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4 text-center">
             <p className="text-[10px] font-bold text-slate-500">
               *These predictions will dynamically shift if you run the <strong>Simulator</strong> while this tab is open.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
