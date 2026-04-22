import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Clock, Loader2, Calendar,
  Banknote, ShieldCheck, AlertCircle, ArrowRight, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  revenue_dgca: { label: 'DGCA 65% Revenue Share', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  revenue_ops:  { label: 'Ops 35% Revenue Share',  color: 'text-indigo-700', bg: 'bg-indigo-50' },
  sna_penalty:  { label: 'SNA Penalty',            color: 'text-red-700',    bg: 'bg-red-50'    },
  late_fee:     { label: 'Late Payment Penalty',   color: 'text-orange-700', bg: 'bg-orange-50' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending_approval: { label: 'Awaiting Approval', color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200'  },
  approved:         { label: 'Approved',          color: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-teal-200'   },
  rejected:         { label: 'Rejected',          color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200'    },
  processed:        { label: 'Processed',         color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200'},
};

interface Payment {
  id: string;
  invoice_id: string;
  airline_id: string;
  payment_type: string;
  description: string;
  amount_kd: number;
  direction: string;
  status: string;
  dgca_approved_by?: string;
  dgca_approved_at?: string;
  rejection_reason?: string;
  payment_date?: string;
  bank_reference?: string;
  notes?: string;
  created_at: string;
  airlines?: { name: string; iata_code: string };
  invoices?: { period_month: string };
}

interface Props { userType: string; airlineCode?: string }

// ─────────────────────────────────────────────────────────────────────────────
export const PaymentsView: React.FC<Props> = ({ userType, airlineCode }) => {
  const [payments,     setPayments]     = useState<Payment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeCard,   setActiveCard]   = useState<string | null>(null);

  const isDGCA = userType === 'dgca';

  useEffect(() => { fetchPayments(); }, [airlineCode, userType]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('payments')
        .select('*, airlines(name, iata_code), invoices(period_month)')
        .order('created_at', { ascending: false });
      if (airlineCode) {
        const { data: al } = await supabase.from('carriers').select('id').eq('iata_code', airlineCode).single();
        if (al) q = q.eq('airline_id', al.id);
      }
      const { data } = await q;
      setPayments(data || []);
    } finally { setLoading(false); }
  };

  const handleApprove = async (p: Payment) => {
    setProcessingId(p.id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('payments').update({
      status: 'approved',
      dgca_approved_by: user?.id,
      dgca_approved_at: new Date().toISOString(),
    }).eq('id', p.id);
    await fetchPayments();
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    await supabase.from('payments').update({
      status: 'rejected',
      rejection_reason: rejectReason,
    }).eq('id', rejectTarget.id);
    setRejectTarget(null);
    setRejectReason('');
    await fetchPayments();
    setProcessingId(null);
  };

  const periodLabel = (d?: string) => {
    if (!d) return '—';
    const dt = new Date(d + 'T12:00:00');
    return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const dirLabel = (dir: string) =>
    dir === 'carrier_to_ops' ? 'Carrier → Ops Partner' :
    dir === 'ops_to_dgca'    ? 'Ops Partner → DGCA'    :
    dir === 'dgca_to_carrier'? 'DGCA → Carrier'        : dir;

  const pending   = payments.filter(p => p.status === 'pending_approval');
  const history   = payments.filter(p => p.status !== 'pending_approval');

  const stats = {
    pendingKD:   pending.reduce((a, p) => a + +p.amount_kd, 0),
    approvedKD:  payments.filter(p => p.status === 'approved').reduce((a, p) => a + +p.amount_kd, 0),
    processedKD: payments.filter(p => p.status === 'processed').reduce((a, p) => a + +p.amount_kd, 0),
    totalCount:  payments.length,
  };

  if (loading) return (
    <div className="h-48 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'pending',   label: 'Pending Approval',   val: stats.pendingKD,   color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock,       isCount: false },
          { id: 'approved',  label: 'Approved (Queued)',  val: stats.approvedKD,  color: 'text-teal-600',    bg: 'bg-teal-50',    icon: CheckCircle, isCount: false },
          { id: 'processed', label: 'Total Processed',    val: stats.processedKD, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Banknote,    isCount: false },
          { id: 'count',     label: 'Total Transactions', val: stats.totalCount,  color: 'text-slate-700',   bg: 'bg-slate-50',   icon: ShieldCheck, isCount: true  },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} onClick={() => setActiveCard(s.id)}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
            <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-xl font-black ${s.color} mt-1`}>
              {s.isCount ? s.val.toLocaleString() : <>
                {fmt(s.val as number)} <span className="text-[10px] text-slate-400 font-bold">KD</span>
              </>}
            </p>
            <p className="text-[9px] text-blue-500 font-bold mt-2 uppercase tracking-widest">Click for breakdown →</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Split Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-3">Monthly Revenue Split — Per Tender</p>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-black">65%</p>
            <p className="text-sm font-bold text-blue-200">DGCA Kuwait</p>
          </div>
          <div className="flex-1 h-4 rounded-full bg-blue-800 overflow-hidden">
            <div className="h-full bg-white/30 w-[65%] rounded-full" />
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">35%</p>
            <p className="text-sm font-bold text-indigo-200">Ops Partner (Collins / PanWorld)</p>
          </div>
        </div>
        <p className="text-[10px] text-blue-300 mt-3 font-bold">
          All payments subject to DGCA approval before release. Annex 10 § 6.2
        </p>
      </div>

      {/* ── Pending Approvals ─────────────────────────────────────────────── */}
      {isDGCA && pending.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-lg">Pending Your Approval</h3>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
              {pending.length} items
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map(p => {
              const tc = TYPE_CFG[p.payment_type] || { label: p.payment_type, color: 'text-slate-700', bg: 'bg-slate-50' };
              return (
                <motion.div key={p.id} whileHover={{ y: -2 }}
                  className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tc.color} ${tc.bg} mb-2`}>
                        {tc.label}
                      </div>
                      <p className="text-sm font-bold text-slate-900">{p.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {p.airlines?.iata_code} • {periodLabel(p.invoices?.period_month)}
                      </p>
                    </div>
                    <p className="text-xl font-black text-slate-900 ml-4 whitespace-nowrap">{fmt(+p.amount_kd)} <span className="text-[10px] font-bold text-slate-400">KD</span></p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {dirLabel(p.direction)}
                    <ArrowRight className="w-3 h-3" />
                  </div>
                  {isDGCA && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(p)} disabled={processingId === p.id}
                        className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all disabled:opacity-50">
                        {processingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Approve
                      </button>
                      <button onClick={() => setRejectTarget(p)}
                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {!isDGCA && (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm font-bold text-blue-800">
            All payments are released only after DGCA authorisation. Pending items are in DGCA review queue.
          </p>
        </div>
      )}

      {/* ── Payment History ───────────────────────────────────────────────── */}
      <div>
        <h3 className="font-bold text-slate-900 text-lg mb-4">Payment History</h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                  {['Type','Carrier','Period','Description','Amount KD','Direction','Status','Date'].map((h, i) => (
                    <th key={i} className={`p-4 ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map(p => {
                  const tc  = TYPE_CFG[p.payment_type] || { label: p.payment_type, color: 'text-slate-700', bg: 'bg-slate-50' };
                  const sc  = STATUS_CFG[p.status] || STATUS_CFG.processed;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tc.color} ${tc.bg}`}>
                          {tc.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-[9px] font-black text-blue-700">
                            {p.airlines?.iata_code}
                          </div>
                          <span className="text-sm font-bold text-slate-700">{p.airlines?.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{periodLabel(p.invoices?.period_month)}</td>
                      <td className="p-4 text-sm text-slate-600 max-w-[200px] truncate">{p.description}</td>
                      <td className="p-4 text-right text-sm font-black text-slate-900">{fmt(+p.amount_kd)}</td>
                      <td className="p-4 text-[10px] font-bold text-slate-500 whitespace-nowrap">{dirLabel(p.direction)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${sc.color} ${sc.bg} ${sc.border}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                        {p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString()
                          : p.dgca_approved_at
                          ? new Date(p.dgca_approved_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr><td colSpan={8} className="p-10 text-center text-slate-400 text-sm">No payment history yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectTarget(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-black text-slate-900">Reject Payment</h4>
                <button onClick={() => setRejectTarget(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">{rejectTarget.description}</p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
                placeholder="Enter rejection reason (required)…"
                className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={handleReject} disabled={!rejectReason.trim() || !!processingId}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50">
                  Confirm Rejection
                </button>
                <button onClick={() => setRejectTarget(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-sm transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {activeCard && (
          <PaymentBreakdownModal
            cardId={activeCard}
            payments={payments}
            onClose={() => setActiveCard(null)}
            periodLabel={periodLabel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment Stat Card Breakdown Modal
// ─────────────────────────────────────────────────────────────────────────────
interface PBProps {
  cardId: string; payments: Payment[];
  onClose: () => void; periodLabel: (d?: string) => string;
}

const PaymentBreakdownModal: React.FC<PBProps> = ({ cardId, payments, onClose, periodLabel }) => {
  const STATUS_FILTER: Record<string, string> = {
    pending:   'pending_approval',
    approved:  'approved',
    processed: 'processed',
    count:     'all',
  };
  const CARD_META: Record<string, { label: string; color: string; note: string }> = {
    pending:   { label: 'Awaiting DGCA Approval', color: 'text-amber-700',   note: 'Payments held pending DGCA authorisation' },
    approved:  { label: 'Approved — Queued',       color: 'text-teal-700',    note: 'DGCA-approved, awaiting processing' },
    processed: { label: 'Total Processed',          color: 'text-emerald-700', note: 'Successfully settled payments' },
    count:     { label: 'All Transactions',          color: 'text-slate-700',   note: 'Every payment record across all statuses' },
  };

  const statusFilter = STATUS_FILTER[cardId];
  const meta = CARD_META[cardId];
  const filtered = statusFilter === 'all' ? payments : payments.filter(p => p.status === statusFilter);

  // Group by carrier
  const byCarrier: Record<string, { name: string; rows: Payment[]; total: number }> = {};
  filtered.forEach(p => {
    const key = p.airlines?.iata_code || 'UNK';
    if (!byCarrier[key]) byCarrier[key] = { name: p.airlines?.name || 'Unknown', rows: [], total: 0 };
    byCarrier[key].rows.push(p);
    byCarrier[key].total += +p.amount_kd;
  });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Payment Breakdown</p>
            <h3 className={`text-2xl font-black ${meta.color}`}>{meta.label}</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">{meta.note}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          {Object.entries(byCarrier).length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">No payments in this category.</p>
          )}
          {Object.entries(byCarrier).map(([iata, group]) => (
            <div key={iata}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-[9px] font-black text-blue-700">{iata}</div>
                <span className="text-sm font-black text-slate-900">{group.name}</span>
                <span className="ml-auto text-sm font-black text-slate-700">{fmt(group.total)} KD</span>
              </div>
              <div className="space-y-2 pl-11">
                {group.rows.map(p => {
                  const tc = TYPE_CFG[p.payment_type] || { label: p.payment_type, color: 'text-slate-700', bg: 'bg-slate-50' };
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tc.color} ${tc.bg} mb-1`}>{tc.label}</div>
                        <p className="text-xs font-bold text-slate-700">{p.description}</p>
                        <p className="text-[9px] text-slate-400">{periodLabel(p.invoices?.period_month)}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900 ml-4 whitespace-nowrap">{fmt(+p.amount_kd)} KD</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Grand total */}
          {filtered.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-slate-900 rounded-2xl text-white">
              <span className="text-sm font-black uppercase tracking-widest">Grand Total</span>
              <span className="text-xl font-black">{fmt(filtered.reduce((a, p) => a + +p.amount_kd, 0))} KD</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
