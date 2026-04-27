import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Clock, 
  DollarSign, Activity, Calendar, Shield, 
  ArrowUpRight, Info, HardDrive, Network, Truck
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label 
} from 'recharts';

// Formatting utilities
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtKD = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// Types
interface Expenditure {
  id: string;
  category: string;
  item: string;
  amount: number;
  week: number;
}

interface Risk {
  id: string;
  code: string;
  title: string;
  impactWeeks: number;
  impactCost: number;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const IMPLEMENTATION_WEEKS = 24;
const REVENUE_START_WEEK = 16;
const AVG_MONTHLY_NET_PANWORLD = 125000; // Mock average monthly revenue for Panworld (35%)
const WEEKLY_REVENUE = AVG_MONTHLY_NET_PANWORLD / 4;

const INITIAL_EXPENDITURES: Expenditure[] = [
  { id: '1', category: 'Hardware CAPEX', item: 'Servers & Storage (Sabhan)', amount: 450000, week: 1 },
  { id: '2', category: 'Hardware CAPEX', item: 'Network Fabric (T4)', amount: 280000, week: 2 },
  { id: '3', category: 'Logistics', item: 'Warehouse Storage (10-week window)', amount: 45000, week: 1 },
  { id: '4', category: 'Resources', item: 'Network Engineering Phase 1', amount: 85000, week: 4 },
  { id: '5', category: 'Fixed Costs', item: 'ABMS Infinity Licenses', amount: 150000, week: 1 },
  { id: '6', category: 'Fixed Costs', item: 'DGCA Concession Fees', amount: 50000, week: 8 },
  { id: '7', category: 'Resources', item: 'Systems Configuration', amount: 65000, week: 12 },
];

const INITIAL_RISKS: Risk[] = [
  { id: 'r1', code: 'R-001', title: 'Hardware Delivery Delay', impactWeeks: 4, impactCost: 25000, active: false },
  { id: 'r2', code: 'R-002', title: 'VPN Readiness Delay', impactWeeks: 3, impactCost: 15000, active: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectFinancialsView: React.FC = () => {
  const [risks, setRisks] = useState<Risk[]>(INITIAL_RISKS);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const toggleRisk = (id: string) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  // Calculate Financial Projections
  const financialData = useMemo(() => {
    const data = [];
    let cumulativeBurn = 0;
    let cumulativeRevenue = 0;

    const activeRisks = risks.filter(r => r.active);
    const delayWeeks = activeRisks.reduce((sum, r) => sum + r.impactWeeks, 0);
    const costImpact = activeRisks.reduce((sum, r) => sum + r.impactCost, 0);
    
    const adjustedRevenueStart = REVENUE_START_WEEK + delayWeeks;
    const totalExpenditureBase = INITIAL_EXPENDITURES.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenditure = totalExpenditureBase + costImpact;

    // Project out for 104 weeks (2 years)
    for (let week = 1; week <= 104; week++) {
      // Add burn for specific weeks
      const weeklyBurn = INITIAL_EXPENDITURES
        .filter(e => e.week === week)
        .reduce((sum, e) => sum + e.amount, 0);
      
      cumulativeBurn += weeklyBurn;
      
      // If week 1, add risk cost impact
      if (week === 1) cumulativeBurn += costImpact;

      // Calculate revenue
      if (week >= adjustedRevenueStart) {
        cumulativeRevenue += WEEKLY_REVENUE;
      }

      data.push({
        week,
        burn: cumulativeBurn,
        revenue: cumulativeRevenue,
        net: cumulativeRevenue - cumulativeBurn,
        isLucrative: cumulativeRevenue > cumulativeBurn
      });
    }
    return data;
  }, [risks]);

  const lucrativeWeek = financialData.find(d => d.isLucrative)?.week;
  const currentWeek = 18; // Mock current project week
  const totalBurn = financialData[financialData.length - 1].burn;
  const currentAccrual = financialData[currentWeek - 1]?.revenue || 0;
  
  const statusColor = currentAccrual > totalBurn ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="space-y-6 bg-slate-950 p-8 min-h-screen text-slate-200 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-black text-blue-400 uppercase tracking-widest">
              KWI Airport Border Management
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Financial Command Center</h1>
          <p className="text-slate-400 font-medium mt-1">Project ROI & Revenue-Sharing Dashboard (35% Panworld Split)</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${currentAccrual > totalBurn ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={`text-lg font-black uppercase tracking-tight ${statusColor}`}>
                {currentAccrual > totalBurn ? 'Lucrative' : 'Recovery Phase'}
              </span>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Break-Even Projection</p>
            <p className="text-2xl font-black text-white tracking-tight">Week {lucrativeWeek || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Project Burn', val: totalBurn, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/5' },
          { label: '35% Accrued Revenue', val: currentAccrual, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Net Position (KD)', val: currentAccrual - totalBurn, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/5' },
          { label: 'Weeks to Lucrative', val: lucrativeWeek ? Math.max(0, lucrativeWeek - currentWeek) : '∞', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/5' },
        ].map((kpi, i) => (
          <motion.div key={i} whileHover={{ y: -4 }}
            className="bg-slate-900/50 border border-slate-800 p-6 rounded-[24px] relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity ${kpi.color}`}>
              <kpi.icon size={64} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {typeof kpi.val === 'number' ? fmtKD(kpi.val) : kpi.val}
            </p>
            <div className="mt-4 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${kpi.bg} ${kpi.color}`}>
                {i === 1 ? '+12.4% MoM' : i === 0 ? 'Front-loaded' : 'Live Data'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-[32px] p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-white">The Lucrative Curve</h3>
              <p className="text-sm text-slate-500 font-medium">Cumulative Burn vs. Revenue Accrual (104 Week Projection)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative Burn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Panworld 35%</span>
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBurn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="week" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickFormatter={(val) => `W${val}`}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                {/* 4-Month Zero Revenue Gap Overlay */}
                <ReferenceLine x={REVENUE_START_WEEK} stroke="#334155" strokeDasharray="5 5">
                  <Label value="Revenue Starts (W16)" position="top" fill="#64748b" fontSize={10} fontWeight="black" />
                </ReferenceLine>
                {lucrativeWeek && (
                  <ReferenceLine x={lucrativeWeek} stroke="#10b981" strokeWidth={2}>
                    <Label value="LUCRATIVE POINT" position="insideTopRight" fill="#10b981" fontSize={12} fontWeight="black" />
                  </ReferenceLine>
                )}
                <Area type="monotone" dataKey="burn" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBurn)" />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar: Risks & Expenditures */}
        <div className="space-y-6">
          {/* Risk Impact Register */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-white">Risk Impact Overlay</h3>
            </div>
            <div className="space-y-3">
              {risks.map(risk => (
                <div 
                  key={risk.id}
                  onClick={() => toggleRisk(risk.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    risk.active 
                      ? 'bg-amber-500/10 border-amber-500/50' 
                      : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{risk.code}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${risk.active ? 'bg-amber-500 border-amber-500' : 'border-slate-600'}`}>
                      {risk.active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <h4 className="font-bold text-white text-sm">{risk.title}</h4>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-black text-slate-400">+{risk.impactWeeks} Weeks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-black text-slate-400">+{fmtKD(risk.impactCost)} KD</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase text-center">
              Toggle risks to see break-even shift
            </p>
          </div>

          {/* Expenditure Breakdown Snippet */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-6">
            <h3 className="text-lg font-black text-white mb-6">Burn Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Hardware CAPEX', icon: HardDrive, val: 880000, p: 65, color: 'bg-blue-500' },
                { label: 'Fixed Costs/Licenses', icon: Shield, val: 250000, p: 18, color: 'bg-purple-500' },
                { label: 'Resources/Dev', icon: Network, val: 150000, p: 12, color: 'bg-indigo-500' },
                { label: 'Logistics/Other', icon: Truck, val: 45000, p: 5, color: 'bg-slate-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex items-center gap-2 text-slate-300">
                      <item.icon size={14} className="text-slate-500" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-white">{fmtKD(item.val)} KD</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.p}%` }}
                      className={`h-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logic Note / Legend */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex gap-4 items-start">
        <Info className="w-6 h-6 text-blue-400 shrink-0" />
        <div>
          <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1">Financial Logic Basis</h4>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Calculations follow the ABMS Revenue Share Model: <span className="text-slate-200">Net_Panworld = 0.35 × ((Pax × Fee) - Consumables - Penalties)</span>. 
            The project becomes "Lucrative" when cumulative Panworld share exceeds total front-loaded expenditures. 
            Implementation costs include geo-redundancy fabric at Sabhan and T4.
          </p>
        </div>
      </div>
    </div>
  );
};
