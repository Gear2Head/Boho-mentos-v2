import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  LayoutDashboard, UserCircle, BookOpen, MessageSquare,
  Settings, CheckCircle2, AlertTriangle, Send, Loader2,
  Calendar, List, Archive, Plus, X, BrainCircuit, ShieldAlert, Trash2, Target, Map as MapIcon, LayoutList, Clock, PenTool, Menu, ChevronRight, MousePointer2, LogOut,
  Bell, RefreshCcw, CloudOff, Pin, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { processSpotifyCallback } from './services/spotifyService';
import { ExamListWidget } from './components/dashboard/ExamListWidget';
import { StrategyAdvisor } from './components/coaching/StrategyAdvisor';


import { uploadImageFile } from './services/storageService';
import MobileMenuModal from './components/layout/MobileMenuModal';
import { MainLayout } from './components/layout/MainLayout';
import { SkeletonScreen } from './components/layout/SkeletonScreen';
import { buildCoachContext, summarizeLogsForPrompt, summarizeExamsForPrompt } from './services/coachContext';
import { useCoachCore } from './hooks/useCoachCore';
import type { CoachIntent } from './types/coach';
import { TYT_SUBJECTS, AYT_SUBJECTS } from './constants';
import { useAppStore, COACH_NAME, COACH_SYSTEM_NAME } from './store/appStore';
import { useAppSelectors } from './store/selectors';
import type {
  StudentProfile, DailyLog, ExamResult, FailedQuestion
} from './types';

import { NotificationCenter } from './components/NotificationCenter';
import { NetworkBanner } from './components/NetworkBanner';
import { SpotifyWidget } from './components/SpotifyWidget';

import { DataIntegrationPanel } from './components/admin/DataIntegrationPanel';
import { FocusPage } from './components/FocusPage';
import { EloRankCard } from './components/EloRankCard';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileGuard } from './components/MobileGuard';
// [DEPRECATED] MorningBlocker archived — no longer gates login flow
import { ProfileShowcase } from './components/ProfileShowcase';
import { SubjectMapAdvanced } from './components/SubjectMapAdvanced';
// [PERF-001 FIX]: Ağır bileşenler Lazy load ediliyor
const QuizEngine = React.lazy(() => import('./components/QuizEngine').then(m => ({ default: m.QuizEngine })));
const TopicExplain = React.lazy(() => import('./components/TopicExplain').then(m => ({ default: m.TopicExplain })));
const AgendaPage = React.lazy(() => import('./components/AgendaPage').then(m => ({ default: m.AgendaPage })));
const StrategyHub = React.lazy(() => import('./components/StrategyHub').then(m => ({ default: m.StrategyHub })));
const SocialPage = React.lazy(() => import('./components/SocialPage').then(m => ({ default: m.SocialPage })));
const MebiWarRoom = React.lazy(() => import('./components/MebiWarRoom').then(m => ({ default: m.MebiWarRoom })));

import { CommandPalette } from './components/CommandPalette';
import { ExamSimulator } from './components/ExamSimulator';
import { AchievementsPanel } from './components/AchievementsPanel';
import { GraveyardPanel } from './components/GraveyardPanel';
import { ArchiveWidget } from './components/warroom/ArchiveWidget';
import { markdownComponents } from './config/markdownConfig';
import { CoachInterventionModal } from './components/CoachInterventionModal';
import { CoachScreen } from './components/coach/CoachScreen';
import { StorePage } from './components/store/StorePage';
import { calcWorkloadRemaining, calcSourceROI, calculatePredictedNet, detectHabitAlerts } from './utils/statistics';

import { LogEntryWidget } from './components/forms/LogEntryWidget';
import { ExamEntryModal } from './components/forms/ExamEntryModal';
import { ProfileSettings } from './components/forms/ProfileSettings';
import { ExamDetailModal } from './components/ExamDetailModal';
import { FlapClock, MiniFlapClock } from './components/FlapClock';

const AdminPanelModal = React.lazy(() => import('./components/admin/AdminPanelModal').then(m => ({ default: m.AdminPanelModal })));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { LogHistory } from './components/LogHistory';
import { LogDetailModal } from './components/LogDetailModal';
import { NAV_ITEMS, ActiveTab } from './config/navItems';
import { NavItem } from './components/NavItem';
import { isSuperAdmin } from './config/admin';
import { AuthGate } from './components/AuthGate';
import { useAuth } from './hooks/useAuth';

import { useVisualViewportHeight } from './hooks/useViewport';
import { useScrollDirection } from './hooks/useScrollDirection';
import { useToast } from './contexts/ToastContext';
import { subscribeToSystemConfig, SystemConfig } from './services/systemService';
import { MaintenanceBlocker } from './components/MaintenanceBlocker';
import { ToastProvider, toast, confirmDialog } from './contexts/ToastContext';
import { isSameLocalDay, parseFlexibleDate, toISODateOnly } from './utils/date';
import { BentoDashboard } from './components/dashboard/BentoDashboard';
import { ThemeStudio } from './components/ThemeStudio';
import { useAchievementMonitor } from './hooks/useAchievementMonitor';

