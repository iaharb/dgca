import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, DollarSign, Shield, TrendingUp, AlertTriangle,
  Eye, CheckCircle, XCircle, Loader2, X, AlertCircle, Send,
  Clock, CreditCard, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const USD_TO_KD = 0.308;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:         { label: 'Draft',          color: 'text-slate-500',   bg: 'bg-slate-100',   border: 'border-slate-200'  },
  submitted:     { label: 'Submitted',      color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200'   },
  dgca_approved: { label: 'DGCA Approved',  color: 'text-teal-600',    bg: 'bg-teal-50',     border: 'border-teal-200'   },
  paid:          { label: 'Paid',           color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200'},
  rejected:      { label: 'Rejected',       color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200'    },
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface Invoice {
  id: string;
  airline_id: string;
  period_month: string;
  pax_count: number;
  desk_count: number;
  gross_revenue_usd: number;
  gross_revenue_kd: number;
  dgca_share_kd: number;
  ops_share_kd: number;
  sna_deductions_kd: number;
  late_fees_kd: number;
  net_dgca_kd: number;
  net_ops_kd: number;
  status: string;
  submitted_at?: string;
  approved_at?: string;
  paid_at?: string;
  rejection_reason?: string;
  notes?: string;
  airlines?: { name: string; iata_code: string };
}

interface Props { userType: string; airlineCode?: string }

// ─────────────────────────────────────────────────────────────────────────────
export const InvoicingView: React.FC<Props> = ({ userType, airlineCode }) => {
  const [invoices,     setInvoices]     = useState<Invoice[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Invoice | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const isDGCA    = userType === 'dgca';
  const isOps     = userType === 'operations_partner';
  const isCarrier = userType === 'carrier';

  useEffect(() => { fetchInvoices(); }, [airlineCode, userType]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('*, airlines(name, iata_code)')
        .order('period_month', { ascending: false });

      if (isCarrier && airlineCode) {
        const { data: al } = await supabase.from('airlines').select('id').eq('iata_code', airlineCode).single();
        if (al) query = query.eq('airline_id', al.id);
      }
      const { data } = await query;
      setInvoices(data || []);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (inv: Invoice) => {
    setProcessingId(inv.id);
    await supabase.from('invoices').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', inv.id);
    await fetchInvoices();
    setProcessingId(null);
  };

  const handleApprove = async (inv: Invoice) => {
    setProcessingId(inv.id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('invoices').update({
      status: 'dgca_approved', approved_at: new Date().toISOString(), approved_by: user?.id
    }).eq('id', inv.id);
    // Create pending payment records
    await supabase.from('payments').insert([
      { invoice_id: inv.id, airline_id: inv.airline_id, payment_type: 'revenue_dgca',
        description: `DGCA 65% — ${inv.airlines?.name} ${periodLabel(inv.period_month)}`,
        amount_kd: inv.net_dgca_kd, direction: 'carrier_to_ops', status: 'approved' },
      { invoice_id: inv.id, airline_id: inv.airline_id, payment_type: 'revenue_ops',
        description: `Ops 35% — ${inv.airlines?.name} ${periodLabel(inv.period_month)}`,
        amount_kd: inv.net_ops_kd, direction: 'ops_to_dgca', status: 'approved' },
    ]);
    await fetchInvoices();
    setProcessingId(null);
    setSelected(null);
  };

  const handleReject = async (inv: Invoice, reason: string) => {
    setProcessingId(inv.id);
    await supabase.from('invoices').update({ status: 'rejected', rejection_reason: reason }).eq('id', inv.id);
    await fetchInvoices();
    setProcessingId(null);
    setSelected(null);
  };

  const periodLabel = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);

  const stats = {
    gross:    invoices.reduce((a, i) => a + +i.gross_revenue_kd, 0),
    dgca:     invoices.reduce((a, i) => a + +i.net_dgca_kd,     0),
    ops:      invoices.reduce((a, i) => a + +i.net_ops_kd,      0),
    sna:      invoices.reduce((a, i) => a + +i.sna_deductions_kd, 0),
    late:     invoices.reduce((a, i) => a + +i.late_fees_kd,    0),
    pending:  invoices.filter(i => i.status === 'submitted').length,
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
          { label: 'Total Gross Revenue', val: stats.gross, color: 'text-slate-700', bg: 'bg-slate-50', icon: DollarSign },
          { label: 'DGCA Net (65%)',       val: stats.dgca,  color: 'text-blue-600',  bg: 'bg-blue-50',  icon: Shield    },
          { label: 'Ops Partner (35%)',    val: stats.ops,   color: 'text-indigo-600',bg: 'bg-indigo-50',icon: TrendingUp},
          { label: 'SNA + Late Fees',      val: stats.sna + stats.late, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-xl font-black ${s.color} mt-1`}>
              {fmt(s.val)} <span className="text-[10px] text-slate-400 font-bold">KD</span>
            </p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {isDGCA && stats.pending > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            {stats.pending} invoice{stats.pending !== 1 ? 's' : ''} awaiting your DGCA approval
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all','draft','submitted','dgca_approved','paid','rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filterStatus === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
            }`}>
            {s === 'all' ? 'All' : STATUS_CFG[s]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900">Invoice Ledger</h3>
          <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {filtered.length} Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                {['Carrier','Period','PAX','Gross KD','DGCA 65%','Ops 35%','SNA Ded.','Late Fees','Net DGCA','Status','Actions']
                  .map((h, i) => <th key={i} className={`p-4 ${i >= 2 && i <= 8 ? 'text-right' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(inv => {
                const cfg = STATUS_CFG[inv.status] || STATUS_CFG.draft;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-[9px] font-black text-blue-700">
                          {inv.airlines?.iata_code}
                        </div>
                        <span className="text-sm font-bold text-slate-900 max-w-[130px] truncate">{inv.airlines?.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-700 whitespace-nowrap">{periodLabel(inv.period_month)}</td>
                    <td className="p-4 text-right text-sm text-slate-600">{Number(inv.pax_count).toLocaleString()}</td>
                    <td className="p-4 text-right text-sm font-medium text-slate-700">{fmt(+inv.gross_revenue_kd)}</td>
                    <td className="p-4 text-right text-sm font-medium text-blue-600">{fmt(+inv.dgca_share_kd)}</td>
                    <td className="p-4 text-right text-sm font-medium text-indigo-600">{fmt(+inv.ops_share_kd)}</td>
                    <td className="p-4 text-right">
                      {+inv.sna_deductions_kd > 0
                        ? <span className="text-sm font-bold text-red-600">-{fmt(+inv.sna_deductions_kd)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-4 text-right">
                      {+inv.late_fees_kd > 0
                        ? <span className="text-sm font-bold text-orange-600">+{fmt(+inv.late_fees_kd)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-4 text-right text-sm font-black text-emerald-700">{fmt(+inv.net_dgca_kd)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(inv)} title="View"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        {isOps && inv.status === 'draft' && (
                          <button onClick={() => handleSubmit(inv)} disabled={processingId === inv.id}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1">
                            {processingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Submit
                          </button>
                        )}
                        {isDGCA && inv.status === 'submitted' && (
                          <button onClick={() => setSelected(inv)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="p-10 text-center text-slate-400 text-sm">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <InvoiceModal
            key={selected.id}
            invoice={selected}
            userType={userType}
            processing={processingId === selected.id}
            onClose={() => setSelected(null)}
            onApprove={() => handleApprove(selected)}
            onReject={(r) => handleReject(selected, r)}
            periodLabel={periodLabel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
interface ModalProps {
  invoice: Invoice; userType: string; processing: boolean;
  onClose: () => void; onApprove: () => void;
  onReject: (r: string) => void; periodLabel: (d: string) => string;
}

const InvoiceModal: React.FC<ModalProps> = ({ invoice, userType, processing, onClose, onApprove, onReject, periodLabel }) => {
  const [showReject, setShowReject] = useState(false);
  const [reason,     setReason]     = useState('');
  const isDGCA = userType === 'dgca';

  const lines = [
    { label: `Passenger Charges  (${Number(invoice.pax_count).toLocaleString()} PAX × KD ${(2 * USD_TO_KD).toFixed(3)})`,
      amount: +invoice.pax_count * 2 * USD_TO_KD, type: 'credit' as const },
    { label: `Check-in Desk Charges  (${invoice.desk_count} desks × KD ${(150 * USD_TO_KD).toFixed(3)})`,
      amount: +invoice.desk_count * 150 * USD_TO_KD, type: 'credit' as const },
    ...( +invoice.sna_deductions_kd > 0
      ? [{ label: `SNA Penalty Deduction — Ops Partner Liability  (Annex 10 § 7.4.2)`,
           amount: -+invoice.sna_deductions_kd, type: 'debit' as const }] : []),
    ...( +invoice.late_fees_kd > 0
      ? [{ label: `Late Payment Penalty  (${Math.round(+invoice.late_fees_kd / 1000)} days × KD 1,000)  (Annex 10 § 8.3)`,
           amount: +invoice.late_fees_kd, type: 'fee' as const }] : []),
  ];

  const typeColor = { credit:'text-slate-700', debit:'text-red-600', fee:'text-orange-600' };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tax Invoice • DGCA Kuwait</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900">{invoice.airlines?.name}</h3>
            <p className="text-sm font-bold text-slate-500 mt-0.5">{periodLabel(invoice.period_month)} — Service Period</p>
          </div>
          <div className="flex items-center gap-3">
            {(() => { const c = STATUS_CFG[invoice.status]; return (
              <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${c.color} ${c.bg} ${c.border}`}>
                {c.label}
              </span>
            ); })()}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Line items */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Line Items</h4>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className={`text-sm font-medium ${typeColor[l.type]} max-w-[340px]`}>{l.label}</span>
                  <span className={`text-sm font-black ${typeColor[l.type]} ml-4 whitespace-nowrap`}>
                    {l.amount >= 0 ? '+' : ''}{fmt(Math.abs(l.amount))} KD
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gross */}
          <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-sm font-black text-slate-900">Gross Revenue</span>
            <span className="text-xl font-black text-slate-900">{fmt(+invoice.gross_revenue_kd)} KD</span>
          </div>

          {/* Split */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">DGCA Share (65%)</p>
              <p className="text-xl font-black text-blue-700">{fmt(+invoice.dgca_share_kd)} KD</p>
              {+invoice.late_fees_kd > 0 && (
                <p className="text-[10px] font-bold text-orange-600 mt-1">+{fmt(+invoice.late_fees_kd)} KD late fees</p>
              )}
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-[11px] font-black text-blue-700">Net: {fmt(+invoice.net_dgca_kd)} KD</p>
              </div>
            </div>
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ops Partner (35%)</p>
              <p className="text-xl font-black text-indigo-700">{fmt(+invoice.ops_share_kd)} KD</p>
              {+invoice.sna_deductions_kd > 0 && (
                <p className="text-[10px] font-bold text-red-600 mt-1">-{fmt(+invoice.sna_deductions_kd)} KD SNA deduction</p>
              )}
              <div className="mt-2 pt-2 border-t border-indigo-200">
                <p className="text-[11px] font-black text-indigo-700">Net: {fmt(+invoice.net_ops_kd)} KD</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Approval Timeline</h4>
            <div className="flex items-center gap-0">
              {[
                { label: 'Submitted', date: invoice.submitted_at,  done: !!invoice.submitted_at  },
                { label: 'Approved',  date: invoice.approved_at,   done: !!invoice.approved_at   },
                { label: 'Paid',      date: invoice.paid_at,       done: !!invoice.paid_at       },
              ].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      step.done ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-200'}`}>
                      {step.done
                        ? <CheckCircle className="w-4 h-4 text-white" />
                        : <Clock className="w-4 h-4 text-slate-300" />}
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{step.label}</p>
                    {step.date && (
                      <p className="text-[8px] text-slate-400">{new Date(step.date).toLocaleDateString()}</p>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`h-px flex-1 mb-5 ${arr[i+1].done ? 'bg-teal-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* DGCA Actions */}
          {isDGCA && invoice.status === 'submitted' && !showReject && (
            <div className="flex gap-3 pt-2">
              <button onClick={onApprove} disabled={processing}
                className="flex-1 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve & Release Payments
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex-1 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
          {isDGCA && invoice.status === 'submitted' && showReject && (
            <div className="space-y-3 pt-2">
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="Enter rejection reason (required)…"
                className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => onReject(reason)} disabled={!reason.trim() || processing}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50">
                  Confirm Rejection
                </button>
                <button onClick={() => setShowReject(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-sm transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notes & rejection reason */}
          {invoice.notes && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-sm text-amber-800">{invoice.notes}</p>
            </div>
          )}
          {invoice.rejection_reason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{invoice.rejection_reason}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
