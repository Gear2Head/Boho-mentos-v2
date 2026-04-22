import React from 'react';
import { Trophy, Star, Target, Crown, Zap, Flame, Award, BookOpen, Hexagon, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store/appStore';
import { getRankDetails } from './EloRankCard';
import type { Trophy as TrophyType, ExamResult, AtlasProgram } from '../types';
import { AtlasExplorer } from './AtlasExplorer';
import { HabitAuditPanel } from './HabitAuditPanel';
import { GlobalHeatmap } from './GlobalHeatmap';
import { AnimatePresence } from 'motion/react';

const ICON_MAP: Record<string, React.FC<any>> = {
  Trophy, Star, Crown, Zap, Flame, Award, Target, BookOpen, Hexagon
};

export function ProfileShowcase() {
  const profile = useAppStore(s => s.profile);
  const eloScore = useAppStore(s => s.eloScore);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const exams = useAppStore(s => s.exams);
  const streakDays = useAppStore(s => s.streakDays);
  const trophies = useAppStore(s => s.trophies);
  const removeTargetGoal = useAppStore(s => s.removeTargetGoal);

  const [isExplorerOpen, setIsExplorerOpen] = React.useState(false);
  const rank = getRankDetails(eloScore);
  const RankIcon = ICON_MAP[rank.iconName] || Trophy;

  if (!profile) return null;

  const tytMastered = tytSubjects.filter(s => s.status === 'mastered').length;
  const tytTotal = tytSubjects.length;
  
  const aytSubjectsForTrack = aytSubjects.filter(s => {
    if (profile.track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'].includes(s.subject);
    if (profile.track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'].includes(s.subject);
    if (profile.track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'].includes(s.subject);
    if (profile.track === 'Dil') return ['Yabancı Dil'].includes(s.subject);
    return true;
  });
  
  const aytMastered = aytSubjectsForTrack.filter(s => s.status === 'mastered').length;
  const aytTotal = aytSubjectsForTrack.length;

  const tytData = [
    { name: 'Biten', value: tytMastered, color: 'var(--color-accent)' },
    { name: 'Kalan', value: tytTotal - tytMastered, color: 'var(--color-surface-2)' }
  ];

  const aytData = [
    { name: 'Biten', value: aytMastered, color: '#E09F3E' },
    { name: 'Kalan', value: aytTotal - aytMastered, color: 'var(--color-surface-2)' }
  ];

  const tytExams = exams.filter((e: ExamResult) => e.type === 'TYT');
  const aytExams = exams.filter((e: ExamResult) => e.type === 'AYT');
  const lastTyt = tytExams.length > 0 ? tytExams[tytExams.length - 1].totalNet : 0;
  const lastAyt = aytExams.length > 0 ? aytExams[aytExams.length - 1].totalNet : 0;

  const targetGoals = profile.targetGoals || [];
  const primaryGoal = targetGoals[0];


  const tytProgress = Math.min(100, Math.round((lastTyt / (profile.tytTarget || 120)) * 100));
  const aytProgress = Math.min(100, Math.round((lastAyt / (profile.aytTarget || 80)) * 100));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      {/* Header & Lig Kartı */}
      <div className="bg-surface border border-app rounded-3xl p-5 md:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start relative z-10">
          {/* Avatar veya Rank İkonu */}
          {profile.avatar ? (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-2 border-accent/40 shadow-xl shadow-accent/10 shrink-0">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-surface-2 flex flex-col items-center justify-center border border-app shadow-inner shrink-0 ${rank.color}`}>
              <RankIcon size={32} className="md:w-12 md:h-12" strokeWidth={1.5} />
              <span className="font-serif italic font-black mt-2 tracking-widest uppercase text-[10px] md:text-xs opacity-90">{rank.title}</span>
            </div>
          )}

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h2 className="font-serif italic text-4xl text-ink">{profile.name}</h2>
              {profile.avatar && (
                <span className={`self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase ${rank.color} border-current/30 bg-current/5 shadow-sm`}>
                  <RankIcon size={12} /> {rank.title}
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <span className="bg-surface-2 border border-app px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest text-ink font-black shadow-sm">{profile.track}</span>
              {profile.examYear && <span className="bg-surface-2 border border-app px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest text-ink font-black shadow-sm">🎯 YKS {profile.examYear}</span>}
              <span className="bg-accent/10 text-accent px-3 py-1.5 rounded-full border border-accent/20 text-[9px] uppercase tracking-widest font-black shadow-sm">🔥 {streakDays} GÜN SERİ</span>
              <span className="bg-surface-2 border border-app px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest text-blue-500 font-black shadow-sm">🏅 {eloScore} PUAN</span>
            </div>

            {profile.motivationQuote && (
              <p className="mt-4 text-lg italic font-serif border-l-2 border-accent pl-4 py-1 text-ink-muted">
                "{profile.motivationQuote}"
              </p>
            )}

            <p className={`text-sm italic font-medium opacity-80 leading-relaxed max-w-xl text-ink-muted ${profile.motivationQuote ? 'mt-3' : 'mt-6'}`}>
              Hedef: <strong className="text-accent">{profile.targetUniversity}</strong> – {profile.targetMajor}.
              Minimum günlük {profile.dailyGoalHours} saatlik çalışma temposu benimsendi.
            </p>
          </div>
        </div>
      </div>

      {/* YÖK Atlas Hedef Progress (Faz 5) - Real Data Fix */}
      <div className="bg-surface border border-app rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Target size={24} className="text-accent" />
          <div>
            <h3 className="font-serif italic text-xl text-ink">Hedef İlerlemesi</h3>
            <p className="text-[10px] uppercase tracking-widest text-ink-muted font-black max-w-full truncate">
              {primaryGoal ? `${primaryGoal.universityName} • ${primaryGoal.programName}` : `${profile.targetUniversity} • ${profile.targetMajor}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] uppercase font-black tracking-widest text-ink-muted">TYT — Temel Yeterlilik</span>
              <span className="text-sm font-mono font-bold text-accent">{lastTyt} / 120</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden border border-app">
              <div className="h-full bg-accent shadow-[0_0_8px_var(--color-accent)] transition-all duration-1000" style={{ width: `${tytProgress}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] uppercase font-black tracking-widest text-ink-muted">AYT — Alan Yeterlilik</span>
              <span className="text-sm font-mono font-bold text-[#E09F3E]">{lastAyt} / 80</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden border border-app">
              <div className="h-full bg-[#E09F3E] shadow-[0_0_8px_rgba(224,159,62,0.3)] transition-all duration-1000" style={{ width: `${aytProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-app rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif italic text-xl text-ink">YÖK Atlas Hedef Listesi</h3>
          <button 
            className="text-[9px] font-black uppercase tracking-widest text-accent border border-accent/30 px-3 py-1.5 rounded-xl hover:bg-accent/10 transition-all shadow-sm"
            onClick={() => setIsExplorerOpen(true)}
            aria-label="YÖK Atlas'tan Yeni Hedef Ekle"
          >
            YENİ HEDEF EKLE
          </button>
        </div>
        
        {targetGoals.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-app rounded-2xl">
            <p className="text-sm text-ink-muted mb-4 tracking-wide italic font-medium">Henüz YÖK Atlas üzerinden bir hedef eklemedin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targetGoals.map((item) => {
              const currentNet = item.scoreType === 'TYT' ? lastTyt.toFixed(1) : lastAyt.toFixed(1);
              const hasRank = item.successRank && item.successRank > 0;
              
              return (
                <div key={item.id} className="rounded-2xl border border-app bg-surface-2 p-5 hover:border-accent/50 transition-all group relative shadow-sm">
                  <button 
                    onClick={() => removeTargetGoal(item.id)}
                    className="absolute top-4 right-4 p-1 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                    aria-label={`${item.programName} Hedefini Kaldır`}
                  >
                    <X size={12} />
                  </button>
                  <div className="text-[9px] uppercase tracking-widest text-[#E09F3E] font-black mb-1">{item.scoreType} Puan Türü • YÖK {item.year || 2023}</div>
                  <div className="text-sm font-black text-ink leading-tight mb-0.5">{item.universityName}</div>
                  <div className="text-[11px] text-accent font-serif italic mb-4">{item.programName}</div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-app">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Sıralama</span>
                      <span className="text-sm font-mono text-zinc-200">#{hasRank ? new Intl.NumberFormat('tr-TR').format(item.successRank!) : '---'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">TYT/AYT Hedef</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-green-400">{item.tytNet || '—'}</span>
                        <span className="text-[10px] opacity-30">/</span>
                        <span className="text-sm font-mono text-blue-400">{item.aytNet || '—'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-app">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                      <span className="text-accent opacity-80">Mevcut Durum:</span>
                      <span className="text-accent font-mono">{currentNet} Net</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Dairesel Progressler */}
        <div className="md:col-span-1 border border-app bg-surface rounded-3xl p-6 flex flex-col items-center shadow-sm">
          <h3 className="font-serif italic text-xl mb-6 text-accent uppercase tracking-widest w-full border-b border-app pb-2 font-black">Mastery Oranı</h3>
          <div className="w-full h-[160px] relative">
            <ResponsiveContainer width="100%" height={160} minHeight={160}>
              <PieChart>
                <Pie data={tytData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                  {tytData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-ink)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '900' }} itemStyle={{ color: 'var(--color-ink)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-accent tracking-tighter">{Math.round((tytMastered / (tytTotal || 1)) * 100)}%</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-ink-muted">TYT</span>
            </div>
          </div>
          <div className="w-full h-[160px] relative mt-4">
            <ResponsiveContainer width="100%" height={160} minHeight={160}>
              <PieChart>
                <Pie data={aytData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                  {aytData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#121212', borderRadius: '8px', border: '1px solid #2A2A2A', color: '#fff' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-[#E09F3E] tracking-tighter">{Math.round((aytMastered / (aytTotal || 1)) * 100)}%</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-ink-muted">AYT</span>
            </div>
          </div>
        </div>

        {/* Trophies (Başarımlar) Vitrini */}
        <div className="md:col-span-2 border border-app bg-surface rounded-3xl p-6 shadow-sm">
          <h3 className="font-serif italic text-xl mb-6 text-accent uppercase tracking-widest border-b border-app pb-2 font-black">Başarımlar Kupası</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {trophies.map((trophy) => {
              const Icon = ICON_MAP[trophy.icon] || Trophy;
              const isUnlocked = !!trophy.unlockedAt;
              
              return (
                <div key={trophy.id} className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-300 ${isUnlocked ? 'bg-surface border-accent/20 shadow-sm' : 'bg-surface-2 border-app opacity-60 grayscale'}`}>
                  {isUnlocked && <div className="absolute top-0 right-0 w-8 h-8 bg-accent rotate-45 transform translate-x-4 -translate-y-4" />}
                  <Icon size={24} className={`mb-3 shrink-0 ${isUnlocked ? 'text-accent' : 'text-ink-muted'}`} />
                  <h4 className={`text-sm font-black mb-1 uppercase tracking-tight ${isUnlocked ? 'text-ink' : 'text-ink-muted'}`}>{trophy.title}</h4>
                  <p className="text-[10px] leading-relaxed font-medium text-ink-muted">{trophy.description}</p>
                  {isUnlocked && (
                    <span className="block mt-2 text-[8px] uppercase tracking-widest opacity-40 font-mono text-zinc-300">
                      {new Date(trophy.unlockedAt!).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      <div className="mt-8 mb-8">
        <GlobalHeatmap />
      </div>

      <HabitAuditPanel />

      <AnimatePresence>
        {isExplorerOpen && (
          <AtlasExplorer onClose={() => setIsExplorerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
