import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Calculator, FileText, 
  Users, HardDrive, Truck, Shield, DollarSign,
  RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const USD_TO_KD = 0.308;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: 'Hardware CAPEX', icon: HardDrive, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'Resources', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'Fixed Costs', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'Bank Guarantee Facilities', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'Insurance Policies', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'Concession Fee Guarantee', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
];

const DOC_TYPES = ['Purchase Order', 'Delivery Order', 'Invoice', 'Timesheet', 'Contract Item'];

export const ExpenditureEntryModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    item_name: '',
    category: 'Hardware CAPEX',
    document_type: 'Purchase Order',
    amount_usd: '',
    amount_kd: '',
    date_incurred: new Date().toISOString().split('T')[0],
    reference_no: '',
    man_days: '',
    description: '',
  });

  const handleUsdChange = (val: string) => {
    const usd = parseFloat(val) || 0;
    setForm(prev => ({
      ...prev,
      amount_usd: val,
      amount_kd: (usd * USD_TO_KD).toFixed(3)
    }));
  };

  const handleKdChange = (val: string) => {
    const kd = parseFloat(val) || 0;
    setForm(prev => ({
      ...prev,
      amount_kd: val,
      amount_usd: (kd / USD_TO_KD).toFixed(2)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const amountUsd = parseFloat(form.amount_usd);
      const amountKd = parseFloat(form.amount_kd);

      if (isNaN(amountUsd) || isNaN(amountKd)) {
        throw new Error('Invalid amount values. Please enter valid numbers.');
      }

      const { error } = await supabase.from('abms_expenditures').insert([{
        item_name: form.item_name,
        category: form.category,
        document_type: form.document_type,
        amount_usd: amountUsd,
        amount_kd: amountKd,
        date_incurred: form.date_incurred,
        reference_no: form.reference_no,
        man_days: form.category === 'Resources' && form.man_days ? parseFloat(form.man_days) : null,
        description: form.description,
        status: 'budgeted'
      }]);

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setForm({
          item_name: '',
          category: 'Hardware CAPEX',
          document_type: 'Purchase Order',
          amount_usd: '',
          amount_kd: '',
          date_incurred: new Date().toISOString().split('T')[0],
          reference_no: '',
          man_days: '',
          description: '',
        });
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving expenditure: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose} 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-blue-600 rounded-lg">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">New Project Burn Entry</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">Log Expenditure</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Record POs, Deliveries, and Resource Utilization</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-2xl transition-all">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {success ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">Expenditure Logged</h4>
                  <p className="text-slate-500 font-medium">The financial model is being recalculated...</p>
                </div>
              ) : (
                <>
                  {/* Category Grid */}
                  <div className="grid grid-cols-5 gap-3">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                          form.category === cat.id 
                            ? `border-blue-500 ${cat.bg} shadow-sm ring-2 ring-blue-500/20` 
                            : 'border-slate-100 bg-white hover:border-slate-300'
                        }`}
                      >
                        <cat.icon className={`w-6 h-6 mb-2 ${form.category === cat.id ? cat.color : 'text-slate-400'}`} />
                        <span className={`text-[8px] font-black uppercase text-center leading-tight ${form.category === cat.id ? 'text-blue-700' : 'text-slate-500'}`}>
                          {cat.id.replace(' ', '\n')}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Description</label>
                      <input 
                        required
                        type="text" 
                        value={form.item_name}
                        onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                        placeholder="e.g., Sabhan Core Switch Cluster"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Type</label>
                      <select 
                        value={form.document_type}
                        onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all appearance-none"
                      >
                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (USD)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          value={form.amount_usd}
                          onChange={e => handleUsdChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Amount (KD Equivalent)</label>
                      <div className="relative">
                        <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input 
                          required
                          type="number" 
                          step="0.001"
                          value={form.amount_kd}
                          onChange={e => handleKdChange(e.target.value)}
                          placeholder="0.000"
                          className="w-full pl-10 pr-4 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-black text-blue-700 focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reference No.</label>
                      <input 
                        type="text" 
                        value={form.reference_no}
                        onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))}
                        placeholder="PO-2026-KWI-001"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      {form.category === 'Resources' ? (
                        <>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Man-Days Expended</label>
                          <input 
                            required
                            type="number" 
                            step="0.5"
                            value={form.man_days}
                            onChange={e => setForm(f => ({ ...f, man_days: e.target.value }))}
                            placeholder="0.0"
                            className="w-full px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </>
                      ) : (
                        <>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Incurred</label>
                          <input 
                            required
                            type="date" 
                            value={form.date_incurred}
                            onChange={e => setForm(f => ({ ...f, date_incurred: e.target.value }))}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 space-y-6">
                    {/* Document Upload Section */}
                    <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                       <input type="file" className="hidden" id="doc-upload" />
                       <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-all" />
                          <p className="text-sm font-black text-slate-900">Upload Scanned Document</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PDF, PNG or JPG (Max 10MB)</p>
                       </label>
                    </div>

                    <button 
                      disabled={loading}
                      className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      Commit Expenditure to Ledger
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                      This action will update the break-even projection for all stakeholders
                    </p>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
