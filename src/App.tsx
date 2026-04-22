import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  LayoutDashboard, UserCircle, BookOpen, MessageSquare,
  Settings, CheckCircle2, AlertTriangle, Send, Loader2,
  Calendar, List, Archive, Plus, X, BrainCircuit, ShieldAlert, Trash2, Target, Map as MapIcon, LayoutList, Clock, PenTool, Menu, ChevronRight, MousePointer2, LogOut,
  Bell, RefreshCcw, CloudOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { parseStructuredDirective } from './services/promptBuilder';
import { uploadImageFile } from './services/storageService';
import { buildCoachContext, summarizeLogsForPrompt, summarizeExamsForPrompt } from './services/coachContext';
import { useCoachCore } from './hooks/useCoachCore';
import type { CoachIntent } from './types/coach';
import { TYT_SUBJECTS, AYT_SUBJECTS } from './constants';
import { useAppStore, COACH_NAME, COACH_SYSTEM_NAME } from './store/appStore';
import type {
  StudentProfile, DailyLog, ExamResult, FailedQuestion
} from './types';

import { NotificationCenter } from './components/NotificationCenter';
import { SpotifyWidget } from './components/SpotifyWidget';

import { DataIntegrationPanel } from './components/admin/DataIntegrationPanel';
import { FocusSidePanel } from './components/FocusSidePanel';
import { EloRankCard } from './components/EloRankCard';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileGuard } from './components/MobileGuard';
import { MorningBlocker } from './components/MorningBlocker';
import { ProfileShowcase } from './components/ProfileShowcase';
import { SubjectMapAdvanced } from './components/SubjectMapAdvanced';
// [PERF-001 FIX]: Ağır bileşenler Lazy load ediliyor
const QuizEngine = React.lazy(() => import('./components/QuizEngine').then(m => ({ default: m.QuizEngine })));
const TopicExplain = React.lazy(() => import('./components/TopicExplain').then(m => ({ default: m.TopicExplain })));
const AgendaPage = React.lazy(() => import('./components/AgendaPage').then(m => ({ default: m.AgendaPage })));
const StrategyHub = React.lazy(() => import('./components/StrategyHub').then(m => ({ default: m.StrategyHub })));
const MebiWarRoom = React.lazy(() => import('./components/MebiWarRoom').then(m => ({ default: m.MebiWarRoom })));

import { AchievementsPanel } from './components/AchievementsPanel';
import { GraveyardPanel } from './components/GraveyardPanel';
import { CoachInterventionModal } from './components/CoachInterventionModal';
import { CoachScreen } from './components/coach/CoachScreen';
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
import { useToast } from './contexts/ToastContext';
import { subscribeToSystemConfig, SystemConfig } from './services/systemService';
import { MaintenanceBlocker } from './components/MaintenanceBlocker';
import { ToastProvider, toast, confirmDialog } from './contexts/ToastContext';
import { isSameLocalDay, parseFlexibleDate, toISODateOnly } from './utils/date';
import { BentoDashboard } from './components/dashboard/BentoDashboard';

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


