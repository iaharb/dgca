import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, RefreshCcw, Activity, Terminal, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { simulateAODBFeed, checkDeemedAcceptance } from '../utils/aodb-simulation';
import { supabase } from '../lib/supabase';

interface CertifiedCarrier {
  iata: string;
  name: string;
}

export const AODBControlCenter: React.FC = () => {
  const [isSimulating,      setIsSimulating]      = useState(false);
  const [certifiedCarriers, setCertifiedCarriers] = useState<CertifiedCarrier[]>([]);
  const [loadingCarriers,   setLoadingCarriers]   = useState(true);
  const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'success' | 'warn'; time: string }[]>([]);

  /* ── Load certified carriers from DB ── */
  useEffect(() => { fetchCertifiedCarriers(); }, []);

  const fetchCertifiedCarriers = async () => {
    setLoadingCarriers(true);
    try {
      // Carriers that have a completed 'certified' milestone
      const { data: milestones } = await supabase
        .from('integration_milestones')
        .select('agreement_id')
        .eq('milestone_type', 'certified')
        .eq('status', 'completed');

      if (!milestones?.length) { setCertifiedCarriers([]); return; }

      const agreementIds = milestones.map(m => m.agreement_id);

      const { data: agreements } = await supabase
        .from('agreements')
        .select('airline_id')
        .in('id', agreementIds);

      if (!agreements?.length) { setCertifiedCarriers([]); return; }

      const airlineIds = agreements.map(a => a.airline_id);

      const { data: airlines } = await supabase
        .from('airlines')
        .select('iata_code, name')
        .in('id', airlineIds);

      setCertifiedCarriers(
        (airlines || []).map(a => ({ iata: a.iata_code, name: a.name }))
      );
    } catch (e) {
      console.error('[AODB] Failed to load certified carriers:', e);
    } finally {
      setLoadingCarriers(false);
    }
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 12));
  };

  const handleManualFeed = async (carrier: CertifiedCarrier) => {
    addLog(`Injecting AODB feed for ${carrier.name} (${carrier.iata})…`, 'info');
    const paxValue = Math.floor(Math.random() * 300) + 150;
    try {
      await simulateAODBFeed(carrier.iata, paxValue);
      addLog(`✓ Synced +${paxValue} pax for ${carrier.iata} — metrics updated`, 'success');
    } catch (e) {
      addLog(`⚠ Feed failed for ${carrier.iata} — check Supabase connectivity`, 'warn');
    }
  };

  const handleBulkFeed = async () => {
    if (!certifiedCarriers.length) return;
    setIsSimulating(true);
    addLog(`Starting bulk AODB cycle for ${certifiedCarriers.length} certified carrier(s)…`, 'info');
    for (const carrier of certifiedCarriers) {
      const pax = Math.floor(Math.random() * 500) + 200;
      try {
        await simulateAODBFeed(carrier.iata, pax);
        addLog(`✓ ${carrier.iata}: +${pax} pax processed`, 'success');
      } catch {
        addLog(`⚠ ${carrier.iata}: feed failed`, 'warn');
      }
    }
    addLog(`Bulk cycle complete — ${certifiedCarriers.length} node(s) updated.`, 'success');
    setIsSimulating(false);
  };

  const handleDeemedAcceptanceCheck = async () => {
    addLog('Executing 14-day deemed acceptance audit…', 'info');
    await checkDeemedAcceptance();
    addLog('Audit complete: 0 milestones processed (simulated).', 'success');
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[660px]">
      {/* Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white relative shrink-0">
            <Radio className="w-5 h-5" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-brand-400 rounded-xl"
            />
          </div>
          <div>
            <h3 className="text-lg font-black font-display tracking-tight uppercase">Collins AODB Simulation</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Interface Node: VII2-BRIDGE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {certifiedCarriers.length} Certified Node{certifiedCarriers.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Activity className="w-3 h-3" /> Syncing
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden">
        {/* Actions Section */}
        <div className="space-y-8 overflow-y-auto pr-1">
          {/* Certified carrier feed buttons */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Certified Carrier Feed Injection
              </h4>
              <button
                onClick={fetchCertifiedCarriers}
                className="text-[9px] text-blue-500 font-black uppercase tracking-widest hover:text-blue-700"
              >
                Refresh ↻
              </button>
            </div>

            {loadingCarriers ? (
              <div className="flex items-center gap-3 py-6 justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold">Loading certified carriers…</span>
              </div>
            ) : certifiedCarriers.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
                <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-amber-700">No certified carriers in the system</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Grant DGCA Certification from the Pipeline Board to enable feed injection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {certifiedCarriers.map(carrier => (
                  <button
                    key={carrier.iata}
                    onClick={() => handleManualFeed(carrier)}
                    disabled={isSimulating}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-brand-500/50 hover:bg-brand-50/30 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="text-left">
                      <span className="font-black text-slate-900 uppercase tracking-tighter text-sm block">
                        {carrier.iata}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 truncate block max-w-[90px]">
                        {carrier.name}
                      </span>
                    </div>
                    <Play className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* System Procedures */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Procedures</h4>

            {certifiedCarriers.length > 0 && (
              <button
                onClick={handleBulkFeed}
                disabled={isSimulating || certifiedCarriers.length === 0}
                className="w-full flex items-center gap-3 p-5 bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSimulating
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Activity className="w-5 h-5" />}
                {isSimulating ? 'Running Bulk Cycle…' : `Run Bulk AODB Cycle (${certifiedCarriers.length} Nodes)`}
              </button>
            )}

            <button
              onClick={handleDeemedAcceptanceCheck}
              className="w-full flex items-center gap-3 p-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
              <RefreshCcw className="w-5 h-5" />
              Trigger Deemed Acceptance Audit
            </button>
            <p className="text-[11px] text-slate-400 font-medium px-2 italic">
              *This will scan for SAP milestones pending {'>'} 14 days and auto-sign them per Annex 10 logic.
            </p>
          </section>
        </div>

        {/* Live Logs */}
        <div className="bg-slate-950 rounded-3xl p-6 flex flex-col font-mono relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <Terminal className="w-4 h-4 text-slate-700" />
          </div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Real-time Telemetry</h4>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={log.time + i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-[10px] text-slate-600 shrink-0 font-bold mt-0.5">[{log.time}]</span>
                  <div className="flex gap-2 items-start">
                    {log.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                    {log.type === 'warn'    && <AlertCircle  className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                    <p className={`text-[12px] leading-relaxed ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'warn'    ? 'text-amber-400'   : 'text-slate-300'
                    }`}>
                      {log.msg}
                    </p>
                  </div>
                </motion.div>
              ))}
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <Activity className="w-12 h-12 text-slate-500 mb-4" />
                  <p className="text-xs">Awaiting Feed Initiation…</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
