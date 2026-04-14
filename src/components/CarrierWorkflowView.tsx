import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  FileCheck2, 
  Send, 
  ShieldCheck, 
  Network, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Download,
  Fingerprint
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SignaturePad } from './SignaturePad';

const ONBOARDING_STAGES = [
  { id: 'APPROVED',         label: 'Application Approved',  icon: CheckCircle2, desc: 'Your entry into the June 2026 term has been validated.' },
  { id: 'AGREEMENT_SENT',   label: 'Review Agreement',     icon: FileText,     desc: 'Standard 5-year operational contract dispatched.' },
  { id: 'AGREEMENT_SIGNED', label: 'Contract Executed',    icon: ShieldCheck,   desc: 'Legal validation confirmed. Readiness active.' },
  { id: 'INTEGRATION_S1',   label: 'Integration Active',   icon: Network,       desc: 'Hardware verification and node syncing.' },
];

export const CarrierWorkflowView: React.FC<{ airline: any }> = ({ airline }) => {
  const [currentAirline, setCurrentAirline] = useState(airline);
  const [loading, setLoading] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const activeIdx = ONBOARDING_STAGES.findIndex(s => s.id === currentAirline.onboarding_status) || 0;

  const handleSign = async (signatureBase64: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('airlines')
        .update({
          onboarding_status: 'AGREEMENT_SIGNED',
          signed_at: new Date().toISOString(),
          contract_start_date: '2026-06-01',
          signature_data: signatureBase64
        })
        .eq('id', currentAirline.id);

      if (error) throw error;
      
      const { data } = await supabase.from('airlines').select('*').eq('id', currentAirline.id).single();
      setCurrentAirline(data);
      setShowSignature(false);
    } catch (err) {
      console.error('Signing error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      {/* Header Stat Card */}
      <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <Building2 className="w-48 h-48" />
        </div>
        
        <div className="flex items-center gap-6">
           <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-blue-600/20">
              {currentAirline.iata_code}
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentAirline.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Network Partner</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Session</span>
              </div>
           </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white min-w-[240px]">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Lifecycle Status</p>
           <p className="text-xl font-black text-center text-blue-400 uppercase tracking-wider">
              {ONBOARDING_STAGES[activeIdx]?.label || 'PENDING'}
           </p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm">
         <div className="flex items-center justify-between mb-12">
            <div>
               <h3 className="text-xl font-bold text-slate-900 tracking-tight">Onboarding Progress</h3>
               <p className="text-sm font-medium text-slate-400 mt-0.5">Step {activeIdx + 1} of 4 completed</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
               <Fingerprint className="w-5 h-5" />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-[27px] left-0 right-0 h-0.5 bg-slate-100 -z-0" />
            
            {ONBOARDING_STAGES.map((stage, i) => {
               const isCompleted = i < activeIdx;
               const isActive = i === activeIdx;
               const Icon = stage.icon;

               return (
                  <div key={stage.id} className="relative z-10 flex flex-col items-center text-center group">
                     <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500
                        ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                          isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-110' : 
                          'bg-white border-2 border-slate-100 text-slate-300'}
                     `}>
                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                     </div>
                     <h4 className={`mt-4 text-xs font-black uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-900'}`}>
                        {stage.label}
                     </h4>
                     <p className="mt-1 text-[10px] text-slate-400 font-medium leading-relaxed px-2">
                        {stage.desc}
                     </p>
                  </div>
               );
            })}
         </div>
      </div>

      {/* Action Content */}
      <AnimatePresence mode="wait">
         {currentAirline.onboarding_status === 'APPROVED' && (
           <motion.div 
             key="approved"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="bg-blue-600 rounded-[40px] p-12 text-white shadow-2xl shadow-blue-600/20 flex items-center gap-12"
           >
              <div className="hidden lg:block w-48 h-48 bg-white/10 rounded-3xl flex items-center justify-center">
                 <FileText className="w-24 h-24 text-blue-200 opacity-50" />
              </div>
              <div className="flex-1">
                 <h2 className="text-4xl font-black tracking-tight mb-4">Legal Framework Dispatched</h2>
                 <p className="text-blue-100 text-lg mb-8 leading-relaxed max-w-2xl">
                    Your application has been vetted and approved by DGCA. The standard 5-year operational 
                    framework (Contract Term: June 2026 - June 2031) is ready for your signature.
                 </p>
                 <button 
                  onClick={() => setShowSignature(true)}
                  className="bg-white text-blue-600 font-black px-10 py-5 rounded-2xl shadow-xl hover:bg-blue-50 hover:scale-[1.05] transition-all flex items-center gap-3 active:scale-95"
                 >
                    Execute Digital Signature <Send className="w-5 h-5" />
                 </button>
              </div>
           </motion.div>
         )}

         {currentAirline.onboarding_status === 'AGREEMENT_SIGNED' && (
           <motion.div 
             key="signed"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-emerald-600 rounded-[40px] p-12 text-white shadow-2xl shadow-emerald-600/20 flex items-center gap-12"
           >
              <div className="hidden lg:block w-48 h-48 bg-white/10 rounded-3xl flex items-center justify-center">
                 <ShieldCheck className="w-24 h-24 text-emerald-100 opacity-50" />
              </div>
              <div className="flex-1">
                 <h2 className="text-4xl font-black tracking-tight mb-4">Agreement Executed</h2>
                 <p className="text-emerald-500 bg-white/95 px-4 py-1 rounded-full text-xs font-black inline-block uppercase tracking-widest mb-6 border border-emerald-400/30 shadow-lg">
                    Term Valid Until: June 30, 2031
                 </p>
                 <p className="text-emerald-50 text-lg mb-8 leading-relaxed max-w-2xl">
                    Your contractual obligations are now synchronized with DGCA. You are officially 
                    a Network Partner. integration specialists will reach out shortly for Stage 1.
                 </p>
                 <div className="flex gap-4">
                    <button className="bg-white/10 border border-white/20 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
                       <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button className="bg-white text-emerald-600 font-bold px-8 py-4 rounded-xl hover:bg-emerald-50 transition-all flex items-center gap-2">
                       Proceed to Integration Stage I <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Signature Modal Overlay */}
      <AnimatePresence>
         {showSignature && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSignature(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
               />
               <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
               >
                  <div className="p-10 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Digital Execution</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Aviation Framework 2026-2031</p>
                     </div>
                     <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <FileCheck2 className="w-6 h-6" />
                     </div>
                  </div>

                  <div className="p-10">
                     <div className="p-6 bg-blue-50 border border-blue-100 rounded-[20px] mb-8 flex items-start gap-4">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 font-medium leading-relaxed">
                           By signing below, you agree to the <strong>Terms & Conditions</strong> of the KWI Unified Aviation Registry. 
                           This signature is legally binding and will be timestamped and anchored to the DGCA Audit-Chain.
                        </p>
                     </div>

                     <SignaturePad onSave={handleSign} onClear={() => {}} />

                     <button 
                      onClick={() => setShowSignature(false)}
                      className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest mt-6 hover:text-slate-600 transition-colors"
                     >
                        Cancel Execution
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};