function ArchiveWidget({ onSubmit, onCancel, subjects }: { onSubmit: (q: FailedQuestion) => void, onCancel: () => void, subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] || '');
  const [topic, setTopic] = useState('');
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [reason, setReason] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageSelect = async (f: File) => {
    setFile(f);
    setIsUploading(true);
    try {
      // 1. Base64
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(f);
      });
      // 2. Call AI
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'vision_archive_parse',
          userMessage: 'Parse this image',
          imageBase64: b64,
          imageMediaType: f.type,
          forceJson: true
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        let parsed = data;
        if(data.text) {
          try { parsed = JSON.parse(data.text); } catch(e){}
        }
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.topic) setTopic(parsed.topic);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.reason) setReason(parsed.reason);
      }
    } catch(e) {
      console.error('Vision OCR failed', e);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-lg mb-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-display italic text-2xl text-[#C17767] dark:text-rose-400">Yeni Mezar Kaz</h3>
          <p className="text-[10px] uppercase tracking-widest opacity-50 text-zinc-500 font-bold">Hatalı soruyu arşive gönder</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X size={20} className="text-[#4A443C] dark:text-zinc-200" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">DERS</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200">
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">ZORLUK</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200">
            <option value="easy">KOLAY (DİKKAT HATASI)</option>
            <option value="medium">ORTA (SÜRE/BİLGİ)</option>
            <option value="hard">ZOR (MANTIK/ÜST DÜZEY)</option>
          </select>
        </div>
        <input type="text" placeholder="Konu Başlığı" value={topic} onChange={e => setTopic(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        <input type="text" placeholder="Kitap / Kaynak Adı" value={book} onChange={e => setBook(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        <div className="flex gap-2">
          <input type="text" placeholder="Sayfa" value={page} onChange={e => setPage(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
          <input type="text" placeholder="Soru No" value={questionNumber} onChange={e => setQuestionNumber(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        </div>
      </div>

      
      <div className="mb-4">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 block mb-1">SORU FOTOĞRAFI (OPSİYONEL - MAX 5MB)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size < 5 * 1024 * 1024) handleImageSelect(f);
            else if (f) alert('Dosya boyutu 5 MB\'ı geçemez.');
          }}
          className="block w-full text-sm text-[#4A443C] dark:text-zinc-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C17767]/10 file:text-[#C17767] hover:file:bg-[#C17767]/20"
        />
      </div>

      <textarea
        placeholder="Neden yanlış yaptın? Hangi bilgi eksikti veya hangi tuzağa düştün?"
        value={reason} onChange={e => setReason(e.target.value)}
        className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] mb-6 h-24 resize-none text-[#4A443C] dark:text-zinc-200"
      />

      <button
        onClick={async () => {
          if (subject && topic && book) {
            let imageUrl: string | undefined = undefined;
            if (file) {
              setIsUploading(true);
              try {
                  const uid = useAppStore.getState().authUser?.uid || 'unknown';
                imageUrl = await uploadImageFile(file, `failed_questions/${uid}/${Date.now()}_${file.name}`);
              } catch (e) {
                console.error("Resim yüklenemedi", e);
                alert("Resim yüklenemedi, ancak soru eklenecek.");
              } finally {
                setIsUploading(false);
              }
            }
            onSubmit({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
              date: new Date().toISOString(),
              subject, topic, book, page, questionNumber, reason,
              difficulty,
              status: 'active',
              solveCount: 0,
              imageUrl
            });
          }
        }}
        disabled={isUploading}
        className="w-full py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold tracking-[0.3em] uppercase hover:bg-[#A56253] transition-all hover:shadow-xl hover:shadow-[#C17767]/20 active:scale-[0.98]"
      >
        {isUploading ? "YÜKLENİYOR..." : "MEZARA GÖNDER"}
      </button>
    </motion.div>
  );
}

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-4 text-[#4A443C] dark:text-zinc-200 text-base" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-2 leading-relaxed" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-2 opacity-90" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 opacity-90" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-[#C17767] dark:text-rose-400" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold font-display italic mt-6 mb-2 border-b border-[#EAE6DF] dark:border-zinc-800 pb-1" {...props} />,
};

// --- Main App ---

export default function App() {
  // --- STORE SELECTORS (PERF-003) ---
  const morningUnlockedDate = useAppStore(s => s.morningUnlockedDate);
  const notifications = useAppStore(s => s.notifications);
  const isSyncing = useAppStore(s => s.isSyncing);
  const theme = useAppStore(s => s.theme);
  const addLog = useAppStore(s => s.addLog);
  const addExam = useAppStore(s => s.addExam);
  const isPassiveMode = useAppStore(s => s.isPassiveMode);
  const setPassiveMode = useAppStore(s => s.setPassiveMode);
  const logs = useAppStore(s => s.logs);
  const setTheme = useAppStore(s => s.setTheme);
  const hardReset = useAppStore(s => s.hardReset);
  const trophies = useAppStore(s => s.trophies);
  const unlockTrophy = useAppStore(s => s.unlockTrophy);
  const addChatMessage = useAppStore(s => s.addChatMessage);
  const profile = useAppStore(s => s.profile);
  const chatHistory = useAppStore(s => s.chatHistory);
  const activeAlerts = useAppStore(s => s.activeAlerts);
  const qaSession = useAppStore(s => s.qaSession);
  const setQaSession = useAppStore(s => s.setQaSession);
  const updateQaAnswer = useAppStore(s => s.updateQaAnswer);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const lastCoachDirective = useAppStore(s => s.lastCoachDirective);
  const setLastCoachDirective = useAppStore(s => s.setLastCoachDirective);
  
  const hasHydrated = useAppStore(s => s.hasHydrated);
  const setHasHydrated = useAppStore(s => s.setHasHydrated);
  useEffect(() => {
    if (!hasHydrated) {
      const timer = setTimeout(() => {
        setHasHydrated(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasHydrated, setHasHydrated]);
  const setProfile = useAppStore(s => s.setProfile);
  const isMorningBlockerEnabled = useAppStore(s => s.isMorningBlockerEnabled);
  const setMorningUnlockedDate = useAppStore(s => s.setMorningUnlockedDate);
  const exams = useAppStore(s => s.exams);
  const eloScore = useAppStore(s => s.eloScore);
  const streakDays = useAppStore(s => s.streakDays);
  const setFocusSidePanelOpen = useAppStore(s => s.setFocusSidePanelOpen);
  const subjectViewMode = useAppStore(s => s.subjectViewMode);
  const setSubjectViewMode = useAppStore(s => s.setSubjectViewMode);
  const updateTytSubject = useAppStore(s => s.updateTytSubject);
  const updateAytSubject = useAppStore(s => s.updateAytSubject);
  const bulkMasterTytSubjectsByName = useAppStore(s => s.bulkMasterTytSubjectsByName);
  const bulkMasterAytSubjectsByName = useAppStore(s => s.bulkMasterAytSubjectsByName);
  const addFailedQuestion = useAppStore(s => s.addFailedQuestion);
  const solveFailedQuestion = useAppStore(s => s.solveFailedQuestion);
  const removeFailedQuestion = useAppStore(s => s.removeFailedQuestion);
  const isDevMode = useAppStore(s => s.isDevMode);
  const failedQuestions = useAppStore(s => s.failedQuestions);

  const { user, isLoading, signOut } = useAuth();
  const syncStatus: string = 'synced';
  const forceSync = async (a?: boolean) => {};
  const isSyncManagerBusy = false;

  const { triggerLogAnalysis, triggerExamDebrief, sendMessage, isTyping: coachIsTyping } = useCoachCore();

  // [UX-003 FIX]: Mobil klavye --vh senkronizasyonu
  useVisualViewportHeight();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [countdownSession, setCountdownSession] = useState<'TYT' | 'AYT'>('TYT');
  const isTyping = coachIsTyping;
  const [inputMessage, setInputMessage] = useState('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isLogWidgetOpen, setIsLogWidgetOpen] = useState(false);
  const [isArchiveWidgetOpen, setIsArchiveWidgetOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // [BUG-010 FIX]: Morning Blocker kilidi artık persist'e bağlı — aynı gün refresh'te kapanmaz
  const todayIso = new Date().toISOString().slice(0, 10);
  const isMorningUnlocked = morningUnlockedDate === todayIso;
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const isCurrentlySyncing = isSyncing || isSyncManagerBusy;
  const syncButtonTitle = syncStatus === 'offline'
    ? 'Çevrimdışı - eşitleme internet gelince yeniden denenebilir'
    : isCurrentlySyncing
      ? 'Bulutla eşitleniyor'
      : 'Bulutla Eşitle';
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- HYDRATION SAFETY TIMEOUT ---
  // If IDB never fires onRehydrateStorage, force unblock after 4s
  useEffect(() => {
    if (hasHydrated) return;
    const t = setTimeout(() => {
      useAppStore.getState().setHasHydrated(true);
    }, 4000);
    return () => clearTimeout(t);
  }, [hasHydrated]);

  // --- SYSTEM STATE & BROADCAST ---
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const lastAnnouncementRef = useRef<string | null>(null);
  const { toast: toastAPI } = useToast();

  useEffect(() => {
    if (!user) return; // FIX: Giriş yapmamış kullanıcılar için abonelik başlatma (Permission Denied önleme)
    
    return subscribeToSystemConfig((config) => {
      setSystemConfig(config);

      // Yeni bir duyuru varsa ve daha önce gösterilmemişse göster
      if (config.globalAnnouncement && config.globalAnnouncement !== lastAnnouncementRef.current) {
        lastAnnouncementRef.current = config.globalAnnouncement;
        toastAPI.info(config.globalAnnouncement, 10000); // 10 saniye göster
      }
    });
  }, [toastAPI, user]);

  // --- TEMA FLASHBANG ENGELLEYİCİ ---
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


  const handleLogSubmit = async (log: DailyLog) => {
    setIsLogWidgetOpen(false);
    const isPassive = log.fatigue >= 8;

    addLog(log);
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
  const chatInitializedRef = useRef(false);
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

  const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string, overrideIntent?: CoachIntent) => {
    e?.preventDefault();
    const userMsg = messageOverride || inputMessage;
    if (!userMsg.trim() || isTyping) return;

    // YENİ: Q&A Tetikleyiciler
    const upperMsg = userMsg.trim().toUpperCase();
    const isQAStarter = ['PLAN', 'LOG', 'DENEME', 'ANLA', 'ANLAT'].includes(upperMsg);

    if (!messageOverride) setInputMessage('');

    // Mevcut bir Q&A seansı var mı?
    const activeQA = qaSession;
    let intent: CoachIntent = overrideIntent || 'free_chat';

    if (isQAStarter && !activeQA) {
      // Yeni Q&A Başlat
      intent = "qa_mode";
      setQaSession({
        scenario: upperMsg.includes('PLAN') ? 'plan' : upperMsg.includes('LOG') ? 'log' : upperMsg.includes('DENEME') ? 'exam' : 'topic',
        currentQuestion: 1,
        totalQuestions: upperMsg.includes('PLAN') ? 6 : upperMsg.includes('LOG') ? 7 : upperMsg.includes('DENEME') ? 8 : 5,
        answers: {},
        isComplete: false
      });
    } else if (activeQA) {
      // Devam eden Q&A
      intent = "qa_mode";
      const qIdx = activeQA.currentQuestion;
      updateQaAnswer(qIdx, userMsg);
      if (qIdx >= activeQA.totalQuestions) {
        setQaSession(null);
      } else {
        setQaSession({ ...activeQA, currentQuestion: qIdx + 1 });
      }
    }

    addChatMessage({ role: 'user', content: userMsg, timestamp: new Date().toISOString() });

    try {
      await sendMessage({
        userMessage: userMsg,
        intent: intent,
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

  // Morning Blocker (Sabah Sorusu Kilidi) — [BUG-010 FIX]: persist store tabanlı
  if (isMorningBlockerEnabled && !isMorningUnlocked) {
    return <MorningBlocker onUnlock={() => setMorningUnlockedDate(todayIso)} />;
  }

  return (
    <MobileGuard className="h-[100dvh]">
      <div className="flex flex-col md:flex-row h-[100dvh] bg-app text-ink font-sans selection:bg-zinc-700 selection:text-zinc-100 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        <header className="md:hidden sticky top-0 left-0 right-0 h-14 border-b border-app bg-header backdrop-blur-xl z-[100] flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-black/20 bg-[#1F2A36] border border-white/10">
              <img src="/logo.png" alt="Boho Mentosluk" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-display italic text-sm font-bold tracking-tight text-ink truncate max-w-[120px]">Boho Mentosluk</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => forceSync()}
              disabled={isCurrentlySyncing}
              className={`p-2 rounded-lg transition-all ${
                syncStatus === 'offline'
                  ? 'text-amber-500 hover:text-amber-400'
                  : isCurrentlySyncing
                    ? 'text-[#C17767]'
                    : 'text-zinc-400 hover:text-[#C17767]'
              }`}
              title={syncButtonTitle}
              aria-label="Bulutla Eşitle"
            >
              {syncStatus === 'offline' ? (
                <CloudOff size={20} />
              ) : (
                <RefreshCcw size={20} className={isCurrentlySyncing ? 'animate-spin' : ''} />
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(true)}
                className="p-2 text-zinc-400 hover:text-[#C17767] transition-all relative"
                aria-label={`Bildirimler (${unreadCount} okunmamış)`}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#C17767] rounded-full border-2 border-[#121212] animate-pulse shadow-[0_0_8px_#C17767]" />}
              </button>
            </div>
            <ThemeToggle />
            <div
              className="w-8 h-8 rounded-full border-2 border-[#C17767]/30 p-0.5 cursor-pointer"
              onClick={() => setActiveTab('profile')}
              role="button"
              aria-label="Profil Git"
            >
              {profile.avatar
                ? <img src={profile.avatar} alt="P" className="w-full h-full rounded-full object-cover" />
                : <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile.name}`} alt="P" className="w-full h-full rounded-full bg-surface" />
              }
            </div>
          </div>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:relative md:w-64 border-t md:border-t-0 md:border-r border-app flex flex-row md:flex-col bg-nav/80 backdrop-blur-2xl saturate-150 z-[90] transition-all duration-300 pb-[env(safe-area-inset-bottom)] md:h-[100dvh] shadow-xl md:shadow-none">
          <div className="hidden md:block p-4 border-b border-app">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#1F2A36] border border-[#C17767]/30 shadow-lg shadow-[#C17767]/10">
                <img src="/logo.png" alt="Boho Mentosluk" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="font-display italic text-lg font-bold tracking-tight text-[#C17767] leading-tight">Boho Mentos</h1>
                <p className="text-[8px] uppercase tracking-[0.2em] opacity-40 font-bold text-zinc-500">Akademik OS</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] uppercase tracking-widest opacity-50 text-ink-muted">YKS Mentörlük v5</p>
              <button
                onClick={() => forceSync()}
                disabled={isCurrentlySyncing}
                className={`p-1.5 hover:bg-white/5 rounded-lg transition-all relative group ${
                  isCurrentlySyncing ? 'text-[#C17767]' : 'text-zinc-500 hover:text-[#C17767]'
                }`}
                title={syncButtonTitle}
                aria-label="Bulutla Eşitle"
              >
                {syncStatus === 'offline' ? (
                  <CloudOff size={16} className="text-amber-500" />
                ) : (
                  <RefreshCcw size={16} className={isCurrentlySyncing ? 'animate-spin' : ''} />
                )}
              </button>
              <button
                onClick={() => setIsNotifOpen(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-[#C17767] transition-all relative group"
                aria-label={`Bildirimler (${unreadCount} okunmamış)`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#C17767] rounded-full border border-[#121212] shadow-[0_0_8px_#C17767]" />
                )}
              </button>
            </div>
            {isPassiveMode && (
              <div className="mt-4 px-3 py-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">PASİF MOD AKTİF</span>
              </div>
            )}
          </div>
          <div className="hidden md:block p-4 border-b border-app space-y-4">
             <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('profile')}>
              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#C17767]/20 shrink-0 group-hover:border-[#C17767]/60 transition-all shadow-md">
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  : <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile.name}`} alt="P" className="w-full h-full bg-surface" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate group-hover:text-[#C17767] transition-colors">{profile.name}</p>
                <p className="text-[9px] uppercase tracking-widest text-[#C17767] font-bold">{profile.track}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-row md:flex-col py-1 md:py-4 px-2 md:space-y-0.5 justify-around md:justify-start overflow-x-auto md:overflow-y-auto no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <div key={item.id} className={`${item.mobileVisible ? 'block' : 'hidden'} md:${item.desktopVisible ? 'block' : 'hidden'} w-full`}>
                <NavItem
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                />
              </div>
            ))}
            {/* Mobil Menü (Daha fazla sekmesi) */}
            <div className="md:hidden block w-full px-1">
              <NavItem icon={<Menu size={18} />} label="Menü" active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(true)} />
            </div>
          </div>

          {/* Nav Alt İşlemler */}
          <div className="hidden md:flex flex-col border-t border-app">
            {isSuperAdmin(user?.uid, user?.email) && (
              <div
                className="p-4 text-[9px] uppercase tracking-[0.3em] text-[#C17767] opacity-60 hover:opacity-100 transition-opacity cursor-pointer font-bold text-center border-b border-app/50"
                onClick={() => setActiveTab('admin_dashboard')}
              >
                ⬡ ADMIN DASHBOARD
              </div>
            )}
            <button
              onClick={async () => { if (await confirmDialog('Çıkış yapmak istediğine emin misin?')) signOut(); }}
              className="p-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <LogOut size={14} /> ÇIKIŞ YAP
            </button>
          </div>
        </nav>

        <main className="flex-1 overflow-hidden relative flex flex-col bg-app pb-16 md:pb-0 pt-0">
          {/* Coach tab renders outside overflow-auto div to maintain full height */}
          {activeTab === 'coach' && (
            <motion.div
              key="coach-standalone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden h-full"
            >
              <CoachScreen
                isTyping={isTyping}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={(msg, intent) => handleSendMessage(undefined, msg, intent)}
                onLogClick={() => setIsLogWidgetOpen(true)}
                onExamClick={() => setIsExamModalOpen(true)}
              />
              {isLogWidgetOpen && <LogEntryWidget onSubmit={handleLogSubmit} onCancel={() => setIsLogWidgetOpen(false)} />}
            </motion.div>
          )}
          <div className={`flex-1 overflow-auto flex flex-col ${activeTab === 'coach' ? 'hidden' : ''}`}>
          <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && (
              <BentoDashboard />
            )}

            {activeTab === 'countdown' && (
              <motion.div key="countdown" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="p-8 flex flex-col items-center justify-center min-h-full">
                <div className="text-center mb-12">
                  <h2 className="font-display italic text-4xl md:text-7xl text-[#C17767] mb-4">Büyük Seferberlik</h2>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex bg-black/30 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setCountdownSession('TYT')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${countdownSession === 'TYT' ? 'bg-[#C17767] text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        2026 TYT
                      </button>
                      <button
                        onClick={() => setCountdownSession('AYT')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${countdownSession === 'AYT' ? 'bg-[#C17767] text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        2026 AYT
                      </button>
                    </div>
                    <p className="text-[10px] md:text-sm uppercase tracking-[0.4em] opacity-40 font-bold">
                      {(countdownSession === 'TYT' ? "20 HAZİRAN 2026, 10:15 (İSTANBUL)" : "21 HAZİRAN 2026, 10:15 (İSTANBUL)") + "'E KALAN SÜRE"}
                    </p>
                  </div>
                </div>
                <FlapClock targetDate={countdownSession === 'TYT' ? YKS_2026_TYT_DATE : YKS_2026_AYT_DATE} />
                <div className="mt-8 text-center space-y-2">
                  <p className="text-sm text-zinc-300">
                    Bu tempoda devam edersen TYT beklenen net: <span className="font-bold text-[#C17767]">{tytProjection.predictedNet}</span>
                  </p>
                  <p className="text-sm text-zinc-300">
                    Bu tempoda devam edersen AYT beklenen net: <span className="font-bold text-[#E09F3E]">{aytProjection.predictedNet}</span>
                  </p>
                </div>
                <p className="mt-16 max-w-lg text-center text-sm md:text-base italic opacity-60 leading-relaxed font-display">
                  "Zaman en kıymetli madenin; onu her gün daha verimli işlemelisin. Harcadığın her saniye hedefine yaklaşmak için bir fırsattır."
                </p>
              </motion.div>
            )}

            {activeTab === 'war_room' && (
              <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-[#C17767]" /></div>}>
                <MebiWarRoom />
              </Suspense>
            )}

            {activeTab === 'questions' && (
              <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-[#C17767]" /></div>}>
                <QuizEngine />
              </Suspense>
            )}

            {activeTab === 'explain' && (
              <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-[#C17767]" /></div>}>
                <TopicExplain />
              </Suspense>
            )}

            {activeTab === 'agenda' && (
              <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-[#C17767]" /></div>}>
                <AgendaPage />
              </Suspense>
            )}

            {activeTab === 'strategy' && (
              <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-[#C17767]" /></div>}>
                <StrategyHub />
              </Suspense>
            )}

            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 md:p-8 space-y-6">
                <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Çalışma Kayıtları</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Tüm seanslarının detaylı dökümü</p>
                </header>
                <LogHistory logs={logs} onLogClick={setSelectedLog} />
              </motion.div>
            )}

            {activeTab === 'exams' && (
              <motion.div key="exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 md:p-8 space-y-6">
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="font-display italic text-3xl text-[#C17767]">Deneme Analizleri</h2>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">TYT & AYT Performance Tracker</p>
                  </div>
                  <button 
                    onClick={() => setIsExamModalOpen(true)}
                    className="px-4 py-2 bg-[#C17767] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-[#C17767]/20 flex items-center gap-2"
                  >
                    <Plus size={14} /> YENİ DENEME
                  </button>
                </header>
                <div className="grid grid-cols-1 gap-4">
                  {exams.length === 0 ? (
                    <div className="text-center py-20 opacity-30 italic">Henüz deneme kaydı girmedin.</div>
                  ) : (
                    exams.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exam => (
                      <button 
                        key={exam.id} 
                        onClick={() => setSelectedExam(exam)}
                        className="p-6 bg-white dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl flex justify-between items-center group hover:border-[#C17767]/50 transition-all shadow-sm"
                      >
                        <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold font-display text-lg ${exam.type === 'TYT' ? 'bg-blue-500/10 text-blue-500' : 'bg-[#E09F3E]/10 text-[#E09F3E]'}`}>
                            {exam.type}
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-[#4A443C] dark:text-zinc-200">{new Date(exam.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</h4>
                            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">{exam.source || 'MANUEL GİRİŞ'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-display font-bold text-[#C17767]">{exam.totalNet}</span>
                          <span className="text-[10px] opacity-40 ml-1 font-bold uppercase tracking-widest">NET</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'archive' && (
              <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 md:p-8 space-y-6">
                <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Mezarlık (Hatalı Sorular)</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Eleyemediğin her soru, seninle burada yüzleşir</p>
                </header>
                <GraveyardPanel />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 md:p-8 space-y-12">
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
            )}

            {activeTab === 'subjects' && (
              <motion.div key="subjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 md:p-8 space-y-6">
                 <header>
                  <h2 className="font-display italic text-3xl text-[#C17767]">Müfredat Haritası</h2>
                  <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Fethedilmeyi bekleyen tüm kaleler</p>
                </header>
                <SubjectMapAdvanced />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 max-w-3xl mx-auto space-y-12">
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
                          <button
                            onClick={() => setSubjectViewMode('list')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subjectViewMode === 'list' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Liste
                          </button>
                          <button
                            onClick={() => setSubjectViewMode('map')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subjectViewMode === 'map' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Gelişmiş Liste
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-between items-center opacity-100">
                        <div><p className="text-[10px] uppercase opacity-40 mb-1 tracking-widest font-bold text-[#C17767]">Arayüz Teması</p><p className="text-sm text-zinc-500">Karanlık veya Aydınlık mod arasında geçiş yap</p></div>
                        <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                          <button
                            onClick={() => setTheme('dark')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Dark
                          </button>
                          <button
                            onClick={() => setTheme('light')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Light
                          </button>
                        </div>
                      </div>
                    </ProfileSection>

                    <ProfileSection title="Soru Hedeflerİ">
                      <div className="grid grid-cols-2 gap-4 col-span-2">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">MİN. GÜNLÜK SORU</label>
                          <input
                            type="number"
                            value={profile?.minDailyQuestions || 100}
                            onChange={e => setProfile({ ...profile!, minDailyQuestions: parseInt(e.target.value) })}
                            className="w-full bg-[#121212] border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#C17767] outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">MAKS. GÜNLÜK SORU</label>
                          <input
                            type="number"
                            value={profile?.maxDailyQuestions || 300}
                            onChange={e => setProfile({ ...profile!, maxDailyQuestions: parseInt(e.target.value) })}
                            className="w-full bg-[#121212] border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#C17767] outline-none"
                          />
                        </div>
                      </div>
                    </ProfileSection>

                    <ProfileSection title="Veri Yönetimi & Tehlİke Bölgesİ">
                      <div className="col-span-2 flex justify-between items-center bg-red-950/20 p-4 border border-red-900/50 rounded-xl">
                        <div><p className="text-[10px] uppercase text-red-500 mb-1 tracking-widest font-bold">Kalıcı Sıfırlama</p><p className="text-sm text-zinc-400">Tüm loglar, denemeler ve başarımlar kalıcı olarak silinir.</p></div>
                        <button onClick={async () => { if (await confirmDialog('Verilerin SİLİNECEK! Hiçbir dönüşü yok. Emin misin?')) { hardReset(); window.location.reload(); } }} className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 text-xs tracking-widest font-bold uppercase rounded-xl hover:bg-red-600 hover:text-white transition-colors">SİSTEMİ SIFIRLA</button>
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
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </main>
        <ExamEntryModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} track={profile?.track || 'Sayısal'} onSave={(exam) => { addExam(exam); setIsExamModalOpen(false); unlockTrophy('first_blood'); }} />
        <ExamDetailModal 
          isOpen={!!selectedExam} 
          onClose={() => setSelectedExam(null)} 
          exam={selectedExam} 
          isAdmin={isSuperAdmin(user?.uid, user?.email)} 
        />
        <LogDetailModal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          log={selectedLog}
          isAdmin={isSuperAdmin(user?.uid, user?.email)}
        />
        <FocusSidePanel />
        <CoachInterventionModal />
        {activeTab === 'admin_dashboard' && (
          <React.Suspense fallback={<div className="fixed inset-0 bg-black z-[200] flex items-center justify-center"><div className="text-zinc-500">Yükleniyor...</div></div>}>
            <AdminDashboard onBack={() => setActiveTab('dashboard')} />
          </React.Suspense>
        )}
        <AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
        <MobileMenuModal
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onSignOut={signOut}
        />
        <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        <SpotifyWidget />
      </div>
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

// --- MOBİL MENÜ MODAL ---
const MobileMenuModal = ({ isOpen, onClose, activeTab, onNavigate, onSignOut }: { isOpen: boolean; onClose: () => void; activeTab: string; onNavigate: (id: string) => void; onSignOut: () => void }) => {
  if (!isOpen) return null;

  const menuItems = [
    { id: 'questions', icon: <BrainCircuit size={20} />, label: 'SORULAR' },
    { id: 'explain', icon: <BookOpen size={20} />, label: 'ANLATIM' },
    { id: 'exams', icon: <Calendar size={20} />, label: 'ANALİZ' },
    { id: 'logs', icon: <List size={20} />, label: 'LOGLAR' },
    { id: 'agenda', icon: <BookOpen size={20} />, label: 'AJANDA' },
    { id: 'archive', icon: <Archive size={20} />, label: 'MEZARLIK' },
    { id: 'subjects', icon: <BookOpen size={20} />, label: 'MÜFREDAT' },
    { id: 'strategy', icon: <Target size={20} />, label: 'STRATEJİ' },
    { id: 'settings', icon: <Settings size={20} />, label: 'AYARLAR' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end md:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full bg-[#FDFBF7] dark:bg-zinc-950 rounded-t-[2.5rem] border-t border-[#EAE6DF] dark:border-zinc-800 p-8 pt-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-8 cursor-pointer" onClick={onClose} />

        <header className="mb-8 pl-2">
          <h3 className="font-display italic text-2xl text-[#C17767] dark:text-rose-400">Tüm Üniteler</h3>
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold font-mono">Sistem Haritası v5.6</p>
        </header>

        <div className="grid grid-cols-3 gap-y-6 gap-x-3 pb-8">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); onClose(); }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === item.id ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20 scale-105' : 'bg-zinc-100 dark:bg-zinc-900 text-[#4A443C] dark:text-zinc-400 group-hover:bg-[#C17767]/10'}`}>
                {item.icon}
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-widest text-center leading-tight ${activeTab === item.id ? 'text-[#C17767]' : 'text-[#4A443C]/60 dark:text-zinc-500'}`}>{item.label}</span>
            </button>
          ))}
          {/* Mobil Logout */}
          <button
            onClick={async () => { if (await confirmDialog('Çıkış yapmak istediğine emin misin?')) onSignOut(); }}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-500 shadow-sm border border-rose-500/20">
              <LogOut size={20} />
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest text-rose-500">ÇIKIŞ YAP</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-[#FDFBF7] dark:text-zinc-950 border border-transparent dark:border-zinc-200 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg"
        >
          Menüyü Kapat
        </button>
      </motion.div>
    </motion.div>
  );
};