// --- Helper ---

import { YKS_TARGET_DATE_TYT, YKS_TARGET_DATE_AYT } from './config/examConfig';

const YKS_2026_TYT_DATE = YKS_TARGET_DATE_TYT;
const YKS_2026_AYT_DATE = YKS_TARGET_DATE_AYT;

const getAytSubjectsForTrack = (track: string) => {
  if (track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
  if (track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'];
  if (track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'];
  if (track === 'Dil') return ['Yabancı Dil'];
  return Object.keys(AYT_SUBJECTS);
};

// --- Sub Components ---
// Sub component imports moved to top

function SpotifyCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    processSpotifyCallback().then((token) => {
      if (token) {
        toast.success('Spotify Bağlandı. Odaklanma müziklerin hazır.');
      }
      navigate('/dashboard');
    });
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center h-screen bg-app">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Spotify'dan Dönülüyor...</p>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  // --- STORE SELECTORS ---
  const selectors = useAppSelectors();
  const {
    notifications, isSyncing, theme, addLog, addAgendaEntry, addExam, isPassiveMode,
    setPassiveMode, logs, setTheme, hardReset, trophies, unlockTrophy, addChatMessage, profile,
    chatHistory, activeAlerts, qaSession, setQaSession, updateQaAnswer, tytSubjects, aytSubjects,
    lastCoachDirective, setLastCoachDirective, hasHydrated, setHasHydrated, setProfile,
    exams, eloScore, streakDays, setFocusSidePanelOpen,
    subjectViewMode, setSubjectViewMode, updateTytSubject, updateAytSubject,
    bulkMasterTytSubjectsByName, bulkMasterAytSubjectsByName, addFailedQuestion, solveFailedQuestion,
    removeFailedQuestion, isDevMode, failedQuestions, migrateLegacyChat, recomputeFullElo, recomputeStreak
  } = selectors;
  const ambientColor = useAppStore(s => s.ambientColor);

  // --- IMAGE PROTECTION ---
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // --- CORE HOOKS ---
  const { user, isLoading, signOut } = useAuth();
  const recordActivity = useAppStore((s) => s.recordActivity);

  useEffect(() => {
    if (user?.uid && hasHydrated) {
      const timer = setTimeout(() => {
        recordActivity();
        recomputeFullElo();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?.uid, hasHydrated, recomputeFullElo, recordActivity]);

  const { triggerLogAnalysis, triggerExamDebrief, sendMessage, isTyping: coachIsTyping } = useCoachCore();
  const { toast: toastAPI } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // --- UTILITY HOOKS ---
  useVisualViewportHeight();
  const scrollDirection = useScrollDirection();

  // --- STATE HOOKS ---
  const [isMounted, setIsMounted] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [countdownSession, setCountdownSession] = useState<'TYT' | 'AYT'>('TYT');
  const [inputMessage, setInputMessage] = useState('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const isLogWidgetOpen = useAppStore((s) => s.isLogWidgetOpen);
  const setIsLogWidgetOpen = useAppStore((s) => s.setLogWidgetOpen);
  const [isArchiveWidgetOpen, setIsArchiveWidgetOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => localStorage.getItem('sidebar_pinned') === 'true');
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // --- REFS ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastAnnouncementRef = useRef<string | null>(null);
  const chatInitializedRef = useRef(false);

  // --- EFFECTS ---
  useAchievementMonitor();

  useEffect(() => {
    if (!hasHydrated) {
      const timer = setTimeout(() => {
        setHasHydrated(true);
        migrateLegacyChat();
        const store = useAppStore.getState();
        if (typeof store.evaluateAllAchievements === 'function') {
          store.evaluateAllAchievements();
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      migrateLegacyChat();
      const store = useAppStore.getState();
      if (typeof store.evaluateAllAchievements === 'function') {
        store.evaluateAllAchievements();
      }
    }
  }, [hasHydrated, setHasHydrated, migrateLegacyChat]);

  useEffect(() => {
    if (user && hasHydrated && !profile) {
      console.warn('[App] Profile missing after hydration, attempting recovery...');
    }
  }, [user, hasHydrated, profile]);

  useEffect(() => {
    setIsMounted(true);
    
    // IMAGE PROTECTION: Prevent context menu on all images
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    if (hasHydrated) return;
    const t = setTimeout(() => {
      useAppStore.getState().setHasHydrated(true);
    }, 4000);
    return () => clearTimeout(t);
  }, [hasHydrated]);

  useEffect(() => {
    if (!user) return;
    return subscribeToSystemConfig((config) => {
      setSystemConfig(config);
      if (config.globalAnnouncement && config.globalAnnouncement !== lastAnnouncementRef.current) {
        lastAnnouncementRef.current = config.globalAnnouncement;
        toastAPI.info(config.globalAnnouncement, 10000);
      }
    });
  }, [toastAPI, user]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // --- DERIVED STATE ---
  const isSidebarExpanded = isSidebarPinned || isNavHovered;
  const isTyping = coachIsTyping;
  const todayIso = new Date().toISOString().slice(0, 10);
  const unreadCount = notifications.filter(n => !n.read).length;
  const isCurrentlySyncing = isSyncing;
  const syncStatus = 'synced' as string;
  const forceSync = async (_force?: boolean) => undefined;
  const syncButtonTitle = syncStatus === 'offline'
    ? 'Çevrimdışı - eşitleme internet gelince yeniden denenebilir'
    : isCurrentlySyncing
      ? 'Bulutla eşitleniyor'
      : 'Bulutla Eşitle';
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  useEffect(() => {
    let color = 'transparent';
    switch (activeTab) {
      case 'dashboard': color = '#C17767'; break; // Primary app color
      case 'coach': color = profile?.coachPersonality === 'hardcore' ? '#F59E0B' : '#3B82F6'; break; // Amber / Blue
      case 'war_room': color = '#EF4444'; break; // Red
      case 'subjects': color = '#10B981'; break; // Emerald
      case 'strategy': color = '#8B5CF6'; break; // Purple
      case 'store': color = '#F59E0B'; break; // Amber
      default: color = 'transparent'; break;
    }
    useAppStore.getState().setAmbientColor(color);
  }, [activeTab, profile?.coachPersonality]);

  const toggleSidebarPin = () => {
    const next = !isSidebarPinned;
    setIsSidebarPinned(next);
    localStorage.setItem('sidebar_pinned', String(next));
  };



  const handleLogSubmit = async (log: DailyLog) => {
    setIsLogWidgetOpen(false);
    const isPassive = log.fatigue >= 8;

    const logId = log.id ?? `log_${Date.now()}`;
    const logWithId = { ...log, id: logId };
    addLog(logWithId);
    addAgendaEntry({
      id: `agenda_log_${logId}`,
      date: logWithId.date,
      content: `LOG: ${logWithId.subject} / ${logWithId.topic} - ${logWithId.questions} soru, ${logWithId.correct}D ${logWithId.wrong}Y ${logWithId.empty}B, ${logWithId.avgTime} dk`,
      linkedLogIds: [logId],
      source: 'log',
      tags: ['log', logWithId.subject],
    });
    if (isPassive && !isPassiveMode) setPassiveMode(true);

    // Unlock Trophy
    if (logs.length >= 2 && !trophies.find(t => t.id === 'streak_3')?.unlockedAt) {
      unlockTrophy('streak_3');
    }

    // COACH-PRODUCT-005: mikro analiz otomatik tetikle
    await triggerLogAnalysis(log);
  };

  const handleExamSave = (exam: ExamResult) => {
    addExam(exam);
    if (exam) {
      setTimeout(() => triggerExamDebrief(exam), 1500);
    }
  };

  const mathSpeedData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

    const dayLogs = logs.filter(log => {
      const logDate = parseFlexibleDate(log.date);
      if (!logDate) return false;
      return isSameLocalDay(logDate, d);
    }).filter(log => log.subject.includes('TYT Matematik'));

    const avgTimeValue = dayLogs.length > 0 ? Math.round(dayLogs.reduce((acc, log) => acc + log.avgTime, 0) / dayLogs.length) : null;
    return { day: dateStr, actual: avgTimeValue, target: 45 };
  });
  const tytProjection = calculatePredictedNet(exams, logs, new Date(YKS_2026_TYT_DATE), 'TYT', eloScore, profile?.tytTarget);
  const aytProjection = calculatePredictedNet(exams, logs, new Date(YKS_2026_AYT_DATE), 'AYT', eloScore, profile?.aytTarget);
  const activeHabitAlertsValue = detectHabitAlerts(logs);

  const summarizeLogs = (logs: DailyLog[]) => {
    if (logs.length === 0) return "Henüz log girilmedi.";
    return logs.map(l => {
      const successRate = Math.round((l.correct / (l.questions || 1)) * 100);
      return `${l.subject} (${l.topic}): ${l.questions} soru, %${successRate} başarı, ${l.avgTime}dk.`;
    }).join(' | ');
  };

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(timer);
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (activeTab !== 'coach') return;
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }, 150);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('light', !isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }
  }, [theme]);

  // [BUG-006 FIX]: SendBeacon kaldırıldı çünkü Supabase/syncQueue kullanıyoruz.
  // Çıkış öncesi lokal durumu kaydedin (gerekirse IndexedDB/Zustand persist ile)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sesi, state'i kaydet - Supabase debouncedPush hallediyor
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    import('./services/spotifyService').then(({ startTokenRefreshWorker }) => {
      startTokenRefreshWorker();
    });
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Her oturum başlangıcında mevcut local state'i yeni sync manager ile flush et
  // REF GUARD: Sadece bir kez çalışır, forceSync referansı değişince yeniden çalışmaz
  const syncOnLoginDoneRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (user?.uid && syncOnLoginDoneRef.current !== user.uid) {
      syncOnLoginDoneRef.current = user.uid;
      // 2s gecikme: hydration tamamlansın, pullFromSupabase duraksın
      const t = setTimeout(() => void forceSync(false), 2000);
      return () => clearTimeout(t);
    }
  }, [user?.uid]); // INTENTIONAL: forceSync kasıtlı dependency dışı

  // REF GUARD: Sadece bir kez çalışır, forceSync referansı değişince yeniden çalışmaz

  // ERR-002: İlk açılış mesajı
  useEffect(() => {
    if (activeTab === 'coach' && !chatInitializedRef.current && chatHistory.length === 0) {
      chatInitializedRef.current = true;
      addChatMessage({
        role: 'coach',
        content: '📋 **Sistem Hazır.**\n\nGüne başlamak için **PLAN** yazabilir, bir çalışma seansını kaydetmek için **LOG** komutunu kullanabilirsin. Senin için buradayım.',
        timestamp: new Date().toISOString()
      });
    }
  }, [activeTab, chatHistory.length, addChatMessage]);

  const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string, overrideIntent?: CoachIntent, attachment?: { base64: string; mediaType: string; name: string }) => {
    e?.preventDefault();
    const userMsg = messageOverride || inputMessage;
    if (!userMsg.trim() || isTyping) return;

    if (!messageOverride) setInputMessage('');

    // --- Intent & Q&A Logic ---
    const upperMsg = userMsg.trim().toUpperCase();
    const isQAStarter = ['PLAN', 'LOG', 'DENEME', 'ANLA', 'ANLAT'].includes(upperMsg);

    let intent: CoachIntent = overrideIntent || 'free_chat';

    // Sadece intent yoksa ve Q&A starter ise qa_mode'a gir
    if (!overrideIntent && isQAStarter && !qaSession) {
      intent = "qa_mode";
      setQaSession({
        scenario: upperMsg.includes('PLAN') ? 'plan' : upperMsg.includes('LOG') ? 'log' : upperMsg.includes('DENEME') ? 'exam' : 'topic',
        currentQuestion: 1,
        totalQuestions: upperMsg.includes('PLAN') ? 6 : upperMsg.includes('LOG') ? 7 : upperMsg.includes('DENEME') ? 8 : 5,
        answers: {},
        isComplete: false
      });
    } else if (qaSession) {
      intent = "qa_mode";
      const qIdx = qaSession.currentQuestion;
      updateQaAnswer(qIdx, userMsg);
      if (qIdx >= qaSession.totalQuestions) {
        setQaSession(null);
      } else {
        setQaSession({ ...qaSession, currentQuestion: qIdx + 1 });
      }
    }

    const imageUrl = attachment?.base64 ? `data:${attachment.mediaType};base64,${attachment.base64}` : undefined;
    addChatMessage({ role: 'user', content: userMsg, timestamp: new Date().toISOString(), imageUrl });

    try {
      await sendMessage({
        userMessage: userMsg,
        intent: intent,
        wantDirective: intent !== 'free_chat' && intent !== 'qa_mode',
        imageBase64: attachment?.base64,
        imageMediaType: attachment?.mediaType,
      });
    } catch (err) {
      console.error("AI Error:", err);
    }
  };

  // Bakım Modu Kontrolü (Sadece Adminlere Açık)
  const isUserAdmin = user && isSuperAdmin(user.uid);
  if (systemConfig?.maintenanceMode && !isUserAdmin) {
    return <MaintenanceBlocker />;
  }

  // 1. Durum: Auth kontrolü veya Yerel Kayıt Yüklemesi yapılıyor
  if (isLoading || !hasHydrated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#FDFBF7] dark:bg-[#0A0A0A]">
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-[#C17767]/20 border-t-[#C17767] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-[#C17767] rounded-lg animate-pulse" />
          </div>
        </div>
        <h1 className="font-display italic text-2xl text-[#C17767] animate-pulse">Boho Mentosluk</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mt-4 font-bold">Veriler Senkronize Ediliyor...</p>
      </div>
    );
  }

  // 2. Durum: Kimlik doğrulaması yoksa her zaman login ekranı göster
  if (!user) {
    return <AuthGate />;
  }

  // 3. Durum: Profil kurulumu eksik
  if (!profile) {
    return <ProfileSettings onSubmit={(p) => setProfile(p)} />;
  }

  // [DEPRECATED] MorningBlocker removed from login flow — archived as legacy feature

  const scrollCls = "flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar";

  return (
    <MobileGuard className="h-[100dvh] relative">
      <CommandPalette />
      {/* Contextual Glassmorphism Background Effect */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out mix-blend-screen"
        style={{
          background: ambientColor !== 'transparent' 
            ? `radial-gradient(circle at 50% 0%, ${ambientColor} 0%, transparent 60%)` 
            : 'transparent',
          opacity: 0.15
        }}
      />
      
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ── Coach: full-height, no scroll ── */}
          <Route path="/coach" element={
            <motion.div key="coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-hidden h-full">
              <CoachScreen
                isTyping={isTyping}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={(msg, intent, attachment) => handleSendMessage(undefined, msg, intent, attachment)}
                onLogClick={() => setIsLogWidgetOpen(true)}
                onExamClick={() => setIsExamModalOpen(true)}
              />
              {isLogWidgetOpen && <LogEntryWidget onSubmit={handleLogSubmit} onCancel={() => setIsLogWidgetOpen(false)} />}
            </motion.div>
          } />

          {/* ── Admin Dashboard ── */}
          <Route path="/admin_dashboard" element={
            <React.Suspense fallback={<div className="fixed inset-0 bg-black z-[200] flex items-center justify-center"><div className="text-zinc-500">Yükleniyor...</div></div>}>
              <AdminDashboard onBack={() => navigate('/dashboard')} />
            </React.Suspense>
          } />

          {/* ── Scrollable routes ── */}
          <Route path="/dashboard" element={
            <div className={scrollCls}>
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="h-full">
                {hasHydrated && profile ? <BentoDashboard /> : <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-[#C17767]" /></div>}
              </motion.div>
            </div>
          } />

          <Route path="/clock" element={
            <div className={scrollCls}>
              <motion.div key="clock" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <FocusPage />
              </motion.div>
            </div>
          } />

          <Route path="/countdown" element={
            <div className={scrollCls}>
              <motion.div key="countdown" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-8 flex flex-col items-center justify-center min-h-full">
                <div className="text-center mb-12">
                  <h2 className="font-display italic text-4xl md:text-7xl text-[#C17767] mb-4">Mokoko'ya Kaç Gün Var?</h2>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex bg-black/30 p-1 rounded-xl border border-white/10">
                      <button onClick={() => setCountdownSession('TYT')} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${countdownSession === 'TYT' ? 'bg-[#C17767] text-white' : 'text-zinc-400 hover:text-white'}`}>2026 TYT</button>
                      <button onClick={() => setCountdownSession('AYT')} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${countdownSession === 'AYT' ? 'bg-[#C17767] text-white' : 'text-zinc-400 hover:text-white'}`}>2026 AYT</button>
                    </div>
                    <p className="text-[10px] md:text-sm uppercase tracking-[0.4em] opacity-40 font-bold">{(countdownSession === 'TYT' ? "20 HAZİRAN 2026, 10:15" : "21 HAZİRAN 2026, 10:15") + "'E KALAN SÜRE"}</p>
                  </div>
                </div>
                <FlapClock targetDate={countdownSession === 'TYT' ? YKS_2026_TYT_DATE : YKS_2026_AYT_DATE} />
                <div className="mt-8 text-center space-y-2">
                  <p className="text-sm text-zinc-300">TYT beklenen net: <span className="font-bold text-[#C17767]">{tytProjection.predictedNet}</span></p>
                  <p className="text-sm text-zinc-300">AYT beklenen net: <span className="font-bold text-[#E09F3E]">{aytProjection.predictedNet}</span></p>
                </div>
                <p className="mt-16 max-w-lg text-center text-sm md:text-base italic opacity-60 leading-relaxed font-display">"Zaman en kıymetli madenin; onu her gün daha verimli işlemelisin."</p>
              </motion.div>
            </div>
          } />

          <Route path="/simulator" element={<ExamSimulator />} />
          <Route path="/war_room" element={<div className={scrollCls}><Suspense fallback={<SkeletonScreen />}><MebiWarRoom /></Suspense></div>} />
          <Route path="/questions" element={<div className={scrollCls}><Suspense fallback={<SkeletonScreen />}><QuizEngine /></Suspense></div>} />
          <Route path="/explain" element={<div className={scrollCls}><Suspense fallback={<SkeletonScreen />}><TopicExplain /></Suspense></div>} />
          <Route path="/agenda" element={<div className={scrollCls}><Suspense fallback={<SkeletonScreen />}><AgendaPage /></Suspense></div>} />
          <Route path="/strategy" element={<div className={scrollCls}><Suspense fallback={<SkeletonScreen />}><StrategyHub /></Suspense></div>} />

          <Route path="/logs" element={
            <div className={scrollCls}>
              <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Çalışma Kayıtları</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Tüm seanslarının detaylı dökümü</p>
                  </div>
                  <button onClick={() => setIsLogWidgetOpen(true)} className="px-4 py-2 bg-[#C17767] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-[#C17767]/20 flex items-center gap-2 self-start sm:self-auto">
                    <Plus size={14} /> Yeni KayÄ±t
                  </button>
                </header>
                <LogHistory logs={logs} onLogClick={setSelectedLog} />
                {isLogWidgetOpen && <LogEntryWidget onSubmit={handleLogSubmit} onCancel={() => setIsLogWidgetOpen(false)} />}
              </motion.div>
            </div>
          } />

          <Route path="/exams" element={
            <div className={scrollCls}>
              <motion.div key="exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-6">
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="font-display italic text-3xl text-[#C17767]">Deneme Analizleri</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">TYT & AYT Performance Tracker</p>
                  </div>
                  <button onClick={() => setIsExamModalOpen(true)} className="px-4 py-2 bg-[#C17767] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-[#C17767]/20 flex items-center gap-2">
                    <Plus size={14} /> YENİ DENEME
                  </button>
                </header>
                <ExamListWidget onSelect={setSelectedExam} />
              </motion.div>
            </div>
          } />

          <Route path="/social" element={
            <div className={scrollCls}>
              <motion.div key="social" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <Suspense fallback={<SkeletonScreen />}>
                  <SocialPage />
                </Suspense>
              </motion.div>
            </div>
          } />

          <Route path="/strategy" element={
            <div className={scrollCls}>
              <motion.div key="strategy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-6">
                <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Savaş Stratejisi</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Hedefine giden en kısa yolu planla</p>
                </header>
                <StrategyAdvisor />
              </motion.div>
            </div>
          } />

          <Route path="/archive" element={
            <div className={scrollCls}>
              <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-6">
                <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Mezarlık (Hatalı Sorular)</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Eleyemediğin her soru, seninle burada yüzleşir</p>
                </header>
                <GraveyardPanel />
              </motion.div>
            </div>
          } />

          <Route path="/profile" element={
            <div className={scrollCls}>
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-12">
                <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Profil & Karakter</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Gelişim istatistiklerin ve başarımların</p>
                </header>
                <ProfileShowcase />
                <div className="space-y-6">
                  <h3 className="font-display italic text-2xl text-[#C17767]">Başarımlar</h3>
                  <AchievementsPanel />
                </div>
              </motion.div>
            </div>
          } />

          <Route path="/subjects" element={
            <div className={scrollCls}>
              <motion.div key="subjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-6">
                <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Müfredat Haritası</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Fethedilmeyi bekleyen tüm kaleler</p>
                </header>
                <SubjectMapAdvanced />
              </motion.div>
            </div>
          } />

          <Route path="/store" element={
            <div className={scrollCls}>
              <motion.div key="store" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <StorePage />
              </motion.div>
            </div>
          } />

          <Route path="/callback" element={<SpotifyCallback />} />

          <Route path="/settings" element={
            <div className={scrollCls}>
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-3xl mx-auto space-y-12">
                <div>
                  <h2 className="font-display italic text-4xl mb-8">Ayarlar & Profil</h2>
                  <div className="space-y-8">
                    <ProfileSection title="Görünüm Ayarları">
                      <div className="col-span-2 flex justify-between items-center mb-4 border-b border-zinc-800 pb-4">
                        <div>
                          <p className="text-[10px] uppercase opacity-40 mb-1 tracking-widest font-bold text-[#EAE6DF]">Müfredat Görünümü</p>
                          <p className="text-sm text-zinc-500">Konu listesinin varsayılan gösterim biçimi</p>
                        </div>
                        <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                          <button onClick={() => setSubjectViewMode('list')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subjectViewMode === 'list' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}>Liste</button>
                          <button onClick={() => setSubjectViewMode('map')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subjectViewMode === 'map' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}>Gelişmiş Liste</button>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-between items-center">
                        <div><p className="text-[10px] uppercase opacity-40 mb-1 tracking-widest font-bold text-[#C17767]">Arayüz Teması</p><p className="text-sm text-zinc-500">Karanlık veya Aydınlık mod</p></div>
                        <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                          <button onClick={() => setTheme('dark')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}>Dark</button>
                          <button onClick={() => setTheme('light')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}>Light</button>
                        </div>
                      </div>
                    </ProfileSection>
                    <ProfileSection title="Soru Hedefleri">
                      <div className="grid grid-cols-2 gap-4 col-span-2">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">MİN. GÜNLÜK SORU</label>
                          <input type="number" value={profile?.minDailyQuestions || 100} onChange={e => setProfile({ ...profile!, minDailyQuestions: parseInt(e.target.value) })} className="w-full bg-[#121212] border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#C17767] outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">MAKS. GÜNLÜK SORU</label>
                          <input type="number" value={profile?.maxDailyQuestions || 300} onChange={e => setProfile({ ...profile!, maxDailyQuestions: parseInt(e.target.value) })} className="w-full bg-[#121212] border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#C17767] outline-none" />
                        </div>
                      </div>
                    </ProfileSection>
                    <ProfileSection title="Veri Yönetimi & Tehlike Bölgesi">
                      <div className="col-span-2 flex justify-between items-center bg-red-950/20 p-4 border border-red-900/50 rounded-xl">
                        <div><p className="text-[10px] uppercase text-red-500 mb-1 tracking-widest font-bold">Kalıcı Sıfırlama</p><p className="text-sm text-zinc-400">Tüm loglar, denemeler ve başarımlar kalıcı silinir.</p></div>
                        <button onClick={async () => { if (await confirmDialog('Verilerin SİLİNECEK! Emin misin?')) { hardReset(); window.location.reload(); } }} className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 text-xs tracking-widest font-bold uppercase rounded-xl hover:bg-red-600 hover:text-white transition-colors">SİSTEMİ SIFIRLA</button>
                      </div>
                    </ProfileSection>
                  </div>
                </div>
                <div>
                  <h3 className="font-display italic text-2xl mb-4 text-[#C17767]">Profil Yönetimi</h3>
                  <ProfileSettings onSubmit={(p) => setProfile(p)} initialData={profile} isEditMode={true} />
                </div>
                <div className="mt-8">
                  <h3 className="font-display italic text-2xl mb-4 text-[#C17767]">Veri Entegrasyonu</h3>
                  <DataIntegrationPanel />
                </div>
                <div className="mt-8">
                  <h3 className="font-display italic text-2xl mb-4 text-[#C17767]">Theme Studio</h3>
                  <ThemeStudio />
                </div>
              </motion.div>
            </div>
          } />
        </Routes>

        <ExamEntryModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} track={profile?.track || 'Sayısal'} onSave={(exam) => { addExam(exam); setIsExamModalOpen(false); unlockTrophy('first_blood'); }} />
        <ExamDetailModal isOpen={!!selectedExam} onClose={() => setSelectedExam(null)} exam={selectedExam} isAdmin={isSuperAdmin(user?.uid, user?.email)} />
        <LogDetailModal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} isAdmin={isSuperAdmin(user?.uid, user?.email)} />

        <CoachInterventionModal />
        <AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
      </MainLayout>
    </MobileGuard>
  );
}
// ----- MOCK UI FORMS ------
const StatCard = ({ title, value, total, unit, icon }: any) => (
  <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] uppercase opacity-50 tracking-widest font-display font-bold text-[#4A443C] dark:text-zinc-400">{title}</span>
      <div className="opacity-50 group-hover:opacity-100 transition-opacity">{icon}</div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-display font-bold text-[#4A443C] dark:text-zinc-200">{value}</span>
      {total && <span className="text-xl opacity-30 font-display text-zinc-500">/ {total}</span>}
      {unit && <span className="text-[10px] uppercase tracking-widest opacity-60 ml-1 text-zinc-500 font-bold">{unit}</span>}
    </div>
  </div>
);

const SubjectList = ({ title, subjects, onStatusChange, onNotesChange, onBulkMaster }: any) => {
  const grouped = subjects.reduce((acc: any, sub: any, idx: number) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push({ ...sub, originalIndex: idx });
    return acc;
  }, {});

  const confirmBulkMaster = async (subjectParam: string) => {
    if (await confirmDialog(`"${subjectParam}" dersindeki TÜM konuları "BİTTİ" olarak işaretlemek istediğine emin misin?`)) {
      onBulkMaster(subjectParam);
    }
  };

  return (
    <div className="border border-[#2A2A2A] rounded-2xl bg-[#1A1A1A] overflow-hidden">
      <div className="p-5 border-b border-[#2A2A2A] bg-gradient-to-r from-red-950/10 to-transparent">
        <h3 className="font-display italic text-xl text-[#C17767] font-bold tracking-wide">{title}</h3>
      </div>
      <div className="overflow-auto h-[600px] custom-scrollbar">
        {Object.entries(grouped).map(([groupName, groupSubjects]: [string, any]) => (
          <div key={groupName} className="mb-4">
            <div className="sticky top-0 bg-[#1A1A1A] z-10 px-5 py-2 border-b border-[#2A2A2A] border-t-4 border-t-transparent shadow-sm flex justify-between items-center">
              <h4 className="font-display italic text-sm text-[#C17767]/70 uppercase tracking-widest">{groupName}</h4>
              <button
                onClick={() => confirmBulkMaster(groupName)}
                className="text-[9px] uppercase tracking-widest bg-[#064E3B]/20 text-[#34D399] border border-[#064E3B] px-2 py-1 rounded hover:bg-[#064E3B]/50 transition-colors"
                title="Bu dersteki tüm konuları bitti olarak işaretle"
              >
                TÜMÜNÜ BİTİR
              </button>
            </div>
            <div className="divide-y divide-[#2A2A2A] opacity-90">
              {groupSubjects.map((sub: any) => {
                const i = sub.originalIndex;
                const statuses = [
                  { value: 'not-started', label: 'BAŞLAMADI', color: 'border-zinc-700 text-zinc-500 hover:bg-zinc-800' },
                  { value: 'in-progress', label: 'ÇALIŞILIYOR', color: 'border-[#1E3A8A] text-[#60A5FA] bg-[#1E3A8A]/20 hover:bg-[#1E3A8A]/40' },
                  { value: 'mastered', label: 'BİTTİ', color: 'border-[#064E3B] text-[#34D399] bg-[#064E3B]/20 hover:bg-[#064E3B]/40' }
                ];

                return (
                  <div key={i} className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center group">
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{sub.name}</span>
                      <div className="flex bg-[#121212] p-1 rounded-xl border border-[#2A2A2A] gap-1 shrink-0">
                        {statuses.map(s => (
                          <button
                            key={s.value}
                            onClick={() => onStatusChange(i, s.value)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all border ${sub.status === s.value ? s.color.replace('hover:', '') : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text" placeholder="Bu konuyla ilgili stratejik notlar..."
                      value={sub.notes} onChange={e => onNotesChange(i, e.target.value)}
                      className="text-xs p-3 rounded-xl bg-[#121212] border border-[#2A2A2A] text-zinc-300 w-full outline-none focus:border-[#C17767] transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileSection = ({ title, children }: any) => <div className="border border-[#2A2A2A] rounded-2xl p-6 bg-[#1A1A1A] shadow-sm"><h3 className="text-[10px] uppercase opacity-50 tracking-widest mb-6 border-b border-[#2A2A2A] pb-2 text-[#C17767] font-bold">{title}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div></div>;
const ProfileField = ({ label, value }: any) => <div><p className="text-[10px] uppercase opacity-40 mb-1 tracking-widest">{label}</p><p className="text-sm font-bold">{value}</p></div>;

// --- GİZLİ ADMİN PANELİ ---
const SubjectMap = ({ title, subjects, onStatusChange, onBulkMaster }: any) => {
  const isSyncing = useAppStore(state => state.isSyncing);
  const grouped = subjects.reduce((acc: any, sub: any, idx: number) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push({ ...sub, originalIndex: idx });
    return acc;
  }, {});

  const confirmBulkMaster = async (subjectParam: string) => {
    if (await confirmDialog(`"${subjectParam}" eyaletindeki TÜM şehirleri (konuları) "FEThedildi" olarak işaretlemek istediğine emin misin?`)) {
      onBulkMaster(subjectParam);
    }
  };

  return (
    <div className={`space-y-8 relative ${isSyncing ? 'pointer-events-none opacity-50' : ''}`}>
      {isSyncing && (
        <div className="absolute top-0 right-0 z-50 flex items-center gap-2 bg-[#C17767]/20 text-[#C17767] border border-[#C17767]/30 px-4 py-2 rounded-xl backdrop-blur-md animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Senkronize Ediliyor...</span>
        </div>
      )}
      <div className="flex items-center gap-4 mb-6">
        <h3 className="font-display italic text-2xl text-[#C17767] tracking-wide">{title}</h3>
        <div className="flex-1 h-px bg-zinc-800"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(grouped).map(([province, cities]: [string, any]) => {
          const masteredCount = cities.filter((c: any) => c.status === 'mastered').length;
          const inProgressCount = cities.filter((c: any) => c.status === 'in-progress').length;
          const totalCount = cities.length || 1;
          const progressPercent = Math.round((masteredCount / totalCount) * 100);

          return (
            <div key={province} className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 hover:border-[#C17767]/30 transition-all group shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-display italic text-xl text-zinc-200 group-hover:text-[#C17767] transition-colors">{province} Eyaleti</h4>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mt-1">Fetih Durumu: {masteredCount}/{totalCount}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-2xl font-mono font-bold text-[#C17767] opacity-80">%{progressPercent}</span>
                  {progressPercent < 100 && (
                    <button
                      onClick={() => confirmBulkMaster(province)}
                      className="text-[8px] uppercase tracking-widest bg-[#064E3B]/20 text-[#34D399] border border-[#064E3B] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      BUNU FETET
                    </button>
                  )}
                </div>
              </div>

              <div className="h-1 bg-zinc-800 rounded-full mb-8 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C17767] to-[#E09F3E] transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {cities.map((city: any) => (
                  <button
                    key={city.originalIndex}
                    onClick={() => {
                      const nextStatus = city.status === 'not-started' ? 'in-progress' : city.status === 'in-progress' ? 'mastered' : 'not-started';
                      onStatusChange(city.originalIndex, nextStatus);
                    }}
                    title={`${city.name} - ${city.status === 'mastered' ? 'FETHERDİLDİ' : city.status === 'in-progress' ? 'KUŞATMADA' : 'HEDEFTE'}`}
                    className={`min-w-[40px] h-10 px-3 rounded-lg flex items-center justify-center transition-all border relative group/castle ${city.status === 'mastered'
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                      : city.status === 'in-progress'
                        ? 'bg-[#E09F3E]/10 border-[#E09F3E]/40 text-[#E09F3E] animate-pulse'
                        : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-600 hover:border-[#C17767]/50'
                      }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-tight text-center leading-none">
                      {city.status === 'mastered' ? '🏰' : city.status === 'in-progress' ? '⚔️' : '🏴'}
                      <div className="mt-0.5 text-[8px] line-clamp-1 opacity-60 group-hover/castle:opacity-100">{city.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

