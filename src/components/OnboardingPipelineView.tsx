import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  FileCheck2, 
  Check, 
  X, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCcw,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const OnboardingPipelineView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    fetchData();
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 86400000); // Daily update
    return () => clearInterval(interval);
  }, []);

  const calculateCountdown = () => {
    const goLive = new Date('2026-06-01');
    const today = new Date();
    const diff = goLive.getTime() - today.getTime();
    setDaysRemaining(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqsRes, airlinesRes] = await Promise.all([
        supabase.from('onboarding_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('airlines').select('*').order('created_at', { ascending: false })
      ]);
      setRequests(reqsRes.data || []);
      setCarriers(airlinesRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: any) => {
    try {
      await supabase.rpc('approve_airline_onboarding', { request_id: request.id });
      // In a real app, this would also trigger a Supabase Auth email
      fetchData();
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const stats = [
    { label: 'Pending Requests', value: requests.filter(r => r.status === 'PENDING_REQUEST').length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Signed Contracts', value: carriers.filter(c => c.onboarding_status === 'AGREEMENT_SIGNED').length, icon: FileCheck2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Network Readiness', value: `${carriers.length}/140`, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-8 p-1">
      {/* Header & Countdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Administrative Hub</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">June 2026 Expansion</span>
           </div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding Pipeline</h2>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
           <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Calendar className="w-6 h-6" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Days to Network Launch</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-black text-slate-900">{daysRemaining}</span>
                 <span className="text-xs font-bold text-slate-500">Days Remaining</span>
              </div>
           </div>
           <div className="h-10 w-px bg-slate-100 mx-2" />
           <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (1 - (daysRemaining / 800)) * 100)}%` }} 
              />
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-colors">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Pending Requests Table */}
        <div className="xl:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Entrance Applications</h3>
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    await supabase.from('onboarding_requests').insert({
                      full_name: 'Ihab Harb',
                      official_email: 'ihab@jazeeraairways.com',
                      phone: '+965 9000 0000',
                      airline_name: 'Jazeera Airways',
                      iata_code: 'J9',
                      job_title: 'Manager'
                    });
                    fetchData();
                  }}
                  className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                   Simulate Intake
                </button>
                <button onClick={fetchData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                   <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Airline / IATA</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrant / Role</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.filter(r => r.status === 'PENDING_REQUEST').map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-blue-600 shadow-sm">
                            {req.iata_code}
                         </div>
                         <div>
                            <p className="font-bold text-slate-900 leading-none">{req.airline_name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1.5">Submitted {new Date(req.created_at).toLocaleDateString()}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900 leading-none">{req.full_name}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-1.5">{req.job_title}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-600 underline decoration-slate-200">{req.official_email}</p>
                      <p className="text-[10px] font-black text-slate-400 mt-1">{req.phone}</p>
                    </td>
                    <td className="px-8 py-5">
                       <button 
                        onClick={() => handleApprove(req)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all opacity-0 group-hover:opacity-100"
                       >
                          Approve & Send Agreement <ChevronRight className="w-3 h-3" />
                       </button>
                    </td>
                  </tr>
                ))}
                {requests.filter(r => r.status === 'PENDING_REQUEST').length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                       <div className="max-w-xs mx-auto opacity-30">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
                          <p className="text-sm font-bold uppercase tracking-widest">Queue Clear</p>
                          <p className="text-xs font-medium mt-1">All entrance requests have been processed.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pipeline Status Overview */}
        <div className="xl:col-span-4 space-y-8">
           <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20">
              <div className="flex items-center gap-3 mb-8">
                 <Zap className="w-5 h-5 text-blue-400" />
                 <h3 className="font-black text-sm uppercase tracking-[0.2em]">Network readiness</h3>
              </div>
              
              <div className="space-y-6">
                 {[
                   { label: 'Agreement Sent', count: carriers.filter(c => c.onboarding_status === 'AGREEMENT_SENT').length, total: carriers.length, color: 'bg-blue-500' },
                   { label: 'Legally Signed', count: carriers.filter(c => c.onboarding_status === 'AGREEMENT_SIGNED').length, total: carriers.length, color: 'bg-emerald-500' },
                   { label: 'Integration Active', count: carriers.filter(c => c.onboarding_status === 'INTEGRATION_STAGE_1').length, total: carriers.length, color: 'bg-indigo-500' },
                 ].map((p, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.label}</p>
                         <p className="text-xs font-black">{p.count} <span className="text-slate-500">/ {p.total}</span></p>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                         <div 
                          className={`${p.color} h-full rounded-full`} 
                          style={{ width: `${Math.max(5, (p.count/p.total)*100)}%` }} 
                         />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
                 <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                 <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                   Critical Path: 14 carriers are stuck in 'Agreement Sent' phase. 
                   Expected bottleneck for hardware verification.
                 </p>
              </div>
           </div>

           <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Live Activity</h4>
              <div className="space-y-6">
                 {carriers.slice(0, 3).map((c, i) => (
                   <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] shrink-0">
                         {c.iata_code}
                      </div>
                      <div>
                         <p className="text-[11px] font-bold text-slate-900 leading-tight">
                            {c.name} <span className="text-slate-500 font-medium">transitioned to</span> {c.onboarding_status?.replace('_', ' ')}
                         </p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">2 hours ago</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
