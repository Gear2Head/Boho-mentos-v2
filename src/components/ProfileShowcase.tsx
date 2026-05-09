import React, { useMemo } from 'react';
import { Trophy, Star, Target, Crown, Zap, Flame, Award, BookOpen, Hexagon, X, Shield, Settings, RefreshCw, ChevronDown, ChevronUp, Package, Coins, BarChart3, BrainCircuit, Palette, Gem, Timer, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Tooltip as RechartsTooltip } from 'recharts';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { getRankDetails } from './EloRankCard';
import { isOwnerEmail } from '../config/owner';
import type { Trophy as TrophyType, ExamResult, AtlasProgram } from '../types';
import { AtlasExplorer } from './AtlasExplorer';
import { HabitAuditPanel } from './HabitAuditPanel';
import { GlobalHeatmap } from './GlobalHeatmap';
import { AnimatePresence, motion } from 'motion/react';
import { ALL_SHOP_ITEMS } from '../types/economy';
import type { BoostKey } from '../types/economy';
import { ProfileWall } from './ProfileWall';
import { CommunityGoalBanner } from './CommunityGoalBanner';
import { InventorySummaryCard } from './ActiveBoostStrip';

const ICON_MAP: Record<string, React.FC<any>> = {
  Trophy, Star, Crown, Zap, Flame, Award, Target, BookOpen, Hexagon, Shield, Package, Coins, BarChart3, BrainCircuit, Palette, Gem, Timer, Sparkles
};

const RARITY_COLOR: Record<string, string> = {
  common: '#94a3b8',
  rare: '#38bdf8',
  epic: '#a855f7',
  legendary: '#f59e0b',
  mythic: '#ec4899',
  cosmic: '#8b5cf6',
};

