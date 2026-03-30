import React from 'react';
import { Trophy, Star, Target, Crown, Zap, Flame, Award, BookOpen, Hexagon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store/appStore';
import { getRankDetails } from './EloRankCard';
import type { Trophy as TrophyType, ExamResult } from '../types';
import { findUniGoal } from '../data/uniGoals';

const ICON_MAP: Record<string, React.FC<any>> = {
  Trophy, Star, Crown, Zap, Flame, Award, Target, BookOpen, Hexagon
};

export function ProfileShowcase() {
  const store = useAppStore();
  const profile = store.profile;
  const rank = getRankDetails(store.eloScore);
  const RankIcon = ICON_MAP[rank.iconName] || Trophy;

  if (!profile) return null;

  const tytMastered = store.tytSubjects.filter(s => s.status === 'mastered').length;
  const tytTotal = store.tytSubjects.length;
  
  const aytSubjectsForTrack = store.aytSubjects.filter(s => {
    if (profile.track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'].includes(s.subject);
    if (profile.track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'].includes(s.subject);
    if (profile.track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'].includes(s.subject);
    if (profile.track === 'Dil') return ['Yabancı Dil'].includes(s.subject);
    return true;
  });
  
  const aytMastered = aytSubjectsForTrack.filter(s => s.status === 'mastered').length;
  const aytTotal = aytSubjectsForTrack.length;

  const tytData = [
    { name: 'Biten', value: tytMastered, color: '#C17767' },
    { name: 'Kalan', value: tytTotal - tytMastered, color: '#EAE6DF' }
  ];

  const aytData = [
    { name: 'Biten', value: aytMastered, color: '#E09F3E' },
    { name: 'Kalan', value: aytTotal - aytMastered, color: '#EAE6DF' }
  ];

  const tytExams = store.exams.filter((e: ExamResult) => e.type === 'TYT');
  const aytExams = store.exams.filter((e: ExamResult) => e.type === 'AYT');
  const lastTyt = tytExams.length > 0 ? tytExams[tytExams.length - 1].totalNet : 0;
  const lastAyt = aytExams.length > 0 ? aytExams[aytExams.length - 1].totalNet : 0;

  const targetGoalTyt = findUniGoal(profile.targetUniversity, profile.targetMajor, 'TYT');
  const targetGoalAyt = findUniGoal(profile.targetUniversity, profile.targetMajor, 'AYT');

  const tytProgress = targetGoalTyt ? Math.min(100, Math.round((lastTyt / targetGoalTyt.lastEntrantNet) * 100)) : Math.min(100, Math.round((lastTyt / profile.tytTarget) * 100));
  const aytProgress = targetGoalAyt ? Math.min(100, Math.round((lastAyt / targetGoalAyt.lastEntrantNet) * 100)) : Math.min(100, Math.round((lastAyt / profile.aytTarget) * 100));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header & Lig Kartı */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#C17767]/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          <div className={`w-32 h-32 rounded-3xl bg-[#121212] flex flex-col items-center justify-center border border-[#2A2A2A] shadow-inner ${rank.color}`}>
            <RankIcon size={48} strokeWidth={1.5} />
            <span className="font-serif italic font-bold mt-2 tracking-widest uppercase text-xs opacity-90">{rank.title}</span>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="font-serif italic text-4xl text-zinc-200 mb-2">{profile.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold uppercase tracking-widest text-[#C17767]/70">
              <span className="bg-[#121212] border border-[#2A2A2A] px-3 py-1 rounded-full">{profile.track}</span>
              {profile.examYear && <span className="bg-[#121212] border border-[#2A2A2A] px-3 py-1 rounded-full text-zinc-300">🎯 YKS {profile.examYear}</span>}
              <span className="bg-[#C17767]/10 text-[#C17767] px-3 py-1 rounded-full border border-[#C17767]/20">🔥 {store.streakDays} GÜN SERİ</span>
              <span className="bg-[#121212] border border-[#2A2A2A] px-3 py-1 rounded-full text-blue-400">🏅 {store.eloScore} Puan</span>
            </div>
            
            {profile.motivationQuote && (
              <p className="mt-4 text-lg italic font-serif border-l-2 border-[#C17767] pl-4 py-1 text-zinc-400">
                "{profile.motivationQuote}"
              </p>
            )}

            <p className={`text-sm italic opacity-80 leading-relaxed max-w-xl text-zinc-300 ${profile.motivationQuote ? 'mt-3' : 'mt-6'}`}>
              Hedef: <strong className="text-[#C17767]">{profile.targetUniversity}</strong> – {profile.targetMajor}. 
              Minimum günlük {profile.dailyGoalHours} saatlik çalışma temposu benimsendi.
            </p>
          </div>
        </div>
      </div>

      {/* YÖK Atlas Hedef Progress (Faz 5) */}
      <div className="bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Target size={24} className="text-[#C17767]" />
          <div>
            <h3 className="font-serif italic text-xl text-zinc-200">Hedef İlerlemesi</h3>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold max-w-full truncate">
              {profile.targetUniversity} • {profile.targetMajor}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">TYT — Temel Yeterlilik</span>
              <span className="text-sm font-mono font-bold text-[#C17767]">{lastTyt} / {targetGoalTyt?.lastEntrantNet || profile.tytTarget}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#C17767] transition-all duration-1000" style={{ width: `${tytProgress}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">AYT — Alan Yeterlilik</span>
              <span className="text-sm font-mono font-bold text-[#E09F3E]">{lastAyt} / {targetGoalAyt?.lastEntrantNet || profile.aytTarget}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#E09F3E] transition-all duration-1000" style={{ width: `${aytProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Dairesel Progressler */}
        <div className="md:col-span-1 border border-[#2A2A2A] bg-[#1A1A1A] rounded-3xl p-6 flex flex-col items-center shadow-sm">
          <h3 className="font-serif italic text-xl mb-6 text-[#C17767] uppercase tracking-widest w-full border-b border-[#2A2A2A] pb-2">Mastery Oranı</h3>
          <div className="w-full h-40 relative">
            <div style={{ width: '100%', height: '100%', minHeight: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tytData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    {tytData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#121212', borderRadius: '8px', border: '1px solid #2A2A2A', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-[#C17767]">{Math.round((tytMastered / (tytTotal || 1)) * 100)}%</span>
              <span className="text-[10px] opacity-50 uppercase tracking-widest font-bold text-zinc-400">TYT</span>
            </div>
          </div>
          <div className="w-full h-40 relative mt-4">
            <div style={{ width: '100%', height: '100%', minHeight: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={aytData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    {aytData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#121212', borderRadius: '8px', border: '1px solid #2A2A2A', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-[#E09F3E]">{Math.round((aytMastered / (aytTotal || 1)) * 100)}%</span>
              <span className="text-[10px] opacity-50 uppercase tracking-widest font-bold text-zinc-400">AYT</span>
            </div>
          </div>
        </div>

        {/* Trophies (Başarımlar) Vitrini */}
        <div className="md:col-span-2 border border-[#2A2A2A] bg-[#1A1A1A] rounded-3xl p-6 shadow-sm">
          <h3 className="font-serif italic text-xl mb-6 text-[#C17767] uppercase tracking-widest border-b border-[#2A2A2A] pb-2">Başarımlar Kupası</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {store.trophies.map((trophy) => {
              const Icon = ICON_MAP[trophy.icon] || Trophy;
              const isUnlocked = !!trophy.unlockedAt;
              
              return (
                <div key={trophy.id} className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-300 ${isUnlocked ? 'bg-[#121212] border-[#C17767]/30 shadow-sm' : 'bg-[#121212]/50 border-[#2A2A2A] opacity-60 grayscale'}`}>
                  {isUnlocked && <div className="absolute top-0 right-0 w-8 h-8 bg-[#C17767] rotate-45 transform translate-x-4 -translate-y-4" />}
                  <Icon size={24} className={`mb-3 ${isUnlocked ? 'text-[#C17767]' : 'text-zinc-600'}`} />
                  <h4 className={`text-sm font-bold mb-1 ${isUnlocked ? 'text-zinc-200' : 'text-zinc-500'}`}>{trophy.title}</h4>
                  <p className="text-[10px] leading-relaxed opacity-80 text-zinc-400">{trophy.description}</p>
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
    </div>
  );
}
