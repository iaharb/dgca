import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, HardDrive, Network, ShieldCheck,
  Loader2, Building2, FileWarning, FileCheck2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StageWorkflowModal } from './StageWorkflowModal';

const STAGES = [
  { id: 'Phase 0',  label: 'Pending Agreement', icon: FileWarning,  color: 'text-slate-400',   bg: 'bg-slate-50',   barColor: 'bg-slate-400',   activeColor: 'border-slate-300',   milestone: 'pending' },
  { id: 'Phase 1',  label: 'Agreement Sent',    icon: Clock,         color: 'text-blue-600',    bg: 'bg-blue-50',    barColor: 'bg-blue-600',    activeColor: 'border-blue-500',    milestone: 'agreement_sent' },
  { id: 'Phase 1b', label: 'Agreement Signed',  icon: FileCheck2,    color: 'text-teal-600',    bg: 'bg-teal-50',    barColor: 'bg-teal-600',    activeColor: 'border-teal-500',    milestone: 'agreement_signed' },
  { id: 'Phase 2',  label: 'Hardware Verified', icon: HardDrive,     color: 'text-orange-600',  bg: 'bg-orange-50',  barColor: 'bg-orange-600',  activeColor: 'border-orange-500',  milestone: 'hardware_verified' },
  { id: 'Phase 3',  label: 'Network Ready',     icon: Network,       color: 'text-indigo-600',  bg: 'bg-indigo-50',  barColor: 'bg-indigo-600',  activeColor: 'border-indigo-500',  milestone: 'network_ready' },
  { id: 'Phase 4',  label: 'SAT Sign-off',      icon: ShieldCheck,   color: 'text-violet-600',  bg: 'bg-violet-50',  barColor: 'bg-violet-600',  activeColor: 'border-violet-500',  milestone: 'sat_sign_off' },
  { id: 'Phase 5',  label: 'Certified',         icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', barColor: 'bg-emerald-600', activeColor: 'border-emerald-500', milestone: 'certified' },
];

interface ActiveStageRef {
  id: string;
  stageIdx: number;
  milestone: string;
  label: string;
}

export const IntegrationPipeline: React.FC<any> = ({ onSelectProject, userType, airlineCode }) => {
  const [projects,      setProjects]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeStage,   setActiveStage]   = useState<ActiveStageRef | null>(null);

  useEffect(() => { fetchIntegrationStatus(); }, [airlineCode, userType]);

  const fetchIntegrationStatus = async () => {
    try {
      const [carriersRes, agreementsRes, milestonesRes] = await Promise.all([
        supabase.from('carriers').select('*'),
        supabase.from('agreements').select('*'),
        supabase.from('integration_milestones').select('*'),
      ]);

      const airlines   = carriersRes.data   || [];
      const agreements = agreementsRes.data || [];
      const milestones = milestonesRes.data || [];

      const projectsList = airlines
        .filter(airline => !(userType === 'carrier' && airlineCode && airline.iata_code !== airlineCode))
        .map(airline => {
          const agreement        = agreements.find(a => a.airline_id === airline.id);
          const airlineMilestones = agreement ? milestones.filter(m => m.agreement_id === agreement.id) : [];

          let currentPhaseIdx = 0;

          if (agreement) {
            currentPhaseIdx = 1; // agreement_sent

            // Advance to agreement_signed if status reflects it
            if (agreement.status === 'signed' || agreement.status === 'active') {
              const idx = STAGES.findIndex(s => s.milestone === 'agreement_signed');
              if (idx > currentPhaseIdx) currentPhaseIdx = idx;
            }

            airlineMilestones.forEach((m: any) => {
              if (m.status === 'completed' || m.status === 'deemed_accepted') {
                const idx = STAGES.findIndex(s => s.milestone === m.milestone_type);
                if (idx > currentPhaseIdx) currentPhaseIdx = idx;
              }
            });
          }

          const stage    = STAGES[currentPhaseIdx] || STAGES[0];
          const maxPhase = STAGES.length - 1;

          return {
            id:             airline.id,
            name:           airline.name      || 'Unknown',
            iata:           airline.iata_code || '??',
            currentPhase:   stage.id,
            currentPhaseIdx,
            label:          stage.label,
            progress:       (currentPhaseIdx / maxPhase) * 100,
            icon:           stage.icon,
            color:          stage.color,
            bg:             stage.bg,
            agreement,
            milestones:     airlineMilestones,
          };
        });

      setProjects(projectsList.sort((a, b) => b.progress - a.progress));
    } catch (e) {
      console.error('[PIPELINE] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const totalCarriers = projects.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          Integration Ledger
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {projects.length} Nodes Discovered
        </p>
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAGES.map((stage) => {
          const stageIdx     = STAGES.findIndex(s => s.id === stage.id);
          const isLastStage  = stageIdx === STAGES.length - 1;
          const carriersHere = projects.filter(p => p.currentPhase === stage.id);
          const count        = carriersHere.length;

          // "Cleared" = moved PAST this stage (or arrived at final stage)
          const clearedCount = isLastStage
            ? carriersHere.length
            : projects.filter(p => p.currentPhaseIdx > stageIdx).length;
          const pct          = totalCarriers > 0 ? Math.round((clearedCount / totalCarriers) * 100) : 0;

          // Show signed badge if any carrier is AT this stage and it's "Agreement Signed"
          const hasSignedCarrier = stage.milestone === 'agreement_signed' && count > 0;

          return (
            <motion.div
              key={stage.id}
              onClick={() => setActiveStage({ id: stage.id, stageIdx, milestone: stage.milestone, label: stage.label })}
              whileHover={{ y: -2, scale: 1.01 }}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Signed badge overlay */}
              {hasSignedCarrier && (
                <div className="absolute top-3 right-3 bg-teal-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Signed
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-bold text-slate-900 text-base leading-tight pr-10">{stage.label}</h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1 inline-block">
                    {count} Carrier{count !== 1 ? 's' : ''} here
                  </span>
                </div>
                <div className={`p-2 rounded-lg ${stage.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <stage.icon className={`w-5 h-5 ${stage.color}`} />
                </div>
              </div>

              {/* Carrier name pills (if any are at this stage) */}
              {carriersHere.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {carriersHere.map(p => (
                    <span
                      key={p.id}
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${stage.bg} ${stage.color} border-current border-opacity-30`}
                    >
                      {p.iata}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter text-slate-400">
                  <span>{isLastStage ? 'Certified' : 'Fleet Cleared Stage'}</span>
                  <span className="text-slate-900">{clearedCount} / {totalCarriers}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${stage.barColor} rounded-full`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black ${stage.color}`}>
                    {pct}% {isLastStage ? 'certified' : 'cleared'}
                  </span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to manage →
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Stage Workflow Modal */}
      <StageWorkflowModal
        isOpen={!!activeStage}
        onClose={() => setActiveStage(null)}
        stageMilestone={activeStage?.milestone ?? null}
        stageLabel={activeStage?.label ?? ''}
        stageIdx={activeStage?.stageIdx ?? 0}
        projects={projects}
        userType={userType || 'carrier'}
        airlineCode={airlineCode}
        onUpdate={() => {
          setActiveStage(null);
          fetchIntegrationStatus();
        }}
      />
    </div>
  );
};
