import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BrainCircuit, Calendar, Map as MapIcon, Target, BookOpen, PenTool, List, LayoutList, Archive, Clock, Settings, Eye, EyeOff, CloudOff, RefreshCcw, Pin, Trophy, AlertTriangle, Menu, LogOut, MessageCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { isSuperAdminClaims } from '../../config/admin';
import { confirmDialog } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';

import { NavItem } from '../NavItem';
import { NAV_ITEMS } from '../../config/navItems';
import { NotificationCenter } from '../NotificationCenter';
import { NetworkBanner } from '../NetworkBanner';
import { CompactSpotify as SpotifyWidget } from '../ui/CompactSpotify';
import { MobileMenuModal } from './MobileMenuModal';
import { CelebrationPortal } from '../CelebrationPortal';

// Centralized nav items used from config

export function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  const { profile } = useAppStore(useShallow(s => ({ profile: s.profile })));
  const { user } = useAppStore(useShallow(s => ({ user: s.authUser })));
  const { signOut } = useAuth();
  const triggerManualSync = useAppStore(s => s.triggerManualSync);
  const { isSyncing, isZenMode, setZenMode } = useAppStore(useShallow(s => ({ isSyncing: s.isSyncing, isZenMode: s.isZenMode, setZenMode: s.setZenMode })));
  const { isPassiveMode } = useAppStore(useShallow(s => ({ isPassiveMode: s.isPassiveMode })));
  const notifications = useAppStore(s => s.notifications);
  const activeBoost = useAppStore(s => 
    s.profile?.coachMemory?.commitments?.some(c =>
      (c.startsWith('xpMultiplier:') || c.startsWith('coinMultiplier:')) &&
      new Date(c.split(':')[1]) > new Date()
    ) ?? false
  );

  const syncStatus = 'synced' as string; 
  const [lastSyncClick, setLastSyncClick] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const COOLDOWN = 60000; // 60 seconds

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const storeForceSync = () => {
    const now = Date.now();
    if (now - lastSyncClick < COOLDOWN) return;
    setLastSyncClick(now);
    setCooldownRemaining(COOLDOWN);
    triggerManualSync();
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('boho_sidebar_pinned');
    return saved ? JSON.parse(saved) : true;
  });
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');

  const isSidebarExpanded = isSidebarPinned || isNavHovered;
  const canOpenAdmin = isSuperAdminClaims(user?.claims ?? null, user?.email);

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
  const syncButtonTitle = syncStatus === 'offline' 
    ? 'Çevrimdışı' 
    : isCurrentlySyncing 
      ? 'Eşitleniyor...' 
      : (Date.now() - lastSyncClick < COOLDOWN)
        ? `${Math.ceil((COOLDOWN - (Date.now() - lastSyncClick)) / 1000)}sn bekleyin`
        : 'Eşitlemeyi Tetikle';
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDMPanelOpen, setIsDMPanelOpen] = useState(false);

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
          <button onClick={() => setIsDMPanelOpen(true)} className="p-2 text-zinc-500">
            <MessageCircle size={18} />
          </button>
          <button 
            onClick={() => storeForceSync()} 
            disabled={isCurrentlySyncing || cooldownRemaining > 0} 
            className={`relative p-2 rounded-xl transition-all ${cooldownRemaining > 0 ? 'text-zinc-700' : 'text-zinc-500 hover:bg-white/5'}`}
            title={cooldownRemaining > 0 ? `Bekle: ${Math.ceil(cooldownRemaining/1000)}s` : 'Senkronize Et'}
          >
            {syncStatus === 'offline' ? <CloudOff size={18} /> : <RefreshCcw size={18} className={isCurrentlySyncing ? 'animate-spin' : ''} />}
            {cooldownRemaining > 0 && !isCurrentlySyncing && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="50%" cy="50%" r="40%"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeDasharray="100"
                  strokeDashoffset={100 - (cooldownRemaining / COOLDOWN) * 100}
                  className="opacity-20"
                />
              </svg>
            )}
          </button>
          {/* Active boost indicator */}
          {activeBoost && (
            <div className="relative p-1.5 bg-amber-500/20 rounded-lg" title="Aktif takviye var!">
              <Zap size={14} className="text-amber-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            </div>
          )}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-app cursor-pointer" onClick={() => navigate('/profile')}>
            {profile?.avatar
              ? <img src={profile.avatar} alt="P" className="w-full h-full rounded-full object-cover" />
              : <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.name || 'user'}`} alt="P" className="w-full h-full rounded-full bg-surface" />
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
        className={`fixed bottom-3 left-3 right-3 md:bottom-auto md:left-auto md:right-auto md:relative border border-white/10 md:border-t-0 md:border-x-0 md:border-b-0 glass-nav bg-zinc-950/80 md:bg-transparent backdrop-blur-2xl md:backdrop-blur-none flex flex-row md:flex-col z-[90] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:p-0 md:h-[100dvh] rounded-[28px] md:rounded-none shadow-2xl md:shadow-none transition-transform duration-300 ${scrollDirection === 'down' ? 'translate-y-[calc(100%+1rem)] md:translate-y-0' : 'translate-y-0'} ${isZenMode ? 'pointer-events-none' : ''}`}
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
                className={`p-1 rounded-lg transition-all ${isSidebarPinned ? 'text-[#C17767] bg-[#C17767]/10' : 'text-zinc-500 hover:text-[#C17767] hover:bg-white/5'}`}
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



        <div className="flex-1 flex flex-row md:flex-col py-1 md:py-3 px-1 md:px-3 md:space-y-1 justify-around md:justify-start overflow-x-auto md:overflow-y-auto no-scrollbar gap-1 md:gap-0">
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

        <div className="hidden md:flex flex-col border-t border-app p-2 space-y-1">
          {isSidebarExpanded && (
            <button
              onClick={() => navigate('/admin_dashboard')}
              className="w-full flex items-center gap-3 p-2 text-[10px] font-black uppercase tracking-widest text-[#C17767] hover:bg-[#C17767]/10 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C17767]/10 flex items-center justify-center group-hover:scale-110 transition-transform text-lg leading-none">⬡</div>
              <span>ADMIN PANEL</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setIsDMPanelOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/5 transition-all text-zinc-500 hover:text-white"
              title="Mesajlar"
            >
              <MessageCircle size={18} />
              {isSidebarExpanded && <span className="text-[7px] mt-1 font-black uppercase tracking-widest">Mesaj</span>}
            </button>

            <button
              onClick={() => setZenMode(!isZenMode)}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/5 transition-all text-zinc-500 hover:text-white"
              title="Zen Modu"
            >
              {isZenMode ? <Eye size={18} className="text-[#C17767]" /> : <EyeOff size={18} />}
              {isSidebarExpanded && <span className="text-[7px] mt-1 font-black uppercase tracking-widest">Zen</span>}
            </button>
          </div>

          <button
            onClick={async () => { if (await confirmDialog('Çıkış yapmak istediğine emin misin?')) signOut(); }}
            className={`flex items-center gap-3 p-2 text-[10px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all ${!isSidebarExpanded ? 'justify-center' : ''}`}
            title="Çıkış Yap"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <LogOut size={16} />
            </div>
            {isSidebarExpanded && <span>ÇIKIŞ YAP</span>}
          </button>

          {isSidebarExpanded && (
            <div className="mt-2 pt-2 border-t border-app">
              <SpotifyWidget />
            </div>
          )}
        </div>
      </motion.nav>

      <main className={`flex-1 overflow-hidden relative flex flex-col bg-app pb-28 md:pb-0 pt-0 transition-all duration-700 ${isZenMode ? 'p-0' : ''}`}>
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
      <AnimatePresence>
        {isDMPanelOpen && <DMPanel onClose={() => setIsDMPanelOpen(false)} />}
      </AnimatePresence>
      <NetworkBanner />
      <CelebrationPortal />
    </div>
  );
}

import { DMPanel } from '../DMPanel';
