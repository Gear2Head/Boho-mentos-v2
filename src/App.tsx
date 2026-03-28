/**
 * AMAÇ: YKS Mentörlük Sistemi v5.0 Ana Uygulama
 * MANTIK: Merkezi state (Zustand), Gelişmiş Zamanlayıcı (FocusTimer), Elo Sistemi, Profil, Quiz ve Modüler mimari
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  LayoutDashboard, UserCircle, BookOpen, MessageSquare, 
  Settings, CheckCircle2, AlertTriangle, Send, Loader2,
  Calendar, List, Archive, Plus, X, BrainCircuit, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { getCoachResponse } from './services/gemini';
import { TYT_SUBJECTS, AYT_SUBJECTS } from './constants';
import { useAppStore } from './store/appStore';
import type { 
  StudentProfile, DailyLog, ExamResult, FailedQuestion 
} from './types';

import { FocusTimer } from './components/FocusTimer';
import { EloRankCard } from './components/EloRankCard';
import { ThemeToggle } from './components/ThemeToggle';
import { MorningBlocker } from './components/MorningBlocker';
import { ProfileShowcase } from './components/ProfileShowcase';
import { QuizEngine } from './components/QuizEngine';
// Kapsam Dışı: import { SpotifyWidget } from './components/SpotifyWidget'; 

import { LogEntryWidget } from './components/forms/LogEntryWidget';
import { ExamEntryModal } from './components/forms/ExamEntryModal';
import { ProfileSettings } from './components/forms/ProfileSettings';
import { ExamDetailModal } from './components/ExamDetailModal';

// --- Helper ---

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
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors">
          <option value="">Tüm Dersler</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors">
          <option value="">Tüm Etiketler</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-lg mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-serif italic text-xl text-[#C17767] dark:text-rose-400">Mezarlığa Ekle</h3>
        <button onClick={onCancel} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><X size={16} className="text-[#4A443C] dark:text-zinc-200" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <select value={subject} onChange={e => setSubject(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200">
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" placeholder="Konu" value={topic} onChange={e => setTopic(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        <input type="text" placeholder="Kitap Adı" value={book} onChange={e => setBook(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        <div className="flex gap-2">
          <input type="text" placeholder="Sayfa" value={page} onChange={e => setPage(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
          <input type="text" placeholder="Soru No" value={questionNumber} onChange={e => setQuestionNumber(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        </div>
      </div>
      <textarea placeholder="Neden yanlış yaptın? (Örn: Formülü unuttum, işlem hatası)" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C17767] mb-4 h-20 resize-none text-[#4A443C] dark:text-zinc-200" />
      <button onClick={() => { if (subject && topic && book) onSubmit({ id: Date.now().toString(), date: new Date().toLocaleDateString('tr-TR'), subject, topic, book, page, questionNumber, reason }); }} className="w-full py-2 bg-[#C17767] text-[#FDFBF7] rounded-lg text-sm font-bold tracking-widest uppercase hover:bg-[#A56253] transition-colors">
        Kaydet
      </button>
    </motion.div>
  );
}

const markdownComponents = {
  p: ({node, ...props}: any) => <p className="leading-relaxed mb-4 text-[#4A443C] dark:text-zinc-200 text-base" {...props} />,
  li: ({node, ...props}: any) => <li className="mb-2 leading-relaxed" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 opacity-90" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 opacity-90" {...props} />,
  strong: ({node, ...props}: any) => <strong className="font-bold text-[#C17767] dark:text-rose-400" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-bold font-serif italic mt-6 mb-2 border-b border-[#EAE6DF] dark:border-zinc-800 pb-1" {...props} />,
};

// --- Main App ---

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'coach' | 'profile' | 'exams' | 'logs' | 'settings' | 'archive' | 'questions'>('dashboard');
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isLogWidgetOpen, setIsLogWidgetOpen] = useState(false);
  const [isArchiveWidgetOpen, setIsArchiveWidgetOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState(false); // Morning Blocker kilidi
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false); // Gizli Admin Paneli
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleLogSubmit = async (log: DailyLog) => {
    setIsLogWidgetOpen(false);
    const isPassive = log.fatigue >= 8;
    
    store.addLog(log);
    if (isPassive && !store.isPassiveMode) store.setPassiveMode(true);
    
    // Unlock Trophy
    if (store.logs.length >= 2 && !store.trophies.find(t=>t.id==='streak_3')?.unlockedAt) {
      store.unlockTrophy('streak_3');
    }
    
    const logMessage = `LOG GİRİŞİ:\nDers: ${log.subject}\nKonu: ${log.topic}\nSoru: ${log.questions} (D:${log.correct} Y:${log.wrong} B:${log.empty})\nToplam Süre: ${log.avgTime}dk\nYorgunluk: ${log.fatigue}/10\nHatalar: ${log.tags.join(', ') || 'Yok'}${isPassive ? '\nSİSTEM NOTU: Öğrencinin zihinsel yorgunluğu 8 veya üzerinde. Sistemi otomatik olarak PASİF MODA geçir. Sadece video izleme, formül okuma gibi yorucu olmayan görevler ver.' : ''}`;

    store.addChatMessage({ role: 'user', content: logMessage, timestamp: new Date().toISOString() });
    setIsTyping(true);

    const context = `Öğrenci Profili: ${JSON.stringify(store.profile)}\nYeni Log: ${JSON.stringify(log)}\nLütfen bu logu analiz et ve akşam değerlendirmesi yap.`;
    const response = await getCoachResponse("LOG ANALİZİ YAP", context, store.chatHistory);
    
    store.addChatMessage({ role: 'coach', content: response || "Log kaydedildi. İyi çalışmalar.", timestamp: new Date().toISOString() });
    setIsTyping(false);
  };

  const mathSpeedData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    
    const dayLogs = store.logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getDate() === d.getDate() && logDate.getMonth() === d.getMonth() && logDate.getFullYear() === d.getFullYear();
    }).filter(log => log.subject.includes('TYT Matematik'));

    const avgTime = dayLogs.length > 0 ? Math.round(dayLogs.reduce((acc, log) => acc + log.avgTime, 0) / dayLogs.length) : null;
    return { day: dateStr, actual: avgTime, target: 45 };
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [store.chatHistory]);

  const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string) => {
    e?.preventDefault();
    const userMsg = messageOverride || inputMessage;
    if (!userMsg.trim() || isTyping) return;
    if (userMsg.trim().toUpperCase() === 'LOG') {
      setIsLogWidgetOpen(true);
      if (!messageOverride) setInputMessage('');
      return;
    }
    if (!messageOverride) setInputMessage('');
    
    store.addChatMessage({ role: 'user', content: userMsg, timestamp: new Date().toISOString() });
    setIsTyping(true);

    const problemTyt = store.tytSubjects.filter(s => s.status === 'in-progress');
    const tytCtx = problemTyt.length > 0 ? problemTyt.map(s => `${s.subject}-${s.name}: ${s.status}`).join(', ') : "Eksik TYT konusu bulunmuyor.";
    
    const problemAyt = store.aytSubjects.filter(s => s.status === 'in-progress' && store.profile?.track && getAytSubjectsForTrack(store.profile.track).includes(s.subject));
    const aytCtx = problemAyt.length > 0 ? problemAyt.map(s => `${s.subject}-${s.name}: ${s.status}`).join(', ') : "Eksik AYT konusu bulunmuyor.";
    
    const logsCtx = store.logs.length > 0 ? JSON.stringify(store.logs.slice(-5)) : "Log girilmedi.";
    const examsCtx = store.exams.length > 0 ? JSON.stringify(store.exams.slice(-3)) : "Deneme girilmedi.";

    const context = `Öğrenci Profili: ${JSON.stringify(store.profile)}\nTYT İlerleyişi: ${tytCtx}\nAYT İlerleyişi: ${aytCtx}\nSon Loglar: ${logsCtx}\nSon Denemeler: ${examsCtx}`;
    
    const response = await getCoachResponse(userMsg, context, store.chatHistory);
    store.addChatMessage({ role: 'coach', content: response || "Üzgünüm, şu an yanıt veremiyorum.", timestamp: new Date().toISOString() });
    setIsTyping(false);
  };

  if (!store.profile) {
    return <ProfileSettings onSubmit={(p) => store.setProfile(p)} />;
  }

  // Morning Blocker (Sabah Sorusu Kilidi)
  if (store.isMorningBlockerEnabled && !unlockStatus) {
    return <MorningBlocker onUnlock={() => setUnlockStatus(true)} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FDFBF7] dark:bg-zinc-950 text-[#4A443C] dark:text-zinc-200 font-sans selection:bg-[#4A443C] selection:text-[#FDFBF7]">
      <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 border-t md:border-t-0 md:border-r border-[#EAE6DF] dark:border-zinc-800 flex flex-row md:flex-col bg-[#F5F2EB]/90 dark:bg-zinc-900/90 backdrop-blur-md md:backdrop-blur-none z-50">
        <div className="hidden md:block p-6 border-b border-[#EAE6DF] dark:border-zinc-800">
          <h1 className="font-serif italic text-xl font-bold tracking-tight text-[#C17767] dark:text-rose-400">Boho Mentosluk</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1 text-[#4A443C] dark:text-zinc-400">YKS Mentörlük v5</p>
          {store.isPassiveMode && (
            <div className="mt-4 px-3 py-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">PASİF MOD AKTİF</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-row md:flex-col py-2 md:py-4 justify-around md:justify-start overflow-x-auto md:overflow-visible no-scrollbar">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dash" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<BrainCircuit size={18} />} label="Sorular" active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} />
          <NavItem icon={<Calendar size={18} />} label="Analiz" active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} />
          <NavItem icon={<List size={18} />} label="Loglar" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={<Archive size={18} />} label="Mezarlık" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} />
          <NavItem icon={<BookOpen size={18} />} label="Müfredat" active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
          <NavItem icon={<MessageSquare size={18} />} label="Koç" active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} />
          <NavItem icon={<UserCircle size={18} />} label="Profil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <NavItem icon={<Settings size={18} />} label="Ayarlar" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
        <div 
          className="hidden md:block p-6 border-t border-[#EAE6DF] dark:border-zinc-800 text-[10px] opacity-20 hover:opacity-100 transition-opacity uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 cursor-pointer"
          onClick={() => setIsAdminPanelOpen(true)}
          title="Admin Panelini Aç"
        >
          © 2026 Kübra Architecture
        </div>
      </nav>

      <main className="flex-1 overflow-auto relative bg-[#FDFBF7] dark:bg-zinc-950 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-8 max-w-5xl mx-auto">
              <header className="mb-12 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-serif italic text-4xl text-[#4A443C] dark:text-zinc-200">Hoş geldin, {store.profile.name}</h2>
                  </div>
                  <div className="flex gap-4 text-xs uppercase tracking-widest opacity-60 text-[#4A443C] dark:text-zinc-400">
                    <span>TYT: {store.profile.tytTarget} Net</span><span>•</span><span>AYT: {store.profile.aytTarget} Net</span>
                  </div>
                </div>
                <div className="w-full md:w-auto flex flex-col items-end gap-4">
                  <div className="flex justify-end w-full">
                    {/* Spotify Widget buraya eklenebilir <SpotifyWidget /> */}
                  </div>
                  <FocusTimer />
                </div>
              </header>

              <div className="mb-12">
                <EloRankCard />
              </div>

              {(() => {
                const todayStr = new Date().toLocaleDateString('tr-TR');
                const todayLogs = store.logs.filter(l => l.date.includes(todayStr));
                const todayHours = (todayLogs.reduce((acc, log) => acc + log.avgTime, 0) / 60).toFixed(1);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatCard title="Tamamlanan" value={store.tytSubjects.filter(s => s.status === 'mastered').length + store.aytSubjects.filter(s => getAytSubjectsForTrack(store.profile!.track).includes(s.subject) && s.status === 'mastered').length} total={store.tytSubjects.length + store.aytSubjects.filter(s => getAytSubjectsForTrack(store.profile!.track).includes(s.subject)).length} icon={<CheckCircle2 className="text-[#C17767] dark:text-rose-400" />} />
                    <StatCard title="Günlük Çalışma" value={todayHours} total={store.profile.dailyGoalHours || store.profile.minHours} unit="Saat" icon={<Calendar className="text-blue-400" />} />
                    <StatCard title="Kritik Sorunlar" value={store.logs.filter(l => l.wrong > l.correct).length} unit="Aktif" icon={<AlertTriangle className="text-orange-500" />} />
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <section className="md:col-span-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-sm">
                  <h3 className="font-serif italic text-xl mb-4 border-b border-[#EAE6DF] dark:border-zinc-800 pb-2 uppercase tracking-tight text-[#C17767] dark:text-rose-400">Günün Direktifi</h3>
                  <div className="prose prose-invert prose-sm max-w-none">
                    {store.chatHistory.filter(m => m.role === 'coach').slice(-1)[0]?.content ? (
                      <div className="font-mono text-[15px] leading-8 text-[#4A443C] dark:text-zinc-200" style={{ letterSpacing: '0.3px', wordSpacing: '1px' }}>
                        <ReactMarkdown components={markdownComponents}>{store.chatHistory.filter(m => m.role === 'coach').slice(-1)[0].content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8 opacity-50 text-[#4A443C] dark:text-zinc-400">Henüz bir direktif yok. Koç ile konuşmaya başla.</div>
                    )}
                  </div>
                </section>

                <section className="border border-[#2A2A2A] rounded-xl bg-[#1A1A1A] p-6 shadow-sm flex flex-col">
                  <h3 className="font-serif italic text-xl mb-4 border-b border-[#2A2A2A] pb-2 uppercase tracking-tight text-[#C17767] flex items-center justify-between">
                    <span>Konu Borcu</span><span className="text-[10px] bg-red-900/30 text-red-500 border border-red-500/20 px-2 py-1 rounded font-bold uppercase tracking-widest">FAİZ İŞLİYOR</span>
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {store.logs.filter(l => l.fatigue > 7).length > 0 ? (
                      store.logs.filter(l => l.fatigue > 7).slice(-3).map((log, idx) => (
                        <div key={idx} className="p-3 bg-[#121212] border border-[#2A2A2A] rounded-lg">
                          <div className="flex justify-between items-start mb-1"><span className="font-bold text-xs text-zinc-300">{log.topic}</span><span className="text-xs font-mono text-red-500 font-bold">+{5 * (idx + 1)} Soru</span></div>
                          <p className="text-[10px] uppercase tracking-widest opacity-40 text-zinc-500">Ertelenme: {new Date(log.date).toLocaleDateString('tr-TR')}</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60"><CheckCircle2 size={32} className="mb-3 text-green-500/50" /><p className="text-xs uppercase tracking-widest font-bold">Borç Yok</p></div>
                    )}
                  </div>
                  {store.logs.filter(l => l.fatigue > 7).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#2A2A2A] text-center">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#C17767]">Toplam Faiz: <span className="font-bold text-base text-red-500">{store.logs.filter(l => l.fatigue > 7).slice(-3).reduce((acc, _, idx) => acc + (5 * (idx + 1)), 0)}</span> Soru</p>
                    </div>
                  )}
                </section>
              </div>

            </motion.div>
          )}

          {activeTab === 'questions' && (
            <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-8 w-full min-h-full">
               <QuizEngine />
            </motion.div>
          )}

          {activeTab === 'logs' && <div className="p-8 max-w-5xl mx-auto"><h2 className="font-serif italic text-4xl mb-8">Log Geçmişi</h2><LogHistory logs={store.logs} /></div>}

          {activeTab === 'exams' && (
            <motion.div key="exams" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 max-w-5xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <h2 className="font-serif italic text-4xl text-zinc-200">Deneme Analizi</h2>
                <button onClick={() => setIsExamModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C17767] text-[#FDFBF7] text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity rounded-xl shadow-lg shadow-[#C17767]/20"><Plus size={16} /> Yeni Deneme Gir</button>
              </div>
              <div className="grid grid-cols-1 gap-8">
                <div className="border border-[#2A2A2A] rounded-xl bg-[#1A1A1A] p-6 shadow-sm">
                  <h3 className="font-serif italic text-xl mb-6 uppercase tracking-tight text-zinc-300">Deneme Takvimi</h3>
                  {store.exams.length === 0 ? <p className="text-center opacity-40 text-xs text-zinc-500 font-bold uppercase tracking-widest">Henüz deneme girilmedi.</p> : store.exams.map(e => (
                    <div 
                       key={e.id} 
                       onClick={() => setSelectedExam(e)}
                       className="p-4 mb-3 border border-[#2A2A2A] rounded-xl bg-[#121212] flex justify-between items-center group hover:border-[#C17767]/50 transition-colors cursor-pointer"
                    >
                       <div>
                         <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] group-hover:text-[#E09F3E] transition-colors">{e.type} DENEMESİ</span>
                         <span className="block text-xs uppercase opacity-40 text-zinc-400 mt-1">{new Date(e.date).toLocaleDateString('tr-TR')}</span>
                       </div>
                       <div className="text-right">
                         <span className="font-serif italic text-2xl text-zinc-200">{e.totalNet.toFixed(2)} <span className="text-[10px] font-sans opacity-50 uppercase tracking-widest">NET</span></span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'subjects' && (
            <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 max-w-6xl mx-auto">
              <h2 className="font-serif italic text-4xl mb-8">Müfredat Haritası</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <SubjectList title="TYT Müfredatı" subjects={store.tytSubjects} onStatusChange={(idx, status) => store.updateTytSubject(idx, {status})} onNotesChange={(idx, notes) => store.updateTytSubject(idx, {notes})} />
                <SubjectList title="AYT Müfredatı" subjects={store.aytSubjects.filter(s => getAytSubjectsForTrack(store.profile!.track).includes(s.subject))} onStatusChange={(idx, status) => { const si = store.aytSubjects.findIndex(a => a.name === store.aytSubjects.filter(s => getAytSubjectsForTrack(store.profile!.track).includes(s.subject))[idx].name && a.subject === store.aytSubjects.filter(ss => getAytSubjectsForTrack(store.profile!.track).includes(ss.subject))[idx].subject); store.updateAytSubject(si, {status}); }} onNotesChange={(idx, notes) => { const si = store.aytSubjects.findIndex(a => a.name === store.aytSubjects.filter(s => getAytSubjectsForTrack(store.profile!.track).includes(s.subject))[idx].name); store.updateAytSubject(si, {notes}); }} />
              </div>
            </motion.div>
          )}

          {activeTab === 'coach' && (
            <motion.div key="coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
              <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
                {store.chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-2xl ${msg.role === 'user' ? 'bg-[#C17767] text-[#FDFBF7]' : 'bg-[#121212] border border-green-800/50 shadow-[0_0_15px_rgba(0,128,0,0.05)] text-zinc-300'}`}>
                      <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-3 border-b border-black/10 dark:border-white/10 pb-2">
                        {msg.role === 'user' ? `Öğrenci - ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'Koç Kübra'}
                      </div>
                      <div className="text-sm font-mono leading-relaxed opacity-90 tracking-wide"><ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown></div>
                    </div>
                  </div>
                ))}
                {isTyping && <div className="p-5 max-w-xs border border-green-800/50 rounded-2xl bg-[#121212] flex items-center gap-3"><Loader2 size={16} className="animate-spin text-green-500"/><span className="text-xs uppercase font-bold tracking-widest text-zinc-500">Kübra analiz ediyor...</span></div>}
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
              <header className="mb-8 flex justify-between items-end">
                <div><h2 className="font-serif italic text-3xl">Soru Bankası Mezarlığı</h2></div>
                <button onClick={() => setIsArchiveWidgetOpen(true)} className="px-4 py-2 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] flex gap-2 items-center"><Plus size={16} /> Yeni Ekle</button>
              </header>
              {isArchiveWidgetOpen && <ArchiveWidget subjects={Object.keys(TYT_SUBJECTS)} onCancel={() => setIsArchiveWidgetOpen(false)} onSubmit={(q) => { store.addFailedQuestion(q); setIsArchiveWidgetOpen(false); }} />}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {store.failedQuestions.map(q => (
                  <div key={q.id} className="bg-[#FFFFFF] dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-6 relative overflow-hidden shadow-sm"><div className="absolute top-0 left-0 w-1 h-full bg-[#C17767]"></div><h4 className="font-bold border-b pb-2 mb-2 border-zinc-200 dark:border-zinc-800">{q.topic}</h4><p className="text-xs opacity-80 mb-2">{q.book} - Sayfa: {q.page}</p><p className="bg-[#F5F2EB] dark:bg-zinc-950 p-2 text-xs italic opacity-80 rounded-md">"{q.reason}"</p></div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 max-w-3xl mx-auto space-y-12">
              <div>
                <h2 className="font-serif italic text-4xl mb-8">Ayarlar & Profil</h2>
                <div className="space-y-8">
                  <ProfileSection title="Görünüm Ayarları">
                    <div className="col-span-2 flex justify-between items-center">
                      <div><p className="text-[10px] uppercase opacity-40 mb-1 tracking-widest font-bold text-[#EAE6DF]">Tema (Mevcut Sabit)</p><p className="text-sm text-zinc-500 line-through">Arayüz temasını değiştir</p></div>
                      <button disabled className="opacity-50 cursor-not-allowed text-xs font-mono uppercase bg-black px-3 py-1 rounded border border-zinc-800">SADECE DARK-MODE</button>
                    </div>
                  </ProfileSection>

                  <ProfileSection title="Veri Yönetimi & Tehlİke Bölgesİ">
                      <div className="col-span-2 flex justify-between items-center bg-red-950/20 p-4 border border-red-900/50 rounded-xl">
                        <div><p className="text-[10px] uppercase text-red-500 mb-1 tracking-widest font-bold">Kalıcı Sıfırlama</p><p className="text-sm text-zinc-400">Tüm loglar, denemeler ve başarımlar kalıcı olarak silinir.</p></div>
                        <button onClick={() => { if (window.confirm('Verilerin SİLİNECEK! Hiçbir dönüşü yok. Emin misin?')) { store.resetStore(); window.location.reload(); } }} className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 text-xs tracking-widest font-bold uppercase rounded-xl hover:bg-red-600 hover:text-white transition-colors">SİSTEMİ SIFIRLA</button>
                      </div>
                  </ProfileSection>
                </div>
              </div>
              
              <div>
                <h3 className="font-serif italic text-2xl mb-4 text-[#C17767]">Profil Yönetimi</h3>
                <ProfileSettings onSubmit={(p) => store.setProfile(p)} initialData={store.profile} isEditMode={true} />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      <ExamEntryModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} track={store.profile!.track} onSave={(exam) => { store.addExam(exam); setIsExamModalOpen(false); store.unlockTrophy('first_blood'); }} />
      <ExamDetailModal isOpen={!!selectedExam} onClose={() => setSelectedExam(null)} exam={selectedExam} isAdmin={store.isDevMode} />
      <AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
    </div>
  );
}

// ----- MOCK UI FORMS ------
const NavItem = ({ icon, label, active, onClick }: any) => <button onClick={onClick} className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-4 px-2 md:px-6 py-2 md:py-4 transition-all rounded-lg md:rounded-none ${active ? 'bg-[#1A1A1A] text-[#C17767] border-r-4 border-[#C17767]' : 'text-[#8C857B] hover:bg-[#1A1A1A]/80'}`}> <div className={`p-2 rounded-full md:p-0 md:rounded-none`}>{icon}</div> <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold hidden md:inline">{label}</span></button>;
const StatCard = ({ title, value, total, unit, icon }: any) => <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm"><div className="flex justify-between items-start mb-4"><span className="text-[10px] uppercase opacity-50 tracking-widest font-bold text-zinc-400">{title}</span>{icon}</div><div className="flex items-baseline gap-2"><span className="text-4xl font-serif italic text-zinc-200">{value}</span>{total && <span className="text-xl opacity-40 text-zinc-500">/ {total}</span>}{unit && <span className="text-[10px] uppercase tracking-widest opacity-60 ml-1 text-zinc-500 font-bold">{unit}</span>}</div></div>;

const SubjectList = ({ title, subjects, onStatusChange, onNotesChange }: any) => {
  const grouped = subjects.reduce((acc: any, sub: any, idx: number) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push({ ...sub, originalIndex: idx });
    return acc;
  }, {});

  return (
    <div className="border border-[#2A2A2A] rounded-2xl bg-[#1A1A1A] overflow-hidden">
      <div className="p-5 border-b border-[#2A2A2A] bg-gradient-to-r from-red-950/10 to-transparent">
        <h3 className="font-serif italic text-xl text-[#C17767] font-bold tracking-wide">{title}</h3>
      </div>
      <div className="overflow-auto h-[600px] custom-scrollbar">
        {Object.entries(grouped).map(([groupName, groupSubjects]: [string, any]) => (
          <div key={groupName} className="mb-4">
            <div className="sticky top-0 bg-[#1A1A1A] z-10 px-5 py-2 border-b border-[#2A2A2A] border-t-4 border-t-transparent shadow-sm">
              <h4 className="font-serif italic text-sm text-[#C17767]/70 uppercase tracking-widest">{groupName}</h4>
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
                             className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all border ${sub.status === s.value ? s.color.replace('hover:','') : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                           >
                             {s.label}
                           </button>
                        ))}
                      </div>
                    </div>
                    <input 
                      type="text" placeholder="Bu konuyla ilgili stratejik notlar..." 
                      value={sub.notes} onChange={e=>onNotesChange(i, e.target.value)} 
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
const AdminPanelModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const store = useAppStore();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#FFFFFF] dark:bg-zinc-900 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative border-2 border-red-500/50">
        <button onClick={onClose} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20}/></button>
        <div className="flex items-center gap-3 mb-6 text-red-500 border-b border-red-500/20 pb-4">
          <ShieldAlert size={28} />
          <h2 className="font-mono text-xl font-bold tracking-widest uppercase">Geliştirici Modu</h2>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#F5F2EB] dark:bg-zinc-950 p-4 rounded-xl border border-[#EAE6DF] dark:border-zinc-800">
            <div>
              <p className="font-bold text-sm text-[#4A443C] dark:text-zinc-200">Geliştirici Özellikleri</p>
              <p className="text-[10px] opacity-60 uppercase tracking-widest mt-1 text-[#4A443C] dark:text-zinc-400">Deneme Silme ve Düzenleme</p>
            </div>
            <button 
              onClick={() => store.setDevMode(!store.isDevMode)}
              className={`relative w-12 h-6 flex items-center rounded-full p-1 transition-colors ${store.isDevMode ? 'bg-green-500' : 'bg-zinc-400 dark:bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${store.isDevMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-[#F5F2EB] dark:bg-zinc-950 p-4 rounded-xl border border-[#EAE6DF] dark:border-zinc-800">
            <div>
              <p className="font-bold text-sm text-[#4A443C] dark:text-zinc-200">Sabah Kilidi</p>
              <p className="text-[10px] opacity-60 uppercase tracking-widest mt-1 text-[#4A443C] dark:text-zinc-400">Sabah uyarısını kapat</p>
            </div>
            <button 
              onClick={() => store.setMorningBlockerEnabled(!store.isMorningBlockerEnabled)}
              className={`relative w-12 h-6 flex items-center rounded-full p-1 transition-colors ${store.isMorningBlockerEnabled ? 'bg-green-500' : 'bg-zinc-400 dark:bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${store.isMorningBlockerEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          
          <button 
            onClick={() => { store.addElo(500); alert('Müthiş Hile: 500 Puan Eklendi!'); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-900/30 text-blue-400 border border-blue-900/50 hover:bg-blue-900/50 text-xs font-bold tracking-widest uppercase rounded-xl transition-colors"
          >
            Hile: +500 Elo Puanı
          </button>
        </div>
      </div>
    </div>
  );
};

