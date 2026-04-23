import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, RefreshCcw, Activity, Terminal, AlertCircle, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { simulateAODBFeed, checkDeemedAcceptance } from '../utils/aodb-simulation';
import { supabase } from '../lib/supabase';

interface Carrier {
  iata: string;
  name: string;
  id: string;
}

export const AODBControlCenter: React.FC = () => {
  const [isSimulating,      setIsSimulating]      = useState(false);
  const [carriers,          setCarriers]          = useState<Carrier[]>([]);
  const [loadingCarriers,   setLoadingCarriers]   = useState(true);
  const [logs,              setLogs]              = useState<{ msg: string; type: 'info' | 'success' | 'warn'; time: string }[]>([]);
  
  // Simulator Parameters
  const [selectedTerminal, setSelectedTerminal] = useState('T1');
  const [allocationHub, setAllocationHub] = useState('G-01, G-02, G-03');
  const [dateRangeStart, setDateRangeStart] = useState('2026-01-01');
  const [dateRangeEnd, setDateRangeEnd] = useState('2026-03-31');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);

  useEffect(() => { fetchCarriers(); }, []);

  const fetchCarriers = async () => {
    setLoadingCarriers(true);
    try {
      const { data: carriersData } = await supabase
        .from('carriers')
        .select('id, iata_code, name')
        .order('iata_code');

      setCarriers((carriersData || []).map(a => ({ id: a.id, iata: a.iata_code, name: a.name })));
    } catch (e) {
      console.error('[AODB] Failed to load carriers:', e);
    } finally {
      setLoadingCarriers(false);
    }
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 15));
  };

  // Compute allowed carriers based on terminal rules
  const allowedCarriers = carriers.filter(c => {
    if (selectedTerminal === 'T4') return c.iata === 'KU';
    if (selectedTerminal === 'T5') return c.iata === 'J9';
    // T1, T2 -> all EXCEPT KU and J9
    return c.iata !== 'KU' && c.iata !== 'J9';
  });

  // Automatically select/deselect based on allowed
  useEffect(() => {
    const validSelections = selectedCarriers.filter(c => allowedCarriers.some(ac => ac.iata === c));
    if (validSelections.length !== selectedCarriers.length) {
      setSelectedCarriers(validSelections);
    }
  }, [selectedTerminal, allowedCarriers]);

  const toggleCarrier = (iata: string) => {
    if (selectedCarriers.includes(iata)) {
      setSelectedCarriers(selectedCarriers.filter(c => c !== iata));
    } else {
      setSelectedCarriers([...selectedCarriers, iata]);
    }
  };

  const selectAllAllowed = () => {
    setSelectedCarriers(allowedCarriers.map(c => c.iata));
  };

  const clearCarriers = () => setSelectedCarriers([]);

  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    let curr = new Date(start);
    const endDt = new Date(end);
    while (curr <= endDt) {
      dates.push(new Date(curr).toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const handleBulkHistoricalSimulation = async () => {
    if (selectedCarriers.length === 0) {
      addLog('No carriers selected for simulation.', 'warn');
      return;
    }
    const dates = getDatesInRange(dateRangeStart, dateRangeEnd);
    if (dates.length === 0) {
      addLog('Invalid date range.', 'warn');
      return;
    }

    setIsSimulating(true);
    addLog(`Initiating Historical Seeding: ${selectedTerminal} for ${selectedCarriers.length} carriers over ${dates.length} days...`, 'info');

    // Split allocation hubs
    const hubs = allocationHub.split(',').map(h => h.trim()).filter(h => h);
    if (hubs.length === 0) hubs.push('G-01');

    let totalMovements = 0;

    for (const dateStr of dates) {
      // For each date, generate a few flights for each selected carrier
      let dayPenalties = 0;
      for (const iata of selectedCarriers) {
        // Randomly 1 to 3 flights per day
        const numFlights = Math.floor(Math.random() * 3) + 1;
        for (let i=0; i<numFlights; i++) {
            const pax = Math.floor(Math.random() * 250) + 50;
            const hub = hubs[Math.floor(Math.random() * hubs.length)];
            const flightNum = `${iata}${Math.floor(Math.random() * 900) + 100}`;
            
            try {
              const result = await simulateAODBFeed(iata, pax, {
                terminal: selectedTerminal,
                gate: hub,
                flightNum,
                dateStr
              });
              
              if (result?.penaltyApplied) {
                addLog(`! PENALTY: ${flightNum} delayed ${result.delayMins}m on ${dateStr}`, 'warn');
                dayPenalties++;
              }
              totalMovements++;
            } catch (e) {
              console.error(e);
            }
        }
      }
      addLog(`✓ ${dateStr}: ${selectedCarriers.length} carriers processed. ${dayPenalties > 0 ? dayPenalties + ' penalties' : 'Clean schedule'}`, dayPenalties > 0 ? 'warn' : 'success');
      // A small artificial delay to not freeze the UI entirely if dates are large
      await new Promise(r => setTimeout(r, 50));
    }
    
    addLog(`Historical Simulation Complete. Generated ${totalMovements} flight movements.`, 'success');
    setIsSimulating(false);
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[740px]">
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
            <h3 className="text-lg font-black font-display tracking-tight uppercase">Historical Data Simulator</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Batch Generate Flights, Pax & Billing</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {isSimulating && (
             <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">
               <Activity className="w-3 h-3" /> Processing
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden">
        {/* Configuration Section */}
        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Time & Space Params */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Simulation Parameters</h4>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Start Date</label>
                 <input 
                   type="date" 
                   value={dateRangeStart} 
                   onChange={(e) => setDateRangeStart(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-500"
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> End Date</label>
                 <input 
                   type="date" 
                   value={dateRangeEnd} 
                   onChange={(e) => setDateRangeEnd(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-500"
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Active Terminal</label>
                 <select 
                   value={selectedTerminal} 
                   onChange={(e) => setSelectedTerminal(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-500"
                 >
                   <option value="T1">Terminal 1 (Foreign)</option>
                   <option value="T2">Terminal 2 (Foreign)</option>
                   <option value="T4">Terminal 4 (KAC Exclusive)</option>
                   <option value="T5">Terminal 5 (JZR Exclusive)</option>
                 </select>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Allocation Hubs (Comma separated)</label>
                 <input 
                   type="text" 
                   value={allocationHub} 
                   onChange={(e) => setAllocationHub(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-500 uppercase"
                   placeholder="G-01, G-02, C-14" 
                 />
               </div>
            </div>
          </section>

          {/* Airlines Multi-select */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Carriers ({selectedCarriers.length}/{allowedCarriers.length})</h4>
                <div className="flex gap-2">
                   <button onClick={selectAllAllowed} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Select All</button>
                   <button onClick={clearCarriers} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:underline">Clear</button>
                </div>
             </div>

             {loadingCarriers ? (
               <div className="flex items-center gap-3 py-6 justify-center text-slate-400">
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <span className="text-xs font-bold">Loading carriers…</span>
               </div>
             ) : (
               <div className="grid grid-cols-3 gap-2">
                 {allowedCarriers.map(carrier => {
                    const isSelected = selectedCarriers.includes(carrier.iata);
                    return (
                      <button
                        key={carrier.iata}
                        onClick={() => toggleCarrier(carrier.iata)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                          isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                         <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                           isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                         }`}>
                           {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                         </div>
                         <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 block truncate">{carrier.iata}</span>
                         </div>
                      </button>
                    )
                 })}
               </div>
             )}
             {allowedCarriers.length === 0 && (
                <div className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-200">
                   No carriers allowed for the selected terminal according to DGCA regulations.
                </div>
             )}
          </section>

          {/* Trigger */}
          <section className="pt-4 border-t border-slate-100">
             <button
                onClick={handleBulkHistoricalSimulation}
                disabled={isSimulating || selectedCarriers.length === 0}
                className="w-full flex items-center justify-center gap-3 p-4 bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {isSimulating ? 'Generating Historical Data…' : `Start Simulation (${selectedCarriers.length} Carriers)`}
              </button>
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
                  <p className="text-xs">Awaiting Simulation Initiation…</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
