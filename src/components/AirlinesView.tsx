import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MoreHorizontal, CheckCircle, Clock, Loader2, 
  MapPin, Plane, Navigation, X, Mail, Phone, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AirlineContact {
  role: string;
  full_name: string;
  email?: string;
  phone?: string;
}

interface Airline {
  id: string;
  name: string;
  iata_code: string;
  status: string;
  fleet?: number;
  routes?: number;
  preferred_terminal?: string;
  contacts?: AirlineContact[];
}

export const AirlinesView: React.FC = () => {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPersonnel, setSelectedPersonnel] = useState<{ airline: Airline; role: string } | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollAirline, setEnrollAirline] = useState<Airline | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', airlineId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAirlines();
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Create the contact in the DB
      await supabase.from('airline_contacts').insert({
        airline_id: formData.airlineId,
        role: 'IT', // Defaulting for now, could be dynamic
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone
      });

      // 2. Add an audit notification
      const airlineName = carriers.find(a => a.id === formData.airlineId)?.name;
      await supabase.from('notifications').insert({
        title: 'Carrier Manager Enrolled',
        message: `Manager ${formData.name} created for ${airlineName}. Credentials pending Auth Release.`,
        type: 'success',
        metadata: { airline_id: formData.airlineId }
      });

      setShowEnrollModal(false);
      setFormData({ name: '', email: '', phone: '', airlineId: '' });
      await fetchAirlines();
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAirlines = async () => {
    try {
      const { data, error } = await supabase
        .from('carriers')
        .select(`
          *,
          contacts:airline_contacts(*)
        `)
        .order('name');
      
      if (error) {
        const { data: fallbackData } = await supabase.from('carriers').select('*').order('name');
        setAirlines(fallbackData || []);
      } else {
        setAirlines(data || []);
      }
    } catch (error) {
      console.error('Error fetching airlines:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {carriers.map((airline, i) => (
          <motion.div
            key={airline.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden"
          >
            {/* Terminal Badge */}
            <div className="absolute top-0 right-0 px-4 py-2 bg-slate-900 text-white rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <MapPin className="w-3 h-3 text-brand-400" />
              {airline.preferred_terminal || 'T1'}
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform shadow-inner">
                <span className="text-xl font-black text-brand-600">{airline.iata_code}</span>
              </div>
              <div className="flex gap-1 mr-10">
                <button 
                  onClick={() => { setEnrollAirline(airline); setFormData(prev => ({ ...prev, airlineId: airline.id })); setShowEnrollModal(true); }}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Enroll Manager"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-black mb-1 font-display tracking-tight text-slate-900 truncate pr-4">{airline.name}</h3>
            
            <div className="flex items-center gap-2 mb-6">
               {airline.status === 'active' ? (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                   <CheckCircle className="w-2.5 h-2.5" />
                   {airline.status}
                 </div>
               ) : (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                   <Clock className="w-2.5 h-2.5" />
                   {airline.status}
                 </div>
               )}
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Governance Access</p>
              <div className="flex gap-2">
                {[
                  { label: 'IT', color: 'bg-blue-600', shadow: 'shadow-blue-500/20' },
                  { label: 'LGL', color: 'bg-indigo-600', shadow: 'shadow-indigo-500/20' },
                  { label: 'FIN', color: 'bg-emerald-600', shadow: 'shadow-emerald-500/20' }
                ].map((role, rIdx) => (
                  <motion.button
                    key={rIdx}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPersonnel({ airline, role: role.label })}
                    className={`w-10 h-10 rounded-xl ${role.color} text-[11px] font-black text-white flex items-center justify-center shadow-lg ${role.shadow} hover:brightness-110 transition-all cursor-pointer`}
                    title={`View ${role.label} Contact`}
                  >
                    {role.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-2">
               <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Plane className="w-3 h-3 text-slate-400" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fleet Size</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">{airline.fleet || '—'}</p>
               </div>
               <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Routes</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">{airline.routes || '—'}</p>
               </div>
            </div>
          </motion.div>
        ))}

        {/* Enroll Button */}
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ y: -5, borderColor: 'var(--brand-600)' }}
          onClick={() => setShowEnrollModal(true)}
          className="bg-slate-50/50 border-2 border-dashed border-slate-200 min-h-[280px] rounded-[32px] flex flex-col items-center justify-center gap-4 group transition-all"
        >
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all">
             <Users className="w-7 h-7 text-slate-400 group-hover:text-white" />
          </div>
          <div className="text-center">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-1">Enroll New End-User</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">DGCA Node & Auth Release</span>
          </div>
        </motion.button>
      </div>

      {/* Enrollment Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEnrollModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Carrier Manager Enrollment</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {enrollAirline ? enrollAirline.name : 'Select Carrier for Manager Provisioning'}
                    </p>
                  </div>
                  <button onClick={() => setShowEnrollModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleEnroll} className="space-y-4">
                  {!enrollAirline && (
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Target Carrier</label>
                      <select 
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={formData.airlineId}
                        onChange={e => setFormData({ ...formData, airlineId: e.target.value })}
                      >
                        <option value="">Select Airline...</option>
                        {carriers.map(a => <option key={a.id} value={a.id}>{a.name} ({a.iata_code})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Manager Full Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Abdullah Al-Sabah"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Official Email</label>
                    <input 
                      required
                      type="email" 
                      placeholder="manager@carrier.com.kw"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Contact Phone</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="+965 2xxx xxxx"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 mt-6">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                      Manager status will be set to <span className="underline">Verified</span>. Credentials will be dispatched to the provided email upon successful Auth Node release.
                    </p>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enroll & Verify Manager'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedPersonnel && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPersonnel(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xl ${
                    selectedPersonnel.role === 'IT' ? 'bg-blue-600 shadow-blue-500/20' :
                    selectedPersonnel.role === 'LGL' ? 'bg-indigo-600 shadow-indigo-500/20' :
                    'bg-emerald-600 shadow-emerald-500/20'
                  }`}>
                    {selectedPersonnel.role}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {selectedPersonnel.role === 'IT' ? 'Technical Infrastructure' :
                       selectedPersonnel.role === 'LGL' ? 'Regulatory & Compliance' :
                       'Financial & Settlement'}
                    </h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Assigned Personnel — {selectedPersonnel.airline.name}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPersonnel(null)}
                  className="p-2.5 bg-white hover:bg-slate-100 text-slate-400 rounded-xl transition-all shadow-sm border border-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8">
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Contact Details</th>
                        <th className="px-6 py-4 text-right">Auth Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedPersonnel.airline.contacts?.filter(c => c.role === selectedPersonnel.role) || []).length > 0 ? (
                        selectedPersonnel.airline.contacts?.filter(c => c.role === selectedPersonnel.role).map((contact, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-5">
                              <p className="text-sm font-black text-slate-900">{contact.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedPersonnel.role} Representative</p>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                  <Mail className="w-3.5 h-3.5 text-brand-600" /> {contact.email}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                  <Phone className="w-3.5 h-3.5 text-brand-600" /> {contact.phone}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase border border-emerald-100">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center">
                            <Clock className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-400">No personnel currently assigned to this node.</p>
                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">Pending Carrier Submission</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 flex-shrink-0">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-blue-900 uppercase tracking-tight mb-1">Access Control Policy</p>
                    <p className="text-[11px] text-blue-800/70 leading-relaxed font-medium">
                      Personnel assigned here are granted restricted access to the {selectedPersonnel.role} node of the DGCA Partner Portal. Credentials are issued only after Annex 10 Level 1 verification.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
