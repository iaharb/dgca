import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plane, Activity, Lock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface PortalInitiationProps {
  onInitiated: () => void;
}

export const PortalInitiation: React.FC<PortalInitiationProps> = ({ onInitiated }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { label: 'Establishing Secure Handshake', duration: 800 },
    { label: 'Syncing KWI Infrastructure Nodes', duration: 800 },
    { label: 'Loading DGCA Annex 10 Protocols', duration: 800 },
    { label: 'Calibrating Financial Ledger', duration: 800 },
    { label: 'Portal Ready', duration: 400 },
  ];

  const handleStart = async () => {
    setIsAuthenticating(true);
    let currentStep = 0;
    
    for (let i = 0; i < steps.length; i++) {
      setStep(i);
      await new Promise(r => setTimeout(r, steps[i].duration));
    }

    try {
      await onInitiated();
    } catch (e: any) {
      setError(e.message || 'Database Synchronization Failed');
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden z-[9999]">
      <div className="absolute inset-0 opacity-20 bg-[url('/kwi_bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

      <div className="relative z-10 w-full max-w-md px-8 text-center">
        {!isAuthenticating ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-blue-600 rounded-3xl shadow-2xl flex items-center justify-center border border-white/10">
                <Plane className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold text-white tracking-tight font-display">KWI Aviation Portal</h1>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em]">Civil Aviation Oversight Hub</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-[32px] space-y-6">
               {error && (
                 <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-200 text-xs font-bold uppercase text-left">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                 </div>
               )}
               
               <button 
                onClick={handleStart}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/30"
               >
                  Initiate System Gateway
                  <ChevronRight className="w-6 h-6" />
               </button>
               
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                 Secure Handshake Protocol Annex 10 v4.2<br/>VII2 National Integration Node Active
               </p>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
             <div className="w-32 h-32 mx-auto border-4 border-slate-800 rounded-full flex items-center justify-center relative overflow-hidden">
                <motion.div 
                   className="absolute bottom-0 left-0 right-0 bg-blue-600/20"
                   animate={{ height: `${(step / steps.length) * 100}%` }}
                />
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
             </div>
             
             <div className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.p key={step} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-blue-400 font-mono text-sm uppercase tracking-widest">
                    {steps[step].label}...
                  </motion.p>
                </AnimatePresence>
                <div className="flex justify-center gap-2">
                  {steps.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-800'}`} />
                  ))}
                </div>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
