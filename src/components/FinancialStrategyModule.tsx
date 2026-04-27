import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Receipt, 
  FileText, 
  AlertTriangle, 
  DollarSign,
  Calendar,
  ShieldCheck,
  Search,
  Upload,
  Folder,
  FolderPlus,
  Plus,
  ChevronRight,
  Info,
  Activity,
  ArrowUpRight,
  Users
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, addWeeks } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ExpenditureEntryModal } from './ExpenditureEntryModal';
import { 
  ANNUAL_EXPECTED_PAX, 
  ANNUAL_TRANSIT_PAX, 
  PROJECT_START_DATE, 
  GO_LIVE_WEEK,
  RISK_FACTOR_DEFAULT,
  SYSTEM_PENALTY_RATE 
} from '../utils/financials';

export const FinancialStrategyModule: React.FC = () => {
  const [riskFactor, setRiskFactor] = useState(RISK_FACTOR_DEFAULT);
  const [penaltyRate, setPenaltyRate] = useState(SYSTEM_PENALTY_RATE);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('root');

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('abms_expenditures')
      .select('*')
      .order('date_incurred', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const stats = useMemo(() => {
    const feePerPax = 2.00;
    // Math: 12M Regular @ $2.00 + 3M Transit @ $2.00 = 30M Gross
    const baseGrossAnnual = (ANNUAL_EXPECTED_PAX - ANNUAL_TRANSIT_PAX) * feePerPax + (ANNUAL_TRANSIT_PAX * feePerPax);
    
    // Risk Adjustment (25%) -> 30M * 0.75 = 22.5M
    const riskAdjustedGross = baseGrossAnnual * (1 - riskFactor);
    
    // Penalty Adjustment (10%) -> 22.5M * 0.9 = 20.25M
    const netAfterPenalty = riskAdjustedGross * (1 - penaltyRate);
    
    const panworldShare = netAfterPenalty * 0.35;
    const dgcaShare = netAfterPenalty * 0.65;

    return {
      baseGrossAnnual,
      riskAdjustedGross,
      netAfterPenalty,
      panworldShare,
      dgcaShare
    };
  }, [riskFactor, penaltyRate]);

  const totalProjectExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount_usd || 0), 0) || 5000000;
  }, [expenses]);

  const chartData = useMemo(() => {
    const data = [];
    let cumulativeExpenses = 0;
    const weeklyBurn = totalProjectExpenses / 50;

    for (let i = 1; i <= 104; i++) {
      const date = addWeeks(PROJECT_START_DATE, i - 1);
      
      // Expenses happen weeks 1-50
      const currentBurn = i <= 50 ? weeklyBurn : 20000;
      cumulativeExpenses += currentBurn;
      
      // Revenue starts week 50
      const monthlyRevenue = i > GO_LIVE_WEEK ? (stats.netAfterPenalty / 52) * 4 : 0;
      const monthlyBurn = currentBurn * 4;

      data.push({
        week: i,
        label: format(date, 'MMM yy'),
        monthlyBurn,
        monthlyRevenue,
        cumulativeExpenses,
        cumulativeRevenue: i > GO_LIVE_WEEK ? (i - GO_LIVE_WEEK) * (stats.netAfterPenalty / 52) : 0
      });
    }
    return data;
  }, [stats, totalProjectExpenses]);

  const breakevenWeek = useMemo(() => {
    const point = chartData.find(d => d.cumulativeRevenue >= d.cumulativeExpenses);
    return point ? point.week : null;
  }, [chartData]);

  const paxPieData = [
    { name: 'Direct Pax (12M)', value: ANNUAL_EXPECTED_PAX - ANNUAL_TRANSIT_PAX, color: '#3b82f6' },
    { name: 'Transit Pax (3M)', value: ANNUAL_TRANSIT_PAX, color: '#fbbf24' }
  ];

  const sharePieData = [
    { name: 'DGCA Share (65%)', value: stats.dgcaShare, color: '#059669' },
    { name: 'Panworld Share (35%)', value: stats.panworldShare, color: '#2563eb' }
  ];

  const docFolders = [
    { id: 'Purchase Order', name: 'Purchase Orders', icon: Folder },
    { id: 'Invoice', name: 'Invoices', icon: Folder },
    { id: 'Contract Item', name: 'Project Contracts', icon: Folder },
    { id: 'Delivery Order', name: 'Deliverables', icon: Folder },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Activity size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Breakeven Velocity</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">
            {breakevenWeek ? `Week ${breakevenWeek}` : 'Estimating...'}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-400">
             <Info size={14} /> <span>Relative to Go-Live Week 50</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><ShieldCheck size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DGCA Annual Net</p>
          </div>
          <h3 className="text-3xl font-black text-emerald-600 tracking-tight">${(stats.dgcaShare / 1000000).toFixed(2)}M</h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600/60">
             <ArrowUpRight size={14} /> <span>65% National Split</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><AlertTriangle size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Sensitivity</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{(riskFactor * 100).toFixed(0)}%</h3>
          <input 
            type="range" min="0" max="0.5" step="0.05" value={riskFactor} 
            onChange={(e) => setRiskFactor(parseFloat(e.target.value))}
            className="w-full mt-4 accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><Calendar size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Go-Live Anchor</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">May 2027</h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-400">
             <Plus size={14} /> <span>50 Week Build-out</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Intersection Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <TrendingUp size={240} />
          </div>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intersection Logic</h3>
              <p className="text-sm text-slate-500 font-medium">Monthly Burn vs. Projected Revenue (Post-Week 50)</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                  <div className="w-3 h-3 bg-red-500 rounded-full" /> Burn
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" /> Revenue
               </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" interval={8} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'white', border: 'none', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="monthlyBurn" stroke="#ef4444" strokeWidth={5} dot={false} animationDuration={2000} />
                <Line type="monotone" dataKey="monthlyRevenue" stroke="#059669" strokeWidth={5} dot={false} animationDuration={2000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Specialized Pie Charts */}
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <Users size={16} className="text-blue-600" /> Passenger Composition
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paxPieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                    {paxPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <DollarSign size={16} className="text-emerald-600" /> Revenue Split (65/35)
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sharePieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                    {sharePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Ledger */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
               <Receipt size={24} className="text-blue-600" />
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Burn Ledger</h3>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-950/10 flex items-center gap-2"
            >
              <Plus size={16} /> Log Entry
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5 text-left">Date Incurred</th>
                  <th className="px-8 py-5 text-left">Item Detail</th>
                  <th className="px-8 py-5 text-left">Category</th>
                  <th className="px-8 py-5 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 text-xs font-bold text-slate-500 whitespace-nowrap">
                      {format(new Date(exp.date_incurred), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-black text-slate-900">{exp.item_name}</div>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                             <FileText size={10} /> {exp.reference_no}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                         {exp.category}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right text-sm font-black text-slate-900">
                      ${Number(exp.amount_usd).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Directory-based Vault */}
        <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Vault</h3>
              <FolderPlus size={24} className="text-slate-400" />
           </div>
           <div className="space-y-4">
              {docFolders.map(folder => (
                <div 
                  key={folder.id} 
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex items-center gap-5 p-5 rounded-[24px] cursor-pointer transition-all border ${
                    selectedFolder === folder.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className={`p-3 rounded-2xl ${selectedFolder === folder.id ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                     <folder.icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className={`text-base font-black truncate ${selectedFolder === folder.id ? 'text-blue-900' : 'text-slate-700'}`}>{folder.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {expenses.filter(e => e.document_type === folder.id).length} Files Encrypted
                     </p>
                  </div>
                  <ChevronRight size={18} className={selectedFolder === folder.id ? 'text-blue-400' : 'text-slate-300'} />
                </div>
              ))}
           </div>
           
           {/* Files Preview Area */}
           <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
              <Search size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 Selected: {selectedFolder}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                 {expenses.filter(e => e.document_type === selectedFolder).slice(0, 3).map((e, i) => (
                   <div key={i} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                      <FileText size={16} />
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <ExpenditureEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchExpenses} 
      />
    </div>
  );
};

