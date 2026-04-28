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
  Trash2,
  X,
  AlertCircle
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

// Custom Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, loading: boolean }> = ({ isOpen, onClose, onConfirm, loading }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center">
           <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertCircle size={32} /></div>
           <h3 className="text-xl font-black text-slate-900 mb-2">Delete Transaction?</h3>
           <p className="text-sm font-medium text-slate-500 mb-8">This action is permanent and will recalibrate all ROI and breakeven projections.</p>
           <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
              <button onClick={onConfirm} disabled={loading} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20">{loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm'}</button>
           </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const FinancialStrategyModule: React.FC = () => {
  const [riskFactor, setRiskFactor] = useState(RISK_FACTOR_DEFAULT);
  const [penaltyRate, setPenaltyRate] = useState(SYSTEM_PENALTY_RATE);
  const [transitSplit, setTransitSplit] = useState(TRANSIT_TYPES_DEFAULT);
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('Purchase Order');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('abms_expenditures').select('*').order('date_incurred', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('abms_expenditures').delete().eq('id', deletingId);
      if (error) throw error;
      await fetchExpenses();
      setDeleteModalOpen(false);
    } catch (err: any) { alert(err.message); } finally { setIsDeleting(false); setDeletingId(null); }
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
    return { baseGrossAnnual, netAfterPenalty, panworldShare, dgcaShare, transitBreakdown: { tPlane, tNoPlane, tNoEntry } };
  }, [riskFactor, penaltyRate, transitSplit]);

  const totalProjectExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount_usd || 0), 0) || 5000000, [expenses]);

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
      data.push({ week: i, label: format(date, 'MMM yy'), monthlyBurn, monthlyRevenue, cumulativeExpenses, cumulativeRevenue: i > GO_LIVE_WEEK ? (i - GO_LIVE_WEEK) * (stats.netAfterPenalty / 52) : 0 });
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
      {/* Top Controls Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Risk & Penalties */}
        <div className="xl:col-span-1 bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Operational Sensitivity
           </h3>
           <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-900 uppercase mb-2">
                   <span>Risk Factor</span>
                   <span className="text-amber-600">{(riskFactor * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="0.5" step="0.05" value={riskFactor} onChange={(e) => setRiskFactor(parseFloat(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-900 uppercase mb-2">
                   <span>System Penalties</span>
                   <span className="text-red-600">{(penaltyRate * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="0.3" step="0.05" value={penaltyRate} onChange={(e) => setPenaltyRate(parseFloat(e.target.value))} className="w-full accent-red-500 cursor-pointer" />
              </div>
           </div>
        </div>

        {/* Transit Sliders */}
        <div className="xl:col-span-2 bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Plane size={16} className="text-blue-500" /> Transit Breakdown (3M PAX Annual)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-900 uppercase mb-2">
                   <span>Plane-to-Plane</span>
                   <span className="text-blue-600">{(transitSplit.plane_to_plane * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={transitSplit.plane_to_plane} onChange={(e) => setTransitSplit(s => ({ ...s, plane_to_plane: parseFloat(e.target.value) }))} className="w-full accent-blue-600 cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-900 uppercase mb-2">
                   <span>No Plane Swap</span>
                   <span className="text-orange-600">{(transitSplit.pax_no_plane * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={transitSplit.pax_no_plane} onChange={(e) => setTransitSplit(s => ({ ...s, pax_no_plane: parseFloat(e.target.value) }))} className="w-full accent-orange-600 cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-900 uppercase mb-2">
                   <span>No Entry/Other</span>
                   <span className="text-slate-600">{(transitSplit.no_entry * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={transitSplit.no_entry} onChange={(e) => setTransitSplit(s => ({ ...s, no_entry: parseFloat(e.target.value) }))} className="w-full accent-slate-600 cursor-pointer" />
              </div>
           </div>
        </div>

        {/* Status Card */}
        <div className="xl:col-span-1 bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
           <div className="absolute right-0 top-0 p-4 opacity-10"><Activity size={120} /></div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">DGCA Annual Net</p>
           <h3 className="text-4xl font-black mb-4">${(stats.dgcaShare / 1000000).toFixed(2)}M</h3>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/10 px-3 py-2 rounded-xl border border-white/10 w-fit">
              <TrendingUp size={14} className="text-emerald-400" /> Breakeven: {breakevenWeek ? `Week ${breakevenWeek}` : 'W50+'}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Intersection Strategy</h3>
              <p className="text-sm text-slate-500 font-medium">Project Burn vs. Operational Revenue</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full" /> Burn</div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Revenue</div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" interval={8} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickFormatter={(v) => `$${(v/1000000).toFixed(2)}M`} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, '']}
                  contentStyle={{ background: 'white', border: 'none', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                />
                <Line type="monotone" dataKey="monthlyBurn" name="Burn" stroke="#ef4444" strokeWidth={5} dot={false} />
                <Line type="monotone" dataKey="monthlyRevenue" name="Revenue" stroke="#059669" strokeWidth={5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Pax Composition</h3>
             <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paxPieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                      {paxPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Passengers']} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Revenue Split (65/35)</h3>
             <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sharePieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                      {sharePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, '']} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-xl font-black text-slate-900">Burn Ledger</h3>
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Log Entry
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5 text-left">Date</th>
                  <th className="px-8 py-5 text-left">Detail</th>
                  <th className="px-8 py-5 text-left">Category</th>
                  <th className="px-8 py-5 text-right">Amount (USD)</th>
                  <th className="px-8 py-5 text-right">Amount (KD)</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6 text-xs font-bold text-slate-500">{format(new Date(exp.date_incurred), 'MMM dd, yyyy')}</td>
                    <td className="px-8 py-6"><div className="text-sm font-black text-slate-900">{exp.item_name}</div><div className="text-[10px] text-blue-600 font-bold mt-1">{exp.reference_no}</div></td>
                    <td className="px-8 py-6"><span className="px-3 py-1 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase">{exp.category}</span></td>
                    <td className="px-8 py-6 text-right text-sm font-black text-slate-900">${Number(exp.amount_usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="px-8 py-6 text-right text-sm font-black text-blue-700">KD {Number(exp.amount_kd).toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})}</td>
                    <td className="px-8 py-6"><div className="flex items-center justify-center gap-2"><button onClick={() => { setEditingItem(exp); setIsModalOpen(true); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={14} /></button><button onClick={() => { setDeletingId(exp.id); setDeleteModalOpen(true); }} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-700 hover:text-white transition-all shadow-sm"><Trash2 size={14} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
           <h3 className="text-xl font-black text-slate-900 mb-8">Vault</h3>
           <div className="space-y-4 mb-8">
              {docFolders.map(folder => (
                <div key={folder.id} onClick={() => setSelectedFolder(folder.id)} className={`flex items-center gap-4 p-4 rounded-[24px] cursor-pointer transition-all border ${selectedFolder === folder.id ? `${folder.bg} border-${folder.color.split('-')[1]}-200 shadow-sm` : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                  <div className={`p-3 rounded-2xl ${selectedFolder === folder.id ? `bg-white ${folder.color} shadow-sm` : 'bg-white text-slate-400 shadow-sm'}`}><folder.icon size={20} /></div>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-black truncate ${selectedFolder === folder.id ? 'text-slate-900' : 'text-slate-700'}`}>{folder.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{expenses.filter(e => e.document_type === folder.id).length} Files</p></div>
                  <ChevronRight size={16} className={selectedFolder === folder.id ? folder.color : 'text-slate-300'} />
                </div>
              ))}
           </div>
           <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 min-h-[250px]">
              <div className="space-y-3">
                 {expenses.filter(e => e.document_type === selectedFolder).map((exp, i) => (
                   <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><FileText size={14} /></div><div className="min-w-0"><p className="text-[10px] font-black text-slate-900 truncate">{exp.reference_no}</p><p className="text-[8px] font-bold text-slate-400 uppercase truncate">{exp.item_name}</p></div></div>
                      <div className="flex items-center gap-1"><button onClick={() => { setEditingItem(exp); setIsModalOpen(true); }} className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><Edit2 size={12} /></button><button className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-lg transition-all"><Download size={12} /></button></div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <ExpenditureEntryModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} onSuccess={fetchExpenses} editData={editingItem} />
      <DeleteConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDelete} loading={isDeleting} />
    </div>
  );
};
