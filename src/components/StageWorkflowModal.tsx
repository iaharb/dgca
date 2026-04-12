import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, AlertCircle, FileText, Settings,
  PenLine, Check, Loader2, Calendar, User, BadgeCheck,
  HardDrive, Network, ShieldCheck, FileCheck2, Award, Info,
  ClipboardCheck, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { simulateAODBFeed } from '../utils/aodb-simulation';

/* ─── Workflow definitions ────────────────────────────────────────── */
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  filledBy?: 'carrier' | 'dgca' | 'both';
}

interface WorkflowDef {
  type: 'info' | 'agreement-detail' | 'workable' | 'certified';
  icon?: React.ElementType;
  color?: string;
  docs?: string[];
  fields?: FieldDef[];
  confirmLabel?: string;
}

const WORKFLOWS: Record<string, WorkflowDef> = {
  pending:          { type: 'info',             icon: AlertCircle,  color: 'text-slate-400' },
  agreement_sent:   { type: 'info',             icon: FileText,     color: 'text-blue-500' },
  agreement_signed: { type: 'agreement-detail', icon: FileCheck2,   color: 'text-teal-500' },

  hardware_verified: {
    type: 'workable',
    icon: HardDrive,
    color: 'text-orange-500',
    docs: [
      'Hardware Installation Certificate',
      'Workstation Inventory Sheet (with serial numbers)',
      'Network Topology Diagram',
    ],
    fields: [
      { key: 'workstation_count', label: 'Total Workstations Installed',  type: 'number',   placeholder: 'e.g. 12',              filledBy: 'carrier' },
      { key: 'ip_range',          label: 'IP Range / Subnet',             type: 'text',     placeholder: 'e.g. 192.168.10.0/24', filledBy: 'carrier' },
      { key: 'installation_date', label: 'Installation Completion Date',  type: 'date',                                          filledBy: 'carrier' },
      { key: 'technician',        label: 'Lead Technician',               type: 'text',     placeholder: 'Full name of engineer',filledBy: 'carrier' },
    ],
    confirmLabel: 'Confirm Hardware Verified',
  },

  network_ready: {
    type: 'workable',
    icon: Network,
    color: 'text-indigo-500',
    docs: [
      'Network Readiness Report',
      'VPN Configuration Sheet',
      'Firewall Policy Document',
      'Bandwidth & Latency Test Certificate',
    ],
    fields: [
      { key: 'vpn_endpoint',   label: 'VPN Endpoint IP',           type: 'text',   placeholder: 'e.g. 203.0.113.45', filledBy: 'carrier' },
      { key: 'primary_dns',    label: 'Primary DNS Server',         type: 'text',   placeholder: 'e.g. 8.8.8.8',     filledBy: 'carrier' },
      { key: 'secondary_dns',  label: 'Secondary DNS Server',       type: 'text',   placeholder: 'e.g. 8.8.4.4',     filledBy: 'carrier' },
      { key: 'bandwidth_mbps', label: 'Confirmed Bandwidth (Mbps)', type: 'number', placeholder: 'e.g. 100',          filledBy: 'carrier' },
    ],
    confirmLabel: 'Confirm Network Ready',
  },

  sat_sign_off: {
    type: 'workable',
    icon: ShieldCheck,
    color: 'text-violet-500',
    docs: [
      'System Acceptance Test (SAT) Report',
      'Performance Benchmark Results',
      'AODB Integration Certificate',
      'Carrier Acceptance Letter',
      'DGCA Technical Authority Sign-off Sheet',
    ],
    fields: [
      { key: 'test_date',       label: 'SAT Completion Date',     type: 'date',     filledBy: 'both' },
      { key: 'test_supervisor', label: 'Test Supervisor',          type: 'text',     placeholder: 'Full name',  filledBy: 'carrier' },
      { key: 'test_score',      label: 'Overall Test Score (%)',   type: 'number',   placeholder: 'e.g. 98',    filledBy: 'carrier' },
      { key: 'issues_noted',    label: 'Issues / Notes',           type: 'textarea', placeholder: 'Describe any open items or deferred issues…', filledBy: 'both' },
    ],
    confirmLabel: 'Confirm Final SAT — Advance to Certified',
  },

  certified: { type: 'certified', icon: Award, color: 'text-emerald-500' },
};

