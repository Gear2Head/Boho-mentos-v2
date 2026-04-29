import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Lock, Star, Zap, Crown, Trophy, RefreshCw, ShoppingCart } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { CrateOpening } from './ui/CrateOpening';
import { useToast } from '../contexts/ToastContext';

type CrateTier = 'standard' | 'epic' | 'legendary';

interface CrateInfo {
  tier: CrateTier;
  name: string;
  cost: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const CRATES: CrateInfo[] = [
  {
    tier: 'standard',
    name: 'Bronz Kasa',
    cost: 500,
    color: 'text-amber-700',
    icon: <Package size={48} className="text-amber-700" />,
    description: 'Temel XP ve başarımlar içerir.'
  },
  {
    tier: 'epic',
    name: 'Gümüş Kasa',
    cost: 1500,
    color: 'text-zinc-300',
    icon: <Package size={48} className="text-zinc-300" />,
    description: 'Yüksek XP ve nadir rozetler içerir.'
  },
  {
    tier: 'legendary',
    name: 'Altın Kasa',
    cost: 5000,
    color: 'text-amber-400',
    icon: <Package size={48} className="text-amber-400" />,
    description: 'Efsanevi XP ve sınırlı süreli temalar içerir.'
  }
];

export function CrateShop() {
  const { eloScore, addElo } = useAppStore();
  const [activeCrate, setActiveCrate] = useState<CrateTier | null>(null);
  const { toast } = useToast();

  const buyCrate = (crate: CrateInfo) => {
    if (eloScore < crate.cost) {
      toast.error('Yetersiz ELO puanı!');
      return;
    }
    setActiveCrate(crate.tier);
  };

  const handleCrateComplete = (reward: any) => {
    const crate = CRATES.find(c => c.tier === activeCrate)!;
    addElo(-crate.cost); // Deduct cost
    addElo(reward.xp); // Add reward
    toast.success(`${reward.name} kazandın! +${reward.xp} ELO eklendi.`);
    setActiveCrate(null);
  };

  return (
    <div className="bg-surface rounded-[32px] p-8 border border-app shadow-xl">
      <div className="flex items-center justify-between mb-8 border-b border-app pb-4">
        <div>
          <h2 className="font-display italic text-3xl text-zinc-100">BOHO GANİMET MARKETİ</h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mt-1">ELO Puanlarını Harca · Şansını Dene</p>
        </div>
        <div className="bg-app px-6 py-3 rounded-2xl border border-[#C17767]/30 flex items-center gap-3 shadow-lg shadow-[#C17767]/5">
           <Trophy size={20} className="text-[#C17767]" />
           <span className="text-2xl font-black text-white font-mono">{eloScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CRATES.map((crate) => (
          <div 
            key={crate.tier}
            className={`bg-app/50 border border-white/5 rounded-[40px] p-8 flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:border-white/10 group relative overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none`} />
            
            <div className="mb-6 relative">
               <div className="absolute inset-0 blur-2xl opacity-20 scale-150" />
               <div className="group-hover:rotate-12 transition-transform duration-500">
                 {crate.icon}
               </div>
            </div>

            <h3 className={`text-xl font-display italic font-black mb-2 ${crate.color}`}>{crate.name.toUpperCase()}</h3>
            <p className="text-xs text-zinc-500 font-medium mb-6 leading-relaxed px-4">{crate.description}</p>

            <button 
              onClick={() => buyCrate(crate)}
              disabled={eloScore < crate.cost}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                eloScore < crate.cost 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-[#C17767] hover:text-white shadow-xl shadow-black/20'
              }`}
            >
              <ShoppingCart size={16} />
              {crate.cost} ELO
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeCrate && (
          <CrateOpening onComplete={handleCrateComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
