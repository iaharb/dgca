import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, Activity, ShieldCheck, HardDrive, Network, ExternalLink, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface DossierDrawerProps {
  project: any | null;
  isOpen: boolean;
  onClose: () => void;
}

const STAGES_CONFIG = [
  { id: 'Agreement Sent', icon: FileText, role: 'Legal Team', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'Hardware Verified', icon: HardDrive, role: 'IT Ops', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'Network Ready', icon: Network, role: 'Network Eng', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'SAT Sign-off', icon: ShieldCheck, role: 'DGCA Lead', color: 'text-brand-500', bg: 'bg-brand-500/10' },
  { id: 'Certified', icon: CheckCircle2, role: 'System root', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
];

export const DossierDrawer: React.FC<DossierDrawerProps> = ({ project, isOpen, onClose }) => {
  const [currentProgress, setCurrentProgress] = useState<number>(project?.progress || 0);
  
  if (!project) return null;

  const getStatusForStage = (stageIdx: number) => {
    const stageProgress = (stageIdx + 1) * 20;
    if (currentProgress >= stageProgress) return 'Completed';
    if (currentProgress >= stageProgress - 20) return 'Active';
    return 'Pending';
  };

  const nextStage = STAGES_CONFIG.find((_, i) => getStatusForStage(i) === 'Active');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-slate-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[120] w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl overflow-y-auto custom-scrollbar"
          >
            <div className="p-10">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brand-600 rounded-[20px] shadow-xl shadow-brand-600/20 flex items-center justify-center text-white">
                    <Plane className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white uppercase">Integration Dossier</h2>
                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Node: KWI-01 / Ref: {project.iata}-{project.id}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-10">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Primary Operator</h3>
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{project.airline}</p>
                      <p className="text-xs text-slate-400 font-medium">Carrier IATA: {project.iata} • Current Progress: {currentProgress}%</p>
                    </div>
                    <div className="bg-brand-600/10 text-brand-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-brand-600/20">
                      {currentProgress === 100 ? 'Certified Node' : 'Integration Active'}
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Milestone Sequence</h3>
                  <div className="space-y-3">
                     {STAGES_CONFIG.map((item, i) => {
                       const status = getStatusForStage(i);
                       const isAgreementStage = item.id === 'Agreement Sent';
                       return (
                        <div key={i} className={`p-5 bg-white dark:bg-slate-900 border ${status === 'Active' ? 'border-brand-500 shadow-lg shadow-brand-500/10' : 'border-slate-100 dark:border-slate-800'} rounded-2xl flex items-center justify-between transition-all`}>
                           <div className="flex items-center gap-4">
                            <div className={`${item.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                               <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white">{item.id}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                 {isAgreementStage && status === 'Completed' ? 'V-Portal Verified' : item.role}
                               </p>
                            </div>
                           </div>
                           <div className="text-right">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${
                                status === 'Completed' ? 'text-emerald-500' : 
                                status === 'Active' ? 'text-brand-500 animate-pulse' : 'text-slate-400'
                              }`}>
                                {isAgreementStage && status === 'Completed' ? 'Digitally Signed' : status}
                              </p>
                              {status === 'Completed' && <p className="text-[9px] text-slate-400 font-medium mt-1">Verified Apr 2026</p>}
                           </div>
                        </div>
                       );
                     })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Documentation</h3>
                    <AlertCircle className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                     {[
                       { name: 'Integration Master Plan (IMP)', type: 'PDF', size: '2.4MB', ref: 'DGCA-REF-101' },
                       { name: 'Annex 10 Terminal Readiness', type: 'PDF', size: '1.8MB', ref: 'DGCA-REF-104' },
                       { name: 'SLA & Support Terms', type: 'PDF', size: '4.2MB', ref: 'DGCA-REF-112' },
                       { name: 'Hardware Config Specs', type: 'DOCX', size: '940KB', ref: 'DGCA-REF-201' },
                     ].map((doc, i) => (
                       <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-between group cursor-pointer border border-transparent hover:border-brand-500/20 hover:bg-white dark:hover:bg-slate-900 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                <FileText className="w-5 h-5 text-slate-400" />
                             </div>
                             <div>
                                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{doc.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{doc.ref} • {doc.type} • {doc.size}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase rounded-lg hover:bg-brand-600 hover:text-white transition-all">Review</button>
                             <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                          </div>
                       </div>
                     ))}
                  </div>
                </section>
              </div>

              <div className="mt-20 pb-10">
                 {currentProgress < 100 ? (
                   <button 
                    onClick={() => setCurrentProgress(prev => Math.min(prev + 20, 100))}
                    className="w-full py-5 bg-brand-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-brand-600/30 hover:bg-brand-700 transition-all flex flex-col items-center justify-center gap-1 group active:scale-[0.98]"
                   >
                     <div className="flex items-center gap-2">
                        Approve: {nextStage?.id}
                        <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     </div>
                     <span className="text-[9px] opacity-70 font-bold uppercase tracking-widest text-white/80">Authorize as {nextStage?.role}</span>
                   </button>
                 ) : (
                   <div className="w-full py-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-[24px] font-black text-sm flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Node Fully Certified
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
