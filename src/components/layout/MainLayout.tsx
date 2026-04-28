import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BrainCircuit, Calendar, Map as MapIcon, Target, BookOpen, PenTool, List, LayoutList, Archive, Clock, Settings, Eye, EyeOff, CloudOff, RefreshCcw, Pin, Trophy, AlertTriangle, Menu, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useAppSelectors } from '../../store/selectors';
import { isSuperAdmin } from '../../config/admin';
import { confirmDialog } from '../../contexts/ToastContext';

import { NavItem } from '../NavItem';
import { NotificationCenter } from '../NotificationCenter';
import { NetworkBanner } from '../NetworkBanner';
import { SpotifyWidget } from '../SpotifyWidget';
import { MobileMenuModal } from './MobileMenuModal';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, mobileVisible: true, desktopVisible: true },
  { id: 'coach', label: 'Ai Koç', icon: <BrainCircuit size={18} />, mobileVisible: true, desktopVisible: true },
  { id: 'agenda', label: 'Ajanda', icon: <Calendar size={18} />, mobileVisible: true, desktopVisible: true },
  { id: 'subjects', label: 'Müfredat', icon: <MapIcon size={18} />, mobileVisible: true, desktopVisible: true },
  { id: 'questions', label: 'Soru Analizi', icon: <Target size={18} />, mobileVisible: false, desktopVisible: true },
  { id: 'explain', label: 'Konu Analizi', icon: <BookOpen size={18} />, mobileVisible: false, desktopVisible: true },
  { id: 'strategy', label: 'Strateji', icon: <PenTool size={18} />, mobileVisible: false, desktopVisible: true },
  { id: 'logs', label: 'Kayıtlar', icon: <List size={18} />, mobileVisible: true, desktopVisible: true },
  { id: 'exams', label: 'Denemeler', icon: <LayoutList size={18} />, mobileVisible: true, desktopVisible: true },
  { id: 'archive', label: 'Mezarlık', icon: <Archive size={18} />, mobileVisible: false, desktopVisible: true },
  { id: 'countdown', label: 'Geri Sayım', icon: <Clock size={18} />, mobileVisible: false, desktopVisible: true },
  { id: 'settings', label: 'Ayarlar', icon: <Settings size={18} />, mobileVisible: false, desktopVisible: true },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  const { 
    user, 
    signOut, 
    profile, 
    isPassiveMode,
    isSyncing,
    notifications,
    isZenMode,
    setZenMode
  } = useAppSelectors();

  const syncStatus = 'synced' as string; // Type-safe placeholder
  const storeForceSync = () => console.log('Sync forced');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('boho_sidebar_pinned');
    return saved ? JSON.parse(saved) : true;
  });
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  
  const isSidebarExpanded = isSidebarPinned || isNavHovered;

  useEffect(() => {
    localStorage.setItem('boho_sidebar_pinned', JSON.stringify(isSidebarPinned));
  }, [isSidebarPinned]);

  const toggleSidebarPin = () => setIsSidebarPinned((prev: boolean) => !prev);

  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      if (direction !== scrollDirection && (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)) {
        setScrollDirection(direction);
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };
    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, [scrollDirection]);

  const isCurrentlySyncing = isSyncing;
  const syncButtonTitle = syncStatus === 'offline' ? 'Çevrimdışı' : isCurrentlySyncing ? 'Eşitleniyor...' : 'Eşitlendi';
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-app text-ink font-sans selection:bg-zinc-700 selection:text-zinc-100 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {isSyncing && <div className="sync-progress-bar" aria-label="Senkronize ediliyor" />}

      <header className="md:hidden sticky top-0 left-0 right-0 h-14 border-b border-app glass-header z-[100] flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-black/20 bg-[#1F2A36] border border-white/10">
            <img src="/logo.png" alt="Boho Mentosluk" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-display italic text-sm font-bold tracking-tight text-ink truncate max-w-[120px]">Boho Mentosluk</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => storeForceSync()} disabled={isCurrentlySyncing} className="p-2 text-zinc-500">
             {syncStatus === 'offline' ? <CloudOff size={18} /> : <RefreshCcw size={18} className={isCurrentlySyncing ? 'animate-spin' : ''} />}
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-app cursor-pointer" onClick={() => navigate('/profile')}>
            {profile.avatar
              ? <img src={profile.avatar} alt="P" className="w-full h-full rounded-full object-cover" />
              : <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile.name}`} alt="P" className="w-full h-full rounded-full bg-surface" />
            }
          </div>
        </div>
      </header>

      <motion.nav
        initial={false}
        animate={{ 
          width: isZenMode ? 0 : (isSidebarExpanded ? 256 : 72),
          x: isZenMode ? -300 : 0,
          opacity: isZenMode ? 0 : 1
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 1 }}
        className={`fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:relative border-t md:border-t-0 glass-nav flex flex-row md:flex-col z-[90] pb-[env(safe-area-inset-bottom)] md:h-[100dvh] shadow-xl md:shadow-none ${scrollDirection === 'down' ? 'translate-y-full md:translate-y-0' : 'translate-y-0'} ${isZenMode ? 'pointer-events-none' : ''}`}
        onMouseEnter={() => !isZenMode && setIsNavHovered(true)}
        onMouseLeave={() => setIsNavHovered(false)}
      >
        <div className="hidden md:flex p-3 border-b border-app items-center justify-between gap-2 overflow-hidden h-14 shrink-0">
          <div className={`flex items-center gap-3 min-w-0 transition-all duration-300 ${isSidebarExpanded ? '' : 'justify-center w-full'}`}>
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#1F2A36] border border-[#C17767]/30 shadow-lg shrink-0">
              <img src="/logo.png" alt="Boho Mentosluk" className="w-full h-full object-cover" />
            </div>
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col justify-center min-w-0 overflow-hidden"
                >
                  <h1 className="font-display italic text-base font-bold tracking-tight text-[#C17767] leading-tight whitespace-nowrap">Boho Mentos</h1>
                  <p className="text-[7px] uppercase tracking-[0.2em] opacity-40 font-bold text-zinc-500 whitespace-nowrap">YKS Mentörlük v5</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isSidebarExpanded && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => storeForceSync()} disabled={isCurrentlySyncing} className="p-1 hover:bg-white/5 rounded-lg transition-all text-zinc-500 hover:text-[#C17767]" title={syncButtonTitle}>
                {syncStatus === 'offline' ? <CloudOff size={14} className="text-amber-500" /> : <RefreshCcw size={14} className={isCurrentlySyncing ? 'animate-spin' : ''} />}
              </button>
              <button
                onClick={toggleSidebarPin}
                className={`p-1 rounded-lg transition-all ${ isSidebarPinned ? 'text-[#C17767] bg-[#C17767]/10' : 'text-zinc-500 hover:text-[#C17767] hover:bg-white/5' }`}
                title={isSidebarPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
              >
                <Pin size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="px-3 mt-4 mb-2 overflow-hidden">
          <div 
            onClick={() => navigate('/profile')}
            className={`p-2 rounded-2xl bg-white/5 border border-white/5 flex items-center transition-all duration-300 cursor-pointer hover:bg-white/10 ${!isSidebarExpanded ? 'justify-center' : 'gap-3'}`}
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden border border-white/10">
                {profile.avatar 
                  ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.name || 'User'}`} alt="avatar" className="w-full h-full bg-surface" />
                }
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#C17767] rounded-full border-2 border-[#0A0A0C] flex items-center justify-center">
                <Trophy size={10} className="text-white" />
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {isSidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-xs font-bold truncate text-zinc-100">{profile?.name || 'Gear_Head'}</span>
                  <span className="text-[9px] uppercase tracking-widest text-[#C17767] font-bold">{profile?.track || 'SAY'} ADAYI</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>



        <div className="flex-1 flex flex-row md:flex-col py-1 md:py-3 px-1 md:px-3 md:space-y-1 justify-around md:justify-start overflow-x-auto md:overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <div key={item.id} className={`${item.mobileVisible ? 'block' : 'hidden'} md:${item.desktopVisible ? 'block' : 'hidden'} w-full`}>
              <NavItem
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => navigate(`/${item.id}`)}
                collapsed={!isSidebarExpanded}
              />
            </div>
          ))}
          <div className="md:hidden block w-full px-1">
            <NavItem icon={<Menu size={18} />} label="Menü" active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(true)} />
          </div>
        </div>

        <div className="hidden md:flex flex-col border-t border-app p-3">
          {isSuperAdmin(user?.uid, user?.email) && isSidebarExpanded && (
            <button
              onClick={() => navigate('/admin_dashboard')}
              className="w-full flex items-center gap-3 p-2 text-[10px] font-bold uppercase tracking-widest text-[#C17767] hover:bg-[#C17767]/5 rounded-xl transition-all mb-1"
            >
              <span className="w-5 h-5 flex items-center justify-center">⬡</span>
              <span>ADMIN PANEL</span>
            </button>
          )}
          <button
            onClick={() => setZenMode(!isZenMode)}
            className={`flex items-center gap-3 p-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-white/5 rounded-xl transition-all mb-1 ${!isSidebarExpanded ? 'justify-center' : ''}`}
            title="Zen Modu (Odaklan)"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {isZenMode ? <Eye size={16} /> : <EyeOff size={16} />}
            </div>
            {isSidebarExpanded && <span>ZEN MODU</span>}
          </button>

          <button
            onClick={async () => { if (await confirmDialog('Çıkış yapmak istediğine emin misin?')) signOut(); }}
            className={`flex items-center gap-3 p-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all ${!isSidebarExpanded ? 'justify-center' : ''}`}
            title="Çıkış Yap"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <LogOut size={16} />
            </div>
            {isSidebarExpanded && <span>ÇIKIŞ YAP</span>}
          </button>
        </div>
      </motion.nav>

      <main className={`flex-1 overflow-hidden relative flex flex-col bg-app pb-16 md:pb-0 pt-0 transition-all duration-700 ${isZenMode ? 'p-0' : ''}`}>
        {isZenMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setZenMode(false)}
            className="fixed top-6 right-6 z-[100] p-4 bg-[#C17767] text-white rounded-2xl shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 group"
          >
            <Eye size={20} />
            <span className="text-xs font-bold uppercase tracking-widest hidden group-hover:inline">Zen'den Çık</span>
          </motion.button>
        )}
        {children}
      </main>

      <MobileMenuModal
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onNavigate={(tab) => {
          navigate(`/${tab}`);
          setIsMobileMenuOpen(false);
        }}
        onSignOut={signOut}
      />
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <NetworkBanner />
      <SpotifyWidget />
    </div>
  );
}
