import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, TrendingUp, TrendingDown, AlertCircle, Loader2, X, Tag, Ticket, Star, Box } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CONSUMABLE_META: Record<string, { icon: React.FC<any>; color: string; bg: string }> = {
  'Thermal Bag Tags': { icon: Tag,    color: 'text-orange-600', bg: 'bg-orange-50' },
  'Boarding Passes':  { icon: Ticket, color: 'text-blue-600',   bg: 'bg-blue-50'   },
  'Lounge Vouchers':  { icon: Star,   color: 'text-violet-600', bg: 'bg-violet-50'  },
};
const DEFAULT_META = { icon: Box, color: 'text-slate-600', bg: 'bg-slate-50' };

export const ConsumablesMonitor: React.FC<any> = ({ userType, airlineCode }) => {
  const [loading, setLoading]           = useState(true);
  const [cards, setCards]               = useState<any[]>([]);
  const [rawMetrics, setRawMetrics]     = useState<any[]>([]);
  const [activeItem, setActiveItem]     = useState<string | null>(null);
  const isDGCA = userType === 'dgca' || userType === 'operations_partner';

  useEffect(() => {
    fetchConsumables();
  }, [airlineCode, userType]);

  const fetchConsumables = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      let query = supabase
        .from('usage_metrics')
        .select('*, carriers!inner(name, iata_code)')  // !inner excludes orphaned/unknown rows
        .eq('billing_month', currentMonth);

      if (airlineCode && !isDGCA) {
        // Look up the airline's UUID first — PostgREST join-column filtering is unreliable
        const { data: myAirline } = await supabase.from('carriers').select('id').eq('iata_code', airlineCode).maybeSingle();
        if (myAirline) query = query.eq('airline_id', myAirline.id);
      }

      const { data: metrics } = await query;
      setRawMetrics(metrics || []);

      // Aggregate totals per consumable type
      const totals: Record<string, any> = {};
      (metrics || []).forEach(m => {
        const usage = m.consumables_usage || {};
        Object.entries(usage).forEach(([item, details]: [string, any]) => {
          if (!totals[item]) {
            totals[item] = { name: item, usage: 0, limit: details.limit || 5000, trend: details.trend || '0%', category: details.category || 'Operations' };
          }
          totals[item].usage += details.usage || 0;
          // Keep the highest limit as canonical
          if ((details.limit || 0) > totals[item].limit) totals[item].limit = details.limit;
        });
      });

      setCards(Object.values(totals));
    } catch (e) {
      console.error('[CONSUMABLES] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGridRows = () => {
    if (!activeItem) return [];
    const airlineMap: Record<string, any> = {};

    rawMetrics.forEach(m => {
      const iata = m.carriers?.iata_code || 'UNK';
      const name = m.carriers?.name || 'Unknown';
      const cons = m.consumables_usage || {};
      const item = cons[activeItem];

      if (!airlineMap[iata]) {
        airlineMap[iata] = { iata, name, usage: 0, limit: 0, pct: 0 };
      }
      if (item) {
        airlineMap[iata].usage += item.usage || 0;
        if ((item.limit || 0) > airlineMap[iata].limit) airlineMap[iata].limit = item.limit;
      }
    });

    return Object.values(airlineMap).map(r => ({
      ...r,
      pct: r.limit > 0 ? Math.min(Math.round((r.usage / r.limit) * 100), 100) : 0
    })).sort((a, b) => b.usage - a.usage);
  };

  if (loading) return (
    <div className="h-48 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Package className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">Resource Monitor</h3>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-auto">This Month</span>
      </div>

      {cards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
          <Package className="w-12 h-12 mb-2" />
          <p className="text-xs font-bold uppercase tracking-widest">Awaiting SAT</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 flex-1">
          {cards.map((item, i) => {
            const pct = Math.min(Math.round((item.usage / item.limit) * 100), 100);
            const isHigh = pct > 80;
            const meta = CONSUMABLE_META[item.name] || DEFAULT_META;
            const Icon = meta.icon;
            const TrendIcon = item.trend.startsWith('+') ? TrendingUp : TrendingDown;
            const trendColor = item.trend.startsWith('+') ? 'text-orange-500' : 'text-emerald-500';

            return (
              <motion.div
                key={i}
                onClick={() => setActiveItem(item.name)}
                whileHover={{ y: -1 }}
                className={`p-5 rounded-xl border cursor-pointer hover:shadow-md transition-all group
                  ${isHigh ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white hover:border-blue-300'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${meta.bg} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-0.5 text-[10px] font-black ${trendColor}`}>
                      <TrendIcon className="w-3 h-3" /> {item.trend}
                    </span>
                    {isHigh && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>{item.usage.toLocaleString()} used</span>
                    <span className={`font-black ${isHigh ? 'text-red-500' : 'text-slate-900'}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isHigh ? 'bg-red-500' : meta.color.replace('text', 'bg')}`}
                    />
                  </div>
                  <div className="text-right text-[9px] text-slate-400 font-bold">
                    Limit: {item.limit.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Consumable Detail Modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeItem}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">Carrier Consumption — Current Month</p>
                </div>
                <button onClick={() => setActiveItem(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-4 max-h-[55vh] overflow-y-auto">
                {getGridRows().map(row => (
                  <div key={row.iata} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black flex items-center justify-center border border-blue-100 flex-shrink-0">
                      {row.iata}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-900">{row.name}</span>
                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-500">
                          <span>{row.usage.toLocaleString()} / {row.limit.toLocaleString()}</span>
                          <span className={row.pct > 80 ? 'text-red-500' : 'text-emerald-600'}>{row.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${row.pct > 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {getGridRows().length === 0 && (
                  <p className="text-center text-slate-400 text-sm font-bold py-8">No data for this consumable</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
