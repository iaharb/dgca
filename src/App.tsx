import React, { useState, useEffect } from 'react';
import { IntegrationPipeline } from './components/IntegrationPipeline';
import { FinancialMap } from './components/FinancialMap';
import { ConsumablesMonitor } from './components/ConsumablesMonitor';
import { PortalInitiation } from './components/PortalInitiation';
import { CarrierOnboardingModal } from './components/CarrierOnboardingModal';
import { AirlinesView } from './components/AirlinesView';
import { AgreementsView } from './components/AgreementsView';
import { DossierDrawer } from './components/DossierDrawer';
import { AODBControlCenter } from './components/AODBControlCenter';
import { Login } from './components/Login';
import { UserManual } from './components/UserManual';
import { InvoicingView } from './components/InvoicingView';
import { PaymentsView } from './components/PaymentsView';
import { ConsumablesDashboard } from './components/ConsumablesDashboard';
import { PredictiveAnalytics } from './components/PredictiveAnalytics';
import { seedDemoData } from './utils/seed-demo-data';
import { seedOperationalData } from './utils/seed-operational-data';
import { OnboardingPublicPortal } from './components/OnboardingPublicPortal';
import { OnboardingPipelineView } from './components/OnboardingPipelineView';
import { CarrierWorkflowView } from './components/CarrierWorkflowView';
import { NotificationBell } from './components/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  LayoutDashboard, 
  Users, 
  FileText, 
  ChevronRight, 
  Plane, 
  Search, 
  Bell, 
  HelpCircle, 
  Command, 
  Plus, 
  Radio, 
  LogOut,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  Receipt,
  Banknote,
  Sparkles
} from 'lucide-react';

import { supabase } from './lib/supabase';

