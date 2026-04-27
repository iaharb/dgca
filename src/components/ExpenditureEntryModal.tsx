import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Calculator, FileText, 
  Users, HardDrive, Shield, DollarSign,
  RefreshCw, CheckCircle, Upload, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const USD_TO_KD = 0.308;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const CATEGORIES = [
  { id: 'Hardware CAPEX', icon: HardDrive, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'Resources', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'Fixed Costs', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'Bank Guarantee Facilities', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'Insurance Policies', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'Concession Fee Guarantee', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
];

const DOC_TYPES = [
  'Purchase Order', 
  'Delivery Order', 
  'Invoice', 
  'Timesheet', 
  'Contract Item',
  'Bank Guarantee Facilities',
  'Insurance Policies',
  'Concession Fee Guarantee'
];

export const ExpenditureEntryModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, editData }) => {
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

  useEffect(() => {
    if (editData) {
      setForm({
        item_name: editData.item_name || '',
        category: editData.category || 'Hardware CAPEX',
        document_type: editData.document_type || 'Purchase Order',
        amount_usd: editData.amount_usd?.toString() || '',
        amount_kd: editData.amount_kd?.toString() || '',
        date_incurred: editData.date_incurred || '',
        reference_no: editData.reference_no || '',
        man_days: editData.man_days?.toString() || '',
        description: editData.description || '',
      });
    } else {
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
    }
  }, [editData, isOpen]);

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
      const payload = {
        item_name: form.item_name,
        category: form.category,
        document_type: form.document_type,
        amount_usd: parseFloat(form.amount_usd),
        amount_kd: parseFloat(form.amount_kd),
        date_incurred: form.date_incurred,
        reference_no: form.reference_no,
        man_days: form.category === 'Resources' && form.man_days ? parseFloat(form.man_days) : null,
        description: form.description,
        status: editData ? editData.status : 'budgeted'
      };

      let result;
      if (editData) {
        result = await supabase.from('abms_expenditures').update(payload).eq('id', editData.id);
      } else {
        result = await supabase.from('abms_expenditures').insert([payload]);
      }

      if (result.error) throw result.error;
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{editData ? 'Update Transaction' : 'Record Burn Item'}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{editData ? 'Modifying existing audit record' : 'Audit-ready financial logging for ABMS'}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              {success ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h4 className="text-xl font-black text-slate-900">Success</h4>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} type="button" onClick={() => setForm(f => ({ ...f, category: cat.id }))} className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${form.category === cat.id ? `border-blue-500 ${cat.bg} ring-2 ring-blue-500/10` : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                        <cat.icon className={`w-5 h-5 mb-2 ${form.category === cat.id ? cat.color : 'text-slate-400'}`} />
                        <span className="text-[8px] font-black uppercase text-center">{cat.id}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Description</label><input required type="text" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Type</label><select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold appearance-none">{DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (USD)</label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required type="number" step="0.01" value={form.amount_usd} onChange={e => handleUsdChange(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (KD)</label><div className="relative"><Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" /><input required type="number" step="0.001" value={form.amount_kd} onChange={e => handleKdChange(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black text-blue-700" /></div></div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference No.</label><input type="text" value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label><input required type="date" value={form.date_incurred} onChange={e => setForm(f => ({ ...f, date_incurred: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                  </div>

                  <button disabled={loading} className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : editData ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editData ? 'Save Changes' : 'Commit to Ledger'}
                  </button>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
