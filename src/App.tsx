import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import ReactMarkdown from 'react-markdown';
import {
  LayoutDashboard, UserCircle, BookOpen, MessageSquare,
  Settings, CheckCircle2, AlertTriangle, Send, Loader2,
  Calendar, List, Archive, Plus, X, BrainCircuit, ShieldAlert, Trash2, Target, Map as MapIcon, LayoutList, Clock, PenTool, Menu, ChevronRight, MousePointer2, LogOut,
  Bell, RefreshCcw, CloudOff, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { getCoachResponse } from './services/gemini';
import { parseStructuredDirective } from './services/promptBuilder';
import { TYT_SUBJECTS, AYT_SUBJECTS } from './constants';
import { useAppStore, COACH_NAME, COACH_SYSTEM_NAME } from './store/appStore';
import type {
  StudentProfile, DailyLog, ExamResult, FailedQuestion
} from './types';

import { NotificationCenter } from './components/NotificationCenter';

import { FocusSidePanel } from './components/FocusSidePanel';
import { EloRankCard } from './components/EloRankCard';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileGuard } from './components/MobileGuard';
import { MorningBlocker } from './components/MorningBlocker';
import { ProfileShowcase } from './components/ProfileShowcase';
// [PERF-001 FIX]: Ağır bileşenler Lazy load ediliyor
const QuizEngine = React.lazy(() => import('./components/QuizEngine').then(m => ({ default: m.QuizEngine })));
const TopicExplain = React.lazy(() => import('./components/TopicExplain').then(m => ({ default: m.TopicExplain })));
const AgendaPage = React.lazy(() => import('./components/AgendaPage').then(m => ({ default: m.AgendaPage })));
const StrategyHub = React.lazy(() => import('./components/StrategyHub').then(m => ({ default: m.StrategyHub })));
const MebiWarRoom = React.lazy(() => import('./components/MebiWarRoom').then(m => ({ default: m.MebiWarRoom })));

import { AchievementsPanel } from './components/AchievementsPanel';
import { CoachInterventionModal } from './components/CoachInterventionModal';
import { calcWorkloadRemaining, calcSourceROI, calculatePredictedNet, detectHabitAlerts } from './utils/statistics';

import { LogEntryWidget } from './components/forms/LogEntryWidget';
import { ExamEntryModal } from './components/forms/ExamEntryModal';
import { ProfileSettings } from './components/forms/ProfileSettings';
import { ExamDetailModal } from './components/ExamDetailModal';
import { FlapClock, MiniFlapClock } from './components/FlapClock';

import { AdminPanelModal } from './components/admin/AdminPanelModal';
import { NAV_ITEMS, ActiveTab } from './config/navItems';
import { NavItem } from './components/NavItem';
import { isSuperAdmin } from './config/admin';
import { AuthGate } from './components/AuthGate';
import { useAuth } from './hooks/useAuth';
import { useVisualViewportHeight } from './hooks/useViewport';
import { debouncedPush, pushToFirestore } from './services/firestoreSync';
import { initOfflineSync } from './utils/syncQueue';
import { useToast } from './contexts/ToastContext';
import { subscribeToSystemConfig, SystemConfig } from './services/systemService';
import { MaintenanceBlocker } from './components/MaintenanceBlocker';
import { ToastProvider, toast, confirmDialog } from './contexts/ToastContext';
import { isSameLocalDay, parseFlexibleDate, toISODateOnly } from './utils/date';

// --- Helper ---

const YKS_2026_TYT_DATE = '2026-06-20T10:15:00+03:00';
const YKS_2026_AYT_DATE = '2026-06-21T10:15:00+03:00';

