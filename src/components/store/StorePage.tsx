import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, Dices, Package, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ALL_SHOP_ITEMS, CRATE_CONFIG, CrateTier } from '../../types/economy';
import { useToast } from '../../contexts/ToastContext';
import { CrateOpening } from '../ui/CrateOpening';
import { CrateCard } from './CrateCard';
import { SlotMachine } from './SlotMachine';

type StoreTab = 'crates' | 'slots' | 'direct' | 'boosts';

const VISUAL_REWARD_ID_BY_ECONOMY_REWARD: Record<string, string> = {
  xp_2x_1h: 'coin_200',
  rival_ticket: 'rocket_boost',
  title_limit: 'trophy_cache',
  freeze_1: 'shield_1',
  freeze_3: 'freeze_3',
  'coin_1.5x_1h': 'coin_450',
  theme_cyber: 'star_cache',
  theme_aurora: 'theme_aurora',
  theme_obsidian: 'theme_obsidian',
  persona_soldier: 'boho_crown',
  persona_zen: 'spark_legend',
  persona_analyst: 'persona_analyst',
  frame_neon: 'diamond_core',
  frame_fire: 'frame_fire',
  frame_gold: 'jackpot',
  title_focus: 'title_focus',
  focus_badge: 'focus_badge',
  cosmic_crown: 'cosmic_crown',
};

export const StorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StoreTab>('crates');
  const [openingCrate, setOpeningCrate] = useState<{ tier: CrateTier; rewardId?: string } | null>(null);
  const bohoCoins = useAppStore((s) => s.bohoCoins);
  const buyShopItem = useAppStore((s) => s.buyShopItem);
  const openCrate = useAppStore((s) => s.openCrate);
  const spendBohoCoins = useAppStore((s) => s.spendBohoCoins);
  const inventory = useAppStore((s) => s.inventory);
  const { toast } = useToast();

  const handleCrateBuy = (tier: string) => {
    const res = openCrate(tier as CrateTier);
    if (res.success) {
      setOpeningCrate({
        tier: tier as CrateTier,
        rewardId: res.rewardId ? VISUAL_REWARD_ID_BY_ECONOMY_REWARD[res.rewardId] : undefined,
      });
      return;
    }
    toast.error('Yetersiz BohoCoin!');
  };

  const handleSlotSpin = () => {
    const ok = spendBohoCoins(10, 'Slot Machine Spin');
    if (!ok) toast.error('Yetersiz BohoCoin!');
    return ok;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[320px] bg-[#C17767]/10 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute top-48 right-0 w-[420px] h-[420px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence>
        {openingCrate && (
          <CrateOpening
            crateTier={openingCrate.tier}
            targetRewardId={openingCrate.rewardId}
            onComplete={() => setOpeningCrate(null)}
          />
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={22} className="text-amber-500" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500 font-black">Boho Mağaza v2.1</span>
          </div>
          <h2 className="font-display italic text-5xl text-[#C17767]">Boho Store</h2>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-black mt-2">Ekonomini Yönet, Gelişimini Hızlandır</p>
        </div>

        <div className="bg-black/50 border border-white/10 px-8 py-4 rounded-3xl flex items-center gap-4 shadow-[0_0_36px_rgba(245,158,11,0.08)] backdrop-blur-xl">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <Coins size={24} />
          </div>
          <div>
            <span className="text-2xl font-display font-bold text-zinc-100">{bohoCoins.toLocaleString()}</span>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Mevcut Bakiyen</p>
          </div>
        </div>
      </header>

      <div className="flex bg-zinc-950/70 backdrop-blur-xl p-1.5 rounded-[24px] border border-white/10 max-w-2xl mx-auto relative z-10 shadow-[0_0_40px_rgba(193,119,103,0.08)]">
        {(['crates', 'slots', 'direct', 'boosts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'crates' && <div className="flex items-center justify-center gap-2"><Package size={14} /> Sandıklar</div>}
            {tab === 'slots' && <div className="flex items-center justify-center gap-2"><Dices size={14} /> Slotlar</div>}
            {tab === 'direct' && <div className="flex items-center justify-center gap-2"><ShoppingBag size={14} /> Kozmetikler</div>}
            {tab === 'boosts' && <div className="flex items-center justify-center gap-2"><Zap size={14} /> Takviyeler</div>}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10"
        >
          {activeTab === 'crates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.values(CRATE_CONFIG).map((crate) => (
                <CrateCard
                  key={crate.tier}
                  crate={crate}
                  onBuy={handleCrateBuy}
                  disabled={bohoCoins < crate.price}
                />
              ))}
            </div>
          )}

          {activeTab === 'slots' && (
            <div className="max-w-xl mx-auto">
              <SlotMachine onSpin={handleSlotSpin} balance={bohoCoins} />
            </div>
          )}

          {(activeTab === 'direct' || activeTab === 'boosts') && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ALL_SHOP_ITEMS.filter((item) =>
                activeTab === 'direct' ? (item.category === 'cosmetic' || item.category === 'ai_persona') : item.category === 'boost'
              ).map((item) => {
                const ownedCount = inventory.items.filter((id) => id === item.id).length;
                const isOwned = ownedCount > 0;
                const isCosmetic = item.category === 'cosmetic' || item.category === 'ai_persona';
                const boostCount = !isCosmetic && item.metadata?.boostKey
                  ? (inventory.boosts[item.metadata.boostKey as keyof typeof inventory.boosts] || 0)
                  : 0;

                return (
                  <div key={item.id} className={`glass-card p-6 rounded-3xl flex items-center justify-between group border transition-all ${
                    isOwned && isCosmetic
                      ? 'border-green-500/25 bg-green-500/[0.03]'
                      : 'border-white/10 hover:border-[#C17767]/30 hover:shadow-[0_0_36px_rgba(193,119,103,0.08)]'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-zinc-800 text-zinc-400 group-hover:bg-[#C17767]/10 group-hover:text-[#C17767] transition-all relative">
                        <ShoppingBag size={24} />
                        {!isCosmetic && boostCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                            {boostCount}
                          </span>
                        )}
                        {isCosmetic && ownedCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                            {ownedCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-100">{item.name}</h4>
                        <p className="text-xs text-zinc-500">{item.description}</p>
                        {isOwned && isCosmetic && (
                          <p className="text-[9px] uppercase tracking-widest text-green-500 font-black mt-1">
                            Owned Count: {ownedCount}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!buyShopItem(item)) {
                          toast.error(isCosmetic && isOwned ? 'Bu eşya zaten sende.' : 'Yetersiz BohoCoin!');
                        } else {
                          toast.success(`${item.name} satın alındı!`);
                        }
                      }}
                      disabled={isCosmetic && isOwned}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-100 ${
                        isCosmetic && isOwned
                          ? 'bg-green-500/20 text-green-500 border border-green-500/20'
                          : 'bg-zinc-800 hover:bg-[#C17767] text-white'
                      }`}
                    >
                      {isCosmetic && isOwned ? 'SAHİPSİN' : `${item.price} COIN`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
