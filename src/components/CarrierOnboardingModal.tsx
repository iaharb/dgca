import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, Save, Info, AlertCircle } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (carrier: any) => void;
}

export const CarrierOnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    iata_code: '',
    status: 'active',
    pax_rate: '0.500',
    workstation_rate: '150.000'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSuccess(formData);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black font-display tracking-tight text-slate-900">Onboard New Carrier</h2>
                  <p className="text-xs text-slate-400 font-medium tracking-tight">System Protocol DGCA-VII2 Annex 10 Initiation.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Airline Identity</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Qatar Airways"
                    className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-sm font-semibold focus:bg-white ring-2 ring-transparent focus:ring-brand-500/20 transition-all outline-none border border-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">IATA Code</label>
                  <input
                    required
                    maxLength={2}
                    value={formData.iata_code}
                    onChange={e => setFormData({...formData, iata_code: e.target.value.toUpperCase()})}
                    placeholder="e.g. QR"
                    className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-sm font-semibold focus:bg-white ring-2 ring-transparent focus:ring-brand-500/20 transition-all outline-none border border-slate-100"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" />
                  Default Billing Parameters
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <p className="text-[10px] font-bold text-slate-400">Pax Service Rate (KD)</p>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.pax_rate}
                      onChange={e => setFormData({...formData, pax_rate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <p className="text-[10px] font-bold text-slate-400">Workstation Rate (KD/Mo)</p>
                    <input
                      type="number"
                      value={formData.workstation_rate}
                      onChange={e => setFormData({...formData, workstation_rate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3 items-start">
                 <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-orange-700 leading-relaxed font-medium">
                   Onboarding initiates the "14-day deemed acceptance" clause per Annex 10. The carrier will be notified via the integration gateway.
                 </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : <Save className="w-5 h-5" />}
                  Finalize Onboarding
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
