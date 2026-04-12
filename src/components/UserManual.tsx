import React, { useRef } from 'react';
import {
  BookOpen, Printer, ChevronRight, LayoutDashboard, BarChart3,
  FileText, Users, Radio, LogIn, Plane, ShieldCheck, HardDrive,
  Network, CheckCircle2, FileWarning, FileCheck2, Tag, Ticket, Star,
  AlertCircle, PenLine, Send, Award, RefreshCw, Info,
  Lock, UserCog, Package,
} from 'lucide-react';

/* ─── Section heading helper ──────────────────────────────────────── */
const Section: React.FC<{ id: string; title: string; icon: React.ElementType; children: React.ReactNode }> = ({
  id, title, icon: Icon, children
}) => (
  <section id={id} className="mb-14 scroll-mt-8">
    <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-blue-100">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
    </div>
    {children}
  </section>
);

/* ─── Sub-section ─────────────────────────────────────────────────── */
const Sub: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-base font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
      <ChevronRight className="w-4 h-4" /> {title}
    </h3>
    <div className="pl-6 space-y-3 text-slate-700 text-sm leading-relaxed">{children}</div>
  </div>
);

/* ─── Role badge ──────────────────────────────────────────────────── */
const RoleBadge: React.FC<{ roles: string[] }> = ({ roles }) => {
  const map: Record<string, { label: string; cls: string }> = {
    dgca:               { label: 'DGCA',              cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    carrier:            { label: 'Carrier',           cls: 'bg-teal-100 text-teal-700 border-teal-200' },
    operations_partner: { label: 'Ops Partner',       cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  };
  return (
    <span className="inline-flex gap-1.5 flex-wrap">
      {roles.map(r => (
        <span key={r} className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${map[r]?.cls}`}>
          {map[r]?.label ?? r}
        </span>
      ))}
    </span>
  );
};

/* ─── Callout box ─────────────────────────────────────────────────── */
const Callout: React.FC<{ type?: 'info' | 'warn' | 'success'; children: React.ReactNode }> = ({
  type = 'info', children
}) => {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warn:    'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const Icon = type === 'info' ? Info : type === 'warn' ? AlertCircle : CheckCircle2;
  return (
    <div className={`flex gap-3 p-4 rounded-2xl border text-sm font-medium mb-4 ${styles[type]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};

/* ─── Steps helper ─────────────────────────────────────────────────── */
const Steps: React.FC<{ items: string[] }> = ({ items }) => (
  <ol className="space-y-2 mb-4">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 items-start">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
          {i + 1}
        </span>
        <span className="text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
      </li>
    ))}
  </ol>
);

/* ─── Phase row ───────────────────────────────────────────────────── */
const PhaseRow: React.FC<{ phase: string; label: string; icon: React.ElementType; color: string; whoActs: string[] }> = ({
  phase, label, icon: Icon, color, whoActs
}) => (
  <tr className="border-b border-slate-100 last:border-0">
    <td className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{phase}</td>
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-bold text-slate-900">{label}</span>
      </div>
    </td>
    <td className="py-3 px-4"><RoleBadge roles={whoActs} /></td>
  </tr>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
interface UserManualProps {
  userType?: string | null;
}

export const UserManual: React.FC<UserManualProps> = ({ userType }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>KWI Aviation Partner Portal — Operations User Manual</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,"Times New Roman",serif;color:#1e293b;line-height:1.75;padding:40px 60px;max-width:960px;margin:auto}
    h1{font-size:26px;font-weight:900;color:#0f172a;margin-bottom:6px}
    h2{font-size:18px;font-weight:900;color:#1e3a5f;margin:36px 0 12px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
    h3{font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#2563eb;margin:24px 0 8px}
    p,li{font-size:13px;margin-bottom:6px}
    ol,ul{padding-left:20px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
    th{text-align:left;background:#f8fafc;padding:8px 12px;font-weight:900;text-transform:uppercase;font-size:10px;letter-spacing:1px;color:#64748b;border-bottom:2px solid #e2e8f0}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
    .callout{border-left:4px solid #2563eb;background:#eff6ff;padding:10px 14px;margin:10px 0;font-size:12px}
    .callout.warn{border-color:#f59e0b;background:#fffbeb}
    .callout.success{border-color:#10b981;background:#ecfdf5}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:9px;font-weight:900;letter-spacing:1px;text-transform:uppercase;border:1px solid currentColor;margin-right:4px}
    .cover{text-align:center;padding:60px 0 40px;border-bottom:3px solid #1e3a5f;margin-bottom:40px}
    .cover .subtitle{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#64748b;margin-bottom:12px}
    .cover .ref{font-size:10px;color:#94a3b8;margin-top:8px}
    @media print{body{padding:20px 30px}section{page-break-inside:avoid}}
  </style>
</head>
<body>
  <div class="cover">
    <div class="subtitle">State of Kuwait — Directorate General of Civil Aviation</div>
    <h1>KWI Aviation Partner Portal</h1>
    <h2 style="border:none;margin-top:4px;font-size:20px">Operations User Manual</h2>
    <p class="ref">Reference: DGCA/KWI/OPS-MAN/2026 &nbsp;|&nbsp; Version 1.0 &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
  ${content}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const toc = [
    { id: 'overview',    label: '1. System Overview' },
    { id: 'access',      label: '2. Accessing the Portal' },
    { id: 'dashboard',   label: '3. Pipeline Board' },
    { id: 'pipeline',    label: '4. Integration Pipeline' },
    { id: 'ledger',      label: '5. Agreements Ledger' },
    { id: 'financial',   label: '6. Financial Health' },
    { id: 'consumables', label: '7. Resource Monitor' },
    { id: 'directory',   label: '8. Carrier Directory' },
    { id: 'simulator',   label: '9. AODB Simulator' },
    { id: 'roles',       label: '10. Role Reference' },
    { id: 'glossary',    label: '11. Glossary' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Operations User Manual</h2>
          <p className="text-sm text-slate-500 mt-1">
            KWI Aviation Partner Portal &nbsp;·&nbsp; DGCA/KWI/OPS-MAN/2026
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          Print / Export PDF
        </button>
      </div>

      <div className="flex gap-10">
        {/* ── Sticky TOC (screen only) ────────────────────────── */}
        <aside className="hidden xl:block w-56 shrink-0 print:hidden">
          <div className="sticky top-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Contents</p>
            <nav className="space-y-1">
              {toc.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-xs font-bold text-slate-500 hover:text-blue-600 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Manual body ─────────────────────────────────────── */}
        <div ref={printRef} className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-sm p-10">

          {/* Cover block (visible in print / PDF) */}
          <div className="print-only hidden print:block text-center pb-10 mb-10 border-b-4 border-blue-700">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">State of Kuwait — Directorate General of Civil Aviation</p>
            <h1 className="text-4xl font-black text-slate-900">KWI Aviation Partner Portal</h1>
            <h2 className="text-2xl font-black text-blue-700 mt-2">Operations User Manual</h2>
            <p className="text-xs text-slate-400 mt-4">DGCA/KWI/OPS-MAN/2026 · Version 1.0 · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>

          {/* ══ 1. OVERVIEW ════════════════════════════════════ */}
          <Section id="overview" title="1. System Overview" icon={BookOpen}>
            <p className="text-slate-700 text-sm leading-relaxed mb-4">
              The <strong>KWI Aviation Partner Portal</strong> (also referred to as "the Portal" or "KWI VP") is the
              official web-based management system for Kuwait International Airport's Annex 10 carrier integration
              programme, operated under the authority of the Directorate General of Civil Aviation (DGCA).
            </p>
            <p className="text-slate-700 text-sm leading-relaxed mb-4">
              The Portal centralises three core operations:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-700 space-y-2 mb-6">
              <li><strong>Lifecycle management</strong> of Annex 10 End-User Agreements between DGCA and airline carriers.</li>
              <li><strong>Integration pipeline</strong> tracking across six milestone phases — from agreement to full certification.</li>
              <li><strong>Financial health monitoring</strong> including PAX-based billing, workstation fees, and consumables usage.</li>
            </ul>
            <Callout type="info">
              Three user roles access the Portal: <strong>DGCA</strong> (authority), <strong>Carrier</strong> (airline),
              and <strong>Operations Partner</strong> (technical administrator). Each role sees a tailored view.
            </Callout>

            <Sub title="Regulatory Context">
              <p>
                All carrier onboarding activities are governed by <strong>DGCA Directive KWI/2024/03</strong> and the
                PPBPS Tender Document Annex 10. Key contractual terms include:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>14-day Deemed Acceptance:</strong> if a carrier does not respond to an agreement within 14 calendar days of dispatch, it is considered fully accepted and binding.</li>
                <li><strong>90-day SAT Window:</strong> all System Acceptance Testing milestones must be completed within 90 calendar days of the agreement date.</li>
                <li><strong>PAX Fee:</strong> KD 0.616 per departing passenger (USD 2.00 × 0.308).</li>
                <li><strong>Workstation Fee:</strong> KD 77.00 per unit per month.</li>
                <li><strong>Revenue Split:</strong> DGCA 65% / Operations Partner 35% on PAX fees.</li>
              </ul>
            </Sub>
          </Section>

          {/* ══ 2. ACCESSING ═══════════════════════════════════ */}
          <Section id="access" title="2. Accessing the Portal" icon={LogIn}>
            <Sub title="Login Procedure">
              <Steps items={[
                'Open the Portal URL in a modern browser (Chrome, Edge, Firefox recommended).',
                'On the login screen, enter your registered email address.',
                'Enter your password. Credentials are issued by DGCA IT administration.',
                'Click <strong>Sign In</strong>. You will be directed to the dashboard matching your role.',
                'To sign out, click the <strong>Log Out</strong> icon at the bottom of the left sidebar.',
              ]} />
            </Sub>
            <Sub title="First-Time Portal Initiation (DGCA Only)">
              <Callout type="warn">
                This step is performed only once, by an authorised DGCA administrator, to seed the system.
              </Callout>
              <Steps items={[
                'If the Portal displays the <strong>Initiate System</strong> screen on first launch, click <strong>Initiate Portal</strong>.',
                'The system will seed carrier data, agreements, milestones, and usage metrics.',
                'Once complete, the login screen will appear automatically.',
              ]} />
            </Sub>
            <Sub title="Forgotten Password">
              <p>Contact your DGCA system administrator to have your credentials reset. Passwords are managed through Supabase Auth infrastructure.</p>
            </Sub>
          </Section>

          {/* ══ 3. DASHBOARD ═══════════════════════════════════ */}
          <Section id="dashboard" title="3. Pipeline Board (Dashboard)" icon={LayoutDashboard}>
            <p className="text-sm text-slate-700 mb-4">
              The <strong>Pipeline Board</strong> is the default landing view after login. It provides a real-time
              snapshot of all carriers' integration progress.
            </p>
            <RoleBadge roles={['dgca', 'carrier', 'operations_partner']} />
            <div className="mt-5">
              <Sub title="What You See">
                <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                  <li><strong>Integration Ledger:</strong> cards showing each pipeline phase with the number of carriers at that stage.</li>
                  <li><strong>Financial Health Map:</strong> PAX trends, revenue breakdown, and billing status across all active carriers.</li>
                  <li><strong>Resource Monitor:</strong> current-month consumables usage (Thermal Bag Tags, Boarding Passes, Lounge Vouchers).</li>
                </ul>
              </Sub>
              <Sub title="Using the Search Bar">
                <p>The search bar in the top header allows you to filter carrier fleet data across all visible modules.</p>
              </Sub>
              <Sub title="Sync Global Nodes">
                <p>
                  The <strong>Sync Global Nodes</strong> button (bottom of the left sidebar) refreshes all data from the
                  live database. Use it after any external data changes or to confirm updates are reflected in the UI.
                </p>
              </Sub>
              <Sub title="Add Carrier (DGCA Only)">
                <RoleBadge roles={['dgca']} />
                <p className="mt-2">
                  Click <strong>+ Add Carrier</strong> in the top-right of the header to open the Carrier Onboarding
                  form. Fill in the airline name, IATA code, ICAO code, country, and fleet size to register a new carrier.
                </p>
              </Sub>
              <Sub title="Toggle MEA SAT Sign-off (DGCA Only)">
                <RoleBadge roles={['dgca']} />
                <p className="mt-2">
                  A utility button in the sidebar that fast-tracks Middle East Airlines (MEA) to the SAT Sign-off and
                  Certified stages. Used for demonstration and testing purposes only.
                </p>
              </Sub>
            </div>
          </Section>

          {/* ══ 4. INTEGRATION PIPELINE ════════════════════════ */}
          <Section id="pipeline" title="4. Integration Pipeline" icon={Plane}>
            <p className="text-sm text-slate-700 mb-5">
              The integration pipeline tracks each carrier through six sequential phases before achieving certification
              under DGCA Annex 10. Each phase card can be clicked to open the <strong>Stage Workflow Modal</strong>.
            </p>
            <RoleBadge roles={['dgca', 'carrier', 'operations_partner']} />

            <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-6">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/70 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Milestone</th>
                    <th className="px-4 py-3">Actor(s)</th>
                  </tr>
                </thead>
                <tbody>
                  <PhaseRow phase="Phase 0"  label="Pending Agreement"   icon={FileWarning}  color="text-slate-400"   whoActs={['dgca']} />
                  <PhaseRow phase="Phase 1"  label="Agreement Sent"      icon={FileText}     color="text-blue-600"   whoActs={['dgca']} />
                  <PhaseRow phase="Phase 1b" label="Agreement Signed"    icon={FileCheck2}   color="text-teal-600"   whoActs={['carrier']} />
                  <PhaseRow phase="Phase 2"  label="Hardware Verified"   icon={HardDrive}    color="text-orange-600" whoActs={['carrier', 'dgca']} />
                  <PhaseRow phase="Phase 3"  label="Network Ready"       icon={Network}      color="text-indigo-600" whoActs={['carrier', 'dgca']} />
                  <PhaseRow phase="Phase 4"  label="SAT Sign-off"        icon={ShieldCheck}  color="text-violet-600" whoActs={['carrier', 'dgca']} />
                  <PhaseRow phase="Phase 5"  label="Certified"           icon={CheckCircle2} color="text-emerald-600" whoActs={['dgca']} />
                </tbody>
              </table>
            </div>

            <Sub title="Stage Workflow Modal — Carrier Actions">
              <RoleBadge roles={['carrier']} />
              <p className="mt-2 mb-3">For Phases 2, 3, and 4 (Hardware Verified, Network Ready, SAT Sign-off):</p>
              <Steps items={[
                'Click the relevant phase card on the Pipeline Board.',
                'In the modal, confirm all required documents by clicking each checkbox.',
                'Fill in the configuration fields (e.g. IP range, VPN endpoint, SAT scores).',
                'Click <strong>Submit for DGCA Review</strong>. Your submission is saved and DGCA is notified.',
                'Your stage status changes to <em>Submitted — Awaiting DGCA</em>.',
              ]} />
            </Sub>
            <Sub title="Stage Workflow Modal — DGCA / Operations Partner Actions">
              <RoleBadge roles={['dgca', 'operations_partner']} />
              <p className="mt-2 mb-3">Once a carrier submits for review:</p>
              <Steps items={[
                'Click the relevant phase card on the Pipeline Board.',
                'In the left sidebar of the modal, select the carrier you wish to review.',
                'Verify the documents and configuration data submitted by the carrier.',
                'In the <strong>DGCA Verification Sign-off</strong> section, enter your full name, title, and date.',
                'Click the confirmation button (e.g. <strong>Confirm Hardware Verified</strong>) to advance the carrier to the next phase.',
              ]} />
              <Callout type="success">
                All sign-offs are permanently recorded in the database with the verifier's name, title, and date.
              </Callout>
            </Sub>
            <Sub title="Granting Certification (DGCA Only)">
              <RoleBadge roles={['dgca']} />
              <Steps items={[
                'Click the <strong>Certified</strong> phase card.',
                'Review the Pre-Certification Checklist — all prerequisite stages must show "Complete ✓".',
                'Enter the certifying authority\'s name, title, and date.',
                'Click <strong>Grant Full Certification</strong>. The carrier\'s progress advances to 100% and is bootstrapped into the AODB simulator.',
              ]} />
            </Sub>
          </Section>

          {/* ══ 5. LEDGER ═══════════════════════════════════════ */}
          <Section id="ledger" title="5. Agreements Ledger" icon={FileText}>
            <p className="text-sm text-slate-700 mb-4">
              The <strong>Ledger</strong> tab displays all Annex 10 End-User Agreements. Carriers can only see their
              own agreement; DGCA and Operations Partners see all.
            </p>
            <RoleBadge roles={['dgca', 'carrier', 'operations_partner']} />
            <div className="mt-5 space-y-4">
              <Sub title="Viewing an Agreement">
                <Steps items={[
                  'Navigate to the <strong>Ledger</strong> tab in the left sidebar.',
                  'The table lists all agreements with carrier identity, version, signed date, and status.',
                  'Click the <strong>Eye</strong> icon on any row to open the full agreement document in a new browser tab.',
                  'From the opened document, use your browser\'s print function (Ctrl+P / Cmd+P) to export as PDF.',
                ]} />
              </Sub>
              <Sub title="Signing an Agreement (Carrier)">
                <RoleBadge roles={['carrier']} />
                <Steps items={[
                  'Locate your agreement in the Ledger table (status will show <em>Awaiting Signature</em>).',
                  'Click <strong>Sign Online</strong> to expand the signing panel.',
                  'Enter your carrier name, your full legal name, title, and signature date.',
                  'Choose a signature method: <strong>Draw Signature</strong> (use your mouse or touchpad) or <strong>Type Signature</strong> (your typed name in italic).',
                  'Review the QR verification code and the legal notice.',
                  'Click <strong>Confirm &amp; Submit Electronically</strong>. The agreement status updates to <em>Signed</em> and the Pipeline Board advances to Phase 1b.',
                ]} />
                <Callout type="warn">
                  The 14-day Deemed Acceptance rule applies. If you do not sign within 14 days of agreement dispatch,
                  the agreement is automatically accepted as binding.
                </Callout>
              </Sub>
              <Sub title="QR Verification">
                <p>
                  Every agreement row displays a small QR code. Scanning it returns the agreement reference, IATA code,
                  and signature status, providing an immutable audit trail for regulatory inspections.
                </p>
              </Sub>
            </div>
          </Section>

          {/* ══ 6. FINANCIAL ════════════════════════════════════ */}
          <Section id="financial" title="6. Financial Health" icon={BarChart3}>
            <p className="text-sm text-slate-700 mb-4">
              The <strong>Financial Health</strong> view provides a full revenue and billing map across all certified
              carriers. It can be accessed both from the dedicated <em>Financial Health</em> sidebar item and as a
              panel on the main Pipeline Board.
            </p>
            <RoleBadge roles={['dgca', 'carrier', 'operations_partner']} />
            <div className="mt-5">
              <Sub title="Revenue Overview">
                <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                  <li><strong>PAX Revenue:</strong> calculated monthly at KD 0.616 per departing passenger.</li>
                  <li><strong>Workstation Fees:</strong> KD 77.00 per active workstation per month.</li>
                  <li><strong>Revenue Split:</strong> 65% DGCA / 35% Operations Partner on PAX revenue shown as a distribution chart.</li>
                </ul>
              </Sub>
              <Sub title="Per-Carrier Billing">
                <p>Each airline row shows monthly PAX count, total revenue generated, workstation count, and payment status (Paid / Outstanding / Overdue).</p>
              </Sub>
              <Sub title="Carrier View (Restricted)">
                <RoleBadge roles={['carrier']} />
                <p className="mt-2">Carriers see only their own financial data — their PAX count, billed amounts, and payment status.</p>
              </Sub>
            </div>
          </Section>

          {/* ══ 7. CONSUMABLES ══════════════════════════════════ */}
          <Section id="consumables" title="7. Resource Monitor (Consumables)" icon={Package}>
            <p className="text-sm text-slate-700 mb-4">
              The <strong>Resource Monitor</strong> tracks three consumable categories allocated to carriers each month:
            </p>
            <RoleBadge roles={['dgca', 'carrier', 'operations_partner']} />
            <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-6">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/70 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Consumable</th>
                    <th className="px-4 py-3">Monthly Allocation</th>
                    <th className="px-4 py-3">Overage Policy</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 flex items-center gap-2"><Tag className="w-4 h-4 text-orange-500" /> Thermal Bag Tags</td>
                    <td className="px-4 py-3">45,000 units</td>
                    <td className="px-4 py-3">Annex 10 Penalty Schedule B</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 flex items-center gap-2"><Ticket className="w-4 h-4 text-blue-500" /> ATB Boarding Passes</td>
                    <td className="px-4 py-3">35,000 units</td>
                    <td className="px-4 py-3">Annex 10 Penalty Schedule B</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 flex items-center gap-2"><Star className="w-4 h-4 text-violet-500" /> VIP Lounge Vouchers</td>
                    <td className="px-4 py-3">3,000 units</td>
                    <td className="px-4 py-3">Annex 10 Penalty Schedule B</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Sub title="Reading the Monitor">
              <ul className="list-disc pl-6 space-y-2 text-sm text-slate-700">
                <li>Each card shows <strong>used / limit</strong> and a percentage completion bar.</li>
                <li>Cards highlighted in <span className="text-red-500 font-bold">red</span> have exceeded 80% of their monthly allocation — immediate attention is required.</li>
                <li>A trend indicator (<strong>+ %</strong> / <strong>− %</strong>) shows month-over-month change.</li>
              </ul>
            </Sub>
            <Sub title="Drilling Down (DGCA / Ops Partner)">
              <RoleBadge roles={['dgca', 'operations_partner']} />
              <p className="mt-2">Click any consumable card to open a breakdown modal showing each carrier's individual usage against their allocation for the current month.</p>
            </Sub>
          </Section>

          {/* ══ 8. DIRECTORY ════════════════════════════════════ */}
          <Section id="directory" title="8. Carrier Directory" icon={Users}>
            <p className="text-sm text-slate-700 mb-4">
              The <strong>Directory</strong> tab (labelled "Directory" in the sidebar) lists all registered airline carriers
              in the system.
            </p>
            <RoleBadge roles={['dgca', 'operations_partner']} />
            <div className="mt-4">
              <p className="text-sm text-slate-700">
                Each entry shows the airline name, IATA/ICAO codes, country of registration, fleet size, and current
                onboarding status. This view is not available to Carrier users, who only see their own data.
              </p>
            </div>
          </Section>

          {/* ══ 9. SIMULATOR ════════════════════════════════════ */}
          <Section id="simulator" title="9. AODB Simulator" icon={Radio}>
            <p className="text-sm text-slate-700 mb-4">
              The <strong>Simulator</strong> tab provides the AODB (Airport Operational Database) Control Centre for
              simulating real-time passenger and flight data feeds.
            </p>
            <RoleBadge roles={['dgca', 'operations_partner']} />
            <Callout type="warn">
              The AODB Simulator is a <strong>controlled testing tool</strong>. Actions performed here generate
              synthetic data used to validate billing calculations and consumable thresholds. Do not use for live operations.
            </Callout>
            <Sub title="Running a Simulation">
              <Steps items={[
                'Navigate to the <strong>Simulator</strong> tab in the left sidebar.',
                'Select a certified carrier from the dropdown.',
                'Configure the simulation parameters (PAX count, number of flights, date range).',
                'Click <strong>Run Simulation</strong> to generate synthetic AODB data.',
                'Return to the Financial Health and Resource Monitor views to see the simulated data reflected.',
              ]} />
            </Sub>
            <Sub title="Auto-Bootstrap on Certification">
              <p>
                When DGCA grants full certification to a carrier, the system automatically bootstraps that carrier
                into the AODB simulator with a realistic initial PAX seed (300–800 passengers), ensuring their
                financial data appears immediately on the dashboard.
              </p>
            </Sub>
          </Section>

          {/* ══ 10. ROLES ═══════════════════════════════════════ */}
          <Section id="roles" title="10. Role Reference" icon={UserCog}>
            <div className="space-y-6">
              {/* DGCA */}
              <div className="p-6 rounded-2xl border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-black text-blue-800 uppercase tracking-widest text-sm">DGCA — Regulatory Authority</h3>
                </div>
                <ul className="list-disc pl-6 text-sm text-blue-800 space-y-1">
                  <li>Full access to all portal modules.</li>
                  <li>Initiates the portal and onboards new carriers.</li>
                  <li>Sends, manages, and tracks all Annex 10 agreements.</li>
                  <li>Performs DGCA verification sign-off for all integration milestones.</li>
                  <li>Grants final certification to fully integrated carriers.</li>
                  <li>Views all financial data across all carriers.</li>
                </ul>
              </div>
              {/* Carrier */}
              <div className="p-6 rounded-2xl border-2 border-teal-200 bg-teal-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                    <Plane className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-black text-teal-800 uppercase tracking-widest text-sm">Carrier — Airline User</h3>
                </div>
                <ul className="list-disc pl-6 text-sm text-teal-800 space-y-1">
                  <li>Views the Pipeline Board restricted to their own airline.</li>
                  <li>Signs Annex 10 End-User Agreements electronically.</li>
                  <li>Submits integration milestone data for DGCA review (Phases 2–4).</li>
                  <li>Monitors their own financial billing and consumables usage.</li>
                  <li>Cannot access the Carrier Directory or AODB Simulator.</li>
                </ul>
              </div>
              {/* Ops Partner */}
              <div className="p-6 rounded-2xl border-2 border-violet-200 bg-violet-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-black text-violet-800 uppercase tracking-widest text-sm">Operations Partner — Technical Admin</h3>
                </div>
                <ul className="list-disc pl-6 text-sm text-violet-800 space-y-1">
                  <li>Access to Pipeline Board, Financial Health, Directory, Agreements Ledger, and AODB Simulator.</li>
                  <li>Can perform DGCA verification sign-offs on integration milestones.</li>
                  <li>Monitors all carriers' consumables and financial data.</li>
                  <li>Cannot onboard new carriers or grant final certification (DGCA privilege only).</li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <Sub title="Permissions Matrix">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3 text-left">Feature</th>
                        <th className="px-4 py-3 text-center">DGCA</th>
                        <th className="px-4 py-3 text-center">Carrier</th>
                        <th className="px-4 py-3 text-center">Ops Partner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { feat: 'Pipeline Board', dgca: true, carrier: true, ops: true },
                        { feat: 'View All Carriers', dgca: true, carrier: false, ops: true },
                        { feat: 'Add Carrier', dgca: true, carrier: false, ops: false },
                        { feat: 'Sign Agreement', dgca: false, carrier: true, ops: false },
                        { feat: 'Submit Milestone Data', dgca: false, carrier: true, ops: false },
                        { feat: 'DGCA Milestone Sign-off', dgca: true, carrier: false, ops: true },
                        { feat: 'Grant Certification', dgca: true, carrier: false, ops: false },
                        { feat: 'Financial Health (All)', dgca: true, carrier: false, ops: true },
                        { feat: 'Financial Health (Own)', dgca: true, carrier: true, ops: true },
                        { feat: 'Resource Monitor', dgca: true, carrier: true, ops: true },
                        { feat: 'Carrier Directory', dgca: true, carrier: false, ops: true },
                        { feat: 'AODB Simulator', dgca: true, carrier: false, ops: true },
                      ].map(row => (
                        <tr key={row.feat} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-bold text-slate-700">{row.feat}</td>
                          <td className="px-4 py-2.5 text-center">{row.dgca ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-2.5 text-center">{row.carrier ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-2.5 text-center">{row.ops ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Sub>
            </div>
          </Section>

          {/* ══ 11. GLOSSARY ════════════════════════════════════ */}
          <Section id="glossary" title="11. Glossary" icon={BookOpen}>
            <div className="space-y-3">
              {[
                { term: 'AODB', def: 'Airport Operational Database — the central data feed for flight and passenger information at KWI.' },
                { term: 'Annex 10', def: 'The DGCA tender annex governing carrier technical integration requirements at Kuwait International Airport.' },
                { term: 'ATB', def: 'Automated Ticket and Boarding pass — the standard boarding pass format used by airline carriers.' },
                { term: 'Certified', def: 'Final milestone status indicating a carrier has completed all integration phases and is fully compliant with DGCA Annex 10.' },
                { term: 'Deemed Accepted', def: 'Legal status applied automatically when a carrier does not formally respond to an agreement within 14 calendar days of dispatch.' },
                { term: 'DGCA', def: 'Directorate General of Civil Aviation — the Kuwaiti regulatory authority responsible for civil aviation oversight.' },
                { term: 'IATA Code', def: 'The two-letter airline identifier assigned by the International Air Transport Association (e.g. KU for Kuwait Airways).' },
                { term: 'Integration Milestone', def: 'A defined checkpoint in the carrier onboarding process, from agreement signing through to full SAT certification.' },
                { term: 'KWI', def: 'IATA code for Kuwait International Airport.' },
                { term: 'Operations Partner', def: 'The appointed third-party technical administrator who supports DGCA in managing carrier integrations. Entitled to 35% of PAX-based revenue.' },
                { term: 'PAX', def: 'Passenger — used in the context of per-head billing calculations.' },
                { term: 'SAT', def: 'System Acceptance Test — the formal end-to-end testing process required before a carrier can be certified.' },
                { term: 'VPN', def: 'Virtual Private Network — the secure encrypted tunnel used to connect carrier systems to DGCA infrastructure.' },
              ].map(({ term, def }) => (
                <div key={term} className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
                  <span className="w-44 shrink-0 font-black text-slate-900 text-sm">{term}</span>
                  <span className="text-slate-600 text-sm">{def}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              DGCA/KWI/OPS-MAN/2026 &nbsp;·&nbsp; Version 1.0 &nbsp;·&nbsp; Confidential — For Authorised Users Only
            </p>
            <p className="text-[11px] text-slate-300 mt-2">
              © {new Date().getFullYear()} Directorate General of Civil Aviation, State of Kuwait. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
