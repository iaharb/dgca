import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, 
  Send, 
  CheckCircle2, 
  Clock,
  ArrowRight, 
  Globe, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Briefcase,
  AlertCircle,
  Search,
  Menu,
  ChevronDown,
  ExternalLink,
  FileText
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

  const navItems = [
    'CIVIL AVIATION',
    'ELECTRONIC SERVICES',
    'SAFETY AND SECURITY SYSTEMS',
    'CONTACT US'
  ];

  const secondaryNav = [
    { label: 'About DGCA', hasDropdown: true },
    { label: 'Media & Information', hasDropdown: true },
    { label: 'AIS', hasDropdown: true }
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
         {/* Success Header */}
         <div className="bg-[#b31b1b] text-white py-4 px-10 flex justify-between items-center font-bold text-xs uppercase tracking-wider">
            <div className="flex gap-8">
               {navItems.map(item => <span key={item} className="hover:opacity-80 cursor-pointer">{item}</span>)}
            </div>
            <div className="flex gap-4 items-center">
               <Search className="w-4 h-4" />
               <Globe className="w-4 h-4" />
               <span className="font-arabic font-medium text-lg">عربي</span>
            </div>
         </div>

         <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-16 rounded-[2rem] shadow-2xl max-w-2xl w-full text-center border-t-8 border-[#b31b1b]"
            >
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-100 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Request Logged</h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
                Credentials for <span className="font-bold text-[#b31b1b]">{formData.airline_name}</span> have been queued for DGCA review. 
                Our compliance node will verify your IATA signature within 48 hours.
              </p>
              <button 
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center gap-2 bg-[#b31b1b] text-white font-bold px-12 py-5 rounded-2xl hover:bg-[#961616] transition-all group"
              >
                Return to Homepage <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#b31b1b]/10 selection:text-[#b31b1b]">
      {/* Red Top Nav */}
      <nav className="bg-[#b31b1b] text-white px-6 lg:px-24 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex flex-wrap items-center gap-x-8 gap-y-2 font-bold text-[10px] lg:text-[11px] uppercase tracking-widest whitespace-nowrap">
            {navItems.map(item => (
              <a key={item} href="#" className="hover:underline decoration-white/30 underline-offset-4 decoration-2">{item}</a>
            ))}
         </div>
         <div className="flex items-center gap-6 font-bold text-[11px]">
            <div className="flex items-center gap-2 pr-6 border-r border-white/20">
               <Clock className="w-3.5 h-3.5 opacity-60" />
               <span>20:51</span>
            </div>
            <div className="flex items-center gap-4">
               <Search className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform" />
               <Globe className="w-4 h-4 cursor-pointer hover:scale-110 transition-transform" />
               <span className="font-arabic font-medium text-lg leading-none cursor-pointer hover:text-white/80">عربي</span>
            </div>
         </div>
      </nav>

      {/* Logo Area */}
      <header className="px-6 lg:px-24 py-8 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pr-8 border-r-2 border-slate-100">
               <img src="https://upload.wikimedia.org/wikipedia/commons/d/de/Kuwait_Civil_Aviation_logo.png" alt="DGCA" className="h-16 w-auto" />
               <div className="leading-tight">
                  <h1 className="text-xl font-arabic font-bold text-slate-800">الطيران المدني</h1>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Civil Aviation</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">State of Kuwait</p>
               </div>
            </div>
            <div className="hidden lg:flex gap-8 font-bold text-[13px] text-slate-600">
               {secondaryNav.map(item => (
                 <button key={item.label} className="flex items-center gap-1.5 hover:text-[#b31b1b] transition-colors group">
                    {item.label} {item.hasDropdown && <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-[#b31b1b]" />}
                 </button>
               ))}
            </div>
         </div>
         <div className="hidden xl:block">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Coat_of_arms_of_Kuwait.svg/1200px-Coat_of_arms_of_Kuwait.svg.png" alt="Kuwait Coat of Arms" className="h-20 w-auto opacity-80" />
         </div>
      </header>

      {/* Hero & Registration Split */}
      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12">
         
         {/* Left Side: Simulation Background */}
         <div className="lg:col-span-7 bg-slate-50 relative min-h-[60vh] lg:min-h-screen p-10 lg:p-24 overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none">
               <Plane className="w-[800px] h-[800px] -rotate-12 translate-x-1/2" />
            </div>

            <div className="relative z-10 space-y-16">
               <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 bg-[#b31b1b]/10 text-[#b31b1b] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                     <ShieldCheck className="w-3 h-3" /> Mandatory Integration
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-arabic font-black leading-tight text-slate-900 border-l-8 border-[#b31b1b] pl-8">
                     تطوير <span className="text-[#b31b1b]">عالم</span> الطيران في الكويت
                  </h2>
                  <h3 className="text-4xl lg:text-5xl font-black text-slate-700 tracking-tight max-w-2xl">
                     Developing Kuwait's Aviation Future
                  </h3>
               </div>

               {/* Grid Cards (Like in image) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Carrier Terms', desc: 'June 2026 Expansion Framework', icon: FileText, color: 'bg-[#b31b1b]' },
                    { label: 'Technical AIS', desc: 'Navigation and Data Protocols', icon: Globe, color: 'bg-white text-slate-900' },
                    { label: 'Safety Systems', desc: 'ICAO Standards compliance', icon: ShieldCheck, color: 'bg-white text-slate-900' },
                    { label: 'e-Services', desc: 'Digital Partner Portal login', icon: Plane, color: 'bg-white text-slate-900' },
                  ].map((card, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -5 }}
                      className={`${card.color} ${card.color === 'bg-[#b31b1b]' ? 'text-white' : 'border border-slate-200'} p-8 rounded-3xl shadow-lg transition-all cursor-pointer group`}
                    >
                       <card.icon className={`w-8 h-8 mb-6 ${card.color === 'bg-[#b31b1b]' ? 'text-white/80' : 'text-[#b31b1b]'}`} />
                       <h4 className="text-xl font-black mb-2">{card.label}</h4>
                       <p className={`text-sm ${card.color === 'bg-[#b31b1b]' ? 'text-white/70' : 'text-slate-400'} font-medium`}>{card.desc}</p>
                       <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          Read More <ArrowRight className="w-3.5 h-3.5" />
                       </div>
                    </motion.div>
                  ))}
               </div>

               <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row gap-12">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Latest News</p>
                     <div className="flex gap-4">
                        <div className="w-24 h-24 bg-slate-200 rounded-2xl shrink-0 bg-[url('https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&q=80&w=1000')] bg-cover" />
                        <div className="space-y-1">
                           <p className="font-bold text-slate-800 leading-tight">DGCA signs modernization MoU with global aerospace partners.</p>
                           <p className="text-[10px] font-bold text-[#b31b1b] uppercase">April 12, 2026</p>
                        </div>
                     </div>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Portal Alert</p>
                     <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-xs">
                        Registration for the 2026 transition is now open. All existing and new carriers must re-register through Annex 10.
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Side: High-Density Registration Form */}
         <div className="lg:col-span-5 bg-white p-10 lg:p-24 shadow-[-50px_0_80px_rgba(0,0,0,0.02)]">
            <div className="max-w-md mx-auto sticky top-24">
               <div className="mb-12">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Partner Intake</h3>
                  <p className="text-slate-500 font-medium">Official registration portal for airline technical managers and fleet leads.</p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Registrant Identity</label>
                     <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                           required
                           type="text" 
                           value={formData.full_name}
                           onChange={e => setFormData({...formData, full_name: e.target.value})}
                           placeholder="Full Legal Name" 
                           className="w-full bg-slate-50 border border-transparent focus:border-[#b31b1b] focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Carrier Name</label>
                        <input 
                           required 
                           type="text"
                           value={formData.airline_name}
                           onChange={e => setFormData({...formData, airline_name: e.target.value})}
                           placeholder="e.g. Jazeera Airways"
                           className="w-full bg-slate-50 border border-transparent focus:border-[#b31b1b] focus:bg-white p-4 rounded-2xl outline-none transition-all font-medium text-slate-900"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">IATA Code</label>
                        <input 
                           required
                           maxLength={3}
                           type="text" 
                           value={formData.iata_code}
                           onChange={e => setFormData({...formData, iata_code: e.target.value.toUpperCase()})}
                           placeholder="J9" 
                           className="w-full bg-slate-50 border border-transparent focus:border-[#b31b1b] focus:bg-white p-4 rounded-2xl outline-none transition-all font-medium text-slate-900 text-center uppercase tracking-widest"
                        />
                     </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Official Communications</label>
                     <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                           required
                           type="email" 
                           value={formData.official_email}
                           onChange={e => setFormData({...formData, official_email: e.target.value})}
                           placeholder="name@airline-registry.kw" 
                           className="w-full bg-slate-50 border border-transparent focus:border-[#b31b1b] focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-medium text-slate-900"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Secure Contact</label>
                        <input 
                           type="tel" 
                           value={formData.phone}
                           onChange={e => setFormData({...formData, phone: e.target.value})}
                           placeholder="+965 ..." 
                           className="w-full bg-slate-50 border border-transparent focus:border-[#b31b1b] focus:bg-white p-4 rounded-2xl outline-none transition-all font-medium text-slate-900"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Designation</label>
                        <input 
                           required
                           type="text" 
                           value={formData.job_title}
                           onChange={e => setFormData({...formData, job_title: e.target.value})}
                           placeholder="Fleet Lead" 
                           className="w-full bg-slate-50 border border-transparent focus:border-[#b31b1b] focus:bg-white p-4 rounded-2xl outline-none transition-all font-medium text-slate-900"
                        />
                     </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-3">
                     <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                     <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                        By submitting this intake form, you attest to being the authorized representative for the specified carrier. 
                        False information will result in integration blacklisting.
                     </p>
                  </div>

                  <button 
                     disabled={submitting}
                     type="submit"
                     className="w-full bg-[#b31b1b] text-white font-black py-6 rounded-2xl shadow-2xl shadow-red-900/20 hover:bg-[#961616] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                     {submitting ? 'Registering Trace...' : 'Submit Annex Registration'} 
                     <Send className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center gap-4 pt-6 text-slate-400">
                     <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Digital Governance Node</span>
                     </div>
                     <p className="text-[9px] text-center leading-relaxed">
                        Directorate General of Civil Aviation <br/>
                        Automated Registry Module v4.2.0
                     </p>
                  </div>
               </form>
            </div>
         </div>
      </main>

      {/* Footer Simulation */}
      <footer className="bg-slate-900 text-white py-20 px-6 lg:px-24">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
               <h5 className="font-bold text-lg mb-6 tracking-tight">KWI Aviation</h5>
               <p className="text-slate-400 text-sm leading-relaxed">
                  The official modernization program of the Kuwait Civil Aviation Authority.
               </p>
            </div>
            <div>
               <h5 className="font-bold text-xs uppercase tracking-[0.2em] mb-6 text-slate-500">e-Services</h5>
               <ul className="space-y-3 text-sm font-medium text-slate-300">
                  <li className="hover:text-white cursor-pointer flex items-center gap-2">Partner Portal <ExternalLink className="w-3 h-3" /></li>
                  <li className="hover:text-white cursor-pointer">Flight Simulation</li>
                  <li className="hover:text-white cursor-pointer">AIS Database</li>
               </ul>
            </div>
            <div>
               <h5 className="font-bold text-xs uppercase tracking-[0.2em] mb-6 text-slate-500">Governance</h5>
               <ul className="space-y-3 text-sm font-medium text-slate-300">
                  <li className="hover:text-white cursor-pointer">Annex 10 Framework</li>
                  <li className="hover:text-white cursor-pointer">Regulatory AOS</li>
                  <li className="hover:text-white cursor-pointer">Audit Registry</li>
               </ul>
            </div>
            <div>
               <h5 className="font-bold text-xs uppercase tracking-[0.2em] mb-6 text-slate-500">Quick Contact</h5>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <p className="text-xs font-bold">+965 2433 6699</p>
                  <p className="text-xs text-slate-500">integration-support@dgca.gov.kw</p>
               </div>
            </div>
         </div>
         <div className="mt-20 pt-8 border-t border-white/10 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <p>© 2026 DGCA Kuwait. All rights reserved.</p>
            <div className="flex gap-6">
               <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
               <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            </div>
         </div>
      </footer>
    </div>
  );
};