const getAytSubjectsForTrack = (track: string) => {
  if (track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
  if (track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'];
  if (track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'];
  if (track === 'Dil') return ['Yabancı Dil'];
  return Object.keys(AYT_SUBJECTS);
};

// --- Sub Components ---

function LogHistory({ logs }: { logs: DailyLog[] }) {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const allTags = Array.from(new Set(logs.flatMap(log => log.tags || [])));
  const allSubjects = Array.from(new Set(logs.map(log => log.subject)));

  const parseDateMs = (d: string) => {
    const parsed = parseFlexibleDate(d);
    if (!parsed) return null;
    const ms = parsed.getTime();
    return Number.isFinite(ms) ? ms : null;
  };

  const fromMs = fromDate ? new Date(fromDate).getTime() : null;
  const toMs = toDate ? (new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1) : null;

  const filteredLogs = logs.filter(log => {
    if (filterSubject && log.subject !== filterSubject) return false;
    if (filterTag && (!log.tags || !log.tags.includes(filterTag))) return false;
    const ms = parseDateMs(log.date);
    if (fromMs !== null && ms !== null && ms < fromMs) return false;
    if (toMs !== null && ms !== null && ms > toMs) return false;
    return true;
  }).sort((a, b) => (parseDateMs(b.date) ?? 0) - (parseDateMs(a.date) ?? 0));

  const tagDistribution = (() => {
    const map: Map<string, number> = new Map();
    filteredLogs.forEach(l => (l.tags || []).forEach(t => map.set(t, (map.get(t) ?? 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  return (
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
        />
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors">
          <option value="">Tüm Dersler</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors">
          <option value="">Tüm Etiketler</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {tagDistribution.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tagDistribution.map(([tag, count]) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-[#C17767]/10 dark:bg-rose-400/10 text-[#C17767] dark:text-rose-400 rounded text-[10px] uppercase tracking-widest font-bold"
              title={`${count} kez`}
            >
              #{tag} <span className="opacity-60 ml-1">({count})</span>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <p className="text-center py-8 opacity-40 text-xs text-[#4A443C] dark:text-zinc-400">Kriterlere uygun log bulunamadı.</p>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} className="p-4 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#F5F2EB] dark:bg-zinc-950">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-1 text-[#4A443C] dark:text-zinc-400">{new Date(log.date).toLocaleString('tr-TR')}</span>
                  <h4 className="font-bold text-[#4A443C] dark:text-zinc-200">{log.subject} - {log.topic}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#C17767] dark:text-rose-400">{log.questions} Soru</span>
                  <div className="text-[10px] opacity-60 mt-1">
                    <span className="text-green-600 dark:text-green-400">{log.correct}D</span> / <span className="text-red-600 dark:text-red-400">{log.wrong}Y</span> / <span className="text-gray-500 dark:text-gray-400">{log.empty}B</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Toplam Süre: {log.avgTime}dk
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Doğruluk: %{Math.round((log.correct / (log.questions || 1)) * 100)}
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Hız: {Math.max(1, Math.round(((log.avgTime || 0) * 60) / (log.questions || 1)))} sn/soru
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Yorgunluk: {log.fatigue}/10
                </span>
                {log.tags && log.tags.length > 0 && log.tags.map((tag, j) => (
                  <span key={j} className="px-2 py-1 bg-[#C17767]/10 dark:bg-rose-400/10 text-[#C17767] dark:text-rose-400 rounded text-[10px] uppercase tracking-widest">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ArchiveWidget({ onSubmit, onCancel, subjects }: { onSubmit: (q: FailedQuestion) => void, onCancel: () => void, subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] || '');
  const [topic, setTopic] = useState('');
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [reason, setReason] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

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

      <textarea
        placeholder="Neden yanlış yaptın? Hangi bilgi eksikti veya hangi tuzağa düştün?"
        value={reason} onChange={e => setReason(e.target.value)}
        className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] mb-6 h-24 resize-none text-[#4A443C] dark:text-zinc-200"
      />

      <button
        onClick={() => {
          if (subject && topic && book) {
            onSubmit({
              id: Date.now().toString(),
              date: new Date().toISOString(),
              subject, topic, book, page, questionNumber, reason,
              difficulty,
              status: 'active',
              solveCount: 0
            });
          }
        }}
        className="w-full py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold tracking-[0.3em] uppercase hover:bg-[#A56253] transition-all hover:shadow-xl hover:shadow-[#C17767]/20 active:scale-[0.98]"
      >
        MEZARA GÖNDER
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
  const isPassiveMode = useAppStore(s => s.isPassiveMode);
  const setPassiveMode = useAppStore(s => s.setPassiveMode);
  const logs = useAppStore(s => s.logs);
  const trophies = useAppStore(s => s.trophies);
  const unlockTrophy = useAppStore(s => s.unlockTrophy);
  const addChatMessage = useAppStore(s => s.addChatMessage);
  const profile = useAppStore(s => s.profile);
  const chatHistory = useAppStore(s => s.chatHistory);
  const setSyncing = useAppStore(s => s.setSyncing);
  const activeAlerts = useAppStore(s => s.activeAlerts);
  const qaSession = useAppStore(s => s.qaSession);
  const setQaSession = useAppStore(s => s.setQaSession);
  const updateQaAnswer = useAppStore(s => s.updateQaAnswer);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const lastCoachDirective = useAppStore(s => s.lastCoachDirective);
  const setLastCoachDirective = useAppStore(s => s.setLastCoachDirective);
  const hasHydrated = useAppStore(s => s.hasHydrated);
  const setProfile = useAppStore(s => s.setProfile);
  const isMorningBlockerEnabled = useAppStore(s => s.isMorningBlockerEnabled);
  const setMorningUnlockedDate = useAppStore(s => s.setMorningUnlockedDate);
  const exams = useAppStore(s => s.exams);
  const eloScore = useAppStore(s => s.eloScore);
  const streakDays = useAppStore(s => s.streakDays);
  const addNotification = useAppStore(s => s.addNotification);
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
  const [isAuthSkipped, setIsAuthSkipped] = useState(false);

  // [UX-003 FIX]: Mobil klavye --vh senkronizasyonu
  useVisualViewportHeight();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [countdownSession, setCountdownSession] = useState<'TYT' | 'AYT'>('TYT');
  const [isTyping, setIsTyping] = useState(false);
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
  const isCurrentlySyncing = isSyncing;
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- SYSTEM STATE & BROADCAST ---
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const lastAnnouncementRef = useRef<string | null>(null);
  const { toast: toastAPI } = useToast();

  useEffect(() => {
    return subscribeToSystemConfig((config) => {
      setSystemConfig(config);

      // Yeni bir duyuru varsa ve daha önce gösterilmemişse göster
      if (config.globalAnnouncement && config.globalAnnouncement !== lastAnnouncementRef.current) {
        lastAnnouncementRef.current = config.globalAnnouncement;
        toastAPI.info(config.globalAnnouncement, 10000); // 10 saniye göster
      }
    });
  }, [toastAPI]);

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

  // --- CAPACITOR NATIVE INTEGRATION ---
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    // 1. Status Bar Kurulumu
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0A0A0A' : '#FDFBF7' });
      } catch (e) {
        console.warn('StatusBar Plugin not loaded', e);
      }
    };
    setupStatusBar();

    // 2. Geri Tuşu Yönetimi
    const backListener = CapApp.addListener('backButton', async ({ canGoBack }) => {
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      } else {
        if (await confirmDialog('Boho Mentosluk\'tan çıkmak istediğine emin misin?')) {
          CapApp.exitApp();
        }
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [theme, activeTab]);

  const handleLogSubmit = async (log: DailyLog) => {
    setIsLogWidgetOpen(false);
    const isPassive = log.fatigue >= 8;

    addLog(log);
    if (isPassive && !isPassiveMode) setPassiveMode(true);

    // Unlock Trophy
    if (logs.length >= 2 && !trophies.find(t => t.id === 'streak_3')?.unlockedAt) {
      unlockTrophy('streak_3');
    }

    const logMessage = `LOG GİRİŞİ:\nDers: ${log.subject}\nKonu: ${log.topic}\nSoru: ${log.questions} (D:${log.correct} Y:${log.wrong} B:${log.empty})\nToplam Süre: ${log.avgTime}dk\nYorgunluk: ${log.fatigue}/10\nHatalar: ${log.tags.join(', ') || 'Yok'}${isPassive ? '\nSİSTEM NOTU: Öğrencinin zihinsel yorgunluğu 8 veya üzerinde. Sistemi otomatik olarak PASİF MODA geçir. Sadece video izleme, formül okuma gibi yorucu olmayan görevler ver.' : ''}`;

    addChatMessage({ role: 'user', content: logMessage, timestamp: new Date().toISOString() });
    setIsTyping(true);

    const successRate = Math.round((log.correct / (log.questions || 1)) * 100);
    const logSummary = `${log.subject} (${log.topic}): ${log.questions} soru, %${successRate} başarı, ${log.avgTime}dk. Yorgunluk: ${log.fatigue}/10.`;

    const context = `Öğrenci Profili: ${JSON.stringify(profile)}\nYeni Log (Özet): ${logSummary}\nLütfen bu logu analiz et ve akşam değerlendirmesi yap.`;
    const response = await getCoachResponse("LOG ANALİZİ YAP", context, chatHistory, { coachPersonality: profile?.coachPersonality });

    addChatMessage({ role: 'coach', content: response || "Log kaydedildi. İyi çalışmalar.", timestamp: new Date().toISOString() });
    setIsTyping(false);
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
  const tytProjection = calculatePredictedNet(exams, logs, new Date(YKS_2026_TYT_DATE), 'TYT', eloScore);
  const aytProjection = calculatePredictedNet(exams, logs, new Date(YKS_2026_AYT_DATE), 'AYT', eloScore);
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

  // [PHASE 3]: Stratejik Senkronizasyon (Manual + Strategic Auto)
  const syncWithCloud = useCallback(async (showNotif = true) => {
    const state = useAppStore.getState();
    const uid = state.authUser?.uid;
    if (!uid) return;

    const EXCLUDED = new Set([
      'warRoomSession', 'warRoomAnswers', 'warRoomEliminated',
      'warRoomTimeLeft', 'warRoomMode', 'isFocusSidePanelOpen',
      'qaSession', 'drawingMode', 'authUser', 'isDevMode',
      'isSyncing', 'showGreeting', 'activeSidebarTab', 'notifications'
    ]);

    setSyncing(true);

    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (!EXCLUDED.has(k) && typeof v !== 'function') {
        payload[k] = v;
      }
    }

    try {
      await pushToFirestore(uid, payload);
      setSyncing(false);
      if (showNotif) {
        addNotification({
          type: 'success',
          title: 'Senkronizasyon Başarılı',
          message: 'Tüm ilerlemen buluta güvenle yedeklendi.'
        });
      }
    } catch (err) {
      setSyncing(false);
      console.error('Manual sync failed:', err);
    }
  }, [setSyncing, addNotification]);

  // [BUG-006 FIX]: beforeunload → sendBeacon ile güvenli son-kayıt
  // sendBeacon browser tarafından sayfa kapansa bile gönderilmeyi garantiler.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useAppStore.getState();
      const uid = state.authUser?.uid;
      if (!uid) return;

      // Güvenli meta root sync — büyük array'ler dahil değil (beacon boyut limiti)
      const rootSnapshot = {
        eloScore: state.eloScore,
        streakDays: state.streakDays,
        theme: state.theme,
        subjectViewMode: state.subjectViewMode,
        isPassiveMode: state.isPassiveMode,
        lastSeenAt: new Date().toISOString(),
      };

      try {
        const blob = new Blob(
          [JSON.stringify({ uid, rootData: rootSnapshot })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('/api/sync', blob);
      } catch {
        // sendBeacon mevcut değil veya bloklanmış — sessizce geç
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Her oturum başlangıcında ve internet gelince verileri buluttan çek
  useEffect(() => {
    if (user?.uid) {
      syncWithCloud(false); // Mount sırasında son durumu push/sync et
    }
  }, [user?.uid]);

  useEffect(() => {
    return initOfflineSync();
  }, []);

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

  const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string) => {
    e?.preventDefault();
    const userMsg = messageOverride || inputMessage;
    if (!userMsg.trim() || isTyping) return;

    // YENİ: Q&A Tetikleyiciler
    const upperMsg = userMsg.trim().toUpperCase();
    const isQAStarter = ['PLAN', 'LOG', 'DENEME', 'ANLA', 'ANLAT'].includes(upperMsg);

    if (!messageOverride) setInputMessage('');

    // Mevcut bir Q&A seansı var mı?
    const activeQA = qaSession;

    addChatMessage({ role: 'user', content: userMsg, timestamp: new Date().toISOString() });
    setIsTyping(true);

    try {
      const compactProfile = profile ? `${profile.name}, Alan:${profile.track}, Hedef:${profile.targetUniversity}, TYT:${profile.tytTarget}, AYT:${profile.aytTarget}` : "Bilinmiyor";
      const logsCtx = summarizeLogs(logs.slice(-5));
      const examsCtx = exams.slice(-3).map(e => `${e.type}:${e.totalNet}N`).join('|');

      let context = `P:${compactProfile}\nLogs:${logsCtx}\nExams:${examsCtx}`;
      let action: "coach" | "qa_mode" = "coach";

      if (isQAStarter && !activeQA) {
        // Yeni Q&A Başlat
        action = "qa_mode";
        context += `\nKOMUT: ${upperMsg} SEANSI BAŞLATILIYOR. İLK SORUYU SOR.`;

        // Store'da seansı başlat (AI yanıtına göre güncellenecek ama şimdilik placeholder)
        setQaSession({
          scenario: upperMsg.includes('PLAN') ? 'plan' : upperMsg.includes('LOG') ? 'log' : upperMsg.includes('DENEME') ? 'exam' : 'topic',
          currentQuestion: 1,
          totalQuestions: upperMsg.includes('PLAN') ? 6 : upperMsg.includes('LOG') ? 7 : upperMsg.includes('DENEME') ? 8 : 5,
          answers: {},
          isComplete: false
        });
      } else if (activeQA) {
        // Devam eden Q&A
        action = "qa_mode";
        const qIdx = activeQA.currentQuestion;
        updateQaAnswer(qIdx, userMsg);

        context += `\nQA_MODU: AKTİF. Senaryo: ${activeQA.scenario}. Cevaplanan Soru: ${qIdx}/${activeQA.totalQuestions}.`;

        if (qIdx >= activeQA.totalQuestions) {
          context += `\nQA_DURUM: TÜM SORULAR CEVAPLANDI. ANALİZİ VE SONUÇ TABLOSUNU DÖNDÜR.`;
          setQaSession(null);
        } else {
          setQaSession({ ...activeQA, currentQuestion: qIdx + 1 });
        }
      }

      const userState = {
        name: profile?.name,
        track: profile?.track,
        elo: eloScore,
        streak: streakDays,
        summary: `TYT %${Math.round((tytSubjects.filter(s => s.status === 'mastered').length / (tytSubjects.length || 1)) * 100)} bitti, AYT %${Math.round((aytSubjects.filter(s => s.status === 'mastered').length / (aytSubjects.length || 1)) * 100)} bitti.`,
        lastLogs: logs.slice(-3).map(l => `${l.subject}: ${l.questions}s %${Math.round((l.correct / (l.questions || 1)) * 100)} başarı`),
        lastExams: exams.slice(-1).map(e => `${e.type}: ${e.totalNet} net`),
        alerts: activeAlerts.length,
        target: profile?.targetUniversity
      };

      const response = await getCoachResponse(userMsg, context, chatHistory, {
        coachPersonality: profile?.coachPersonality,
        action: action,
        userState
      });

      // [COACH-006 FIX]: Offline çalışması için direktifi parse edip idb'ye (store'a) at
      const parsed = parseStructuredDirective(response || '', action === 'qa_mode' ? 'qa_mode' : 'free_chat');
      
      // Her durumda son mesaja raw text olarak atıyoruz (UI chat history için)
      const cleanContent = parsed.isStructured && parsed.directive.text ? parsed.directive.text.replace(/```json[\s\S]*?```/g, '').trim() : response;
      addChatMessage({ role: 'coach', content: cleanContent || "Üzgünüm, şu an yanıt veremiyorum.", timestamp: new Date().toISOString() });
      
      // Sadece Structured Directive ise ön yüz için (Günün Direktifi) kaydet
      if (parsed.isStructured) {
        setLastCoachDirective(parsed.directive);
      }
    } catch (err) {
      console.error("AI Error:", err);
      addChatMessage({ role: 'coach', content: "Bağlantı hatası oluştu.", timestamp: new Date().toISOString() });
    } finally {
      setIsTyping(false);
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

  // 2. Durum: Kimlik doğrulaması yok ve misafir geçişi de atlanmamış
  if (!user && !isAuthSkipped) {
    return <AuthGate onSkip={() => setIsAuthSkipped(true)} />;
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
      <div className="flex flex-col md:flex-row h-[100dvh] bg-app text-ink font-sans selection:bg-zinc-700 selection:text-zinc-100 overflow-hidden" style={{ paddingTop: Capacitor.getPlatform() !== 'web' ? 'var(--sat)' : '0px' }}>

        <header className="md:hidden sticky top-0 left-0 right-0 h-14 border-b border-app bg-header backdrop-blur-xl z-[100] flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-black/20 bg-[#1F2A36] border border-white/10">
              <img src="/logo.png" alt="Boho Mentosluk" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-display italic text-sm font-bold tracking-tight text-ink truncate max-w-[120px]">Boho Mentosluk</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncWithCloud()}
              disabled={isCurrentlySyncing}
              className={`p-2 rounded-lg transition-all ${isCurrentlySyncing ? 'text-[#C17767] animate-spin' : 'text-zinc-400 hover:text-[#C17767]'}`}
              title="Bulutla Eşitle"
              aria-label="Bulutla Eşitle"
            >
              <RefreshCcw size={20} className={isCurrentlySyncing ? 'animate-spin' : ''} />
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

        <nav className="fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:relative md:w-56 border-t md:border-t-0 md:border-r border-app flex flex-row md:flex-col bg-nav backdrop-blur-xl z-[90] transition-all duration-300 pb-[env(safe-area-inset-bottom)] md:h-[100dvh] shadow-lg md:shadow-none">
          <div className="hidden md:block p-4 border-b border-app">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#1F2A36] border border-[#C17767]/20">
                <img src="/logo.png" alt="Boho Mentosluk" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-display italic text-xl font-bold tracking-tight text-[#C17767]">Boho Mentosluk</h1>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] uppercase tracking-widest opacity-50 text-ink-muted">YKS Mentörlük v5</p>
              <button
                onClick={() => syncWithCloud()}
                disabled={isCurrentlySyncing}
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-[#C17767] transition-all relative group"
                title="Bulutla Eşitle"
                aria-label="Bulutla Eşitle"
              >
                <RefreshCcw size={16} className={isCurrentlySyncing ? 'animate-spin text-[#C17767]' : ''} />
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
          {/* Desktop: Avatar Mini Profil Kartı */}
          <div className="hidden md:block p-4 border-b border-app cursor-pointer group" onClick={() => setActiveTab('profile')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#C17767]/30 shrink-0 group-hover:border-[#C17767]/70 transition-colors">
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  : <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile.name}`} alt="P" className="w-full h-full bg-surface" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate group-hover:text-[#C17767] transition-colors">{profile.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-[9px] uppercase tracking-widest text-ink-muted truncate">{profile.track}</p>
                  {user?.uid && (
                    <span
                      title="Tıkla ve Tam UID Kopyala"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(user.uid);
                        toast.success('Kullanıcı ID (UID) kopyalandı.');
                      }}
                      className="text-[8px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-white hover:bg-[#C17767] px-1.5 py-0.5 rounded transition-colors"
                    >
                      #{user.uid.slice(0, 5)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-row md:flex-col py-1 md:py-3 justify-around md:justify-start overflow-x-auto md:overflow-visible no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <div key={item.id} className={`${item.mobileVisible ? 'block' : 'hidden'} md:${item.desktopVisible ? 'block' : 'hidden'} w-full md:mb-0.5`}>
                <NavItem
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                />
              </div>
            ))}
            {/* Mobil Menü (Daha fazla sekmesi) */}
            <div className="md:hidden block w-full">
              <NavItem icon={<Menu size={18} />} label="Daha Fazla" active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(true)} />
            </div>
          </div>

          {/* Nav Alt İşlemler */}
          <div className="hidden md:flex flex-col border-t border-app">
            {isSuperAdmin(user?.uid) && (
              <div
                className="p-4 text-[9px] uppercase tracking-[0.3em] text-[#C17767] opacity-60 hover:opacity-100 transition-opacity cursor-pointer font-bold text-center border-b border-app/50"
                onClick={() => setIsAdminPanelOpen(true)}
              >
                ⬡ DEV CONSOLE
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

        <main className="flex-1 overflow-auto relative bg-app pb-24 md:pb-0 pt-0">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 md:p-8 max-w-5xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-display italic text-4xl text-[#4A443C] dark:text-zinc-200">Hoş geldin, {profile?.name}</h2>
                    </div>
                    <div className="flex gap-4 text-xs uppercase tracking-widest opacity-60 text-[#4A443C] dark:text-zinc-400">
                      <span>TYT: {profile?.tytTarget} Net</span><span>•</span><span>AYT: {profile?.aytTarget} Net</span>
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex flex-col items-end gap-4 scale-90 md:scale-100 origin-right">
                    <MiniFlapClock targetDate={YKS_2026_TYT_DATE} />

                    {(() => {
                      const track = profile?.track || 'SAY';
                      const wp = calcWorkloadRemaining(tytSubjects, aytSubjects.filter(s => getAytSubjectsForTrack(track).includes(s.subject)), logs);
                      return (
                        <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 shadow-md">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">MÜFREDAT YÜKÜ</span>
                            <span className="text-xs font-mono font-bold text-zinc-300">%{wp.completedPercent}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#C17767] transition-all" style={{ width: `${wp.completedPercent}%` }} />
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">{wp.completedTopics} Bitti / {wp.remainingTopics} Kaldı</div>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setFocusSidePanelOpen(true)}
                      className="flex items-center gap-3 px-6 py-3 bg-[#C17767] text-white rounded-xl shadow-lg shadow-[#C17767]/20 hover:scale-105 transition-all group w-full md:w-auto justify-center"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Clock size={16} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-70 leading-none">SEFERBERLİK</div>
                        <div className="text-sm font-bold leading-none mt-1">ODAK MODUNU AÇ</div>
                      </div>
                    </button>
                  </div>
                </header>

                <div className="mb-12">
                  <EloRankCard />
                </div>

                <div className="mb-12">
                  <AchievementsPanel />
                </div>

                {(() => {
                  const todayStr = toISODateOnly();
                  const todayLogs = logs.filter((l) => {
                    const dt = parseFlexibleDate(l.date);
                    if (!dt) return false;
                    return toISODateOnly(dt) === todayStr;
                  });
                  const todayHours = (todayLogs.reduce((acc, log) => acc + log.avgTime, 0) / 60).toFixed(1);
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                        <StatCard title="Tamamlanan" value={tytSubjects.filter(s => s.status === 'mastered').length + aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject) && s.status === 'mastered').length} total={tytSubjects.length + aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject)).length} icon={<CheckCircle2 className="text-[#C17767] dark:text-rose-400" />} />
                        <StatCard title="Günlük Çalışma" value={todayHours} total={profile?.dailyGoalHours || profile?.minHours} unit="Saat" icon={<Calendar className="text-blue-400" />} />
                        <StatCard title="Kritik Sorunlar" value={logs.filter(l => l.wrong > l.correct).length} unit="Aktif" icon={<AlertTriangle className="text-orange-500" />} />
                        <StatCard
                          title="ROI Kaynak"
                          value={(() => {
                            const roi = calcSourceROI(logs).slice(0, 1)[0];
                            return roi ? roi.sourceName.split(' ')[0] : 'YOK';
                          })()}
                          unit={(() => {
                            const roi = calcSourceROI(logs).slice(0, 1)[0];
                            return roi ? `ROI:${roi.roiScore}` : '';
                          })()}
                          icon={<BookOpen className="text-green-500" />}
                        />
                      </div>
                      {activeHabitAlerts[0] && (
                        <div className="mb-8 rounded-2xl border border-red-800/50 bg-red-950/30 p-5">
                          <div className="text-[10px] uppercase tracking-widest text-red-300 font-bold mb-2">KIRMIZI ALARM</div>
                          <p className="text-sm text-red-100">{activeHabitAlerts[0].message}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <section className="md:col-span-2 space-y-6">
                  {/* Günün Direktifi */}
                  <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-sm">
                    <h3 className="font-display italic text-xl mb-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 uppercase tracking-tight text-[#C17767] dark:text-rose-400">Günün Direktifi</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                      {lastCoachDirective ? (
                        <div className="space-y-4">
                          <h4 className="text-zinc-200 font-bold text-lg leading-snug">{lastCoachDirective.headline}</h4>
                          <p className="text-zinc-400 text-sm leading-relaxed">{lastCoachDirective.summary}</p>
                          
                          {lastCoachDirective.tasks && lastCoachDirective.tasks.length > 0 && (
                            <div className="mt-4">
                              <h5 className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] mb-2 border-b border-[#2A2A2A] pb-1">Görevler</h5>
                              <ul className="space-y-2 m-0 p-0 list-none">
                                {lastCoachDirective.tasks.map((t, idx) => (
                                  <li key={idx} className="flex gap-3 items-start bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <div>
                                      <p className="text-sm font-bold text-zinc-300">{t.action}</p>
                                      {(t.subject || t.targetMinutes) && (
                                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                                          {t.subject} {t.targetMinutes ? `• ${t.targetMinutes} DK` : ''}
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {lastCoachDirective.warnings && lastCoachDirective.warnings.length > 0 && (
                             <div className="mt-4 bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
                               <h5 className="text-[10px] uppercase font-bold tracking-widest text-red-500 mb-1">Uyarı</h5>
                               <p className="text-xs text-red-200/70">{lastCoachDirective.warnings[0].message}</p>
                             </div>
                          )}
                        </div>
                      ) : chatHistory.filter(m => m.role === 'coach').slice(-1)[0]?.content ? (
                        <div className="font-mono text-[15px] leading-8 text-[#4A443C] dark:text-zinc-200" style={{ letterSpacing: '0.3px', wordSpacing: '1px' }}>
                          <ReactMarkdown components={markdownComponents}>{chatHistory.filter(m => m.role === 'coach').slice(-1)[0].content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center py-8 opacity-50 text-[#4A443C] dark:text-zinc-400">Henüz bir direktif yok. Koç ile konuşmaya başla.</div>
                      )}
                    </div>
                  </div>

                  {/* Matematik Seri Takibi (RESTORED) */}
                  <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-sm h-60">
                    <h3 className="font-display italic text-lg mb-4 uppercase tracking-tight text-[#C17767] flex justify-between items-center">
                      <span>Matematik Seri Takibi</span>
                      <span className="text-[10px] opacity-40 font-bold uppercase">Son 7 Gün</span>
                    </h3>
                    <div className="h-40 w-full">
                      {isMounted && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mathSpeedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} opacity={0.1} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888' }} />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ 
                                backgroundColor: '#1A1A1A', 
                                border: '1px solid #2A2A2A', 
                                borderRadius: '12px',
                                fontSize: '10px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="actual" 
                              stroke="#C17767" 
                              strokeWidth={3} 
                              dot={{ fill: '#C17767', r: 4 }} 
                              activeDot={{ r: 6, stroke: '#FFF', strokeWidth: 2 }}
                              connectNulls
                            />
                            <ReferenceLine y={45} stroke="#22C55E" strokeDasharray="5 5" label={{ value: 'Hedef', position: 'right', fill: '#22C55E', fontSize: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>

                  <section className="flex flex-col gap-4">
                    {/* Yeni Koç Yönlendirme Kartı */}
                    <div
                      onClick={() => setActiveTab('coach')}
                      className="flex-1 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 shadow-lg shadow-green-900/10 hover:border-[#C17767]/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-500 groKübrabg-green-500 group-hover:text-white transition-all">
                          <MessageSquare size={20} />
                        </div>
                        <h3 className="font-bold tracking-tight text-sm text-zinc-200">Geleceğini İnşa Et</h3>
                      </div>
                      <p className="text-xs text-zinc-500 mb-4 leading-relaxed font-mono">Gear_Head. seni bekliyor. Bugün neyi fethedeceksin?</p>
                      <button className="text-[10px] font-bold uppercase tracking-widest text-[#C17767] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        KOÇA DANIŞ <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="h-px bg-zinc-800 my-2" />

                    <section className="border border-[#2A2A2A] rounded-xl bg-[#1A1A1A] p-6 shadow-sm flex flex-col flex-1">
                      <h3 className="font-display italic text-xl mb-4 border-b border-[#2A2A2A] pb-2 uppercase tracking-tight text-[#C17767] flex items-center justify-between">
                        <span>Konu Borcu</span><span className="text-[10px] bg-red-900/30 text-red-500 border border-red-500/20 px-2 py-1 rounded font-bold uppercase tracking-widest">FAİZ İŞLİYOR</span>
                      </h3>
                      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {(() => {
                          const candidates = logs
                            .slice(-30)
                            .map((log) => {
                              const accuracy = log.correct / (log.questions || 1);
                              const secondsPerQuestion = ((log.avgTime || 0) * 60) / (log.questions || 1);
                              const isLowAccuracy = accuracy < 0.65;
                              const isSlow = secondsPerQuestion > 120;
                              if (!isLowAccuracy && !isSlow) return null;

                              let interest = 0;
                              if (accuracy < 0.5) interest += 15;
                              else if (accuracy < 0.65) interest += 10;
                              if (isSlow) interest += 5;

                              return {
                                subject: log.subject,
                                topic: log.topic,
                                date: log.date,
                                accuracy: Math.round(accuracy * 100),
                                secondsPerQuestion: Math.round(secondsPerQuestion),
                                interest,
                              };
                            })
                            .filter(Boolean) as Array<{ subject: string; topic: string; date: string; accuracy: number; secondsPerQuestion: number; interest: number }>;

                          const debts = candidates
                            .sort((a, b) => b.interest - a.interest)
                            .slice(0, 5);

                          if (debts.length === 0) {
                            return (
                              <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60">
                                <CheckCircle2 size={32} className="mb-3 text-green-500/50" />
                                <p className="text-xs uppercase tracking-widest font-bold">Borç Yok</p>
                              </div>
                            );
                          }

                          return debts.map((d, idx) => (
                            <div key={`${d.subject}-${d.topic}-${idx}`} className="p-3 bg-[#121212] border border-[#2A2A2A] rounded-lg">
                              <div className="flex justify-between items-start mb-1 gap-4">
                                <div>
                                  <div className="font-bold text-xs text-zinc-300">{d.subject}</div>
                                  <div className="text-[10px] uppercase tracking-widest opacity-60 text-zinc-500 mt-1">{d.topic}</div>
                                </div>
                                <span className="text-xs font-mono text-red-500 font-bold">+{d.interest} Soru</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[10px] uppercase tracking-widest opacity-40 text-zinc-500">Doğruluk: %{d.accuracy}</span>
                                <span className="text-[10px] uppercase tracking-widest opacity-40 text-zinc-500">Hız: {d.secondsPerQuestion} sn/soru</span>
                                <span className="text-[10px] uppercase tracking-widest opacity-40 text-zinc-500">Tarih: {(parseFlexibleDate(d.date) ?? new Date()).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                      {(() => {
                        const candidates = logs
                          .slice(-30)
                          .map((log) => {
                            const accuracy = log.correct / (log.questions || 1);
                            const secondsPerQuestion = ((log.avgTime || 0) * 60) / (log.questions || 1);
                            const isLowAccuracy = accuracy < 0.65;
                            const isSlow = secondsPerQuestion > 120;
                            if (!isLowAccuracy && !isSlow) return null;

                            let interest = 0;
                            if (accuracy < 0.5) interest += 15;
                            else if (accuracy < 0.65) interest += 10;
                            if (isSlow) interest += 5;
                            return interest;
                          })
                          .filter((x): x is number => typeof x === 'number');

                        const totalInterest = candidates.reduce((a, b) => a + b, 0);
                        if (totalInterest <= 0) return null;
                        return (
                          <div className="mt-4 pt-4 border-t border-[#2A2A2A] text-center">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-[#C17767]">
                              Toplam Faiz: <span className="font-bold text-base text-red-500">{totalInterest}</span> Soru
                            </p>
                          </div>
                        );
                      })()}
                    </section>
                  </section>
                </div>

              </motion.div>
            )}

            {activeTab === 'war_room' && (
              <motion.div key="war_room" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full min-h-screen">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#C17767] my-20" size={32} /></div>}>
                  <MebiWarRoom />
                </Suspense>
              </motion.div>
            )}

            {activeTab === 'questions' && (
              <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-8 w-full min-h-full">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#C17767] my-20" size={32} /></div>}>
                  <QuizEngine />
                </Suspense>
              </motion.div>
            )}

            {activeTab === 'explain' && (
              <motion.div key="explain" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Suspense fallback={<div className="flex bg-[#121212] flex-1 items-center justify-center h-[500px]"><Loader2 className="animate-spin text-[#C17767]" size={32} /></div>}>
                  <TopicExplain />
                </Suspense>
              </motion.div>
            )}

            {activeTab === 'agenda' && (
              <motion.div key="agenda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Suspense fallback={<div className="flex bg-[#121212] flex-1 items-center justify-center h-[500px]"><Loader2 className="animate-spin text-[#C17767]" size={32} /></div>}>
                  <AgendaPage />
                </Suspense>
              </motion.div>
            )}

            {activeTab === 'logs' && <div className="p-8 max-w-5xl mx-auto"><h2 className="font-display italic text-4xl mb-8">Log Geçmişi</h2><LogHistory logs={logs} /></div>}

            {activeTab === 'exams' && (
              <motion.div key="exams" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 max-w-5xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                  <h2 className="font-display italic text-4xl text-zinc-200">Deneme Analizi</h2>
                  <button onClick={() => setIsExamModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C17767] text-[#FDFBF7] text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity rounded-xl shadow-lg shadow-[#C17767]/20"><Plus size={16} /> Yeni Deneme Gir</button>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  <div className="border border-[#2A2A2A] rounded-xl bg-[#1A1A1A] p-6 shadow-sm">
                    <h3 className="font-display italic text-xl mb-6 uppercase tracking-tight text-zinc-300">Deneme Takvimi</h3>
                    {exams.length === 0 ? <p className="text-center opacity-40 text-xs text-zinc-500 font-bold uppercase tracking-widest">Henüz deneme girilmedi.</p> : exams.map(e => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedExam(e)}
                        className="p-4 mb-3 border border-[#2A2A2A] rounded-xl bg-[#121212] flex justify-between items-center group hover:border-[#C17767]/50 transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] group-hover:text-[#E09F3E] transition-colors">{e.type} DENEMESİ</span>
                          <span className="block text-xs uppercase opacity-40 text-zinc-400 mt-1">{(parseFlexibleDate(e.date) ?? new Date()).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-display italic text-2xl text-zinc-200">{e.totalNet.toFixed(2)} <span className="text-[10px] font-sans opacity-50 uppercase tracking-widest">NET</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'subjects' && (
              <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="font-display italic text-4xl text-zinc-200">Müfredat Haritası</h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17767] mt-2 font-bold font-mono">Topraklarını Genişlet ve Konuları Fethet</p>
                  </div>
                  <div className="flex bg-[#121212] p-1 rounded-xl border border-[#2A2A2A]">
                    <button
                      onClick={() => setSubjectViewMode('list')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${subjectViewMode === 'list' ? 'bg-[#C17767] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <LayoutList size={14} /> Liste
                    </button>
                    <button
                      onClick={() => setSubjectViewMode('map')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${subjectViewMode === 'map' ? 'bg-[#C17767] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <MapIcon size={14} /> Harita
                    </button>
                  </div>
                </div>

                {subjectViewMode === 'list' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <SubjectList title="TYT Müfredatı" subjects={tytSubjects} onStatusChange={(idx, status) => updateTytSubject(idx, { status })} onNotesChange={(idx, notes) => updateTytSubject(idx, { notes })} onBulkMaster={(subject) => bulkMasterTytSubjectsByName(subject)} />
                    <SubjectList title="AYT Müfredatı" subjects={aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject))} onStatusChange={(idx, status) => { const si = aytSubjects.findIndex(a => a.name === aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject))[idx].name && a.subject === aytSubjects.filter(ss => getAytSubjectsForTrack(profile!.track).includes(ss.subject))[idx].subject); updateAytSubject(si, { status }); }} onNotesChange={(idx, notes) => { const si = aytSubjects.findIndex(a => a.name === aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject))[idx].name); updateAytSubject(si, { notes }); }} onBulkMaster={(subject) => bulkMasterAytSubjectsByName(subject)} />
                  </div>
                ) : (
                  <div className="space-y-12">
                    <SubjectMap title="TYT Kıtası — Temel Hakimiyet" subjects={tytSubjects} onStatusChange={(idx, status) => updateTytSubject(idx, { status })} onBulkMaster={(subject) => bulkMasterTytSubjectsByName(subject)} />
                    <SubjectMap title="AYT Kıtası — İleri Seviye Seferberlik" subjects={aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject))} onStatusChange={(idx, status) => { const si = aytSubjects.findIndex(a => a.name === aytSubjects.filter(s => getAytSubjectsForTrack(profile!.track).includes(s.subject))[idx].name && a.subject === aytSubjects.filter(ss => getAytSubjectsForTrack(profile!.track).includes(ss.subject))[idx].subject); updateAytSubject(si, { status }); }} onBulkMaster={(subject) => bulkMasterAytSubjectsByName(subject)} />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'strategy' && (
              <motion.div key="strategy" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                <Suspense fallback={<div className="flex bg-[#121212] flex-1 items-center justify-center h-[500px]"><Loader2 className="animate-spin text-[#C17767]" size={32} /></div>}>
                  <StrategyHub />
                </Suspense>
              </motion.div>
            )}

            {activeTab === 'coach' && (
              <motion.div key="coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
                  {chatHistory.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-2xl ${msg.role === 'user' ? 'bg-[#C17767] text-[#FDFBF7]' : 'bg-[#121212] border border-green-800/50 shadow-[0_0_15px_rgba(0,128,0,0.05)] text-zinc-300'}`}>
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-3 border-b border-black/10 dark:border-white/10 pb-2">
                          {/* [BUG-018 FIX]: COACH_NAME sabiti */}
                          {msg.role === 'user' ? `${profile.name} - ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : COACH_SYSTEM_NAME}
                        </div>
                        <div className="text-sm font-mono leading-relaxed opacity-90 tracking-wide"><ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown></div>
                      </div>
                    </div>
                  ))}
                  {isTyping && <div className="p-5 max-w-xs border border-green-800/50 rounded-2xl bg-[#121212] flex items-center gap-3"><Loader2 size={16} className="animate-spin text-green-500" /><span className="text-xs uppercase font-bold tracking-widest text-zinc-500">{COACH_SYSTEM_NAME} analiz ediyor...</span></div>}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 md:p-8 border-t border-[#2A2A2A] bg-[#1A1A1A]">
                  {/* Hızlı Butonlar */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => setIsLogWidgetOpen(true)} className="px-3 py-1.5 border border-[#C17767] text-[#C17767] bg-[#C17767]/10 text-[10px] uppercase font-bold tracking-widest rounded-md hover:bg-[#C17767] hover:text-white transition-colors">+ LOG</button>
                    <button onClick={() => handleSendMessage(undefined, "ANALİZ ET")} className="px-3 py-1.5 border border-amber-600 text-amber-500 bg-amber-600/10 text-[10px] uppercase font-bold tracking-widest rounded-md hover:bg-amber-600 hover:text-white transition-colors">+ ANALİZ ET</button>
                    <button onClick={() => setIsExamModalOpen(true)} className="px-3 py-1.5 border border-red-600 text-red-500 bg-red-600/10 text-[10px] uppercase font-bold tracking-widest rounded-md hover:bg-red-600 hover:text-white transition-colors">- DENEME</button>
                    <button onClick={() => handleSendMessage(undefined, "ANLA")} className="px-3 py-1.5 border border-zinc-600 text-zinc-400 bg-zinc-600/10 text-[10px] uppercase font-bold tracking-widest rounded-md hover:bg-zinc-600 hover:text-white transition-colors">+ ANLA</button>
                  </div>

                  {isLogWidgetOpen && <LogEntryWidget onSubmit={handleLogSubmit} onCancel={() => setIsLogWidgetOpen(false)} />}

                  <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                    <input value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Komut gir veya mesaj yaz..." className="flex-1 bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-4 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors" />
                    <button type="submit" disabled={isTyping} className="w-12 h-12 bg-[#2A2A2A] text-zinc-400 hover:text-[#C17767] border border-[#333] flex justify-center items-center rounded-xl transition-colors shrink-0 disabled:opacity-50"><Send size={18} className="transform -translate-y-px translate-x-px" /></button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-full">
                <ProfileShowcase />
              </motion.div>
            )}

            {activeTab === 'archive' && (
              <div className="p-4 md:p-8 max-w-6xl mx-auto">
                <header className="mb-12 flex justify-between items-end border-b border-[#2A2A2A] pb-6">
                  <div>
                    <h2 className="font-display italic text-4xl text-zinc-200">Soru Bankası Mezarlığı</h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17767] mt-2 font-bold font-mono">Unutulanların ve Hataların Arşivi</p>
                  </div>
                  <button onClick={() => setIsArchiveWidgetOpen(true)} className="px-6 py-3 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] flex gap-2 items-center shadow-lg shadow-[#C17767]/20 transition-all active:scale-95"><Plus size={16} /> Mezar Kaz</button>
                </header>

                {isArchiveWidgetOpen && <ArchiveWidget subjects={Object.keys(TYT_SUBJECTS)} onCancel={() => setIsArchiveWidgetOpen(false)} onSubmit={(q) => { addFailedQuestion(q); setIsArchiveWidgetOpen(false); }} />}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {failedQuestions.filter(q => q.status === 'active' || isDevMode).length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-20 uppercase tracking-[0.5em] font-display italic text-2xl">Burası şimdilik sessiz...</div>
                  ) : failedQuestions.map(q => (
                    <div key={q.id} className={`group relative bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 transition-all hover:border-[#C17767]/50 ${q.status === 'solved' ? 'opacity-50 grayscale' : ''}`}>
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#C17767] group-hover:bg-[#E09F3E] transition-colors"></div>

                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">{q.subject}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < q.solveCount ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-800'}`}></div>
                          ))}
                        </div>
                      </div>

                      <h4 className="font-display italic text-xl text-zinc-200 mb-2 truncate">{q.topic}</h4>
                      <p className="text-[10px] uppercase font-bold text-zinc-500 mb-4">{q.book} • S:{q.page}</p>

                      <div className="bg-black/40 rounded-xl p-4 mb-6 border border-[#222]">
                        <p className="text-xs italic text-zinc-400 leading-relaxed font-mono">"{q.reason}"</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => solveFailedQuestion(q.id)}
                          disabled={q.status === 'solved'}
                          className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${q.status === 'solved' ? 'bg-zinc-800 text-zinc-500' : 'bg-[#C17767]/10 text-[#C17767] border border-[#C17767]/30 hover:bg-[#C17767] hover:text-white'}`}
                        >
                          {q.status === 'solved' ? 'HUZUR İÇİNDE' : 'HORTLAT (ÇÖZÜLDÜ)'}
                        </button>

                        {isDevMode && (
                          <button
                            onClick={async () => { if (await confirmDialog('Siliyorum?')) removeFailedQuestion(q.id); }}
                            className="px-3 py-2 bg-red-950/20 text-red-500 border border-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                            onClick={() => store.setSubjectViewMode('list')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${store.subjectViewMode === 'list' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Liste
                          </button>
                          <button
                            onClick={() => store.setSubjectViewMode('map')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${store.subjectViewMode === 'map' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Harita
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-between items-center opacity-100">
                        <div><p className="text-[10px] uppercase opacity-40 mb-1 tracking-widest font-bold text-[#C17767]">Arayüz Teması</p><p className="text-sm text-zinc-500">Karanlık veya Aydınlık mod arasında geçiş yap</p></div>
                        <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                          <button
                            onClick={() => store.setTheme('dark')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${store.theme === 'dark' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
                          >
                            Dark
                          </button>
                          <button
                            onClick={() => store.setTheme('light')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${store.theme === 'light' ? 'bg-[#C17767] text-white' : 'text-zinc-500'}`}
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
                            value={store.profile?.minDailyQuestions || 100}
                            onChange={e => store.setProfile({ ...store.profile!, minDailyQuestions: parseInt(e.target.value) })}
                            className="w-full bg-[#121212] border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#C17767] outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">MAKS. GÜNLÜK SORU</label>
                          <input
                            type="number"
                            value={store.profile?.maxDailyQuestions || 300}
                            onChange={e => store.setProfile({ ...store.profile!, maxDailyQuestions: parseInt(e.target.value) })}
                            className="w-full bg-[#121212] border border-zinc-800 rounded-xl p-3 text-sm focus:border-[#C17767] outline-none"
                          />
                        </div>
                      </div>
                    </ProfileSection>

                    <ProfileSection title="Veri Yönetimi & Tehlİke Bölgesİ">
                      <div className="col-span-2 flex justify-between items-center bg-red-950/20 p-4 border border-red-900/50 rounded-xl">
                        <div><p className="text-[10px] uppercase text-red-500 mb-1 tracking-widest font-bold">Kalıcı Sıfırlama</p><p className="text-sm text-zinc-400">Tüm loglar, denemeler ve başarımlar kalıcı olarak silinir.</p></div>
                        <button onClick={async () => { if (await confirmDialog('Verilerin SİLİNECEK! Hiçbir dönüşü yok. Emin misin?')) { store.resetStore(); window.location.reload(); } }} className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 text-xs tracking-widest font-bold uppercase rounded-xl hover:bg-red-600 hover:text-white transition-colors">SİSTEMİ SIFIRLA</button>
                      </div>
                    </ProfileSection>
                  </div>
                </div>

                <div>
                  <h3 className="font-display italic text-2xl mb-4 text-[#C17767]">Profil Yönetimi</h3>
                  <ProfileSettings onSubmit={(p) => store.setProfile(p)} initialData={store.profile} isEditMode={true} />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
        <ExamEntryModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} track={store.profile!.track} onSave={(exam) => { store.addExam(exam); setIsExamModalOpen(false); store.unlockTrophy('first_blood'); }} />
        <ExamDetailModal isOpen={!!selectedExam} onClose={() => setSelectedExam(null)} exam={selectedExam} isAdmin={store.isDevMode} />
        <FocusSidePanel />
        <CoachInterventionModal />
        <AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
        <MobileMenuModal
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onSignOut={signOut}
        />
        <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
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
