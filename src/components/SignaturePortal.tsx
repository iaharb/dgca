import React, { useState, useEffect, useRef } from 'react';
// import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  FileText, 
  PenTool, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Building2,
  Calendar,
  Lock,
  ChevronRight,
  Hand
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../lib/supabase';

export const SignaturePortal: React.FC = () => {
  const token = window.location.pathname.split('/').pop();
  const [airline, setAirline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('carriers')
        .select('*')
        .eq('signature_token', token)
        .single();

      if (error || !data) {
        throw new Error('Invalid or expired signature token.');
      }

      // Check expiry
      if (new Date(data.token_expiry) < new Date()) {
        throw new Error('This signature token has expired. Please contact DGCA.');
      }

      setAirline(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Please provide a signature.');
      return;
    }

    setSigning(true);
    const signatureBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

    try {
      const { error } = await supabase
        .from('carriers')
        .update({
          onboarding_status: 'AGREEMENT_SIGNED',
          signed_at: new Date().toISOString(),
          signature_data: signatureBase64,
          signature_token: null, // Revoke token
          status: 'active'
        })
        .eq('id', airline.id);

      if (error) throw error;

      // Update agreement status in Ledger
      await supabase
        .from('agreements')
        .update({ status: 'active' })
        .eq('airline_id', airline.id);

      setCompleted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Authenticating Signature Session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[32px] shadow-2xl max-w-md w-full text-center border border-red-100">
           <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight whitespace-pre-wrap">{error}</h2>
           <p className="text-slate-500 mb-8 font-medium">Please verify your invitation link or contact the DGCA Integration Office for a fresh token.</p>
           <button 
             onClick={() => window.location.href = '/'}
             className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl"
           >
              Return Home
           </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1540339832862-4745a9805ad3?auto=format&fit=crop&q=80&w=2187')] bg-cover bg-center">
        <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative bg-white p-12 rounded-[40px] shadow-2xl max-w-xl w-full text-center"
        >
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Agreement Executed</h2>
          <p className="text-slate-600 text-lg leading-relaxed mb-10">
            The 5-year operational framework for <span className="font-bold text-blue-600">{airline.name}</span> has been 
            digitally signed and recorded. You are now officially a Network Partner for the June 2026 Term.
          </p>
          <div className="grid grid-cols-1 gap-4">
             <button className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
                <Download className="w-5 h-5" /> Download Countersigned Copy
             </button>
             <button 
               onClick={() => window.location.href = '#dashboard'}
               className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
             >
                Enter Partner Dashboard <ChevronRight className="w-5 h-5" />
             </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Column: Contract Reading */}
      <div className="lg:w-1/2 p-10 h-screen overflow-y-auto custom-scrollbar border-r border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto space-y-12">
           <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <h1 className="text-2xl font-black text-slate-900 tracking-tight underline decoration-blue-600/30">Annex 10 Framework</h1>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Agreement: 2026-2031</p>
              </div>
           </div>

           <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-8 font-medium leading-relaxed">
              <section className="space-y-4">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600" /> Parties involved
                 </h3>
                 <p>
                    This Agreement is entered into between the <strong>Directorate General of Civil Aviation (DGCA)</strong> 
                    and <strong>{airline.name} (Carrier Code: {airline.iata_code})</strong>.
                 </p>
              </section>

              <section className="space-y-4">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600" /> Scope of Integration
                 </h3>
                 <p>
                    The Carrier agrees to integrate all operational data feeds, including but not limited to 
                    Flight Schedules, Real-time Departure Information, and Passenger Load Metrics, into the 
                    KWI Unified Registry. This integration must be completed and certified by Stage 1 verification.
                 </p>
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs italic">
                       Data security is guaranteed under the Cyber-Governance protocol, with all transactions 
                       anchored to a cryptographically secure audit trail.
                    </p>
                 </div>
              </section>

              <section className="space-y-4">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600" /> Operational Term
                 </h3>
                 <p>
                    The term of this integration agreement shall commence on <strong>June 1, 2026</strong> 
                    and conclude on <strong>June 1, 2031</strong>, subject to annual performance reviews.
                 </p>
              </section>

              <section className="space-y-4">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600" /> Financial Obligations
                 </h3>
                 <p>
                    Invoicing and settlements will be processed monthly via the Partner Portal. 
                    Late payments exceeding 30 days will trigger the automated integration suspension protocol.
                 </p>
              </section>

              <div className="h-40" /> {/* Spacer */}
           </div>
        </div>
      </div>

      {/* Right Column: Signature Interaction */}
      <div className="lg:w-1/2 p-10 flex flex-col bg-slate-50 relative">
         <div className="absolute top-10 right-10">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
               <Lock className="w-3.5 h-3.5 text-blue-600" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secure Session ID: {token?.slice(0, 8)}</span>
            </div>
         </div>

         <div className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center">
            <div className="mb-12">
               <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">Finalize Execution</h2>
               <p className="text-slate-500 font-medium">Please review the contract on the left and provide your digital signature below to bind this agreement.</p>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-200 space-y-8">
               <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                  <Hand className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800 font-medium">Draw your signature in the field below. Use a stylus for maximum precision.</p>
               </div>
               
               <div className="relative group">
                  <div className="absolute inset-0 bg-blue-600/5 rounded-[32px] group-hover:bg-blue-600/10 transition-colors pointer-events-none" />
                  <div className="bg-white border-2 border-slate-200 border-dashed rounded-[32px] overflow-hidden">
                     <SignatureCanvas 
                       ref={sigCanvas}
                       penColor="#1e293b"
                       canvasProps={{
                         width: 400,
                         height: 200,
                         className: 'sigCanvas w-full h-[200px]'
                       }}
                     />
                  </div>
                  <button 
                    onClick={() => sigCanvas.current?.clear()}
                    className="absolute top-4 right-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
                  >
                     Clear Canvas
                  </button>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                     <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                     </div>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authenticated for {airline.name}</p>
                  </div>

                  <button 
                    onClick={handleSign}
                    disabled={signing}
                    className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-700 hover:scale-[1.02] shadow-2xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                     {signing ? 'Processing Legal Chain...' : 'Submit Signed Agreement'}
                     <PenTool className="w-5 h-5" />
                  </button>
               </div>
            </div>

            <p className="mt-8 text-[10px] text-center text-slate-400 font-black uppercase tracking-[0.2em]">
               Legally binding electronic signature pursuant to Law No. 20/2014
            </p>
         </div>
      </div>
    </div>
  );
};