/* ─── Props ───────────────────────────────────────────────────────── */
interface Project {
  id: string;
  name: string;
  iata: string;
  currentPhase: string;
  currentPhaseIdx: number;
  agreement: any;
  milestones: any[];
}

export interface StageWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageMilestone: string | null;
  stageLabel: string;
  stageIdx: number;
  projects: Project[];
  userType: string;
  airlineCode?: string | null;
  onUpdate: () => void;
}

/* ─── Component ───────────────────────────────────────────────────── */
export const StageWorkflowModal: React.FC<StageWorkflowModalProps> = ({
  isOpen, onClose, stageMilestone, stageLabel, stageIdx,
  projects, userType, airlineCode, onUpdate,
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [configData,   setConfigData]   = useState<Record<string, string>>({});
  const [checkedDocs,  setCheckedDocs]  = useState<Set<string>>(new Set());
  const [signerName,   setSignerName]   = useState('');
  const [signerTitle,  setSignerTitle]  = useState('');
  const [signerDate,   setSignerDate]   = useState(new Date().toISOString().slice(0, 10));
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState<'draft' | 'complete' | null>(null);

  const workflow  = stageMilestone ? WORKFLOWS[stageMilestone] : null;

  // DGCA/ops_partner can do final sign-off; carriers fill in config/docs and submit for review
  const canSignOff = userType === 'dgca' || userType === 'operations_partner';
  const isCarrier  = userType === 'carrier';

  /* ── Auto-select project ── */
  useEffect(() => {
    if (!isOpen || projects.length === 0) return;
    if (isCarrier && airlineCode) {
      setSelectedProject(projects.find(p => p.iata === airlineCode) || projects[0]);
    } else {
      setSelectedProject(projects[0]);
    }
  }, [isOpen, stageMilestone]);

  /* ── Load saved milestone details ── */
  useEffect(() => {
    if (!selectedProject || !stageMilestone) return;
    const m = selectedProject.milestones.find((m: any) => m.milestone_type === stageMilestone);
    if (m?.details) {
      setConfigData(m.details.config    || {});
      setCheckedDocs(new Set(m.details.documents || []));
      setSignerName(m.details.signer?.name  || '');
      setSignerTitle(m.details.signer?.title || '');
      setSignerDate(m.details.signer?.date  || new Date().toISOString().slice(0, 10));
    } else {
      setConfigData({});
      setCheckedDocs(new Set());
      setSignerName('');
      setSignerTitle('');
      setSignerDate(new Date().toISOString().slice(0, 10));
    }
  }, [selectedProject?.id, stageMilestone]);

  const existingMilestone = selectedProject?.milestones.find(
    (m: any) => m.milestone_type === stageMilestone
  );
  const isCompleted = existingMilestone?.status === 'completed'
                   || existingMilestone?.status === 'deemed_accepted';
  // Carrier submitted for review but DGCA not yet confirmed
  const isPendingReview = existingMilestone?.status === 'pending'
                       && !!existingMilestone?.details;

  const toggleDoc = (doc: string) => {
    if (isCompleted) return;
    setCheckedDocs(prev => {
      const next = new Set(prev);
      next.has(doc) ? next.delete(doc) : next.add(doc);
      return next;
    });
  };

  /* ── Save (draft = carrier submit; complete = DGCA confirms) ── */
  const handleSave = async (markComplete: boolean) => {
    if (!selectedProject?.agreement?.id || !stageMilestone) return;
    setIsSaving(true);
    try {
      const now     = new Date().toISOString();
      const details = {
        config:    configData,
        documents: Array.from(checkedDocs),
        signer:    markComplete ? { name: signerName, title: signerTitle, date: signerDate } : (existingMilestone?.details?.signer || null),
        savedAt:   now,
      };

      // Determine the new status:
      // - markComplete (DGCA) → 'completed'
      // - carrier submitting for review → keep 'pending' but with details filled
      const newStatus = markComplete ? 'completed' : (existingMilestone?.status || 'pending');

      await supabase.from('integration_milestones').upsert({
        agreement_id:   selectedProject.agreement.id,
        milestone_type: stageMilestone,
        status:         newStatus,
        completed_at:   markComplete ? now : (existingMilestone?.completed_at ?? null),
        details,
      }, { onConflict: 'agreement_id,milestone_type' });

      // When a carrier is certified, bootstrap them into the AODB simulator
      if (markComplete && stageMilestone === 'certified' && selectedProject.iata) {
        const seedPax = Math.floor(Math.random() * 500) + 300; // realistic first-month seed
        await simulateAODBFeed(selectedProject.iata, seedPax);
        console.log(`[CERT] ${selectedProject.iata} bootstrapped into AODB simulator with ${seedPax} pax`);
      }

      setSaveSuccess(markComplete ? 'complete' : 'draft');
      setTimeout(() => {
        setSaveSuccess(null);
        if (markComplete) {
          onUpdate();
          onClose();
        } else {
          // Refresh data to show updated state without closing
          onUpdate();
        }
      }, 1600);
    } catch (e) {
      console.error('[WORKFLOW] Save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const qrUrl = (iata: string) => {
    const payload = encodeURIComponent(`DGCA/KWI/ANX10/${iata}/2026 | Status: SIGNED`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=104x104&data=${payload}&bgcolor=ffffff&color=1e3a5f&margin=6`;
  };

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* ── Header ── */}
            <div className="shrink-0 p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {workflow?.icon && (
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <workflow.icon className={`w-5 h-5 ${workflow.color || 'text-slate-400'}`} />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{stageLabel}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                    Integration Stage Workflow
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* ── Carrier Sidebar (DGCA, multi-carrier) ── */}
              {canSignOff && projects.length > 1 && (
                <div className="w-56 shrink-0 border-r border-slate-100 overflow-y-auto p-4 space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">
                    Carriers
                  </p>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProject(p)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                        selectedProject?.id === p.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-brand-600">
                        {p.iata}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${
                          p.currentPhaseIdx >= stageIdx ? 'text-emerald-500' : 'text-amber-500'
                        }`}>
                          {p.currentPhaseIdx >= stageIdx ? '✓ Reached' : 'Pending'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Main Content ── */}
              <div className="flex-1 overflow-y-auto p-8">
                {!selectedProject ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                    Select a carrier to view stage details
                  </div>
                ) : (
                  <div className="space-y-8 max-w-2xl mx-auto">

                    {/* Carrier + status row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-brand-600 text-sm">
                          {selectedProject.iata}
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900">{selectedProject.name}</h4>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            IATA: {selectedProject.iata}
                          </p>
                        </div>
                      </div>
                      {isCompleted ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Stage Complete</span>
                        </div>
                      ) : isPendingReview ? (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl">
                          <Send className="w-4 h-4 text-blue-500" />
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Submitted — Awaiting DGCA</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Completion</span>
                        </div>
                      )}
                    </div>

                    {/* ══════════════════════════
                        AGREEMENT DETAIL VIEW
                    ══════════════════════════ */}
                    {workflow?.type === 'agreement-detail' && (
                      <>
                        {selectedProject.agreement?.signer_name ? (
                          <>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex gap-6">
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                    Agreement Electronically Signed
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Signed By</p>
                                    <p className="text-base font-black text-slate-900 mt-0.5 italic" style={{ fontFamily: 'Georgia, serif' }}>
                                      {selectedProject.agreement.signer_name}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Title</p>
                                    <p className="text-sm font-bold text-slate-700 mt-0.5">{selectedProject.agreement.signer_title}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Signed</p>
                                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                                      {selectedProject.agreement.signer_date
                                        ? new Date(selectedProject.agreement.signer_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                                        : selectedProject.agreement.signed_at
                                          ? new Date(selectedProject.agreement.signed_at).toLocaleDateString('en-GB')
                                          : '—'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference</p>
                                    <p className="text-[11px] font-bold text-slate-700 mt-0.5 font-mono">
                                      DGCA/KWI/ANX10/{selectedProject.iata}/2026
                                    </p>
                                  </div>
                                </div>
                                {selectedProject.agreement.signature_data && (
                                  <div className="pt-3 border-t border-emerald-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Electronic Signature</p>
                                    {selectedProject.agreement.signature_data.startsWith('data:image') ? (
                                      <img src={selectedProject.agreement.signature_data} alt="Sig" className="h-10 border-b border-slate-300" />
                                    ) : (
                                      <p className="text-2xl font-black text-slate-900 italic" style={{ fontFamily: 'Georgia, serif' }}>
                                        {selectedProject.agreement.signature_data}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0 text-center">
                                <img src={qrUrl(selectedProject.iata)} alt="QR" className="rounded-xl border border-emerald-200" style={{ width: 104, height: 104 }} />
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Verify</p>
                              </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-xs font-bold text-blue-700">
                                Full agreement can be viewed and printed from the <strong>Ledger</strong> tab.
                                Proceed to Hardware Verification to advance this carrier.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-8 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                            <p className="text-sm font-black text-slate-900">Agreement Not Yet Signed Online</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                              Direct the carrier to the Ledger tab to complete the online signing.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* ══════════════════════════════════════════
                        WORKABLE STAGES: Hardware / Network / SAT
                    ══════════════════════════════════════════ */}
                    {workflow?.type === 'workable' && (
                      <div className="space-y-8">

                        {/* Role banner */}
                        {isCarrier ? (
                          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-blue-700">
                              Fill in the configuration details and confirm received documents below, then click
                              <strong> Submit for DGCA Review</strong>. DGCA will perform final verification and sign-off.
                            </p>
                          </div>
                        ) : isPendingReview ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                            <Send className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-blue-700">
                              Carrier has submitted this stage for review. Verify the details below, complete the
                              sign-off, and click <strong>Confirm Complete</strong> to advance.
                            </p>
                          </div>
                        ) : null}

                        {/* ── Required Documents ── */}
                        <div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> Required Documents
                          </h5>
                          <div className="space-y-2">
                            {workflow.docs?.map(doc => {
                              const checked = checkedDocs.has(doc);
                              return (
                                <button
                                  key={doc}
                                  type="button"
                                  onClick={() => toggleDoc(doc)}
                                  disabled={isCompleted}
                                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                                    checked
                                      ? 'border-emerald-200 bg-emerald-50'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  } ${isCompleted ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                                >
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                  }`}>
                                    {checked && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`text-sm font-bold flex-1 ${checked ? 'text-emerald-700' : 'text-slate-700'}`}>
                                    {doc}
                                  </span>
                                  {checked && (
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                      Received ✓
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {!isCompleted && checkedDocs.size < (workflow.docs?.length || 0) && (
                            <p className="text-[10px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {(workflow.docs?.length || 0) - checkedDocs.size} document(s) still outstanding
                            </p>
                          )}
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* ── Configuration Fields ── */}
                        <div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5" /> Configuration Details
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            {workflow.fields?.map(field => (
                              <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                                  {field.label}
                                  {field.filledBy === 'carrier' && (
                                    <span className="text-[8px] text-blue-400 font-bold normal-case tracking-normal">(carrier)</span>
                                  )}
                                </label>
                                {field.type === 'textarea' ? (
                                  <textarea
                                    value={configData[field.key] || ''}
                                    onChange={e => !isCompleted && setConfigData(p => ({ ...p, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    rows={3}
                                    readOnly={isCompleted}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none read-only:bg-slate-50 read-only:text-slate-500"
                                  />
                                ) : (
                                  <input
                                    type={field.type}
                                    value={configData[field.key] || ''}
                                    onChange={e => !isCompleted && setConfigData(p => ({ ...p, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    readOnly={isCompleted}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 read-only:bg-slate-50 read-only:text-slate-500"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── DGCA Sign-off section (only for DGCA/ops, only when not completed) ── */}
                        {canSignOff && !isCompleted && (
                          <>
                            <div className="border-t border-slate-100" />
                            <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <PenLine className="w-3.5 h-3.5" /> DGCA Verification Sign-off
                              </h5>
                              <div className="grid grid-cols-3 gap-4 mb-5">
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                    <User className="w-3 h-3" /> Verifier Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    placeholder="Full name"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                    <BadgeCheck className="w-3 h-3" /> Title *
                                  </label>
                                  <input
                                    type="text"
                                    value={signerTitle}
                                    onChange={e => setSignerTitle(e.target.value)}
                                    placeholder="e.g. DGCA Infrastructure Lead"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                    <Calendar className="w-3 h-3" /> Date *
                                  </label>
                                  <input
                                    type="date"
                                    value={signerDate}
                                    onChange={e => setSignerDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={() => handleSave(true)}
                                disabled={isSaving || !signerName.trim() || !signerTitle.trim()}
                                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                  saveSuccess === 'complete'
                                    ? 'bg-emerald-500 text-white'
                                    : !signerName.trim() || !signerTitle.trim()
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20 active:scale-[0.98]'
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saveSuccess === 'complete' ? (
                                  <><Check className="w-4 h-4" /> Stage Confirmed — Pipeline Advanced</>
                                ) : (
                                  <><ClipboardCheck className="w-4 h-4" /> {workflow.confirmLabel}</>
                                )}
                              </button>
                            </div>
                          </>
                        )}

                        {/* ── Carrier: Submit for Review button ── */}
                        {isCarrier && !isCompleted && (
                          <>
                            <div className="border-t border-slate-100" />
                            <div className="space-y-3">
                              <button
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                  saveSuccess === 'draft'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]'
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saveSuccess === 'draft' ? (
                                  <><Check className="w-4 h-4" /> Submitted for DGCA Review</>
                                ) : (
                                  <><Send className="w-4 h-4" /> Submit for DGCA Review</>
                                )}
                              </button>
                              <p className="text-[10px] text-slate-400 font-bold text-center">
                                DGCA will verify the documents and complete final sign-off
                              </p>
                            </div>
                          </>
                        )}

                        {/* ── Completed: show sign-off record ── */}
                        {isCompleted && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified &amp; Signed Off by DGCA
                            </p>
                            {existingMilestone?.details?.signer?.name ? (
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</p>
                                  <p className="text-sm font-black text-slate-900 mt-0.5">{existingMilestone.details.signer.name}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Title</p>
                                  <p className="text-sm font-bold text-slate-700 mt-0.5">{existingMilestone.details.signer.title}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                                    {new Date(existingMilestone.details.signer.date || existingMilestone.completed_at).toLocaleDateString('en-GB')}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-emerald-700 font-bold">
                                Completed on {existingMilestone?.completed_at
                                  ? new Date(existingMilestone.completed_at).toLocaleDateString('en-GB') : '—'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ══════════
                        CERTIFIED
                    ══════════ */}
                    {workflow?.type === 'certified' && (() => {
                      // Prerequisite milestones to display in the checklist
                      const PRE_REQS = [
                        { key: 'agreement_signed', label: 'Agreement Signed' },
                        { key: 'hardware_verified', label: 'Hardware Verified' },
                        { key: 'network_ready',     label: 'Network Ready' },
                        { key: 'sat_sign_off',      label: 'SAT Sign-off' },
                      ];
                      const prereqStatus = PRE_REQS.map(pr => ({
                        ...pr,
                        done: selectedProject.milestones.some(
                          (m: any) => m.milestone_type === pr.key &&
                            (m.status === 'completed' || m.status === 'deemed_accepted')
                        ) || (pr.key === 'agreement_signed' &&
                          (selectedProject.agreement?.status === 'signed' || selectedProject.agreement?.status === 'active')),
                      }));
                      const allDone = prereqStatus.every(p => p.done);

                      if (isCompleted) {
                        // ── Already Certified ──
                        return (
                          <div className="py-10 text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-6">
                              <Award className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900">Fully Certified</h4>
                            <p className="text-sm text-slate-400 mt-3 max-w-sm mx-auto">
                              <strong>{selectedProject.name}</strong> has completed all integration
                              milestones and is fully certified under DGCA Annex 10.
                            </p>
                            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-2xl text-emerald-700 text-[11px] font-black uppercase tracking-widest mt-6">
                              <CheckCircle2 className="w-4 h-4" /> Annex 10 Compliant
                            </div>
                            {existingMilestone?.details?.signer?.name && (
                              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left grid grid-cols-3 gap-4 max-w-md mx-auto">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Certified By</p>
                                  <p className="text-sm font-black text-slate-900 mt-0.5">{existingMilestone.details.signer.name}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Title</p>
                                  <p className="text-sm font-bold text-slate-700 mt-0.5">{existingMilestone.details.signer.title}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                                    {new Date(existingMilestone.details.signer.date || existingMilestone.completed_at).toLocaleDateString('en-GB')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (canSignOff) {
                        // ── DGCA: Grant Certification ──
                        return (
                          <div className="space-y-6">
                            {/* Prerequisites checklist */}
                            <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ClipboardCheck className="w-3.5 h-3.5" /> Pre-Certification Checklist
                              </h5>
                              <div className="space-y-2">
                                {prereqStatus.map(pr => (
                                  <div
                                    key={pr.key}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
                                      pr.done
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-amber-50 border-amber-200'
                                    }`}
                                  >
                                    {pr.done ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    ) : (
                                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                    )}
                                    <span className={`text-sm font-bold ${pr.done ? 'text-emerald-700' : 'text-amber-700'}`}>
                                      {pr.label}
                                    </span>
                                    <span className={`ml-auto text-[9px] font-black uppercase tracking-widest ${
                                      pr.done ? 'text-emerald-500' : 'text-amber-500'
                                    }`}>
                                      {pr.done ? 'Complete ✓' : 'Pending'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {!allDone && (
                                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-xs font-bold text-amber-700">
                                    Some prerequisite stages are not yet confirmed. You may still grant certification, but ensure all stages are complete.
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="border-t border-slate-100" />

                            {/* Certification Sign-off */}
                            <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <PenLine className="w-3.5 h-3.5" /> DGCA Certification Authority Sign-off
                              </h5>
                              <div className="grid grid-cols-3 gap-4 mb-5">
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                    <User className="w-3 h-3" /> Authority Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    placeholder="Full name"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                    <BadgeCheck className="w-3 h-3" /> Title *
                                  </label>
                                  <input
                                    type="text"
                                    value={signerTitle}
                                    onChange={e => setSignerTitle(e.target.value)}
                                    placeholder="e.g. DGCA Director General"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                    <Calendar className="w-3 h-3" /> Date *
                                  </label>
                                  <input
                                    type="date"
                                    value={signerDate}
                                    onChange={e => setSignerDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={() => handleSave(true)}
                                disabled={isSaving || !signerName.trim() || !signerTitle.trim()}
                                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                  saveSuccess === 'complete'
                                    ? 'bg-emerald-500 text-white'
                                    : !signerName.trim() || !signerTitle.trim()
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98]'
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saveSuccess === 'complete' ? (
                                  <><Check className="w-4 h-4" /> Carrier Certified — Pipeline at 100%</>
                                ) : (
                                  <><Award className="w-4 h-4" /> Grant DGCA Certification to {selectedProject.name}</>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // ── Carrier: awaiting certification ──
                      return (
                        <div className="py-12 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-6">
                            <Award className="w-8 h-8 text-slate-300" />
                          </div>
                          <h4 className="text-lg font-black text-slate-700">Awaiting DGCA Certification</h4>
                          <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
                            All prerequisite stages must be verified by DGCA before certification is granted.
                          </p>
                          <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
                            {prereqStatus.map(pr => (
                              <div key={pr.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${pr.done ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {pr.done
                                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                                <span className="text-xs font-bold">{pr.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ════════════════════════════════════════
                        INFO (pending / agreement_sent)
                    ════════════════════════════════════════ */}
                    {workflow?.type === 'info' && (
                      <div className="py-12 text-center">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-500">
                          {stageMilestone === 'pending'
                            ? 'This carrier is awaiting agreement dispatch from DGCA.'
                            : 'The agreement has been sent. Awaiting carrier signature in the Ledger tab.'}
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
