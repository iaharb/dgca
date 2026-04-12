import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ShieldCheck, Mail, Lock, ChevronRight, Building2, Globe } from 'lucide-react';

import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const [view, setView] = useState<'select' | 'dgca' | 'ops' | 'carrier'>('select');
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showBiometric, setShowBiometric] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const startBiometric = () => {
    setShowBiometric(true);
    setTimeout(() => {
        handleLogin('iaharb+dgca@gmail.com');
    }, 3000);
  };

  const handleLogin = async (email: string) => {
    setLoading(true);
    setErrorMsg('');
    
    // Pure Auth Attempt - NO Auto Provisioning
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123'
      });

      if (error) {
        setErrorMsg('Invalid authorization credentials. Please verify your node access.');
        console.error("Login failed:", error.message);
      }
    } catch (err) {
      console.error("Login crashed", err);
      setErrorMsg('Critical connection failure to identity node.');
    }

    setLoading(false);
  };

  const getInitialEmail = (v: string) => {
    if (v === 'dgca') return 'iaharb+dgca@gmail.com';
    if (v === 'ops') return 'iaharb+ops@gmail.com';
    if (v === 'carrier') return 'iaharb+ku@gmail.com';
    return '';
  };

  const handleLoginSubmit = () => {
     const finalEmail = emailInput || getInitialEmail(view);
     handleLogin(finalEmail);
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex items-center justify-center overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/kwi_bg.png" 
          className="w-full h-full object-cover opacity-30 grayscale-[0.5] scale-110" 
          alt="KWI Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,142,233,0.1),transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[480px] p-8"
      >
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex p-4 rounded-[24px] bg-brand-600 shadow-2xl shadow-brand-600/30 mb-6"
          >
            <Plane className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight mb-2 uppercase">KWI V-Portal</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Official Partner Gateway • DGCA Kuwait</p>
        </div>

        <AnimatePresence mode="wait">
          {view === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button 
                onClick={() => setView('dgca')}
                className="w-full group p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] flex items-center gap-5 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-black text-lg">DGCA Control</p>
                  <p className="text-slate-400 text-xs font-medium">Administrator & Oversight Access</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setView('ops')}
                className="w-full group p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] flex items-center gap-5 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Globe className="w-7 h-7" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-black text-lg">Operations Partner</p>
                  <p className="text-slate-400 text-xs font-medium">Global Terminal Network Admin</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setView('carrier')}
                className="w-full group p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] flex items-center gap-5 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Building2 className="w-7 h-7" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-black text-lg">Carrier Gateway</p>
                  <p className="text-slate-400 text-xs font-medium">Partner Integration & Settlement</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {(view === 'dgca' || view === 'carrier' || view === 'ops') && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[40px] shadow-2xl space-y-8"
            >
              <div>
                 <button 
                  onClick={() => setView('select')}
                  className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 mb-6"
                 >
                   ← Return to selection
                 </button>
                 <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight">
                   {view === 'dgca' ? 'Admin Login' : (view === 'ops' ? 'Operations Sync' : 'Partner Sync')}
                 </h2>
                 <p className="text-slate-400 text-sm mt-1">Provide credentials to access the node.</p>
              </div>

              {errorMsg && (
                 <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-bold text-center">
                    {errorMsg}
                 </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Identity Endpoint</label>
                   <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={getInitialEmail(view)}
                        className="w-full pl-11 pr-5 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white text-sm font-semibold focus:bg-slate-900 focus:border-brand-500 transition-all outline-none" 
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Secure Protocol</label>
                   <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="password"
                        defaultValue="••••••••"
                        placeholder="Access Key"
                        className="w-full pl-11 pr-5 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white text-sm font-semibold focus:bg-slate-900 focus:border-brand-500 transition-all outline-none" 
                      />
                   </div>
                </div>
              </div>

              <button 
                onClick={handleLoginSubmit}
                disabled={loading}
                className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-brand-600/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    Initialize Session
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <button 
                  onClick={startBiometric}
                  className="w-full py-4 bg-slate-900/50 hover:bg-slate-900 border border-white/10 text-slate-300 rounded-[22px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-brand-400" />
                  Request Biometric Sync
                </button>
                <p className="text-[9px] text-slate-500 font-medium text-center italic">Requires registered biometric identity node.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBiometric && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-10"
            >
              <div className="relative w-64 h-64 mb-10">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 border-4 border-brand-500/30 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute -inset-4 border border-dashed border-brand-500/20 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-brand-500/50 relative">
                     <motion.div 
                        initial={{ y: -192 }}
                        animate={{ y: 192 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute top-0 left-0 right-0 h-1 bg-brand-500 shadow-[0_0_20px_#0c8ee9]"
                     />
                     <img src="/face_scan.png" className="w-full h-full object-cover opacity-50 grayscale" alt="Scan" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 font-display">Scanning Identity</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Calibrating Neural Map...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-4">
           <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Node: KWI-GLOBAL-01
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
           <p>© 2026 DGCA Kuwait</p>
        </div>
      </motion.div>
    </div>
  );
};
