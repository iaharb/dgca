import React, { useEffect, useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  BarChart3, 
  Plus, 
  RefreshCcw, 
  Activity, 
  LayoutGrid,
  History,
  Info,
  ChevronRight,
  Database
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryItem {
  id: string;
  name: string;
  type: 'BTP' | 'BTAG';
  current_stock: number;
  reorder_threshold: number;
  unit_price: number;
  threshold_breached: boolean;
  updated_at: string;
}

interface UsageData {
  airline_name: string;
  iata_code: string;
  quantity: number;
}

export const ConsumablesDashboard: React.FC<{ variant?: 'full' | 'widget' }> = ({ variant = 'full' }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(0);
  const [simulating, setSimulating] = useState(false);

  const isWidget = variant === 'widget';

  useEffect(() => {
    fetchData();
  }, []);

  // ... (fetchData, handleRestock, simulateAODBFeed remain the same)
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Inventory
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      setInventory(invData || []);

      // 2. Fetch Aggregated Usage (Last 30 Days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usageData } = await supabase
        .from('consumables_usage')
        .select(`
          quantity,
          airlines (name, iata_code)
        `)
        .gte('usage_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Aggregate by airline
      const aggregated: Record<string, UsageData> = {};
      usageData?.forEach((u: any) => {
        const iata = u.airlines?.iata_code || 'UNK';
        if (!aggregated[iata]) {
          aggregated[iata] = {
            airline_name: u.airlines?.name || 'Unknown',
            iata_code: iata,
            quantity: 0
          };
        }
        aggregated[iata].quantity += u.quantity;
      });

      setUsageHistory(Object.values(aggregated).sort((a, b) => b.quantity - a.quantity));
    } catch (err) {
      console.error('Error fetching consumables data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async () => {
    if (!selectedItem || restockQty <= 0) return;

    try {
      const { error } = await supabase.rpc('restock_inventory_item', {
        item_id: selectedItem.id,
        added_quantity: restockQty
      });

      // If RPC is not found (some environments might not have it yet), fallback to manual update
      if (error) {
        await supabase
          .from('inventory_items')
          .update({
            current_stock: selectedItem.current_stock + restockQty,
            threshold_breached: (selectedItem.current_stock + restockQty) <= selectedItem.reorder_threshold
          })
          .eq('id', selectedItem.id);
      }

      setIsRestockOpen(false);
      setRestockQty(0);
      fetchData();
    } catch (err) {
      console.error('Restock error:', err);
    }
  };

  const simulateAODBFeed = async () => {
    setSimulating(true);
    try {
      // Get all airlines and inventory items
      const { data: airlines } = await supabase.from('airlines').select('id, iata_code');
      const { data: items } = await supabase.from('inventory_items').select('id');

      if (!airlines || !items || airlines.length === 0 || items.length === 0) return;

      // Pick random airline and item
      const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const randomQty = Math.floor(Math.random() * 5) + 1; // 1-5 units

      // Insert usage record
      await supabase.from('consumables_usage').insert({
        airline_id: randomAirline.id,
        item_id: randomItem.id,
        quantity: randomQty
      });

      await fetchData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setTimeout(() => setSimulating(false), 500);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#f4f4f4] text-[#161616] font-sans ${isWidget ? 'bg-white rounded-2xl border border-slate-200' : ''}`}>
      {/* Header - Only show if not widget */}
      {!isWidget && (
        <div className="bg-white border-b border-[#e0e0e0] px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
              Consumables Management
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded leading-none uppercase">v2.0</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Inventory tracking for airport operations & carrier procurement alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={simulateAODBFeed}
              disabled={simulating}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50`}
            >
              {simulating ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Simulate AODB Feed
            </button>
            <button 
              onClick={fetchData}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      <div className={`${isWidget ? 'p-0' : 'p-6'} grid grid-cols-12 gap-6 overflow-y-auto`}>
        
        {/* Left Column - Inventory Grid */}
        <div className={`${isWidget ? 'col-span-12' : 'col-span-12 lg:col-span-8'} bg-white border border-[#e0e0e0] shadow-sm`}>
          <div className="px-4 py-3 border-b border-[#e0e0e0] flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Live Inventory Status
            </h2>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-slate-500">Healthy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-slate-500">Low Stock</span>
              </div>
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-[#f4f4f4] border-b border-[#e0e0e0]">
              <tr>
                <th className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">Item Name</th>
                <th className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">Type</th>
                <th className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">Current Stock</th>
                <th className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">Threshold</th>
                <th className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${item.threshold_breached ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {item.type === 'BTP' ? <BarChart3 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Last updated: {new Date(item.updated_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">{item.type}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    <span className={item.threshold_breached ? 'text-red-600 font-bold' : 'text-slate-900'}>
                      {item.current_stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.reorder_threshold.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => { setSelectedItem(item); setIsRestockOpen(true); }}
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="w-3 h-3" /> RESTOCK
                    </button>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No inventory records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column - Usage Chart */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#e0e0e0] shadow-sm flex flex-col h-full">
            <div className="px-4 py-3 border-b border-[#e0e0e0] flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider">30-Day Consumption</h2>
            </div>
            <div className="p-4 flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageHistory} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="iata_code" 
                    type="category" 
                    width={40} 
                    fontSize={10} 
                    fontWeight={700}
                    tick={{ fill: '#393939' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded shadow-lg text-[10px]">
                            <p className="font-bold">{payload[0].payload.airline_name}</p>
                            <p className="text-blue-400">Usage: {payload[0].value} units</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {usageHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0f62fe' : '#8d8d8d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="p-4 border-t border-[#e0e0e0] bg-slate-50">
              <p className="text-[10px] text-slate-500 font-medium">Top consumer: <span className="text-slate-900 font-bold">{usageHistory[0]?.airline_name || 'N/A'}</span></p>
            </div>
          </div>

          {/* Quick Stats / Alerts */}
          <div className="bg-white border border-[#e0e0e0] shadow-sm p-4">
             <div className="flex items-center gap-2 mb-4">
               <AlertTriangle className="w-4 h-4 text-orange-500" />
               <h2 className="text-xs font-bold uppercase tracking-wider">Priority Alerts</h2>
             </div>
             <div className="space-y-3">
               {inventory.filter(i => i.threshold_breached).length > 0 ? (
                 inventory.filter(i => i.threshold_breached).map(item => (
                   <div key={item.id} className="p-3 bg-red-50 border-l-2 border-red-500 rounded-r flex items-start gap-3">
                     <div className="bg-white p-1 rounded-full shadow-sm text-red-500">
                        <Package className="w-3 h-3" />
                     </div>
                     <div>
                       <p className="text-[11px] font-bold text-red-800 uppercase tracking-tight">Procurement Alert</p>
                       <p className="text-[10px] text-red-700 font-medium mt-0.5">{item.name} stock level critical ({item.current_stock}). Reorder required immediately.</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r">
                    <p className="text-[10px] text-emerald-700 font-bold">ALL STOCKS WITHIN HEALTHY THRESHOLD</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      <AnimatePresence>
        {isRestockOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRestockOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-md shadow-2xl rounded"
            >
              <div className="px-6 py-4 border-b border-[#e0e0e0] flex justify-between items-center bg-[#f4f4f4]">
                <h3 className="text-sm font-bold uppercase tracking-wider">Restock Inventory</h3>
                <button onClick={() => setIsRestockOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <RefreshCcw className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded">
                  <div className="p-2 bg-white rounded shadow-sm text-blue-600">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedItem?.name}</p>
                    <p className="text-[10px] text-slate-600">Current Level: {selectedItem?.current_stock}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity to Add</label>
                  <input 
                    type="number"
                    value={restockQty}
                    onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#f4f4f4] border border-transparent focus:border-blue-600 focus:bg-white p-3 text-sm transition-all outline-none"
                    placeholder="Enter units..."
                  />
                  <p className="mt-2 text-[9px] text-slate-500 italic flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Adding stock will automatically clear the reorder alert if above threshold.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#e0e0e0] flex justify-end gap-2 bg-[#f4f4f4]">
                <button 
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRestock}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Confirm Restock
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