export function ProfileShowcase({ isPublic, targetUid }: { isPublic?: boolean; targetUid?: string }) {
  const navigate = useNavigate();
  const { authUser, profile: myProfile, eloScore: myElo, exams: myExams, streakDays: myStreak, trophies: myTrophies, tytSubjects: myTyt, aytSubjects: myAyt, removeTargetGoal, recomputeFullElo, inventory: myInventory } = useAppStore(useShallow(s => ({
    authUser: s.authUser,
    profile: s.profile,
    eloScore: s.eloScore,
    tytSubjects: s.tytSubjects,
    aytSubjects: s.aytSubjects,
    exams: s.exams,
    streakDays: s.streakDays,
    trophies: s.trophies,
    removeTargetGoal: s.removeTargetGoal,
    recomputeFullElo: s.recomputeFullElo,
    inventory: s.inventory
  })));

  const [publicData, setPublicData] = React.useState<any>(null);
  const [isPublicLoading, setIsPublicLoading] = React.useState(isPublic);

  React.useEffect(() => {
    if (isPublic && targetUid) {
      import('firebase/firestore').then(({ doc, getDoc }) => {
        const { db } = require('../services/firebase');
        getDoc(doc(db, 'publicProfiles', targetUid)).then((snap: any) => {
          if (snap.exists()) setPublicData(snap.data());
          setIsPublicLoading(false);
        });
      });
    }
  }, [isPublic, targetUid]);

  const profile = isPublic ? publicData?.profile : myProfile;
  const eloScore = isPublic ? (publicData?.eloScore || 0) : myElo;
  const exams = isPublic ? (publicData?.exams || []) : myExams;
  const streakDays = isPublic ? (publicData?.streakDays || 0) : myStreak;
  const trophies = isPublic ? (publicData?.trophies || []) : myTrophies;
  const inventory = isPublic ? publicData?.inventory : myInventory;
  const tytSubjects = isPublic ? (publicData?.tytSubjects || []) : myTyt;
  const aytSubjects = isPublic ? (publicData?.aytSubjects || []) : myAyt;

  const [isExplorerOpen, setIsExplorerOpen] = React.useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = React.useState(false);
  const [achievementPanel, setAchievementPanel] = React.useState<'all' | 'unlocked' | 'locked'>('all');
  const { equipInventoryItem, activateInventoryBoost } = useAppStore(useShallow(s => ({
    equipInventoryItem: s.equipInventoryItem,
    activateInventoryBoost: s.activateInventoryBoost,
  })));

  const tytMastered = tytSubjects.filter(s => s.status === 'mastered').length;
  const tytTotal = tytSubjects.length;
  
  const aytSubjectsForTrack = aytSubjects.filter(s => {
    if (profile?.track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'].includes(s.subject);
    if (profile?.track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'].includes(s.subject);
    if (profile?.track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'].includes(s.subject);
    if (profile?.track === 'Dil') return ['Yabancı Dil'].includes(s.subject);
    return true;
  });
  
  const aytMastered = aytSubjectsForTrack.filter(s => s.status === 'mastered').length;
  const aytTotal = aytSubjectsForTrack.length;

  // STABLE-HOOKS-FIX: Always exactly 2 entries so Recharts v3 internal hook count stays constant
  const tytData = useMemo(() => [
    { name: 'Biten', value: tytTotal > 0 ? tytMastered : 0, fill: 'var(--color-accent)' },
    { name: 'Kalan', value: tytTotal > 0 ? Math.max(0, tytTotal - tytMastered) : 1, fill: 'var(--color-surface-2)' }
  ], [tytMastered, tytTotal]);

  const aytData = useMemo(() => [
    { name: 'Biten', value: aytTotal > 0 ? aytMastered : 0, fill: '#E09F3E' },
    { name: 'Kalan', value: aytTotal > 0 ? Math.max(0, aytTotal - aytMastered) : 1, fill: 'var(--color-surface-2)' }
  ], [aytMastered, aytTotal]);

  if (isPublicLoading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-accent" /></div>;
  if (!profile) return null;

  const rank = getRankDetails(eloScore);
  const RankIcon = ICON_MAP[rank.iconName] || Trophy;
  const canOpenAdmin = isOwnerEmail(authUser?.email) || (profile as any)?.role === 'super_admin';
  const activeFrameDef = inventory?.activeFrame ? ALL_SHOP_ITEMS.find(i => i.id === inventory.activeFrame) : null;
  const activeTitleDef = inventory?.activeTitle ? ALL_SHOP_ITEMS.find(i => i.id === inventory.activeTitle) : null;
  const activeFrameColor = activeFrameDef ? RARITY_COLOR[activeFrameDef.rarity] : undefined;
  const activeTitleColor = activeTitleDef ? RARITY_COLOR[activeTitleDef.rarity] : undefined;



  const tytExams = exams.filter((e: ExamResult) => e.type === 'TYT');
  const aytExams = exams.filter((e: ExamResult) => e.type === 'AYT');
  const lastTyt = tytExams.length > 0 ? tytExams[tytExams.length - 1].totalNet : 0;
  const lastAyt = aytExams.length > 0 ? aytExams[aytExams.length - 1].totalNet : 0;

  const targetGoals = profile.targetGoals || [];
  const primaryGoal = targetGoals[0];


  const tytProgress = Math.min(100, Math.round((lastTyt / (profile.tytTarget || 120)) * 100));
  const aytProgress = Math.min(100, Math.round((lastAyt / (profile.aytTarget || 80)) * 100));
  const unlockedTrophies = trophies.filter((trophy) => trophy.unlockedAt);
  const lockedTrophies = trophies.filter((trophy) => !trophy.unlockedAt);
  const visibleTrophies = achievementPanel === 'unlocked'
    ? unlockedTrophies
    : achievementPanel === 'locked'
      ? lockedTrophies
      : trophies;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      {/* Header & Lig Kartı */}
      <div className="bg-surface border border-app rounded-3xl p-5 md:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start relative z-10">
          {/* Avatar veya Rank İkonu */}
          <div
            className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-2 border-accent/40 shadow-xl shadow-accent/10 shrink-0 bg-surface-2"
            style={activeFrameColor ? { borderColor: activeFrameColor, boxShadow: `0 0 34px ${activeFrameColor}55` } : undefined}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile.name}`} alt="P" className="w-full h-full bg-surface" />
            )}
            {canOpenAdmin && (
              <button 
                onClick={() => navigate('/admin_dashboard')}
                className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white"
              >
                <Shield size={14} /> Dev Console
              </button>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h2 className="font-serif italic text-4xl text-ink">{profile.name}</h2>
              {activeTitleDef && (
                <span
                  className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase bg-current/5 shadow-sm"
                  style={{ color: activeTitleColor, borderColor: `${activeTitleColor}55` }}
                >
                  {activeTitleDef.name}
                </span>
              )}
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
              <div className="flex items-center gap-1 group">
                <span className="bg-surface-2 border border-app px-3 py-1.5 rounded-l-full text-[9px] uppercase tracking-widest text-blue-500 font-black shadow-sm group-hover:border-blue-500/30 transition-all">🏅 {eloScore} PUAN</span>
                <button 
                  onClick={() => recomputeFullElo()}
                  className="bg-surface-2 border border-app border-l-0 px-2 py-1.5 rounded-r-full text-zinc-500 hover:text-blue-500 hover:bg-blue-500/5 transition-all shadow-sm"
                  title="Verileri Yeniden Hesapla"
                >
                  <RefreshCw size={10} />
                </button>
              </div>
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
          <div className="w-full h-[160px] min-w-0 relative flex justify-center">
              <PieChart width={160} height={160}>
                <Pie data={tytData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-ink)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '900' }} itemStyle={{ color: 'var(--color-ink)' }} />
              </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-accent tracking-tighter">{Math.round((tytMastered / (tytTotal || 1)) * 100)}%</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-ink-muted">TYT</span>
            </div>
          </div>
          <div className="w-full h-[160px] min-w-0 relative mt-4 flex justify-center">
              <PieChart width={160} height={160}>
                <Pie data={aytData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#121212', borderRadius: '8px', border: '1px solid #2A2A2A', color: '#fff' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-[#E09F3E] tracking-tighter">{Math.round((aytMastered / (aytTotal || 1)) * 100)}%</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-ink-muted">AYT</span>
            </div>
          </div>
        </div>

        {/* Trophies (Başarımlar) Vitrini */}
        <div className="md:col-span-2 border border-app bg-surface rounded-3xl p-6 shadow-sm flex flex-col">
          <div 
            className="flex justify-between items-center cursor-pointer group"
            onClick={() => setIsAchievementsOpen(!isAchievementsOpen)}
          >
            <div>
              <h3 className="font-serif italic text-xl text-accent uppercase tracking-widest font-black">Başarımlar & Kariyer</h3>
              <p className="text-[10px] uppercase tracking-widest text-ink-muted font-black mt-1">
                {unlockedTrophies.length} / {trophies.length} rozet açıldı
              </p>
            </div>
            <button className="p-2 rounded-full bg-surface-2 group-hover:bg-accent/10 transition-colors">
              {isAchievementsOpen ? <ChevronUp size={20} className="text-accent" /> : <ChevronDown size={20} className="text-zinc-500 group-hover:text-accent" />}
            </button>
          </div>
          
          <AnimatePresence initial={false}>
            {isAchievementsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t border-app mt-4 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                      <p className="text-[9px] uppercase tracking-widest text-accent font-black">Açılan</p>
                      <p className="text-2xl font-black text-ink mt-1">{unlockedTrophies.length}</p>
                    </div>
                    <div className="rounded-2xl border border-app bg-surface-2 p-4">
                      <p className="text-[9px] uppercase tracking-widest text-ink-muted font-black">Kalan</p>
                      <p className="text-2xl font-black text-ink mt-1">{lockedTrophies.length}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <p className="text-[9px] uppercase tracking-widest text-amber-500 font-black">Seri</p>
                      <p className="text-2xl font-black text-ink mt-1">{streakDays}G</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all' as const, label: 'Tum Rozetler', count: trophies.length },
                      { id: 'unlocked' as const, label: 'Acilanlar', count: unlockedTrophies.length },
                      { id: 'locked' as const, label: 'Kilitliler', count: lockedTrophies.length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAchievementPanel(tab.id)}
                        className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          achievementPanel === tab.id
                            ? 'border-accent bg-accent/10 text-accent shadow-[0_0_22px_rgba(193,119,103,0.16)]'
                            : 'border-app bg-surface-2 text-ink-muted hover:border-accent/40 hover:text-ink'
                        }`}
                      >
                        {tab.label} / {tab.count}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleTrophies.map((trophy) => {
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Inventory Section - Pro Max */}
      <div className="bg-surface border border-app rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500/10 rounded-xl">
            <Package size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-ink leading-none">Envanter & Aktif Takviyeler</h3>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mt-0.5">
              {(inventory?.items?.length || 0) + Object.values(inventory?.boosts || {}).reduce((a: number, v) => a + (v as number), 0)} EŞYA
            </p>
          </div>
        </div>

        {/* ACTIVE TIMED BOOSTS BANNER */}
        {profile?.coachMemory?.commitments?.some(c => c.includes('Multiplier')) && (
          <div className="mt-4 mb-6 space-y-3">
            <p className="text-[9px] uppercase font-black tracking-[0.3em] text-amber-500/80">◈ AKTİF TAKVİYELER</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.coachMemory.commitments.map((commitment, idx) => {
                if (!(commitment.startsWith('xpMultiplier:') || commitment.startsWith('coinMultiplier:'))) return null;
                const [type, expiresAt] = commitment.split(':');
                const expiryDate = new Date(expiresAt);
                if (expiryDate < new Date()) return null;
                const minutesLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 60000);
                const pct = Math.max(0, Math.min(100, (minutesLeft / 60) * 100));
                return (
                  <motion.div
                    key={`active-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-amber-900/10 p-4"
                  >
                    {/* Glow */}
                    <div className="absolute inset-0 bg-amber-500/5 blur-xl pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="p-2.5 bg-amber-500/20 rounded-xl">
                          <Zap size={18} className="text-amber-400 animate-pulse" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-amber-400 text-sm">
                          {type === 'xpMultiplier' ? '⚡ 2x ELO Çarpanı' : '🪙 2x Coin Çarpanı'}
                        </h4>
                        <p className="text-[9px] uppercase font-black text-amber-500/70 tracking-widest mt-0.5">{minutesLeft} DK KALDI</p>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-amber-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {(!inventory?.items?.length) && Object.values(inventory?.boosts || {}).every(v => (v as number) === 0) ? (
          <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl mt-4">
            <Package size={40} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-600 font-black uppercase tracking-widest">Envanterin boş</p>
            <p className="text-xs text-zinc-700 mt-1">Mağazadan eşya alarak koleksiyonunu büyüt!</p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">

            {/* BOOST ITEMS */}
            {Object.entries(inventory?.boosts || {}).some(([, v]) => (v as number) > 0) && (
              <div>
                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-zinc-500 mb-3">◈ TAKVİYELER</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(inventory?.boosts || {}).map(([key, count]) => {
                    const cnt = count as number;
                    if (cnt <= 0) return null;
                    const itemDef = ALL_SHOP_ITEMS.find(i => i.metadata?.boostKey === key);
                    const Icon = itemDef?.icon ? (ICON_MAP[itemDef.icon] || Zap) : Zap;
                    return (
                      <motion.div
                        key={`boost-${key}`}
                        whileHover={{ scale: 1.02 }}
                        className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-4 flex flex-col gap-3"
                      >
                        {/* Count badge */}
                        <div className="absolute top-2 right-2 bg-amber-500 text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg shadow-amber-500/30">
                          x{cnt}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 shadow-inner">
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-zinc-100 text-sm leading-tight truncate">{itemDef?.name || key}</h4>
                            <span className="text-[9px] uppercase tracking-widest text-amber-500/70 font-black">Takviye Eşyası</span>
                          </div>
                        </div>
                        {!isPublic && (
                          <button
                            onClick={() => activateInventoryBoost(key as any)}
                            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                          >
                            <Zap size={12} />
                            KULLAN
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COSMETIC ITEMS */}
            {inventory?.items?.length > 0 && (
              <div>
                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-zinc-500 mb-3">◈ KOZMETİK EŞYALAR</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {inventory.items.map(itemId => {
                    const itemDef = ALL_SHOP_ITEMS.find(i => i.id === itemId);
                    if (!itemDef) return null;
                    const Icon = itemDef.icon ? (ICON_MAP[itemDef.icon] || Package) : Package;
                    const rarityColor = RARITY_COLOR[itemDef.rarity] || '#94a3b8';
                    const isEquipped = inventory.activeFrame === itemId || inventory.activeTheme === itemId || inventory.activeCoachPersona === itemId || inventory.activeTitle === itemId;
                    return (
                      <motion.div
                        key={`item-${itemId}`}
                        whileHover={{ scale: 1.03 }}
                        className="relative overflow-hidden rounded-2xl border p-4 flex flex-col gap-2 cursor-pointer group"
                        style={{
                          borderColor: isEquipped ? rarityColor + '80' : 'rgba(255,255,255,0.06)',
                          background: isEquipped ? rarityColor + '12' : 'rgba(255,255,255,0.02)',
                          boxShadow: isEquipped ? `0 0 16px ${rarityColor}22` : 'none',
                        }}
                      >
                        {/* Equipped badge */}
                        {isEquipped && (
                          <div
                            className="absolute top-0 right-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-xl"
                            style={{ background: rarityColor, color: '#000' }}
                          >
                            AKTİF
                          </div>
                        )}
                        {/* Rarity glow */}
                        {isEquipped && (
                          <div className="absolute inset-0 pointer-events-none opacity-20 blur-xl" style={{ background: rarityColor }} />
                        )}
                        <div className="relative z-10 flex items-center gap-2">
                          <div className="p-2 rounded-xl" style={{ background: rarityColor + '22', color: rarityColor }}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-zinc-100 text-xs leading-tight truncate">{itemDef.name}</h4>
                            <span className="text-[8px] uppercase tracking-widest font-black" style={{ color: rarityColor }}>
                              {itemDef.rarity}
                            </span>
                          </div>
                        </div>
                        {!isPublic && (
                          <button
                            disabled={isEquipped}
                            onClick={() => equipInventoryItem(itemId)}
                            className="relative z-10 mt-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all w-full"
                            style={isEquipped
                              ? { background: rarityColor + '22', color: rarityColor, cursor: 'not-allowed' }
                              : { background: 'rgba(255,255,255,0.05)', color: '#71717a' }
                            }
                          >
                            {isEquipped ? '✓ KULLANIMDA' : 'DONAT'}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 mb-8">
        <GlobalHeatmap />
      </div>

      <HabitAuditPanel />

      {/* Profil Ziyaretçi Duvarı */}
      {(isPublic || targetUid) && targetUid && (
        <div className="mt-6">
          <ProfileWall
            targetUid={targetUid}
            isOwnProfile={authUser?.uid === targetUid}
          />
        </div>
      )}

      {/* Topluluk Hedefi — sadece kendi profilinde */}
      {!isPublic && (
        <div className="mt-4 space-y-4">
          <InventorySummaryCard />
          <CommunityGoalBanner />
        </div>
      )}

      <AnimatePresence>
        {isExplorerOpen && (
          <AtlasExplorer onClose={() => setIsExplorerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
