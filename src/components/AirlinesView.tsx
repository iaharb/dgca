import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MoreHorizontal, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Airline {
  id: string;
  name: string;
  iata_code: string;
  status: string;
  fleet?: number;
  routes?: number;
}

export const AirlinesView: React.FC = () => {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    try {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setAirlines(data || []);
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
        {airlines.map((airline, i) => (
          <motion.div
            key={airline.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm group hover:shadow-xl transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform">
                <span className="text-lg font-black text-brand-600">{airline.iata_code}</span>
              </div>
              <button className="p-2 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                < MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-lg font-black mb-1 font-display tracking-tight text-slate-900 dark:text-white">{airline.name}</h3>
            <div className="flex items-center gap-2 mb-4">
               {airline.status === 'active' ? (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest">
                   <CheckCircle className="w-2.5 h-2.5" />
                   {airline.status}
                 </div>
               ) : (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">
                   <Clock className="w-2.5 h-2.5" />
                   {airline.status}
                 </div>
               )}
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Assigned Personnel</p>
              <div className="flex gap-2">
                {[
                  { label: 'IT', color: 'bg-blue-500' },
                  { label: 'LGL', color: 'bg-indigo-500' },
                  { label: 'FIN', color: 'bg-emerald-500' }
                ].map((role, rIdx) => (
                  <div key={rIdx} className="group relative">
                    <div className={`w-8 h-8 rounded-lg ${role.color} text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-black/5`}>
                      {role.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fleet</p>
                  <p className="text-sm font-bold">{airline.fleet || 'N/A'}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Routes</p>
                  <p className="text-sm font-bold">{airline.routes || 'N/A'}</p>
               </div>
            </div>
          </motion.div>
        ))}

        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 min-h-[220px] rounded-[28px] flex flex-col items-center justify-center gap-4 group hover:border-brand-500/50 transition-colors"
        >
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
             <Users className="w-6 h-6 text-slate-400 group-hover:text-brand-600" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Enroll New End-User</span>
        </motion.button>
      </div>
    </div>
  );
};
