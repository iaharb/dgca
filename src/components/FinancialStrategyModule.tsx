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
  Users,
  Plane,
  Download,
  Eye,
  PieChart as PieIcon,
  RefreshCw,
  Edit2,
  Trash2
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
  SYSTEM_PENALTY_RATE,
  TRANSIT_TYPES_DEFAULT
} from '../utils/financials';

export const FinancialStrategyModule: React.FC = () => {
  const [riskFactor, setRiskFactor] = useState(RISK_FACTOR_DEFAULT);
  const [penaltyRate, setPenaltyRate] = useState(SYSTEM_PENALTY_RATE);
  const [transitSplit, setTransitSplit] = useState(TRANSIT_TYPES_DEFAULT);
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedFolder, setSelectedFolder] = useState('Purchase Order');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('abms_expenditures')
        .select('*')
        .order('date_incurred', { ascending: false });
      
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This will impact ROI calculations.')) return;
    
    const { error } = await supabase.from('abms_expenditures').delete().eq('id', id);
    if (error) {
      alert(`Error deleting: ${error.message}`);
    } else {
      fetchExpenses();
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const stats = useMemo(() => {
    const feeReg = 2.00;
    const feeTransitPlane = 2.00;
    const feeTransitNoPlane = 1.00;
    const feeTransitNoEntry = 0.00;

    const regularPax = ANNUAL_EXPECTED_PAX - ANNUAL_TRANSIT_PAX;
    const tPlane = ANNUAL_TRANSIT_PAX * transitSplit.plane_to_plane;
    const tNoPlane = ANNUAL_TRANSIT_PAX * transitSplit.pax_no_plane;
    const tNoEntry = ANNUAL_TRANSIT_PAX * transitSplit.no_entry;

    const baseGrossAnnual = (regularPax * feeReg) + (tPlane * feeTransitPlane) + (tNoPlane * feeTransitNoPlane) + (tNoEntry * feeTransitNoEntry);
    const riskAdjustedGross = baseGrossAnnual * (1 - riskFactor);
    const netAfterPenalty = riskAdjustedGross * (1 - penaltyRate);
    
    const panworldShare = netAfterPenalty * 0.35;
    const dgcaShare = netAfterPenalty * 0.65;

    return {
      baseGrossAnnual,
      riskAdjustedGross,
      netAfterPenalty,
      panworldShare,
      dgcaShare,
      transitBreakdown: { tPlane, tNoPlane, tNoEntry }
    };
  }, [riskFactor, penaltyRate, transitSplit]);

  const totalProjectExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount_usd || 0), 0) || 5000000;
  }, [expenses]);

  const chartData = useMemo(() => {
    const data = [];
    let cumulativeExpenses = 0;
    const weeklyBurn = totalProjectExpenses / 50;

    for (let i = 1; i <= 104; i++) {
      const date = addWeeks(PROJECT_START_DATE, i - 1);
      const currentBurn = i <= 50 ? weeklyBurn : 20000;
      cumulativeExpenses += currentBurn;
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
    { name: 'Direct Pax', value: ANNUAL_EXPECTED_PAX - ANNUAL_TRANSIT_PAX, color: '#3b82f6' },
    { name: 'Plane Transit', value: stats.transitBreakdown.tPlane, color: '#fbbf24' },
    { name: 'No Plane Swap', value: stats.transitBreakdown.tNoPlane, color: '#f59e0b' },
    { name: 'No Entry', value: stats.transitBreakdown.tNoEntry, color: '#d97706' }
  ];

  const sharePieData = [
    { name: 'DGCA Net (65%)', value: stats.dgcaShare, color: '#059669' },
    { name: 'Panworld Net (35%)', value: stats.panworldShare, color: '#2563eb' }
  ];

  const docFolders = [
    { id: 'Purchase Order', name: 'Purchase Orders', icon: Folder, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Invoice', name: 'Invoices', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'Contract Item', name: 'Project Contracts', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'Bank Guarantee Facilities', name: 'Bank Guarantees', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'Insurance Policies', name: 'Insurance Files', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'Concession Fee Guarantee', name: 'Concession Docs', icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Activity size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Breakeven Target</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{breakevenWeek ? `W${breakevenWeek}` : 'W50+'}</h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-400">
             <Info size={14} /> <span>Calculated from live burn</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><ShieldCheck size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DGCA Annual Share</p>
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
          <input type="range" min="0" max="0.5" step="0.05" value={riskFactor} onChange={(e) => setRiskFactor(parseFloat(e.target.value))} className="w-full mt-4 accent-amber-500 cursor-pointer" />
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><Calendar size={20} /></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Build-out Weeks</p>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">50 Weeks</h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-400">
             <span>Implementation Phase</span>
          </div>
        </div>
      </div>

      {/* Transit Sliders Bar */}
      <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Plane size={18} className="text-blue-500" /> Transit Passenger Sensitivity (3M Annual Baseline)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                 <span>Plane-to-Plane ($2.00)</span>
                 <span className="text-blue-600">{(transitSplit.plane_to_plane * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={transitSplit.plane_to_plane} onChange={(e) => setTransitSplit(s => ({ ...s, plane_to_plane: parseFloat(e.target.value) }))} className="w-full accent-blue-600 cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                 <span>No Plane Swap ($1.00)</span>
                 <span className="text-orange-600">{(transitSplit.pax_no_plane * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={transitSplit.pax_no_plane} onChange={(e) => setTransitSplit(s => ({ ...s, pax_no_plane: parseFloat(e.target.value) }))} className="w-full accent-orange-600 cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                 <span>No Entry/Other ($0.00)</span>
                 <span className="text-slate-600">{(transitSplit.no_entry * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={transitSplit.no_entry} onChange={(e) => setTransitSplit(s => ({ ...s, no_entry: parseFloat(e.target.value) }))} className="w-full accent-slate-600 cursor-pointer" />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Intersection Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intersection Analysis</h3>
              <p className="text-sm text-slate-500 font-medium">Monthly Burn vs. Net Annual Revenue (Post-Week 50)</p>
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
                <Tooltip contentStyle={{ background: 'white', border: 'none', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="monthlyBurn" stroke="#ef4444" strokeWidth={5} dot={false} animationDuration={2000} />
                <Line type="monotone" dataKey="monthlyRevenue" stroke="#059669" strokeWidth={5} dot={false} animationDuration={2000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHARTS */}
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Users size={16} className="text-blue-600" /> Pax Revenue Sources
             </h3>
             <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paxPieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                      {paxPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <PieIcon size={16} className="text-emerald-600" /> Net Revenue Split (65/35)
             </h3>
             <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sharePieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                      {sharePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
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
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Project Burn Ledger</h3>
            </div>
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }} 
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-950/10 flex items-center gap-2"
            >
              <Plus size={16} /> Log Entry
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5 text-left">Date</th>
                  <th className="px-8 py-5 text-left">Item Detail</th>
                  <th className="px-8 py-5 text-left">Category</th>
                  <th className="px-8 py-5 text-right">Amount (USD)</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                   <tr><td colSpan={5} className="px-8 py-10 text-center"><RefreshCw size={24} className="animate-spin mx-auto text-slate-300" /></td></tr>
                ) : expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 text-xs font-bold text-slate-500 whitespace-nowrap">{format(new Date(exp.date_incurred), 'MMM dd, yyyy')}</td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-black text-slate-900">{exp.item_name}</div>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1"><FileText size={10} /> {exp.reference_no}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">{exp.category}</span>
                    </td>
                    <td className="px-8 py-6 text-right text-sm font-black text-slate-900">${Number(exp.amount_usd).toLocaleString()}</td>
                    <td className="px-8 py-6">
                       <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(exp)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                          >
                             <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vault */}
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Vault</h3>
              <FolderPlus size={24} className="text-slate-400" />
           </div>
           <div className="space-y-4 mb-8">
              {docFolders.map(folder => (
                <div key={folder.id} onClick={() => setSelectedFolder(folder.id)} className={`flex items-center gap-4 p-4 rounded-[24px] cursor-pointer transition-all border ${selectedFolder === folder.id ? `${folder.bg} border-${folder.color.split('-')[1]}-200` : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                  <div className={`p-3 rounded-2xl ${selectedFolder === folder.id ? `bg-white ${folder.color} shadow-sm` : 'bg-white text-slate-400 shadow-sm'}`}><folder.icon size={20} /></div>
                  <div className="flex-1 min-w-0">
                     <p className={`text-sm font-black truncate ${selectedFolder === folder.id ? 'text-slate-900' : 'text-slate-700'}`}>{folder.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{expenses.filter(e => e.document_type === folder.id).length} Files</p>
                  </div>
                  <ChevronRight size={16} className={selectedFolder === folder.id ? folder.color : 'text-slate-300'} />
                </div>
              ))}
           </div>
           <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 min-h-[250px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{selectedFolder} Items</p>
              <div className="space-y-3">
                 {expenses.filter(e => e.document_type === selectedFolder).map((exp, i) => (
                   <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><FileText size={14} /></div>
                         <div className="min-w-0"><p className="text-[10px] font-black text-slate-900 truncate">{exp.reference_no}</p><p className="text-[8px] font-bold text-slate-400 uppercase truncate">{exp.item_name}</p></div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEdit(exp)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Edit2 size={12} /></button>
                         <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Download size={12} /></button>
                      </div>
                   </div>
                 ))}
                 {expenses.filter(e => e.document_type === selectedFolder).length === 0 && <div className="py-10 text-center"><p className="text-xs font-bold text-slate-300">Empty directory</p></div>}
              </div>
           </div>
        </div>
      </div>

      <ExpenditureEntryModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        onSuccess={fetchExpenses} 
        editData={editingItem}
      />
    </div>
  );
};
