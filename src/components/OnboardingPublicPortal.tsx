import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const OnboardingPublicPortal: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    official_email: '',
    phone: '',
    airline_name: '',
    iata_code: '',
    job_title: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('onboarding_requests')
        .insert([formData]);

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center">
        <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white p-12 rounded-[32px] shadow-2xl max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Request Received</h2>
          <p className="text-slate-600 leading-relaxed mb-8">
            Thank you, <span className="font-bold text-blue-600">{formData.full_name}</span>. 
            We've received the onboarding request for <span className="font-bold">{formData.airline_name}</span>. 
            Our digital integration team will review your credentials and contact you within 48 hours.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Return Home <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Hero Section */}
      <div className="relative h-[45vh] overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center transition-transform hover:scale-110 duration-[10s]" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 via-blue-900/60 to-slate-50" />
        
        <div className="relative max-w-7xl mx-auto px-6 pt-12 flex flex-col justify-between h-full pb-12">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <Plane className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tighter">KWI PARTNER PORTAL</h1>
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.3em]">Directorate General of Civil Aviation</p>
            </div>
          </div>

          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 px-4 py-2 rounded-full text-blue-100 text-[10px] font-black uppercase tracking-widest mb-6"
            >
              <Globe className="w-3 h-3" /> External Carrier Onboarding
            </motion.div>
            <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tight mb-6">
              June 2026 <br/>
              <span className="text-blue-400">Network Readiness</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-20 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Announcement Column */}
        <div className="lg:col-span-7 space-y-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Official DGCA Announcement</h3>
            </div>
            
            <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
              <p>
                In alignment with Kuwait's 2035 Vision and the modernization of airport operations, the 
                <strong> Directorate General of Civil Aviation (DGCA)</strong> is officially opening the 
                onboarding pipeline for the June 2026 - June 2031 operational term.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-blue-600 italic font-medium">
                "All carriers operating within KWI airspace are mandated to integrate with the Unified 
                Aviation Partner Portal before the June 1st hard-transition date."
              </div>
              <p>
                The new framework consolidates AODB feeds, financial settlements, and resource allocation 
                into a single blockchain-verified ledger. Successful validation ensures technical 
                compliance for the next 5 years of operation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-12">
              <div className="p-6 bg-blue-50 rounded-2xl">
                <p className="text-blue-600 font-black text-2xl">5 Years</p>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mt-1">Contract Term</p>
              </div>
              <div className="p-6 bg-slate-900 rounded-2xl">
                <p className="text-white font-black text-2xl">June 1, 2026</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Go-Live Date</p>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-8 px-10">
             <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Partner" />
                  </div>
                ))}
             </div>
             <p className="text-sm font-bold text-slate-500">
               Join <span className="text-blue-600">140+ carriers</span> already in the pipeline.
             </p>
          </div>
        </div>

        {/* Form Column */}
        <div className="lg:col-span-5">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 sticky top-12"
          >
            <div className="mb-8">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Request Intake</h4>
              <p className="text-sm font-medium text-slate-400 mt-1">Start your carrier certification process</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Contact Name</label>
                <div className="relative group">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                   <input 
                    required
                    type="text" 
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    placeholder="John Doe" 
                    className="w-full bg-slate-50 border border-transparent focus:border-blue-600 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Airline / Carrier</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      value={formData.airline_name}
                      onChange={e => setFormData({...formData, airline_name: e.target.value})}
                      placeholder="Emirates" 
                      className="w-full bg-slate-50 border border-transparent focus:border-blue-600 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">IATA Code</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      maxLength={3}
                      type="text" 
                      value={formData.iata_code}
                      onChange={e => setFormData({...formData, iata_code: e.target.value.toUpperCase()})}
                      placeholder="EK" 
                      className="w-full bg-slate-50 border border-transparent focus:border-blue-600 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Official Industry Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                    required
                    type="email" 
                    value={formData.official_email}
                    onChange={e => setFormData({...formData, official_email: e.target.value})}
                    placeholder="john@carrier.com" 
                    className="w-full bg-slate-50 border border-transparent focus:border-blue-600 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+965 ..." 
                      className="w-full bg-slate-50 border border-transparent focus:border-blue-600 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      value={formData.job_title}
                      onChange={e => setFormData({...formData, job_title: e.target.value})}
                      placeholder="Fleet Manager" 
                      className="w-full bg-slate-50 border border-transparent focus:border-blue-600 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                disabled={submitting}
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-5 rounded-[20px] shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group"
              >
                {submitting ? 'Authenticating...' : 'Submit Request'} 
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>

              <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest mt-6">
                Certified Secure by DGCA CyberNode
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
