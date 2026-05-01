import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MessageCircle, UserPlus, UserCheck, Shield, Award, Flame, Zap, Trophy, User } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getLevelFromElo } from '../utils/leveling';
import { DMPanel } from './DMPanel';

interface WarriorProfile {
  uid: string;
  name: string;
  email?: string;
  eloScore: number;
  streakDays: number;
  avatar?: string;
  targetUniversity?: string;
  targetProgram?: string;
}

export function SocialPage() {
  const authUser = useAppStore(s => s.authUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [warriors, setWarriors] = useState<WarriorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChatUid, setActiveChatUid] = useState<string | null>(null);
  const [selectedWarrior, setSelectedWarrior] = useState<WarriorProfile | null>(null);

  // Fetch initial warriors (active ones)
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('eloScore', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          uid: doc.id,
          name: d.profile?.name || d.display_name || 'Savaşçı',
          eloScore: d.eloScore || 0,
          streakDays: d.streakDays || 0,
          avatar: d.profile?.avatar || d.photo_url,
          targetUniversity: d.profile?.targetUniversity,
          targetProgram: d.profile?.targetProgram,
        } as WarriorProfile;
      }).filter(w => w.uid !== authUser?.uid);
      setWarriors(data);
    });
    return () => unsub();
  }, [authUser?.uid]);

  const filteredWarriors = useMemo(() => {
    if (!searchTerm) return warriors;
    const low = searchTerm.toLowerCase();
    return warriors.filter(w => 
      w.name.toLowerCase().includes(low) || 
      (w.email && w.email.toLowerCase().includes(low))
    );
  }, [warriors, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-app">
      <header className="p-6 border-b border-app bg-surface/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display italic text-3xl text-zinc-100 leading-none">BOHO CEMİYETİ</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mt-2 font-black">Savaşçıları Bul · Selam Ver · Rekabet Et</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text"
              placeholder="Savaşçı veya E-posta Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-app border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C17767]/50 transition-all font-medium"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-6 gap-6">
        {/* Left: Warriors List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {filteredWarriors.length === 0 ? (
            <div className="text-center py-20 opacity-50">
               <User className="mx-auto mb-4" size={48} />
               <p className="text-sm font-black uppercase tracking-widest">Henüz kimse bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredWarriors.map((w) => (
                <WarriorCard 
                  key={w.uid} 
                  warrior={w} 
                  onChat={() => setActiveChatUid(w.uid)} 
                  onView={() => setSelectedWarrior(w)}
                />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {activeChatUid && (
            <DMPanel forceTargetUid={activeChatUid} onClose={() => setActiveChatUid(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedWarrior && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedWarrior(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
               <div className="text-center mb-6">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/5 shadow-xl overflow-hidden bg-app">
                    <img src={selectedWarrior.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedWarrior.uid}`} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-display italic text-3xl text-zinc-100">{selectedWarrior.name}</h3>
                  <div className="mt-1 flex items-center justify-center gap-2 text-[10px] uppercase font-black tracking-widest text-zinc-500">
                    <Shield size={12} className="text-[#C17767]" />
                    <span>Seviye {getLevelFromElo(selectedWarrior.eloScore).level} Savaşçı</span>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-app p-4 rounded-3xl text-center border border-white/5">
                     <div className="text-xl font-black text-white">{selectedWarrior.eloScore}</div>
                     <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">ELO PUANI</div>
                  </div>
                  <div className="bg-app p-4 rounded-3xl text-center border border-white/5">
                     <div className="text-xl font-black text-[#C17767] flex items-center justify-center gap-1">
                       <Flame size={18} fill="currentColor" />
                       {selectedWarrior.streakDays}
                     </div>
                     <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">GÜN SERİSİ</div>
                  </div>
                  <div className="bg-app p-4 rounded-3xl text-center border border-white/5">
                     <div className="text-xl font-black text-white">{Math.floor(selectedWarrior.eloScore / 100)}</div>
                     <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">BAŞARIM</div>
                  </div>
               </div>

               <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-app/50 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                       <Award size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">HEDEF ÜNİVERSİTE</p>
                       <p className="text-sm font-bold text-zinc-200">{selectedWarrior.targetUniversity || 'Bilinmiyor'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-app/50 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                       <Zap size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">HEDEF BÖLÜM</p>
                       <p className="text-sm font-bold text-zinc-200">{selectedWarrior.targetProgram || 'Bilinmiyor'}</p>
                    </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button 
                    onClick={() => { setActiveChatUid(selectedWarrior.uid); setSelectedWarrior(null); }}
                    className="flex-1 py-4 bg-[#C17767] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#C17767]/20 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} /> MESAJ GÖNDER
                  </button>
                  <button className="px-6 py-4 bg-zinc-800 text-zinc-400 rounded-2xl hover:text-white transition-colors">
                     <UserPlus size={18} />
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface WarriorCardProps {
  key?: React.Key;
  warrior: WarriorProfile;
  onChat: () => void;
  onView: () => void;
}

function WarriorCard({ warrior, onChat, onView }: WarriorCardProps) {
  const levelInfo = getLevelFromElo(warrior.eloScore);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-app p-4 rounded-3xl hover:border-[#C17767]/30 transition-all group cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden bg-app">
            <img src={warrior.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${warrior.uid}`} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-[8px] font-black text-[#C17767]">
            {levelInfo.level}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-zinc-100 truncate group-hover:text-[#C17767] transition-colors">{warrior.name}</h4>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">
            <Trophy size={10} className="text-amber-500" />
            <span>{warrior.eloScore} ELO</span>
            <span className="opacity-30">|</span>
            <Flame size={10} className="text-orange-500" />
            <span>{warrior.streakDays} GÜN</span>
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onChat(); }}
          className="p-3 bg-app rounded-2xl text-zinc-500 hover:text-[#C17767] hover:bg-[#C17767]/5 transition-all"
        >
          <MessageCircle size={18} />
        </button>
      </div>
    </motion.div>
  );
}
