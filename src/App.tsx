/**
 * AMAÇ: YKS Mentörlük Sistemi v3.0 Ana Uygulama
 * MANTIK: Veri odaklı koçluk, yerel depolama ile hafıza yönetimi, Gemini entegrasyonu
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  LayoutDashboard, 
  UserCircle, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  Send,
  Loader2,
  History,
  Clock,
  Target,
  Plus,
  X,
  Calendar,
  Bell,
  Smartphone,
  List,
  Volume2,
  Archive,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCoachResponse, parseVoiceLog } from './services/gemini';
import { TYT_SUBJECTS, AYT_SUBJECTS } from './constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// --- Types ---

interface StudentProfile {
  name: string;
  exam: string;
  track: 'Sayısal' | 'Eşit Ağırlık' | 'Sözel' | 'Dil';
  targetUniversity: string;
  targetMajor: string;
  tytTarget: number;
  aytTarget: number;
  minHours: number;
  maxHours: number;
  dailyGoalHours: number;
  startTime: string;
  endTime: string;
  aytPriorities: string;
  weakSubjects: string;
  strongSubjects: string;
  resources: string;
}

interface SubjectStatus {
  subject: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'mastered';
  notes: string;
}

interface DailyLog {
  date: string;
  subject: string;
  topic: string;
  questions: number;
  correct: number;
  wrong: number;
  empty: number;
  avgTime: number;
  fatigue: number;
  tags: string[];
}

interface ExamResult {
  id: string;
  date: string;
  type: 'TYT' | 'AYT';
  totalNet: number;
  scores: Record<string, { correct: number, wrong: number, net: number }>;
}

interface FailedQuestion {
  id: string;
  date: string;
  subject: string;
  topic: string;
  book: string;
  page: string;
  questionNumber: string;
  reason: string;
}

interface AppState {
  profile: StudentProfile | null;
  tytSubjects: SubjectStatus[];
  aytSubjects: SubjectStatus[];
  logs: DailyLog[];
  exams: ExamResult[];
  chatHistory: { role: 'user' | 'coach'; content: string; timestamp: string }[];
  isPassiveMode?: boolean;
  failedQuestions?: FailedQuestion[];
}

// --- Initial State ---

const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) => topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' })));
const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) => topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' })));

const getAytSubjectsForTrack = (track: string) => {
  if (track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
  if (track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'];
  if (track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'];
  if (track === 'Dil') return ['Yabancı Dil'];
  return Object.keys(AYT_SUBJECTS);
};

// --- Components ---

function LogHistory({ logs }: { logs: DailyLog[] }) {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTag, setFilterTag] = useState('');
  
  const allTags = Array.from(new Set(logs.flatMap(log => log.tags || [])));
  const allSubjects = Array.from(new Set(logs.map(log => log.subject)));

  const filteredLogs = logs.filter(log => {
    if (filterSubject && log.subject !== filterSubject) return false;
    if (filterTag && (!log.tags || !log.tags.includes(filterTag))) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select 
          value={filterSubject} 
          onChange={e => setFilterSubject(e.target.value)}
          className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
        >
          <option value="">Tüm Dersler</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <select 
          value={filterTag} 
          onChange={e => setFilterTag(e.target.value)}
          className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
        >
          <option value="">Tüm Etiketler</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <p className="text-center py-8 opacity-40 text-xs">Kriterlere uygun log bulunamadı.</p>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} className="p-4 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#F5F2EB] dark:bg-zinc-950">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{new Date(log.date).toLocaleString('tr-TR')}</span>
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
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest">
                  Toplam Süre: {log.avgTime}dk
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest">
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

function ArchiveWidget({ onSubmit, onCancel, subjects }: { onSubmit: (q: Omit<FailedQuestion, 'id' | 'date'>) => void, onCancel: () => void, subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] || '');
  const [topic, setTopic] = useState('');
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [reason, setReason] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-lg mb-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-serif italic text-xl text-[#C17767] dark:text-rose-400">Mezarlığa Ekle</h3>
        <button onClick={onCancel} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><X size={16} /></button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <select value={subject} onChange={e => setSubject(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767]">
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" placeholder="Konu" value={topic} onChange={e => setTopic(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767]" />
        <input type="text" placeholder="Kitap Adı" value={book} onChange={e => setBook(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767]" />
        <div className="flex gap-2">
          <input type="text" placeholder="Sayfa" value={page} onChange={e => setPage(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767]" />
          <input type="text" placeholder="Soru No" value={questionNumber} onChange={e => setQuestionNumber(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767]" />
        </div>
      </div>
      <textarea placeholder="Neden yanlış yaptın? (Örn: Formülü unuttum, işlem hatası)" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] mb-4 h-20 resize-none" />
      
      <button 
        onClick={() => {
          if (subject && topic && book) {
            onSubmit({ subject, topic, book, page, questionNumber, reason });
          }
        }}
        className="w-full py-2 bg-[#C17767] text-[#FDFBF7] rounded-lg text-sm font-bold tracking-widest uppercase hover:bg-[#A56253] transition-colors"
      >
        Kaydet
      </button>
    </motion.div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('yks_coach_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.exams) parsed.exams = [];
      return parsed;
    }
    return {
      profile: null,
      tytSubjects: INITIAL_TYT,
      aytSubjects: INITIAL_AYT,
      logs: [],
      exams: [],
      chatHistory: []
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'coach' | 'profile' | 'exams' | 'logs' | 'settings' | 'archive'>('dashboard');
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isLogWidgetOpen, setIsLogWidgetOpen] = useState(false);
  const [isArchiveWidgetOpen, setIsArchiveWidgetOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleLogSubmit = async (log: DailyLog) => {
    setIsLogWidgetOpen(false);
    
    const isPassive = log.fatigue >= 8;
    
    setState(prev => ({ 
      ...prev, 
      logs: [...prev.logs, log],
      isPassiveMode: isPassive
    }));
    
    const logMessage = `LOG GİRİŞİ:
Ders: ${log.subject}
Konu: ${log.topic}
Soru: ${log.questions} (D:${log.correct} Y:${log.wrong} B:${log.empty})
Toplam Süre: ${log.avgTime}dk
Yorgunluk: ${log.fatigue}/10
Hatalar: ${log.tags.join(', ') || 'Yok'}
${isPassive ? '\\nSİSTEM NOTU: Öğrencinin zihinsel yorgunluğu 8 veya üzerinde. Sistemi otomatik olarak PASİF MODA geçir. Sadece video izleme, formül okuma gibi yorucu olmayan görevler ver.' : ''}`;

    const newHistory = [
      ...state.chatHistory,
      { role: 'user' as const, content: logMessage, timestamp: new Date().toISOString() }
    ];
    
    setState(prev => ({ ...prev, chatHistory: newHistory }));
    setIsTyping(true);

    const context = `
      Öğrenci Profili: ${JSON.stringify(state.profile)}
      Yeni Log: ${JSON.stringify(log)}
      Lütfen bu logu analiz et ve akşam değerlendirmesi yap.
    `;

    const response = await getCoachResponse("LOG ANALİZİ YAP", context, state.chatHistory);
    
    setState(prev => ({
      ...prev,
      chatHistory: [
        ...prev.chatHistory,
        { role: 'coach' as const, content: response || "Log kaydedildi. İyi çalışmalar.", timestamp: new Date().toISOString() }
      ]
    }));
    setIsTyping(false);
  };

  const mathSpeedData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    
    const dayLogs = state.logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getDate() === d.getDate() && logDate.getMonth() === d.getMonth() && logDate.getFullYear() === d.getFullYear();
    }).filter(log => log.subject.includes('TYT Matematik'));

    const avgTime = dayLogs.length > 0 
      ? Math.round(dayLogs.reduce((acc, log) => acc + log.avgTime, 0) / dayLogs.length)
      : null;

    return { day: dateStr, actual: avgTime, target: 45 };
  });

  useEffect(() => {
    localStorage.setItem('yks_coach_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory]);

  const handleProfileSubmit = (profile: StudentProfile) => {
    setState(prev => ({ ...prev, profile }));
    setIsEditingProfile(false);
  };

  const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string) => {
    e?.preventDefault();
    const userMsg = messageOverride || inputMessage;
    if (!userMsg.trim() || isTyping) return;

    if (userMsg.trim().toUpperCase() === 'LOG') {
      setIsLogWidgetOpen(true);
      if (!messageOverride) setInputMessage('');
      return;
    }

    if (!messageOverride) {
      setInputMessage('');
    }
    
    const newHistory = [
      ...state.chatHistory,
      { role: 'user' as const, content: userMsg, timestamp: new Date().toISOString() }
    ];
    
    setState(prev => ({ ...prev, chatHistory: newHistory }));
    setIsTyping(true);

    // Prepare context for AI
    const context = `
      Öğrenci Profili: ${JSON.stringify(state.profile)}
      TYT Durumu: ${state.tytSubjects.filter(s => s.status !== 'not-started').map(s => `${s.name}: ${s.status}`).join(', ')}
      AYT Durumu: ${state.aytSubjects.filter(s => s.status !== 'not-started').map(s => `${s.name}: ${s.status}`).join(', ')}
      Son Loglar: ${JSON.stringify(state.logs.slice(-5))}
      Son Denemeler: ${JSON.stringify(state.exams.slice(-3))}
    `;

    const response = await getCoachResponse(userMsg, context, state.chatHistory);
    
    setState(prev => ({
      ...prev,
      chatHistory: [
        ...prev.chatHistory,
        { role: 'coach' as const, content: response || "Üzgünüm, şu an yanıt veremiyorum.", timestamp: new Date().toISOString() }
      ]
    }));
    setIsTyping(false);
  };

  if (!state.profile || isEditingProfile) {
    return <ProfileSetup onSubmit={handleProfileSubmit} initialData={state.profile || undefined} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FDFBF7] dark:bg-zinc-950 text-[#4A443C] dark:text-zinc-200 font-sans selection:bg-[#4A443C] selection:text-[#FDFBF7]">
      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 border-t md:border-t-0 md:border-r border-[#EAE6DF] dark:border-zinc-800 flex flex-row md:flex-col bg-[#F5F2EB]/90 dark:bg-zinc-900/90 backdrop-blur-md md:backdrop-blur-none z-50">
        <div className="hidden md:block p-6 border-b border-[#EAE6DF] dark:border-zinc-800">
          <h1 className="font-serif italic text-xl font-bold tracking-tight text-[#C17767] dark:text-rose-400">Boho Mentosluk</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">YKS Mentörlük</p>
          {state.isPassiveMode && (
            <div className="mt-4 px-3 py-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">PASİF MOD AKTİF</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-row md:flex-col py-2 md:py-4 justify-around md:justify-start overflow-x-auto md:overflow-visible no-scrollbar">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dash" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Calendar size={18} />} 
            label="Analiz" 
            active={activeTab === 'exams'} 
            onClick={() => setActiveTab('exams')} 
          />
          <NavItem 
            icon={<List size={18} />} 
            label="Loglar" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <NavItem 
            icon={<Archive size={18} />} 
            label="Mezarlık" 
            active={activeTab === 'archive'} 
            onClick={() => setActiveTab('archive')} 
          />
          <NavItem 
            icon={<BookOpen size={18} />} 
            label="Müfredat" 
            active={activeTab === 'subjects'} 
            onClick={() => setActiveTab('subjects')} 
          />
          <NavItem 
            icon={<MessageSquare size={18} />} 
            label="Koç" 
            active={activeTab === 'coach'} 
            onClick={() => setActiveTab('coach')} 
          />
          <NavItem 
            icon={<UserCircle size={18} />} 
            label="Profil" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
          <NavItem 
            icon={<Settings size={18} />} 
            label="Ayarlar" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>

        <div className="hidden md:block p-6 border-t border-[#EAE6DF] dark:border-zinc-800 text-[10px] opacity-50 uppercase tracking-widest">
          © 2026 Gear_Head Architecture
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-[#FDFBF7] dark:bg-zinc-950 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 max-w-5xl mx-auto"
            >
              <header className="mb-12 flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-serif italic text-4xl text-[#4A443C] dark:text-zinc-200">Hoş geldin, {state.profile.name}</h2>
                    <div className="px-2 py-1 bg-[#C17767]/10 text-[#C17767] dark:text-rose-400 text-xs font-bold rounded-md border border-[#C17767]/20 flex items-center gap-1">
                      <Trophy size={14} />
                      ELO: {1200 + (state.logs.length * 5) + (state.exams.length * 20)}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs uppercase tracking-widest opacity-60">
                    <span>TYT Hedef: {state.profile.tytTarget} Net</span>
                    <span>•</span>
                    <span>AYT Hedef: {state.profile.aytTarget} Net</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <PushU />
                  <button 
                    onClick={() => setIsExamModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#C17767] text-[#FDFBF7] text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
                  >
                    <Plus size={16} />
                    Deneme Neti Gir
                  </button>
                </div>
              </header>

              {(() => {
                const todayStr = new Date().toLocaleDateString('tr-TR');
                const todayLogs = state.logs.filter(l => l.date === todayStr);
                const todayMinutes = todayLogs.reduce((acc, log) => acc + log.avgTime, 0);
                const todayHours = (todayMinutes / 60).toFixed(1);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatCard 
                      title="Tamamlanan Konular" 
                      value={state.tytSubjects.filter(s => s.status === 'mastered').length + state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject) && s.status === 'mastered').length} 
                      total={state.tytSubjects.length + state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject)).length}
                      icon={<CheckCircle2 className="text-[#C17767] dark:text-rose-400" />}
                    />
                    <StatCard 
                      title="Günlük Çalışma" 
                      value={todayHours} 
                      total={state.profile.dailyGoalHours || state.profile.minHours}
                      unit="Saat"
                      icon={<Clock className="text-blue-400" />}
                    />
                    <StatCard 
                      title="Kritik Sorunlar" 
                      value={state.logs.filter(l => l.wrong > l.correct).length} 
                      unit="Aktif"
                      icon={<AlertTriangle className="text-orange-500" />}
                    />
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <section className="md:col-span-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,255,0,0.1)]">
                  <h3 className="font-serif italic text-xl mb-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 uppercase tracking-tight text-[#C17767] dark:text-rose-400">Günün Direktifi</h3>
                  <div className="prose prose-invert prose-sm max-w-none">
                    {state.chatHistory.filter(m => m.role === 'coach').slice(-1)[0]?.content ? (
                      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#4A443C] dark:text-zinc-200">
                        <ReactMarkdown>{state.chatHistory.filter(m => m.role === 'coach').slice(-1)[0].content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8 opacity-50">
                        Henüz bir direktif yok. Koç ile konuşmaya başla.
                      </div>
                    )}
                  </div>
                </section>

                <section className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,255,0,0.1)] flex flex-col">
                  <h3 className="font-serif italic text-xl mb-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 uppercase tracking-tight text-[#C17767] dark:text-rose-400 flex items-center justify-between">
                    <span>Konu Borcu</span>
                    <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded font-bold">FAİZ İŞLİYOR</span>
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {state.logs.filter(l => l.fatigue > 7).length > 0 ? (
                      state.logs.filter(l => l.fatigue > 7).slice(-3).map((log, idx) => (
                        <div key={idx} className="p-3 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-[#4A443C] dark:text-zinc-200">{log.topic}</span>
                            <span className="text-xs font-mono text-red-500 font-bold">+{5 * (idx + 1)} Soru</span>
                          </div>
                          <p className="text-[10px] uppercase tracking-widest opacity-60">Ertelenme: {new Date(log.date).toLocaleDateString('tr-TR')}</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-50 text-center">
                        <CheckCircle2 size={32} className="mb-2 text-green-500" />
                        <p className="text-sm">Hiç konu borcun yok.<br/>Harika disiplin!</p>
                      </div>
                    )}
                  </div>
                  {state.logs.filter(l => l.fatigue > 7).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#EAE6DF] dark:border-zinc-800 text-center">
                      <p className="text-xs font-mono text-[#C17767] dark:text-rose-400">
                        Toplam Faiz: <span className="font-bold text-lg">{state.logs.filter(l => l.fatigue > 7).slice(-3).reduce((acc, _, idx) => acc + (5 * (idx + 1)), 0)}</span> Soru
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                <section className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,255,0,0.1)] flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif italic text-xl mb-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 uppercase tracking-tight text-[#C17767] dark:text-rose-400">YKS Simülatörü (Tahmin)</h3>
                    <p className="text-sm opacity-80 mb-4 leading-relaxed">
                      Mevcut çalışma tempon ve net artış hızın baz alındığında, Haziran ayındaki tahmini TYT netin:
                    </p>
                    <div className="text-5xl font-serif italic text-center text-[#4A443C] dark:text-zinc-200 mb-4">
                      {state.exams.length > 0 ? (state.exams[state.exams.length - 1].tytNet + (state.logs.length * 0.1)).toFixed(1) : '---'}
                    </div>
                    <p className="text-xs text-center opacity-60 uppercase tracking-widest">
                      Hedef: {state.profile.tytTarget} Net
                    </p>
                  </div>
                  <div className="mt-6 p-4 bg-[#F5F2EB] dark:bg-zinc-950 rounded-lg border border-[#EAE6DF] dark:border-zinc-800">
                    <p className="text-xs font-mono text-[#C17767] dark:text-rose-400">
                      {state.exams.length > 0 && (state.exams[state.exams.length - 1].tytNet + (state.logs.length * 0.1)) < state.profile.tytTarget 
                        ? `Hedefin olan ${state.profile.targetUniversity} için tempoyu %15 artırman gerekiyor.` 
                        : `Harika gidiyorsun! ${state.profile.targetUniversity} hedefine ulaşmak üzeresin.`}
                    </p>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6">
                  <h3 className="font-serif italic text-xl mb-4 uppercase tracking-tight text-[#4A443C] dark:text-zinc-200">Son Çalışmalar</h3>
                  <div className="space-y-4">
                    {state.logs.slice(-3).reverse().map((log, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-[#EAE6DF] dark:border-zinc-800 pb-2">
                        <div>
                          <p className="font-bold text-sm text-[#4A443C] dark:text-zinc-200">{log.topic}</p>
                          <p className="text-[10px] opacity-60 uppercase">{log.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-[#C17767] dark:text-rose-400">{log.correct}D / {log.wrong}Y</p>
                          <p className="text-[10px] opacity-60 uppercase">{log.avgTime}dk</p>
                        </div>
                      </div>
                    ))}
                    {state.logs.length === 0 && <p className="text-center py-4 opacity-40 text-xs">Henüz veri girişi yapılmadı.</p>}
                  </div>
                </div>
                <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6">
                  <h3 className="font-serif italic text-xl mb-4 uppercase tracking-tight text-[#4A443C] dark:text-zinc-200">Progress Overview</h3>
                  <div className="mb-6">
                    <div className="flex justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>TYT Ustalaşılan</span>
                      <span>{state.tytSubjects.filter(s => s.status === 'mastered').length} / {state.tytSubjects.length}</span>
                    </div>
                    <div className="h-2 bg-[#EAE6DF] dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#C17767]" 
                        style={{ width: `${(state.tytSubjects.filter(s => s.status === 'mastered').length / state.tytSubjects.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>AYT Ustalaşılan</span>
                      <span>{state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject) && s.status === 'mastered').length} / {state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject)).length}</span>
                    </div>
                    <div className="h-2 bg-[#EAE6DF] dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject) && s.status === 'mastered').length / Math.max(1, state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject)).length)) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <h4 className="text-[10px] uppercase tracking-widest opacity-50 mb-4 mt-8">TYT Mat Soru Süresi (sn)</h4>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mathSpeedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
                        <XAxis dataKey="day" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EAE6DF', fontSize: '12px' }}
                          itemStyle={{ color: '#4A443C' }}
                        />
                        <ReferenceLine y={45} stroke="#FF4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Hedef', fill: '#FF4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="actual" stroke="#C17767" strokeWidth={2} dot={{ r: 4, fill: '#FFFFFF', stroke: '#C17767', strokeWidth: 2 }} name="Gerçekleşen" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 max-w-5xl mx-auto"
            >
              <div className="flex justify-between items-end mb-8">
                <h2 className="font-serif italic text-4xl text-[#4A443C] dark:text-zinc-200">Log Geçmişi</h2>
              </div>

              <LogHistory logs={state.logs} />
            </motion.div>
          )}

          {activeTab === 'exams' && (
            <motion.div 
              key="exams"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 max-w-5xl mx-auto"
            >
              <div className="flex justify-between items-end mb-8">
                <h2 className="font-serif italic text-4xl text-[#4A443C] dark:text-zinc-200">Deneme Analizi</h2>
                <button 
                  onClick={() => setIsExamModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#C17767] text-[#FDFBF7] text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} />
                  Yeni Deneme Gir
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                  <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6">
                    <h3 className="font-serif italic text-xl mb-6 uppercase tracking-tight text-[#4A443C] dark:text-zinc-200">Deneme Takvimi</h3>
                    <div className="space-y-4">
                      {state.exams.length === 0 ? (
                        <p className="text-center py-8 opacity-40 text-xs">Henüz deneme girilmedi.</p>
                      ) : (
                        [...state.exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exam => (
                          <div key={exam.id} className="flex items-center justify-between p-4 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#F5F2EB] dark:bg-zinc-900 hover:border-[#C17767] transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-[#EAE6DF] dark:bg-zinc-800 flex flex-col items-center justify-center text-[#4A443C] dark:text-zinc-200 group-hover:bg-[#C17767] group-hover:text-[#FDFBF7] transition-colors">
                                <span className="text-[10px] uppercase font-bold">{new Date(exam.date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                                <span className="text-lg font-mono leading-none">{new Date(exam.date).getDate()}</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-[#4A443C] dark:text-zinc-200">{exam.type} Denemesi</h4>
                                <p className="text-[10px] uppercase tracking-widest opacity-50">{Object.keys(exam.scores).length} Ders</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-mono text-[#C17767] dark:text-rose-400 font-bold">{exam.totalNet}</span>
                              <span className="text-[10px] uppercase tracking-widest opacity-50 block">Net</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="text-[#C17767] dark:text-rose-400" size={20} />
                      <h3 className="font-serif italic text-xl uppercase tracking-tight text-[#4A443C] dark:text-zinc-200">Akıllı Deneme Önerisi</h3>
                    </div>
                    <p className="text-sm opacity-80 mb-4 leading-relaxed">
                      Eksiklerine ve çalışma tempona göre bu hafta çözmen gereken denemeler:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 p-3 bg-[#F5F2EB] dark:bg-zinc-950 rounded-lg border border-[#EAE6DF] dark:border-zinc-800">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-[#C17767]"></div>
                        <div>
                          <p className="text-sm font-bold text-[#4A443C] dark:text-zinc-200">TYT Genel Denemesi</p>
                          <p className="text-xs opacity-60">Son TYT denemesinin üzerinden 7 gün geçti. Hız kontrolü için gerekli.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3 p-3 bg-[#F5F2EB] dark:bg-zinc-950 rounded-lg border border-[#EAE6DF] dark:border-zinc-800">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-[#E09F3E]"></div>
                        <div>
                          <p className="text-sm font-bold text-[#4A443C] dark:text-zinc-200">AYT Matematik Branş Denemesi</p>
                          <p className="text-xs opacity-60">Matematik netlerin hedefin %20 altında. Odaklanmış pratik şart.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6">
                    <h3 className="font-serif italic text-xl mb-6 uppercase tracking-tight text-[#4A443C] dark:text-zinc-200">TYT Net Gelişimi</h3>
                    <div className="h-64 w-full">
                      {state.exams.filter(e => e.type === 'TYT').length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[...state.exams.filter(e => e.type === 'TYT')].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
                            <XAxis dataKey="date" stroke="#666" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} />
                            <YAxis stroke="#666" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EAE6DF', fontSize: '12px' }}
                              itemStyle={{ color: '#4A443C' }}
                              labelFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')}
                            />
                            <Line type="monotone" dataKey="totalNet" stroke="#C17767" strokeWidth={2} dot={{ r: 4, fill: '#FFFFFF', stroke: '#C17767', strokeWidth: 2 }} name="TYT Net" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-40 text-xs">
                          TYT Grafiği için veri bekleniyor.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6">
                    <h3 className="font-serif italic text-xl mb-6 uppercase tracking-tight text-[#4A443C] dark:text-zinc-200">AYT Net Gelişimi</h3>
                    <div className="h-64 w-full">
                      {state.exams.filter(e => e.type === 'AYT').length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[...state.exams.filter(e => e.type === 'AYT')].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
                            <XAxis dataKey="date" stroke="#666" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} />
                            <YAxis stroke="#666" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EAE6DF', fontSize: '12px' }}
                              itemStyle={{ color: '#4A443C' }}
                              labelFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')}
                            />
                            <Line type="monotone" dataKey="totalNet" stroke="#E09F3E" strokeWidth={2} dot={{ r: 4, fill: '#FFFFFF', stroke: '#E09F3E', strokeWidth: 2 }} name="AYT Net" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-40 text-xs">
                          AYT Grafiği için veri bekleniyor.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'subjects' && (
            <motion.div 
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="font-serif italic text-4xl mb-8 text-[#4A443C] dark:text-zinc-200">Müfredat Haritası</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <SubjectList 
                  title="TYT Müfredatı" 
                  subjects={state.tytSubjects} 
                  onStatusChange={(idx, status) => {
                    const newSubs = [...state.tytSubjects];
                    newSubs[idx].status = status;
                    setState(prev => ({ ...prev, tytSubjects: newSubs }));
                  }}
                  onNotesChange={(idx, notes) => {
                    const newSubs = [...state.tytSubjects];
                    newSubs[idx].notes = notes;
                    setState(prev => ({ ...prev, tytSubjects: newSubs }));
                  }}
                />
                <SubjectList 
                  title="AYT Müfredatı" 
                  subjects={state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject))} 
                  onStatusChange={(idx, status) => {
                    // We need to find the original index in state.aytSubjects
                    const filteredSubjects = state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject));
                    const targetSubject = filteredSubjects[idx];
                    const originalIndex = state.aytSubjects.findIndex(s => s.subject === targetSubject.subject && s.name === targetSubject.name);
                    
                    const newSubs = [...state.aytSubjects];
                    newSubs[originalIndex].status = status;
                    setState(prev => ({ ...prev, aytSubjects: newSubs }));
                  }}
                  onNotesChange={(idx, notes) => {
                    const filteredSubjects = state.aytSubjects.filter(s => getAytSubjectsForTrack(state.profile?.track || 'Sayısal').includes(s.subject));
                    const targetSubject = filteredSubjects[idx];
                    const originalIndex = state.aytSubjects.findIndex(s => s.subject === targetSubject.subject && s.name === targetSubject.name);
                    
                    const newSubs = [...state.aytSubjects];
                    newSubs[originalIndex].notes = notes;
                    setState(prev => ({ ...prev, aytSubjects: newSubs }));
                  }}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'coach' && (
            <motion.div 
              key="coach"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full bg-[#FDFBF7] dark:bg-zinc-950"
            >
              <div className="flex-1 overflow-auto p-8 space-y-6">
                {state.chatHistory.length === 0 && (
                  <div className="max-w-2xl mx-auto text-center py-20">
                    <div className="w-16 h-16 bg-[#C17767] text-[#FDFBF7] rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="font-serif italic text-2xl mb-4 text-[#4A443C] dark:text-zinc-200">Aktif Koçluk Başlıyor</h3>
                    <p className="text-sm opacity-60 mb-8 text-[#4A443C] dark:text-zinc-200">
                      Sabah direktifi almak için "SABAH" yaz. Akşam verilerini girmek için "LOG" yaz. 
                      Herhangi bir konuyu anlamadıysan "ANLA [KONU]" yaz.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        { cmd: 'SABAH', desc: 'Günün görevlerini al' },
                        { cmd: 'LOG', desc: 'Çalışma verilerini gir' },
                        { cmd: 'PLAN', desc: '7 günlük plan oluştur' },
                        { cmd: 'ANALYZE', desc: 'Performans analizi yap' }
                      ].map(item => (
                        <button 
                          key={item.cmd}
                          onClick={() => {
                            if (item.cmd === 'LOG') {
                              setInputMessage("LOG\nTARİH: " + new Date().toLocaleDateString('tr-TR') + "\nÇALIŞILAN: [Ders] – [Konu] – [Soru] – [D/Y/B] – [Süre sn]\nHATALAR: #KAVRAM – [Açıklama]\nYORGUNLUK: [1-10]");
                            } else {
                              setInputMessage(item.cmd);
                            }
                          }}
                          className="px-4 py-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 text-[10px] uppercase tracking-widest hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors group relative"
                        >
                          {item.cmd}
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#EAE6DF] dark:bg-zinc-800 text-white px-2 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                            {item.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {state.chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 ${
                      msg.role === 'user' 
                        ? 'bg-[#C17767] text-[#FDFBF7] font-medium' 
                        : 'bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,255,0,0.2)]'
                    }`}>
                      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2 flex justify-between items-center">
                        <span>{msg.role === 'user' ? 'Öğrenci' : 'Koç Kübra'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.role === 'coach' && (
                          <button 
                            onClick={() => {
                              const utterance = new SpeechSynthesisUtterance(msg.content);
                              utterance.lang = 'tr-TR';
                              window.speechSynthesis.speak(utterance);
                            }}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                            title="Sesli Oku"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className={`whitespace-pre-wrap text-sm leading-relaxed ${msg.role === 'coach' ? 'font-mono' : ''}`}>
                        {msg.role === 'coach' ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-4 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#C17767] dark:text-rose-400" />
                      <span className="text-[10px] uppercase tracking-widest text-[#C17767] dark:text-rose-400">Kübra analiz ediyor...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-8 border-t border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-900 flex flex-col gap-4">
                {isLogWidgetOpen && (
                  <LogEntryWidget onSubmit={handleLogSubmit} onCancel={() => setIsLogWidgetOpen(false)} track={state.profile?.track || 'Sayısal'} />
                )}
                <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                  <button 
                    type="button"
                    onClick={() => setIsLogWidgetOpen(true)}
                    className="px-3 py-1 border border-[#C17767] bg-[#C17767]/10 text-[9px] uppercase tracking-widest text-[#C17767] dark:text-rose-400 hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors font-bold"
                  >
                    + LOG
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSendMessage(undefined, 'ANALYZE')}
                    className="px-3 py-1 border border-[#E09F3E] bg-[#E09F3E]/10 text-[9px] uppercase tracking-widest text-[#E09F3E] hover:bg-[#E09F3E] hover:text-[#FDFBF7] transition-colors font-bold"
                  >
                    + ANALİZ ET
                  </button>
                  {[
                    { label: 'Deneme', template: 'LOG\nDENEME: \nDoğru: \nYanlış: \nBoş: \nNet: ' },
                    { label: 'Anla', template: 'ANLA: ' }
                  ].map(btn => (
                    <button 
                      key={btn.label}
                      type="button"
                      onClick={() => setInputMessage(btn.template)}
                      className="px-3 py-1 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-[9px] uppercase tracking-widest text-[#C17767] dark:text-rose-400 hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      + {btn.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <textarea 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Komut gir veya mesaj yaz..."
                    rows={inputMessage.includes('\n') ? 6 : 1}
                    className="flex-1 bg-transparent border-b border-[#EAE6DF] dark:border-zinc-800 py-2 focus:outline-none text-sm resize-none text-[#4A443C] dark:text-zinc-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={isTyping}
                    className="w-10 h-10 bg-[#C17767] text-[#FDFBF7] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 self-end"
                  >
                    <Send size={18} />
                  </button>
                </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif italic text-4xl text-[#4A443C] dark:text-zinc-200">Öğrenci Profili</h2>
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                >
                  Profili Düzenle
                </button>
              </div>
              <div className="space-y-8">
                <ProfileSection title="Temel Bilgiler">
                  <ProfileField label="İsim" value={state.profile.name} />
                  <ProfileField label="Sınav" value={state.profile.exam} />
                  <ProfileField label="Alan" value={state.profile.track || 'Sayısal'} />
                  <ProfileField label="Hedef Üniversite" value={state.profile.targetUniversity} />
                  <ProfileField label="Hedef Bölüm" value={state.profile.targetMajor} />
                  <ProfileField label="TYT Hedef" value={`${state.profile.tytTarget} Net`} />
                  <ProfileField label="AYT Hedef" value={`${state.profile.aytTarget} Net`} />
                </ProfileSection>

                <ProfileSection title="Çalışma Düzeni">
                  <ProfileField label="Kapasite" value={`${state.profile.minHours}-${state.profile.maxHours} Saat`} />
                  <ProfileField label="Saatler" value={`${state.profile.startTime} → ${state.profile.endTime}`} />
                </ProfileSection>

                <ProfileSection title="Akademik Odak">
                  <ProfileField label="Öncelikli Dersler" value={state.profile.aytPriorities} />
                  <ProfileField label="Güçlü Dersler" value={state.profile.strongSubjects} />
                  <ProfileField label="Zayıf Dersler" value={state.profile.weakSubjects} />
                  <ProfileField label="Kaynaklar" value={state.profile.resources} />
                </ProfileSection>

                <ProfileSection title="Sistem Ayarları">
                  <div className="col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Mobil Bildirimler</p>
                      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">Koç direktiflerini anlık al</p>
                    </div>
                    <button 
                      onClick={async () => {
                        if ('Notification' in window) {
                          const permission = await Notification.requestPermission();
                          if (permission === 'granted') {
                            new Notification('Boho Mentosluk', {
                              body: 'Bildirimler aktifleştirildi. Koç direktifleri buraya gelecek.',
                            });
                          } else {
                            alert('Bildirim izni reddedildi.');
                          }
                        } else {
                          alert('Tarayıcınız bildirimleri desteklemiyor.');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-xs uppercase tracking-widest hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      <Bell size={16} />
                      Bildirimleri Aç
                    </button>
                  </div>
                </ProfileSection>

                <button 
                  onClick={() => setState(prev => ({ ...prev, profile: null }))}
                  className="w-full py-4 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors"
                >
                  Profili Sıfırla
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'archive' && (
            <motion.div 
              key="archive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 md:p-8 max-w-6xl mx-auto"
            >
              <header className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="font-serif italic text-3xl text-[#4A443C] dark:text-zinc-200">Soru Bankası Mezarlığı</h2>
                  <p className="text-sm opacity-60 mt-2">Yanlış yaptığın soruları kaydet ve unutma.</p>
                </div>
                <button 
                  onClick={() => setIsArchiveWidgetOpen(true)}
                  className="px-4 py-2 bg-[#C17767] text-[#FDFBF7] rounded-lg text-sm font-bold tracking-widest uppercase hover:bg-[#A56253] transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Yeni Ekle
                </button>
              </header>
              
              {isArchiveWidgetOpen && (
                <ArchiveWidget 
                  subjects={Object.keys(TYT_SUBJECTS)}
                  onCancel={() => setIsArchiveWidgetOpen(false)}
                  onSubmit={(q) => {
                    setState(prev => ({
                      ...prev,
                      failedQuestions: [
                        ...(prev.failedQuestions || []),
                        { ...q, id: Date.now().toString(), date: new Date().toLocaleDateString('tr-TR') }
                      ]
                    }));
                    setIsArchiveWidgetOpen(false);
                  }}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(state.failedQuestions || []).map(q => (
                  <div key={q.id} className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#C17767]"></div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest opacity-50">{q.date}</span>
                      <span className="text-[10px] uppercase tracking-widest bg-[#F5F2EB] dark:bg-zinc-800 px-2 py-1 rounded text-[#C17767] dark:text-rose-400 font-bold">{q.subject}</span>
                    </div>
                    <h4 className="font-bold text-[#4A443C] dark:text-zinc-200 mb-1">{q.topic}</h4>
                    <p className="text-xs opacity-80 mb-4">{q.book} - Sayfa: {q.page}, Soru: {q.questionNumber}</p>
                    <div className="bg-[#FDFBF7] dark:bg-zinc-950 p-3 rounded-lg border border-[#EAE6DF] dark:border-zinc-800">
                      <p className="text-xs italic opacity-80">"{q.reason}"</p>
                    </div>
                  </div>
                ))}
                {(!state.failedQuestions || state.failedQuestions.length === 0) && (
                  <div className="col-span-full bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                    <p className="text-sm opacity-60 text-center py-8">Mezarlık henüz boş. Yanlış yaptığın soruları buraya ekleyebilirsin.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif italic text-4xl text-[#4A443C] dark:text-zinc-200">Ayarlar</h2>
              </div>
              <div className="space-y-8">
                <ProfileSection title="Görünüm">
                  <div className="col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Karanlık Tema</p>
                      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">Arayüzü koyu renklere çevir</p>
                    </div>
                    <button 
                      onClick={() => document.documentElement.classList.toggle('dark')}
                      className="px-4 py-2 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      Değiştir
                    </button>
                  </div>
                </ProfileSection>

                <ProfileSection title="Veri Yönetimi">
                  <div className="col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Sohbet Geçmişi</p>
                      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">Koç ile olan konuşmaları indir</p>
                    </div>
                    <button 
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.chatHistory, null, 2));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href",     dataStr);
                        downloadAnchorNode.setAttribute("download", "boho_mentosluk_sohbet.json");
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className="px-4 py-2 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      Dışa Aktar
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-between items-center mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Tüm Veriler</p>
                      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">Tüm uygulama verilerini indir</p>
                    </div>
                    <button 
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href",     dataStr);
                        downloadAnchorNode.setAttribute("download", "boho_mentosluk_yedek.json");
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className="px-4 py-2 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      Yedekle
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-between items-center mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Sıfırla</p>
                      <p className="text-sm font-medium text-red-500">Tüm verileri sil ve baştan başla</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm('Tüm verileriniz silinecek. Emin misiniz?')) {
                          localStorage.removeItem('yks_coach_state');
                          window.location.reload();
                        }
                      }}
                      className="px-4 py-2 bg-red-100 text-red-600 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Sıfırla
                    </button>
                  </div>
                </ProfileSection>

                <ProfileSection title="Geliştirici Ayarları">
                  <div className="col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Hata Ayıklama Modu</p>
                      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">Sistem loglarını konsola yazdır</p>
                    </div>
                    <button 
                      onClick={() => alert('Hata ayıklama modu aktif edildi. (Konsolu kontrol edin)')}
                      className="px-4 py-2 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      Aktifleştir
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-between items-center mt-4 pt-4 border-t border-[#EAE6DF] dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">Özellik Kontrolü</p>
                      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">Deneysel özellikleri aç/kapat</p>
                    </div>
                    <button 
                      onClick={() => alert('Deneysel özellikler yakında eklenecektir.')}
                      className="px-4 py-2 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
                    >
                      Yönet
                    </button>
                  </div>
                </ProfileSection>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ExamEntryModal 
        isOpen={isExamModalOpen} 
        onClose={() => setIsExamModalOpen(false)} 
        track={state.profile?.track || 'Sayısal'}
        onSave={(exam) => {
          setState(prev => ({ ...prev, exams: [...prev.exams, exam] }));
          setIsExamModalOpen(false);
        }}
      />
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-2 md:px-6 py-2 md:py-4 transition-all ${
        active 
          ? 'bg-transparent md:bg-[#FFFFFF] dark:md:bg-zinc-900 text-[#C17767] dark:text-rose-400 md:border-r-4 md:border-[#C17767] md:border-b-0' 
          : 'text-[#8C857B] dark:text-zinc-400 hover:bg-[#FFFFFF]/50 dark:hover:bg-zinc-900/50'
      }`}
    >
      <div className={`p-2 rounded-full md:p-0 md:rounded-none transition-colors ${active ? 'bg-[#C17767]/10 dark:bg-rose-400/10 md:bg-transparent' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] md:text-xs uppercase tracking-widest font-medium ${active ? 'opacity-100' : 'opacity-60'}`}>
        {label}
      </span>
    </button>
  );
}

function StatCard({ title, value, total, unit, icon }: { title: string, value: string | number, total?: number, unit?: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,255,0,0.1)]">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-200">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-serif italic text-[#4A443C] dark:text-zinc-200">{value}</span>
        {total && <span className="text-xl opacity-40 text-[#4A443C] dark:text-zinc-200">/ {total}</span>}
        {unit && <span className="text-xs uppercase opacity-60 tracking-widest text-[#4A443C] dark:text-zinc-200">{unit}</span>}
      </div>
    </div>
  );
}

function SubjectList({ title, subjects, onStatusChange, onNotesChange }: { title: string, subjects: SubjectStatus[], onStatusChange: (idx: number, status: SubjectStatus['status']) => void, onNotesChange: (idx: number, notes: string) => void }) {
  const groupedSubjects = subjects.reduce((acc, sub, idx) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push({ ...sub, originalIndex: idx });
    return acc;
  }, {} as Record<string, (SubjectStatus & { originalIndex: number })[]>);

  return (
    <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900">
      <div className="p-4 border-b border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-900 text-[#C17767] dark:text-rose-400">
        <h3 className="font-serif italic text-lg">{title}</h3>
      </div>
      <div className="divide-y divide-[#EAE6DF] dark:divide-zinc-800 max-h-[600px] overflow-auto">
        {Object.entries(groupedSubjects).map(([subjectName, topics]) => (
          <div key={subjectName}>
            <div className="p-2 bg-[#F0EBE1] dark:bg-zinc-800 text-[#C17767] dark:text-rose-400 text-xs font-bold uppercase tracking-widest sticky top-0 z-10">
              {subjectName}
            </div>
            {topics.map((sub) => (
              <div key={sub.originalIndex} className="p-4 flex flex-col gap-2 hover:bg-[#C17767]/5 dark:hover:bg-rose-400/10 transition-colors pl-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">{sub.name}</span>
                  <div className="flex gap-2">
                    <StatusButton 
                      active={sub.status === 'not-started'} 
                      onClick={() => onStatusChange(sub.originalIndex, 'not-started')}
                      color="gray"
                      label="Başlamadı"
                    />
                    <StatusButton 
                      active={sub.status === 'in-progress'} 
                      onClick={() => onStatusChange(sub.originalIndex, 'in-progress')}
                      color="blue"
                      label="Çalışılıyor"
                    />
                    <StatusButton 
                      active={sub.status === 'mastered'} 
                      onClick={() => onStatusChange(sub.originalIndex, 'mastered')}
                      color="green"
                      label="Bitti"
                    />
                  </div>
                </div>
                <textarea
                  className="w-full mt-2 p-2 text-xs bg-[#FDFBF7] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] dark:focus:border-rose-400 transition-colors resize-none"
                  placeholder="Bu konu hakkında notlar ekle..."
                  rows={2}
                  value={sub.notes || ''}
                  onChange={(e) => onNotesChange(sub.originalIndex, e.target.value)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusButton({ active, onClick, color, label }: { active: boolean, onClick: () => void, color: 'gray' | 'blue' | 'green', label: string }) {
  const colors = {
    gray: active ? 'bg-[#EAE6DF] text-[#4A443C] dark:bg-zinc-800 dark:text-zinc-200 border-[#C17767]/20 shadow-sm' : 'bg-transparent text-[#8C857B] dark:text-zinc-500 border-transparent hover:border-[#EAE6DF] dark:hover:border-zinc-800',
    blue: active ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm' : 'bg-transparent text-[#8C857B] dark:text-zinc-500 border-transparent hover:border-blue-100 dark:hover:border-blue-900/30',
    green: active ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800/50 shadow-sm' : 'bg-transparent text-[#8C857B] dark:text-zinc-500 border-transparent hover:border-green-100 dark:hover:border-green-900/30'
  };
  
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-full border transition-all duration-300 ${colors[color]}`}
    >
      {label}
    </button>
  );
}

function ProfileSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 bg-[#FFFFFF] dark:bg-zinc-900">
      <h3 className="text-[10px] uppercase tracking-widest opacity-50 mb-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 text-[#C17767] dark:text-rose-400">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 text-[#4A443C] dark:text-zinc-200">{label}</p>
      <p className="text-sm font-medium text-[#4A443C] dark:text-zinc-200">{value}</p>
    </div>
  );
}

function ProfileSetup({ onSubmit, initialData }: { onSubmit: (profile: StudentProfile) => void, initialData?: StudentProfile }) {
  const [formData, setFormData] = useState<StudentProfile>(initialData || {
    name: '',
    exam: 'YKS 2026',
    track: 'Sayısal',
    targetUniversity: 'Boğaziçi Üniversitesi',
    targetMajor: 'Bilgisayar Mühendisliği',
    tytTarget: 100,
    aytTarget: 70,
    minHours: 6,
    maxHours: 10,
    dailyGoalHours: 8,
    startTime: '08:00',
    endTime: '23:00',
    aytPriorities: 'Matematik, Kimya',
    weakSubjects: 'Fizik, Geometri',
    strongSubjects: 'Türkçe, Biyoloji',
    resources: '345, Bilgi Sarmal, Apotemi'
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-zinc-950 flex items-center justify-center p-8 py-16">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-10 shadow-lg"
      >
        <h1 className="font-serif italic text-4xl mb-2 text-[#C17767] dark:text-rose-400">Boho Mentosluk</h1>
        <p className="text-[10px] uppercase tracking-widest opacity-50 mb-8 text-[#4A443C] dark:text-zinc-200">Profil Kurulumu</p>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="İsim" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
            <div>
              <label className="block text-[10px] uppercase tracking-widest opacity-50 mb-2 text-[#4A443C] dark:text-zinc-200">Alan</label>
              <select 
                value={formData.track}
                onChange={e => setFormData({...formData, track: e.target.value as any})}
                className="w-full bg-transparent border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
              >
                <option value="Sayısal">Sayısal</option>
                <option value="Eşit Ağırlık">Eşit Ağırlık</option>
                <option value="Sözel">Sözel</option>
                <option value="Dil">Dil</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Hedef Üniversite" value={formData.targetUniversity} onChange={v => setFormData({...formData, targetUniversity: v})} />
            <Input label="Hedef Bölüm" value={formData.targetMajor} onChange={v => setFormData({...formData, targetMajor: v})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="TYT Hedef Net" type="number" value={formData.tytTarget} onChange={v => setFormData({...formData, tytTarget: Number(v)})} />
            <Input label="AYT Hedef Net" type="number" value={formData.aytTarget} onChange={v => setFormData({...formData, aytTarget: Number(v)})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Min Saat" type="number" value={formData.minHours} onChange={v => setFormData({...formData, minHours: Number(v)})} />
            <Input label="Max Saat" type="number" value={formData.maxHours} onChange={v => setFormData({...formData, maxHours: Number(v)})} />
            <Input label="Günlük Hedef" type="number" value={formData.dailyGoalHours} onChange={v => setFormData({...formData, dailyGoalHours: Number(v)})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Başlangıç" type="time" value={formData.startTime} onChange={v => setFormData({...formData, startTime: v})} />
            <Input label="Bitiş" type="time" value={formData.endTime} onChange={v => setFormData({...formData, endTime: v})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Güçlü Dersler" value={formData.strongSubjects} onChange={v => setFormData({...formData, strongSubjects: v})} />
            <Input label="Zayıf Dersler" value={formData.weakSubjects} onChange={v => setFormData({...formData, weakSubjects: v})} />
          </div>
          <Input label="Kaynaklar" value={formData.resources} onChange={v => setFormData({...formData, resources: v})} />
          
          <button 
            onClick={() => onSubmit(formData)}
            className="w-full py-4 bg-[#C17767] text-[#FDFBF7] text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity mt-8 font-bold"
          >
            Sistemi Başlat
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string, value: any, onChange: (v: string) => void, type?: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1 text-[#4A443C] dark:text-zinc-200">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full border-b border-[#EAE6DF] dark:border-zinc-800 py-2 focus:outline-none text-sm bg-transparent text-[#4A443C] dark:text-zinc-200 focus:border-[#C17767] transition-colors"
      />
    </div>
  );
}

function LogEntryWidget({ onSubmit, onCancel, track }: { onSubmit: (log: DailyLog) => void, onCancel: () => void, track: string }) {
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [subject, setSubject] = useState(Object.keys(TYT_SUBJECTS)[0]);
  const [topic, setTopic] = useState(TYT_SUBJECTS[Object.keys(TYT_SUBJECTS)[0] as keyof typeof TYT_SUBJECTS][0]);
  const [questions, setQuestions] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [empty, setEmpty] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [fatigue, setFatigue] = useState(5);
  const [tags, setTags] = useState('');

  const getAytSubjectsForTrack = () => {
    const all = AYT_SUBJECTS;
    if (track === 'Sayısal') return { 'Matematik': all['Matematik'], 'Fizik': all['Fizik'], 'Kimya': all['Kimya'], 'Biyoloji': all['Biyoloji'] };
    if (track === 'Eşit Ağırlık') return { 'Matematik': all['Matematik'], 'Edebiyat': all['Edebiyat'], 'Tarih': all['Tarih'], 'Coğrafya': all['Coğrafya'] };
    if (track === 'Sözel') return { 'Edebiyat': all['Edebiyat'], 'Tarih': all['Tarih'], 'Coğrafya': all['Coğrafya'], 'Felsefe Grubu': all['Felsefe Grubu'] };
    if (track === 'Dil') return { 'Yabancı Dil': all['Yabancı Dil'] };
    return all;
  };

  const currentSubjects = examType === 'TYT' ? TYT_SUBJECTS : getAytSubjectsForTrack();
  const currentTopics = currentSubjects[subject as keyof typeof currentSubjects] || [];

  // Update subject and topic when exam type changes
  useEffect(() => {
    const newSubject = Object.keys(currentSubjects)[0];
    if (newSubject) {
      setSubject(newSubject);
      setTopic(currentSubjects[newSubject as keyof typeof currentSubjects][0]);
    }
  }, [examType, track]);

  // Update topic when subject changes
  useEffect(() => {
    if (currentSubjects[subject as keyof typeof currentSubjects]) {
      setTopic(currentSubjects[subject as keyof typeof currentSubjects][0]);
    }
  }, [subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date: new Date().toISOString(),
      subject: `${examType} ${subject}`,
      topic,
      questions,
      correct,
      wrong,
      empty,
      avgTime,
      fatigue,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 mb-4 text-sm shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[#C17767] dark:text-rose-400 font-serif italic text-lg">Günlük Çalışma Logu</h4>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => {
              const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
              recognition.lang = 'tr-TR';
              recognition.start();
              recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                alert(`Algılanan Ses: "${transcript}"\n(Gerçek entegrasyon için NLP ile ayrıştırma gerekir)`);
                // Örnek doldurma
                setQuestions(40);
                setCorrect(35);
                setWrong(5);
                setAvgTime(45);
              };
              recognition.onerror = () => {
                alert("Ses algılanamadı. Lütfen mikrofon izinlerini kontrol edin.");
              };
            }}
            className="px-3 py-1 bg-[#C17767]/10 text-[#C17767] dark:text-rose-400 rounded text-xs font-bold uppercase tracking-widest hover:bg-[#C17767]/20 transition-colors flex items-center gap-1"
          >
            <Volume2 size={14} /> Sesli Log
          </button>
          <button 
            type="button"
            onClick={() => {
              alert("OCR Modülü (Simülasyon): Fotoğraf analiz ediliyor... (Gerçek entegrasyon için backend API gereklidir)");
              setQuestions(40);
              setCorrect(35);
              setWrong(4);
              setEmpty(1);
              setAvgTime(45);
            }}
            className="px-3 py-1 bg-[#EAE6DF] dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-200 rounded text-xs font-bold uppercase tracking-widest hover:bg-[#D5D0C5] dark:hover:bg-zinc-700 transition-colors"
          >
            Fotoğraftan Oku (OCR)
          </button>
          <button onClick={onCancel} className="text-[#4A443C] dark:text-zinc-200 opacity-50 hover:opacity-100"><X size={18} /></button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="flex items-center gap-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-4">
          <span className="text-[#C17767] dark:text-rose-400 font-bold w-8">Q:</span>
          <span className="text-[#8C857B] dark:text-zinc-400 flex-1">Hangi sınava çalıştın?</span>
          <div className="flex gap-2 w-1/2">
            <button type="button" onClick={() => setExamType('TYT')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${examType === 'TYT' ? 'bg-[#C17767] text-[#FDFBF7] border-[#C17767]' : 'border-[#EAE6DF] dark:border-zinc-800 text-[#4A443C] dark:text-zinc-200 hover:border-[#C17767]'}`}>TYT</button>
            <button type="button" onClick={() => setExamType('AYT')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${examType === 'AYT' ? 'bg-[#E09F3E] text-[#FDFBF7] border-[#E09F3E]' : 'border-[#EAE6DF] dark:border-zinc-800 text-[#4A443C] dark:text-zinc-200 hover:border-[#E09F3E]'}`}>AYT</button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-4">
          <span className="text-[#C17767] dark:text-rose-400 font-bold w-8">Q:</span>
          <span className="text-[#8C857B] dark:text-zinc-400 flex-1">Ders ve Konu nedir?</span>
          <div className="flex gap-2 w-1/2">
            <select value={subject} onChange={e => setSubject(e.target.value)} className="flex-1 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767]">
              {Object.keys(currentSubjects).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={topic} onChange={e => setTopic(e.target.value)} className="flex-1 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767]">
              {currentTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-4">
          <span className="text-[#C17767] dark:text-rose-400 font-bold w-8">Q:</span>
          <span className="text-[#8C857B] dark:text-zinc-400 flex-1">Soru Dağılımı (D/Y/B)? <span className="text-xs opacity-50">(Top: {questions})</span></span>
          <div className="flex gap-2 w-1/2">
            <input type="number" min="0" placeholder="D" value={correct || ''} onChange={e => { setCorrect(parseInt(e.target.value) || 0); setQuestions((parseInt(e.target.value) || 0) + wrong + empty); }} className="w-1/3 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-green-600 focus:outline-none focus:border-[#C17767] text-center font-bold" />
            <input type="number" min="0" placeholder="Y" value={wrong || ''} onChange={e => { setWrong(parseInt(e.target.value) || 0); setQuestions(correct + (parseInt(e.target.value) || 0) + empty); }} className="w-1/3 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-red-600 focus:outline-none focus:border-[#C17767] text-center font-bold" />
            <input type="number" min="0" placeholder="B" value={empty || ''} onChange={e => { setEmpty(parseInt(e.target.value) || 0); setQuestions(correct + wrong + (parseInt(e.target.value) || 0)); }} className="w-1/3 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-gray-500 focus:outline-none focus:border-[#C17767] text-center font-bold" />
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-4">
          <span className="text-[#C17767] dark:text-rose-400 font-bold w-8">Q:</span>
          <span className="text-[#8C857B] dark:text-zinc-400 flex-1">Toplam Süre (dk) ve Yorgunluk?</span>
          <div className="flex gap-4 w-1/2 items-center">
            <input type="number" min="0" placeholder="Süre (dk)" value={avgTime || ''} onChange={e => setAvgTime(parseInt(e.target.value) || 0)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] text-center" />
            <div className="w-1/2 flex items-center gap-2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2">
              <input type="range" min="1" max="10" value={fatigue} onChange={e => setFatigue(parseInt(e.target.value))} className="flex-1 accent-[#C17767]" />
              <span className="text-xs font-bold text-[#C17767] dark:text-rose-400 w-4 text-center">{fatigue}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pb-2">
          <span className="text-[#C17767] dark:text-rose-400 font-bold w-8">Q:</span>
          <span className="text-[#8C857B] dark:text-zinc-400 flex-1">Hata Etiketleri? <span className="text-xs opacity-50">(Örn: #KAVRAM, #DİKKAT)</span></span>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="#HESAP, #SÜRE" className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767]" />
        </div>

        <button type="submit" className="w-full py-3 bg-[#C17767] text-[#FDFBF7] font-bold rounded-xl hover:opacity-90 transition-opacity mt-4 tracking-widest uppercase text-xs">
          LOG KAYDET VE ANALİZ ET
        </button>
      </form>
    </div>
  );
}
function PushU() {
  const sendPush = () => {
    const messages = [
      "Zaman daralıyor, masaya dön!",
      "Hedefin seni bekliyor, pes etme.",
      "Bugün çözdüğün her soru seni 1 adım öne taşıyor.",
      "Rakiplerin çalışıyor, sen neredesin?"
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Boho Mentosluk', { body: msg });
    } else {
      alert(msg);
    }
  };

  return (
    <button 
      onClick={sendPush}
      className="flex items-center gap-2 px-4 py-2 bg-[#C17767]/10 text-[#C17767] dark:text-rose-400 border border-[#C17767] text-xs uppercase tracking-widest font-bold hover:bg-[#C17767] hover:text-[#FDFBF7] transition-colors"
    >
      <Smartphone size={16} />
      PushU
    </button>
  );
}

function ExamEntryModal({ isOpen, onClose, onSave, track }: { isOpen: boolean, onClose: () => void, onSave: (exam: ExamResult) => void, track: string }) {
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [scores, setScores] = useState<Record<string, { correct: number, wrong: number, net: number }>>({});
  
  if (!isOpen) return null;
  
  const tytSubjects = [
    { name: 'Türkçe', total: 40 },
    { name: 'Sosyal Bilimler', total: 20 },
    { name: 'Temel Matematik', total: 40 },
    { name: 'Fen Bilimleri', total: 20 }
  ];

  const aytSubjectsByTrack: Record<string, { name: string, total: number }[]> = {
    'Sayısal': [
      { name: 'Matematik', total: 40 },
      { name: 'Fizik', total: 14 },
      { name: 'Kimya', total: 13 },
      { name: 'Biyoloji', total: 13 }
    ],
    'Eşit Ağırlık': [
      { name: 'Matematik', total: 40 },
      { name: 'Edebiyat', total: 24 },
      { name: 'Tarih-1', total: 10 },
      { name: 'Coğrafya-1', total: 6 }
    ],
    'Sözel': [
      { name: 'Edebiyat', total: 24 },
      { name: 'Tarih-1', total: 10 },
      { name: 'Coğrafya-1', total: 6 },
      { name: 'Tarih-2', total: 11 },
      { name: 'Coğrafya-2', total: 11 },
      { name: 'Felsefe Grubu', total: 12 },
      { name: 'Din Kültürü', total: 6 }
    ],
    'Dil': [
      { name: 'Yabancı Dil', total: 80 }
    ]
  };

  const aytSubjects = aytSubjectsByTrack[track] || aytSubjectsByTrack['Sayısal'];

  const subjects = examType === 'TYT' ? tytSubjects : aytSubjects;

  const handleScoreChange = (subject: string, type: 'correct' | 'wrong', value: number) => {
    setScores(prev => {
      const current = prev[subject] || { correct: 0, wrong: 0, net: 0 };
      const updated = { ...current, [type]: value };
      updated.net = updated.correct - (updated.wrong * 0.25);
      return { ...prev, [subject]: updated };
    });
  };

  const calculateNet = (subject: string) => {
    const s = scores[subject] || { correct: 0, wrong: 0, net: 0 };
    return (s.correct - (s.wrong * 0.25)).toFixed(2);
  };

  const totalNet = subjects.reduce((acc, sub) => acc + parseFloat(calculateNet(sub.name)), 0).toFixed(2);

  const handleSave = () => {
    const exam: ExamResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: examType,
      totalNet: parseFloat(totalNet),
      scores
    };
    onSave(exam);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl"
      >
        <div className="flex justify-between items-center p-6 border-b border-[#EAE6DF] dark:border-zinc-800">
          <h2 className="font-serif italic text-2xl text-[#4A443C] dark:text-zinc-200">Deneme Neti Gir</h2>
          <button onClick={onClose} className="text-[#4A443C] dark:text-zinc-200 hover:text-[#C17767] dark:text-rose-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => { setExamType('TYT'); setScores({}); }}
              className={`flex-1 py-3 text-sm uppercase tracking-widest font-bold transition-colors ${examType === 'TYT' ? 'bg-[#C17767] text-[#FDFBF7]' : 'bg-[#F5F2EB] dark:bg-zinc-900 text-[#4A443C] dark:text-zinc-200 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 dark:bg-zinc-800'}`}
            >
              TYT
            </button>
            <button 
              onClick={() => { setExamType('AYT'); setScores({}); }}
              className={`flex-1 py-3 text-sm uppercase tracking-widest font-bold transition-colors ${examType === 'AYT' ? 'bg-[#C17767] text-[#FDFBF7]' : 'bg-[#F5F2EB] dark:bg-zinc-900 text-[#4A443C] dark:text-zinc-200 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 dark:bg-zinc-800'}`}
            >
              AYT
            </button>
          </div>

          <div className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#EAE6DF] dark:border-zinc-800 text-[10px] uppercase tracking-widest opacity-60">
              <div className="col-span-6">Ders</div>
              <div className="col-span-2 text-center">Doğru</div>
              <div className="col-span-2 text-center">Yanlış</div>
              <div className="col-span-2 text-right">Net</div>
            </div>
            
            <div className="divide-y divide-[#EAE6DF] dark:divide-zinc-800">
              {subjects.map(sub => (
                <div key={sub.name} className="grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-6 text-sm font-medium">
                    {sub.name} <span className="opacity-50 text-xs">({sub.total})</span>
                  </div>
                  <div className="col-span-2">
                    <select 
                      value={scores[sub.name]?.correct || 0}
                      onChange={(e) => handleScoreChange(sub.name, 'correct', parseInt(e.target.value))}
                      className="w-full bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-[#4A443C] dark:text-zinc-200 p-2 text-sm focus:outline-none focus:border-[#C17767]"
                    >
                      {Array.from({ length: sub.total + 1 }, (_, i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select 
                      value={scores[sub.name]?.wrong || 0}
                      onChange={(e) => handleScoreChange(sub.name, 'wrong', parseInt(e.target.value))}
                      className="w-full bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-[#4A443C] dark:text-zinc-200 p-2 text-sm focus:outline-none focus:border-[#C17767]"
                    >
                      {Array.from({ length: sub.total + 1 }, (_, i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 text-right font-mono text-[#C17767] dark:text-rose-400">
                    {calculateNet(sub.name)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-[#EAE6DF] dark:border-zinc-800 bg-[#FFFFFF] dark:bg-zinc-900 flex justify-between items-center">
              <span className="text-sm uppercase tracking-widest font-bold">Toplam Net</span>
              <span className="text-xl font-mono text-[#C17767] dark:text-rose-400 font-bold">{totalNet}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#EAE6DF] dark:border-zinc-800 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-xs uppercase tracking-widest hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors"
          >
            İptal
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-[#C17767] text-[#FDFBF7] text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
          >
            Kaydet
          </button>
        </div>
      </motion.div>
    </div>
  );
}