function App() {
  // ── Hash-based routing helpers ────────────────────────────────────────────
  const VALID_TABS = ['dashboard','financial','airlines','agreements','invoicing','payments','consumables','onboarding','simulation','analytics','manual'];
  const hashToTab = () => {
    const h = window.location.hash.replace('#', '');
    return VALID_TABS.includes(h) ? h : 'dashboard';
  };

  const [isInitiated, setIsInitiated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(hashToTab);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const initApp = async () => {
      const { data } = await supabase.from('app_settings').select('is_initiated').eq('id', 'global').maybeSingle();
      setIsInitiated(data?.is_initiated || false);
    };
    initApp();

    // Sync hash ↔ tab state (handles browser back/forward)
    const onHashChange = () => setActiveTab(hashToTab());
    window.addEventListener('hashchange', onHashChange);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      hydrateUser(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      hydrateUser(session?.user);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const hydrateUser = async (user: any) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      setProfile(data);
    }
  };

  const handleInitiate = async () => {
    await seedDemoData();
    await supabase.from('app_settings').upsert({ id: 'global', is_initiated: true });
    setIsInitiated(true);
  };

  // Navigate: update both React state AND the URL hash
  const navigateTo = (tab: string) => {
    window.location.hash = tab;
    setActiveTab(tab);
  };

  const menuItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Pipeline Board',  roles: ['dgca', 'carrier', 'operations_partner'] },
    { id: 'financial',  icon: BarChart3,        label: 'Financial Health', roles: ['dgca', 'carrier', 'operations_partner'] },
    { id: 'airlines',   icon: Users,            label: 'Directory',        roles: ['dgca', 'operations_partner'] },
    { id: 'agreements', icon: FileText,          label: 'Ledger',           roles: ['dgca', 'carrier', 'operations_partner'] },
    { id: 'invoicing',  icon: Receipt,           label: 'Invoicing',        roles: ['dgca', 'carrier', 'operations_partner'] },
    { id: 'payments',   icon: Banknote,          label: 'Payments',         roles: ['dgca', 'operations_partner'] },
    { id: 'consumables', icon: Package,           label: 'Consumables',      roles: ['dgca', 'carrier', 'operations_partner'] },
    { id: 'onboarding',  icon: Zap,               label: 'Onboarding',       roles: ['dgca', 'operations_partner'] },
    { id: 'simulation', icon: Radio,             label: 'Simulator',        roles: ['dgca', 'operations_partner'] },
    { id: 'analytics',  icon: Sparkles,          label: 'Predictive RMS',   roles: ['dgca', 'operations_partner'] },
    { id: 'manual',     icon: BookOpen,          label: 'User Manual',      roles: ['dgca', 'carrier', 'operations_partner'] },
  ].filter(item => item.roles.includes(profile?.role || ''));

  // Sync browser tab title with active page
  useEffect(() => {
    const label = menuItems.find(m => m.id === activeTab)?.label || 'KWI Portal';
    document.title = `${label} — KWI Aviation Partner Portal`;
  }, [activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitiated === null) return <div className="h-screen w-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-xs">Authenticating Node...</div>;

  // Handle Public Onboarding Portal
  if (window.location.pathname === '/onboarding/june-2026') {
     return <OnboardingPublicPortal />;
  }

  if (!isInitiated) return <PortalInitiation onInitiated={handleInitiate} />;
  if (!session || !profile) return <Login />;

  const performSync = async () => {
    setIsSyncing(true);
    await seedDemoData();
    await seedOperationalData();
    setRefreshKey(k => k + 1); // Forces all dashboard components to remount & refetch
    setIsSyncing(false);
  };

  const triggerMEASatSignOff = async () => {
    setIsSyncing(true);
    try {
      const { data: airline } = await supabase.from('airlines').select('id').eq('iata_code', 'ME').maybeSingle();
      if (airline) {
        const { data: agreement } = await supabase.from('agreements').select('id').eq('airline_id', airline.id).maybeSingle();
        if (agreement) {
          // ensure milestones exist, then mark sat_sign_off and certified
          const milestones = ['sat_sign_off', 'certified'];
          for (const m of milestones) {
            await supabase.from('integration_milestones').upsert({
              agreement_id: agreement.id,
              milestone_type: m,
              status: 'completed',
              completed_at: new Date().toISOString()
            }, { onConflict: 'agreement_id,milestone_type' });
          }
        }
      }
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error(e);
    }
    setIsSyncing(false);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden select-none">
      <CarrierOnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} onSuccess={() => navigateTo('airlines')} />
      <DossierDrawer project={selectedProject} isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} />

      {/* Sidebar */}
      <aside className="w-64 min-w-[256px] border-r border-slate-200 bg-white flex flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <Plane className="w-6 h-6" />
            </div>
            <h1 className="font-black text-xl tracking-tight text-slate-900 font-display">KWI VP</h1>
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-6 px-1">Control Hub</p>
        </div>

        <nav className="flex-1 px-4 mt-2 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2">
           <button 
             onClick={performSync}
             disabled={isSyncing}
             className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
           >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Global Nodes'}
           </button>
           
           {profile?.role === 'dgca' && (
             <button 
               onClick={triggerMEASatSignOff}
               disabled={isSyncing}
               className="w-full flex items-center justify-center gap-2 py-3 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
               title="Force Middle East Airlines to SAT Sign-off"
             >
                <ShieldCheck className={`w-3 h-3 ${isSyncing ? 'animate-pulse' : ''}`} />
                Toggle MEA SAT Sign-off
             </button>
           )}
        </div>

        <div className="p-6 border-t border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center font-black text-orange-600 text-xs text-center leading-none">
                {profile?.role === 'dgca' ? 'YA' : profile?.airline_code || (profile?.role === 'operations_partner' ? 'OP' : '??')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {profile?.role?.replace('_', ' ')} {profile?.airline_code ? `- ${profile.airline_code}` : ''}
                </p>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-red-500"><LogOut className="w-4 h-4" /></button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-50 relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-10">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-xl w-[400px] border border-slate-200 focus-within:border-blue-500 group transition-all">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
            <input type="text" placeholder="Search carrier fleet data..." className="bg-transparent text-sm font-medium outline-none w-full" />
          </div>
          <div className="flex items-center gap-4">
             <NotificationBell />
             {[HelpCircle, Command].map((Icon, i) => (
                <button key={i} className="p-2 text-slate-400 hover:text-blue-500"><Icon className="w-5 h-5" /></button>
             ))}
             <div className="h-8 w-px bg-slate-200 mx-2"></div>
              {profile?.role === 'dgca' && (
               <button onClick={() => setIsOnboardingOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                 <Plus className="w-4 h-4" /> Add Carrier
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{activeTab}</span>
                 <ChevronRight className="w-3 h-3 text-slate-300" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Network</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display">
                {menuItems.find(m => m.id === activeTab)?.label || 'Network Integration Board'}
              </h2>
           </div>

           <AnimatePresence mode="wait">
             <motion.div key={`${activeTab}-${refreshKey}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === 'dashboard' && (
                  <div className="space-y-10">
                    {profile?.role === 'carrier' && profile?.onboarding_status !== 'INTEGRATION_STAGE_1' ? (
                       <CarrierWorkflowView airline={profile} />
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                          <div className="xl:col-span-2 space-y-10">
                            <IntegrationPipeline onSelectProject={(p: any) => setSelectedProject(p)} userType={profile?.role} airlineCode={profile?.airline_code} />
                            <FinancialMap userType={profile?.role} airlineCode={profile?.airline_code} />
                         </div>
                         <div className="space-y-10">
                            <ConsumablesDashboard variant="widget" />
                         </div>
                      </div>
                    )}
                  </div>
                )}
               {activeTab === 'financial'  && <FinancialMap   userType={profile?.role} airlineCode={profile?.airline_code} />}
               {activeTab === 'airlines'   && (profile?.role === 'dgca' || profile?.role === 'operations_partner') && <AirlinesView />}
               {activeTab === 'agreements' && <AgreementsView userType={profile?.role} airlineCode={profile?.airline_code} />}
               {activeTab === 'invoicing'  && <InvoicingView  userType={profile?.role} airlineCode={profile?.airline_code} />}
               {activeTab === 'payments'   && (profile?.role === 'dgca' || profile?.role === 'operations_partner') && <PaymentsView userType={profile?.role} airlineCode={profile?.airline_code} />}
               {activeTab === 'consumables' && <ConsumablesDashboard />}
               {activeTab === 'onboarding'  && (profile?.role === 'dgca' || profile?.role === 'operations_partner') && <OnboardingPipelineView />}
               {activeTab === 'simulation' && (profile?.role === 'dgca' || profile?.role === 'operations_partner') && <AODBControlCenter />}
               {activeTab === 'analytics'  && (profile?.role === 'dgca' || profile?.role === 'operations_partner') && <PredictiveAnalytics userType={profile?.role} />}
               {activeTab === 'manual'     && <UserManual userType={profile?.role} />}
             </motion.div>
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
