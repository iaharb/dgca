import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Calendar, ShieldCheck, AlertCircle, Check,
  Loader2, QrCode, PenLine, Type, X,
  Building2, User, BadgeCheck, Eraser
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Agreement {
  id: string;
  version: string;
  status: string;
  signed_at: string | null;
  notified_at: string | null;
  airline_id: string;
  signer_name: string | null;
  signer_title: string | null;
  signer_date: string | null;
  signature_data: string | null;
  airlines: { name: string; iata_code: string };
}

interface AgreementsViewProps {
  userType?: 'dgca' | 'carrier' | 'operations_partner' | null;
  airlineCode?: string | null;
}

/* ─── Signature Canvas ───────────────────────────────────────────────────── */
const SignatureCanvas: React.FC<{ onDraw: (dataUrl: string | null) => void }> = ({ onDraw }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    drawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    hasStrokes.current = true;
  };

  const endDraw = () => {
    drawing.current = false;
    if (hasStrokes.current && canvasRef.current) {
      onDraw(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
    onDraw(null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={440}
        height={130}
        className="w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button
        type="button"
        onClick={clearCanvas}
        className="absolute top-2 right-2 p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
        title="Clear"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center mt-1">
        Draw your signature above
      </p>
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────────────────── */
export const AgreementsView: React.FC<AgreementsViewProps> = ({ userType, airlineCode }) => {
  const [agreements, setAgreements]   = useState<Agreement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [openSignId, setOpenSignId]   = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Sign form state
  const [sigCarrierName, setSigCarrierName] = useState('');
  const [sigPersonName,  setSigPersonName]  = useState('');
  const [sigTitle,       setSigTitle]       = useState('');
  const [sigDate,        setSigDate]        = useState(() => new Date().toISOString().slice(0, 10));
  const [sigMethod,      setSigMethod]      = useState<'draw' | 'type'>('draw');
  const [canvasData,     setCanvasData]     = useState<string | null>(null);
  const [typeSignature,  setTypeSignature]  = useState('');

  useEffect(() => { fetchAgreements(); }, [airlineCode]);

  const fetchAgreements = async () => {
    try {
      let query = supabase
        .from('agreements')
        .select(`*, airlines(name, iata_code)`)
        .order('created_at', { ascending: false });

      if (userType === 'carrier' && airlineCode) {
        const { data: myAirline } = await supabase
          .from('airlines').select('id').eq('iata_code', airlineCode).maybeSingle();
        if (myAirline) query = query.eq('airline_id', myAirline.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAgreements((data as any) || []);
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ── Prefill sign form when panel opens ──────────────── */
  const openSignPanel = (ag: Agreement) => {
    setSigCarrierName(ag.airlines?.name || '');
    setSigPersonName(ag.signer_name || '');
    setSigTitle(ag.signer_title || '');
    setSigDate(ag.signer_date || new Date().toISOString().slice(0, 10));
    setSigMethod('draw');
    setCanvasData(null);
    setTypeSignature('');
    setOpenSignId(ag.id);
  };

  /* ── Effective signature value ───────────────────────── */
  const effectiveSig = sigMethod === 'draw' ? canvasData : typeSignature.trim();

  const canSubmit =
    sigPersonName.trim().length > 0 &&
    sigTitle.trim().length > 0 &&
    sigDate.length > 0 &&
    !!effectiveSig;

  /* ── Submit ──────────────────────────────────────────── */
  const handleSignAndSubmit = async () => {
    if (!canSubmit || !openSignId) return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      // 1. Update agreement status
      await supabase.from('agreements').update({
        status:         'signed',
        signed_at:      now,
        signer_name:    sigPersonName.trim(),
        signer_title:   sigTitle.trim(),
        signer_date:    sigDate,
        signature_data: effectiveSig,
      }).eq('id', openSignId);

      // 2. Write integration milestone so the Pipeline Board stage advances
      await supabase.from('integration_milestones').upsert({
        agreement_id:   openSignId,
        milestone_type: 'agreement_signed',
        status:         'completed',
        completed_at:   now,
      }, { onConflict: 'agreement_id,milestone_type' });

      setSubmitSuccess(openSignId);
      setTimeout(async () => {
        setOpenSignId(null);
        setSubmitSuccess(null);
        await fetchAgreements();
      }, 2200);
    } catch (e) {
      console.error('Sign error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Agreement HTML builder (download / preview) ─────── */
  const buildAgreementHtml = (
    iata: string,
    airlineName?: string,
    signed?: boolean,
    signerName?: string,
    signerTitle?: string,
    signerDate?: string,
    signatureData?: string | null
  ) => {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const ref   = `DGCA/KWI/ANX10/${iata}/2026`;
    const qrPayload = encodeURIComponent(`${ref} | Status: ${signed ? 'SIGNED' : 'PENDING'} | ${today}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${qrPayload}&bgcolor=ffffff&color=1e3a5f&margin=8`;

    const sigBlock = signed && signerName
      ? `<div class="signed-name">${signerName}</div>
         <div style="font-size:10px;color:#475569">${signerTitle || ''}</div>
         <div style="font-size:10px;color:#475569">Date: ${signerDate || today}</div>
         ${signatureData && signatureData.startsWith('data:image')
           ? `<img src="${signatureData}" style="height:40px;margin-top:6px;border-bottom:1px solid #94a3b8" alt="Signature"/>`
           : signatureData ? `<div style="font-size:20px;font-family:Georgia,serif;font-style:italic;color:#1e3a5f;margin-top:4px">${signatureData}</div>` : ''
         }`
      : 'Name: ______________________________<br>Title: ___________________________<br>Date: _____ / _____ / 2026';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>DGCA Annex 10 Agreement — ${iata}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, serif; max-width: 820px; margin: 50px auto; color: #1e293b; line-height: 1.75; padding: 0 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 36px; }
    .header-left .logo { font-size: 10px; font-weight: 900; letter-spacing: 5px; color: #64748b; text-transform: uppercase; }
    .header-left h1 { font-size: 18px; font-weight: bold; margin: 6px 0 3px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
    .header-left .ref { font-size: 10px; color: #94a3b8; }
    .qr-block { text-align: center; }
    .qr-block img { display: block; border: 1px solid #e2e8f0; border-radius: 8px; }
    .qr-block .qr-label { font-size: 8px; color: #94a3b8; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
    h2 { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-top: 28px; color: #1e3a5f; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    p, li { font-size: 12px; margin: 6px 0; }
    .clause { background: #f8fafc; border-left: 4px solid #1e3a5f; padding: 10px 14px; margin: 10px 0; font-size: 11.5px; }
    .parties { display: flex; gap: 24px; margin: 16px 0; }
    .party { flex: 1; background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 11.5px; border: 1px solid #e2e8f0; }
    .party strong { display: block; font-size: 12px; margin-bottom: 4px; color: #0f172a; font-weight: 900; }
    .sig-block { display: flex; gap: 40px; margin-top: 50px; }
    .sig { flex: 1; border-top: 2px solid #1e3a5f; padding-top: 10px; font-size: 11px; color: #334155; }
    .signed-name { font-weight: 900; font-size: 16px; color: #0f172a; font-style: italic; margin-bottom: 2px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 9px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; background: ${signed ? '#dcfce7' : '#fef9c3'}; color: ${signed ? '#166534' : '#854d0e'}; margin-bottom: 16px; }
    @media print { body { margin: 30px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">State of Kuwait &mdash; Directorate General of Civil Aviation</div>
      <h1>Annex 10 End-User Agreement</h1>
      <p class="ref">Reference: ${ref} &nbsp;|&nbsp; Version 1.0 &nbsp;|&nbsp; ${today}</p>
      <br>
      <span class="status-badge">${signed ? '✓ Signed & Certified' : '⏳ Awaiting Signature'}</span>
    </div>
    <div class="qr-block">
      <img src="${qrUrl}" width="130" height="130" alt="Verification QR" />
      <div class="qr-label">Verify Document</div>
    </div>
  </div>

  <h2>Parties to this Agreement</h2>
  <div class="parties">
    <div class="party">
      <strong>The Authority</strong>
      Directorate General of Civil Aviation (DGCA)<br>
      Kuwait International Airport, Terminal 2<br>
      State of Kuwait<br>
      Ref: DGCA/KWI/LEGAL/2026
    </div>
    <div class="party">
      <strong>The Carrier</strong>
      ${airlineName || iata}<br>
      IATA Code: <strong>${iata}</strong><br>
      Registered Carrier — ICAO Annex 10 Participant
    </div>
  </div>

  <h2>1. Scope and Purpose</h2>
  <p>This Agreement governs the terms under which <strong>${airlineName || iata}</strong> ("the Carrier") is granted access to the DGCA Annex 10 infrastructure at Kuwait International Airport (IATA: KWI), including check-in workstations, AODB integration nodes, consumable resources, and associated billing facilities under the V-Portal governance framework.</p>

  <h2>2. Integration Milestones &amp; SAT</h2>
  <div class="clause">The Carrier must complete all System Acceptance Testing (SAT) milestones — including hardware verification, network readiness, and formal sign-off — within <strong>90 calendar days</strong> of the date of this Agreement. Failure triggers the Deemed Acceptance clause under Section 5 below.</div>

  <h2>3. Financial Terms</h2>
  <p>Billing is calculated monthly on the following basis:</p>
  <ul>
    <li><strong>PAX Fee:</strong> KD 0.616 per departing passenger (USD 2.00 × 0.308)</li>
    <li><strong>Workstation Fee:</strong> KD 77.00 per unit per month (USD 250.00 × 0.308)</li>
    <li>Invoices are due no later than the 15th of the following month.</li>
  </ul>
  <div class="clause"><strong>Revenue Distribution:</strong> DGCA retains 65% of all PAX-based fees. The Appointed Operations Partner retains 35%. All workstation fees accrue entirely to DGCA infrastructure accounts.</div>

  <h2>4. Consumables Policy</h2>
  <p>Monthly allocations of Thermal Bag Tags (45,000 units), ATB Boarding Passes (35,000 units), and VIP Lounge Vouchers (3,000 units) are provided subject to published thresholds. Overages are subject to Annex 10 Penalty Schedule B.</p>

  <h2>5. Deemed Acceptance Clause</h2>
  <div class="clause">Pursuant to DGCA Directive KWI/2024/03: if the Carrier fails to formally respond to this Agreement within <strong>14 calendar days</strong> of dispatch, the Agreement shall be considered fully accepted and binding without further action by either party.</div>

  <h2>6. Governing Law</h2>
  <p>This Agreement is governed exclusively by the laws of the State of Kuwait. Any dispute shall be subject to the exclusive jurisdiction of the competent Kuwaiti courts.</p>

  <div class="sig-block">
    <div class="sig">
      <strong>Authorised Signatory — DGCA</strong><br><br>
      Name: ______________________________<br>
      Title: Director General, Civil Aviation<br>
      Date: _____ / _____ / 2026<br>
      Stamp: [OFFICIAL SEAL]
    </div>
    <div class="sig">
      <strong>Authorised Signatory — ${airlineName || iata}</strong><br><br>
      ${sigBlock}
    </div>
  </div>
</body>
</html>`;
  };


  const handlePreview = (ag: Agreement) => {
    const html = buildAgreementHtml(
      ag.airlines?.iata_code, ag.airlines?.name,
      ag.status === 'signed' || ag.status === 'active',
      ag.signer_name || undefined, ag.signer_title || undefined,
      ag.signer_date || undefined, ag.signature_data
    );
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  /* ── QR URL for inline display ───────────────────────── */
  const inlineQrUrl = (iata: string, signed: boolean) => {
    const ref = `DGCA/KWI/ANX10/${iata}/2026`;
    const payload = encodeURIComponent(`${ref} | Status: ${signed ? 'SIGNED' : 'PENDING'}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${payload}&bgcolor=ffffff&color=1e3a5f&margin=6`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const isCarrier    = userType === 'carrier';
  const isCertified  = agreements.some(ag => ag.status === 'active' || ag.status === 'signed');

  return (
    <div className="space-y-6">
      {/* ── Ledger Table ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-black font-display tracking-tight uppercase">Master Agreements Ledger</h3>
            <p className="text-xs text-slate-400 font-medium">Official Annex 10 Governance Records.</p>
          </div>
          {isCarrier && !isCertified && (
            <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl">
              <AlertCircle className="w-3.5 h-3.5" />
              Signature Required — Expand Row to Sign
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30 dark:bg-slate-900/50">
              <tr>
                <th className="px-8 py-5">Carrier / Identity</th>
                <th className="px-8 py-5">Version</th>
                <th className="px-8 py-5">Signed Date</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {agreements.map((ag) => {
                const isSigned = ag.status === 'signed' || ag.status === 'active';
                const isOpen   = openSignId === ag.id;
                const qrUrl    = inlineQrUrl(ag.airlines?.iata_code, isSigned);

                return (
                  <React.Fragment key={ag.id}>
                    {/* ── Row ── */}
                    <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-brand-600">
                            {ag.airlines?.iata_code}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">{ag.airlines?.name}</span>
                            {ag.signer_name && (
                              <span className="text-[10px] text-slate-400 font-medium">Signed by {ag.signer_name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">{ag.version}</span>
                      </td>
                      <td className="px-8 py-6 text-slate-500 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {ag.signed_at ? new Date(ag.signed_at).toLocaleDateString() : 'Pending'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {isSigned ? (
                          <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase">
                            <ShieldCheck className="w-4 h-4" /> {ag.status}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase">
                            <AlertCircle className="w-4 h-4" /> {ag.status}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">

                          <button
                            onClick={() => handlePreview(ag)}
                            className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-all"
                            title="Read Online"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* QR preview */}
                          <img
                            src={qrUrl}
                            alt="QR"
                            className="w-8 h-8 rounded border border-slate-200 opacity-60 hover:opacity-100 transition-opacity"
                            title={`Verify: DGCA/KWI/ANX10/${ag.airlines?.iata_code}/2026`}
                          />
                          {/* Sign / Expand toggle — show for unsigned, or DGCA */}
                          {(!isSigned || userType === 'dgca') && (
                            <button
                              onClick={() => isOpen ? setOpenSignId(null) : openSignPanel(ag)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                isOpen
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:scale-105'
                              }`}
                            >
                              {isOpen ? (
                                <><X className="w-3 h-3" /> Close</>
                              ) : (
                                <><PenLine className="w-3 h-3" /> {isSigned ? 'Re-sign' : 'Sign Online'}</>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Inline Sign Panel ── */}
                    <AnimatePresence>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-8 py-8 bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 border-t border-slate-100">
                                {submitSuccess === ag.id ? (
                                  <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center gap-4 py-8"
                                  >
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                      <Check className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">Agreement Signed</p>
                                    <p className="text-sm text-slate-500">Submission routed to DGCA Legal Node. Status updated.</p>
                                  </motion.div>
                                ) : (
                                  <div className="max-w-3xl mx-auto">
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
                                        <PenLine className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                          Electronic Agreement Signing
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-bold">
                                          DGCA/KWI/ANX10/{ag.airlines?.iata_code}/2026 — Legally binding under DGCA Directive KWI/2024/03
                                        </p>
                                      </div>
                                      {/* Inline QR */}
                                      <div className="ml-auto text-center">
                                        <img
                                          src={qrUrl}
                                          alt="QR"
                                          className="w-16 h-16 rounded-lg border border-slate-200 mx-auto"
                                        />
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Verify</p>
                                      </div>
                                    </div>

                                    {/* Form fields grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                      {/* Carrier Name */}
                                      <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                          <Building2 className="w-3 h-3" /> Carrier Name
                                        </label>
                                        <input
                                          type="text"
                                          value={sigCarrierName}
                                          onChange={e => setSigCarrierName(e.target.value)}
                                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                        />
                                      </div>
                                      {/* Person Name */}
                                      <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                          <User className="w-3 h-3" /> Authorised Person Name *
                                        </label>
                                        <input
                                          type="text"
                                          value={sigPersonName}
                                          onChange={e => setSigPersonName(e.target.value)}
                                          placeholder="Full legal name"
                                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                        />
                                      </div>
                                      {/* Title */}
                                      <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                          <BadgeCheck className="w-3 h-3" /> Title / Position *
                                        </label>
                                        <input
                                          type="text"
                                          value={sigTitle}
                                          onChange={e => setSigTitle(e.target.value)}
                                          placeholder="e.g. Director of Ground Operations"
                                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                        />
                                      </div>
                                      {/* Date */}
                                      <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                          <Calendar className="w-3 h-3" /> Signature Date *
                                        </label>
                                        <input
                                          type="date"
                                          value={sigDate}
                                          onChange={e => setSigDate(e.target.value)}
                                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                        />
                                      </div>
                                    </div>

                                    {/* Signature method toggle */}
                                    <div className="mb-4">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                        Signature Method *
                                      </label>
                                      <div className="flex rounded-2xl border border-slate-200 bg-white overflow-hidden w-fit mb-3">
                                        <button
                                          type="button"
                                          onClick={() => setSigMethod('draw')}
                                          className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                            sigMethod === 'draw' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                                          }`}
                                        >
                                          <PenLine className="w-3.5 h-3.5" /> Draw Signature
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSigMethod('type')}
                                          className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                            sigMethod === 'type' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                                          }`}
                                        >
                                          <Type className="w-3.5 h-3.5" /> Type Signature
                                        </button>
                                      </div>

                                      {sigMethod === 'draw' ? (
                                        <SignatureCanvas onDraw={setCanvasData} />
                                      ) : (
                                        <div>
                                          <input
                                            type="text"
                                            value={typeSignature}
                                            onChange={e => setTypeSignature(e.target.value)}
                                            placeholder="Type your full name as signature"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-900 italic focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                            style={{ fontFamily: 'Georgia, serif' }}
                                          />
                                          {typeSignature && (
                                            <div className="mt-2 p-3 bg-white rounded-xl border border-slate-100">
                                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Preview</p>
                                              <p className="text-2xl font-black text-slate-900 italic" style={{ fontFamily: 'Georgia, serif' }}>
                                                {typeSignature}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Info note */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 mb-5">
                                      <QrCode className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <p className="text-[11px] font-bold text-blue-700">
                                        Your electronic signature will be embedded in the agreement document with a QR verification code linked to reference <strong>DGCA/KWI/ANX10/{ag.airlines?.iata_code}/2026</strong>. This constitutes a legally binding submission under DGCA Directive KWI/2024/03.
                                      </p>
                                    </div>

                                    {/* Submit */}
                                    <button
                                      onClick={handleSignAndSubmit}
                                      disabled={isSubmitting || !canSubmit}
                                      className={`w-full py-4 rounded-[20px] font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                        !canSubmit
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xl shadow-brand-600/25 active:scale-[0.98]'
                                      }`}
                                    >
                                      {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : (
                                        <><ShieldCheck className="w-5 h-5" /> Confirm &amp; Submit Electronically</>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
              {agreements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-400 text-sm italic">
                    No agreement records found in core node.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
