import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  XCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Rectangle } from 'recharts';

// Simulated Heatmap Data (Hour vs Gate)
const HOURS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
const GATES = ['G01', 'G02', 'G03', 'G04', 'G05'];

const HEATMAP_DATA = GATES.map(gate => ({
  gate,
  hours: HOURS.map(h => ({ hour: h, load: Math.floor(Math.random() * 100) }))
}));

const AI_SUGGESTIONS = [
  { id: 1, flight: 'ME402', carrier: 'MEA', current: 'G01', suggested: 'G04', reason: 'Passenger load > 90%', confidence: 0.98 },
  { id: 2, flight: 'QR132', carrier: 'QTR', current: 'G03', suggested: 'G05', reason: 'T3 Delay expected', confidence: 0.85 },
];

// Simulated Predictive Data
const FORECAST_DATA = [
  { day: 'Mon', historical: 12000, predicted: 14500, confidence: 92 },
  { day: 'Tue', historical: 11000, predicted: 13200, confidence: 88 },
  { day: 'Wed', historical: 15400, predicted: 16100, confidence: 95 },
  { day: 'Thu', historical: 13200, predicted: 15800, confidence: 91 },
  { day: 'Fri', historical: 18900, predicted: 21000, confidence: 85 },
  { day: 'Sat', historical: 19500, predicted: 22500, confidence: 82 },
  { day: 'Sun', historical: 16000, predicted: 17800, confidence: 94 },
];

const RESOURCE_ALLOCATIONS = [
  { resource: 'Gate T4-01', demand: 85, status: 'Optimal' },
  { resource: 'Gate T4-05', demand: 98, status: 'Overloaded' },
  { resource: 'Counter C-12', demand: 45, status: 'Underutilized' },
  { resource: 'Counter C-18', demand: 72, status: 'Optimal' },
  { resource: 'Staff Zone A', demand: 91, status: 'Critical' },
];

export const PredictiveAnalytics: React.FC<{ userType?: string }> = ({ userType }) => {
  const [engineStatus, setEngineStatus] = useState<'idle' | 'processing' | 'ready'>('ready');
  const [selectedCloud, setSelectedCloud] = useState<'gcp' | 'aws'>('gcp');
  const [isAutoAllocate, setIsAutoAllocate] = useState(false);
  const [approvals, setApprovals] = useState<number[]>([]);

  const handleApprove = (id: number) => {
    setApprovals(prev => [...prev, id]);
  };

  return (
    <div className="space-y-10">
      {/* Analytics Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Cloud Engine', value: selectedCloud === 'gcp' ? 'BigQuery ML' : 'SageMaker', sub: 'Vertex AI Enabled', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Forecast Confidence', value: '94.2%', sub: 'vs 88% last month', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Auto-Allocations', value: '142', sub: 'Pending Review', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Cost Efficiency', value: '+18%', sub: 'Resource Optimization', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
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
      <div className="bg-blue-600 rounded-[28px] p-6 text-white flex items-center justify-between shadow-xl shadow-blue-600/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black tracking-tight uppercase">Autonomous RMS Governance</h4>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Enable AI-driven real-time resource conflict resolution</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAutoAllocate(!isAutoAllocate)}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.1em] transition-all ${
            isAutoAllocate ? 'bg-white text-blue-600' : 'bg-blue-500 text-white border border-blue-400'
          }`}
        >
          {isAutoAllocate ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {isAutoAllocate ? 'Auto-Allocation Live' : 'Enable Auto-Pilot'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Forecasting Graph */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-blue-600" />
                Passenger Flow Forecast (7-Day)
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Machine Learning trained on 24 months of AODB historicals</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setSelectedCloud('gcp')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCloud === 'gcp' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
              >
                GCP Engine
              </button>
              <button 
                onClick={() => setSelectedCloud('aws')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCloud === 'aws' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`}
              >
                AWS Engine
              </button>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FORECAST_DATA}>
                <defs>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFace: 'Inter' }}
                  labelStyle={{ fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="historical" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="predicted" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorPredicted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 flex items-center gap-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-blue-600"></div>
               <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Predicted Load</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-300 border-2 border-dashed border-slate-400"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical (Avg)</span>
             </div>
             <div className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">
                Data Source: {selectedCloud === 'gcp' ? 'BigQuery_Warehouse' : 'Redshift_Cluster'}
             </div>
          </div>
        </div>

        {/* AI Allocation Suggestions & Heatmap */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-900/20 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight uppercase text-white">Capacity Heatmap</h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Predictive Gate Saturation</p>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="space-y-4 flex-1">
             <div className="flex items-center text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                <div className="w-10">Gate</div>
                <div className="flex-1 flex justify-around">
                   {HOURS.map(h => <span key={h}>{h}</span>)}
                </div>
             </div>
             {HEATMAP_DATA.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                   <span className="w-10 text-[10px] font-bold text-slate-400">{row.gate}</span>
                   <div className="flex-1 flex gap-1">
                      {row.hours.map((h, j) => (
                         <div 
                           key={j} 
                           className={`h-8 flex-1 rounded-md transition-all cursor-help ${
                             h.load > 85 ? 'bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                             h.load > 60 ? 'bg-orange-500/60' : 
                             h.load > 40 ? 'bg-blue-500/40' : 'bg-slate-800'
                           }`}
                           title={`${row.gate} @ ${h.hour}: ${h.load}% load`}
                         />
                      ))}
                   </div>
                </div>
             ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Approvals</h4>
            {AI_SUGGESTIONS.map(sug => (
              <div key={sug.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                       <span className="text-xs font-black">{sug.flight}</span>
                       <span className="text-[9px] text-slate-500 ml-2">Conf: {(sug.confidence * 100).toFixed(0)}%</span>
                    </div>
                    {approvals.includes(sug.id) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className="flex gap-2">
                         <button onClick={() => handleApprove(sug.id)} className="p-1 hover:text-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                         <button className="p-1 hover:text-red-500 transition-colors"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )}
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 mb-2">Suggestion: Re-assign {sug.current} → {sug.suggested}</p>
                 <div className="text-[9px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg inline-block font-bold italic">
                    Reason: {sug.reason}
                 </div>
              </div>
            ))}
          </div>

          <button 
            disabled={approvals.length === 0}
            className="w-full mt-8 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-30"
          >
            {approvals.length > 0 ? `Execute ${approvals.length} Actions` : 'Awaiting Review'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cloud Pipeline Status */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Cloud Pipeline Telemetry</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { label: 'Data Ingestion', status: 'Healthy', latency: '42ms', icon: Database },
             { label: 'Model Training', status: 'Active', latency: 'Scheduled', icon: BrainCircuit },
             { label: 'API Endpoint', status: 'Online', latency: '12ms', icon: Zap },
           ].map((node, i) => (
             <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                  <node.icon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{node.label}</p>
                   <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-sm font-black text-slate-900 tracking-tight">{node.status}</span>
                      <span className="text-[10px] font-bold text-slate-400 ml-2">[{node.latency}]</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
