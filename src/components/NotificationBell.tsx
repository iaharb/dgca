import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, AlertCircle, X, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    
    // Real-time subscription
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, 
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(c => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleApprove = async (notification: Notification) => {
    const carrierId = notification.metadata?.carrier_id;
    if (!carrierId) return;

    try {
      setUnreadCount(prev => prev); // keep state
      const { error } = await supabase.rpc('handle_carrier_acknowledgement', {
        target_carrier_id: carrierId,
        performing_officer_id: (await supabase.auth.getUser()).data.user?.id
      });
      
      if (error) throw error;
      
      // Update notification message locally
      setNotifications(prev => prev.map(n => n.id === notification.id ? {
        ...n,
        type: 'success',
        message: `Annex 10 dispatched to ${notification.metadata?.airline_name}.`
      } : n));
      
      alert(`Agreement generated for ${notification.metadata?.airline_name}. Link sent to registry email.`);
    } catch (err) {
      console.error('Workflow error:', err);
      alert('Failed to trigger agreement workflow.');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-blue-500 relative transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[110] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Activity Stream</h4>
                <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              </div>

              <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">No recent activity.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => n.type !== 'carrier_enrolled' && markAsRead(n.id)}
                      className={`p-5 border-b border-slate-50 transition-colors group ${!n.is_read ? 'bg-blue-50/20' : ''} ${n.type !== 'carrier_enrolled' ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                    >
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          n.type === 'carrier_enrolled' ? 'bg-blue-600 text-white' :
                          n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {n.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-black text-slate-900 leading-tight">{n.title}</p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0 ml-2">{getTimeAgo(n.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3">{n.message}</p>
                          
                          {n.type === 'carrier_enrolled' && (
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => handleApprove(n)}
                                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                >
                                   Approve & Send
                                </button>
                                <button className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                                   Review
                                </button>
                             </div>
                          )}

                          {!n.is_read && n.type !== 'carrier_enrolled' && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                               Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-slate-50 text-center">
                <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center justify-center gap-1 mx-auto">
                  View Full Governance Logs <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
