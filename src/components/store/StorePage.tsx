import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, Dices, Package, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ALL_SHOP_ITEMS, CRATE_CONFIG, CrateTier } from '../../types/economy';
import { useToast } from '../../contexts/ToastContext';
import { CrateOpening } from '../ui/CrateOpening';
import { CrateCard } from './CrateCard';
import { SlotMachine } from './SlotMachine';
import { X } from 'lucide-react';

const RewardPreviewPopup = ({ crate, onClose }: { crate: typeof CRATE_CONFIG[keyof typeof CRATE_CONFIG]; onClose: () => void }) => {
  const pool = require('../../types/economy').REWARD_POOLS[crate.tier] || [];
  const allItems = require('../../types/economy').ALL_SHOP_ITEMS || [];
  const totalWeight = pool.reduce((s: number, e: any) => s + e.weight, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-zinc-950 border rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ borderColor: crate.color, boxShadow: `0 0 40px ${crate.color}30` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between" style={{ background: `linear-gradient(90deg, ${crate.color}20, transparent)` }}>
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: crate.color }}>Ödül Havuzu</p>
            <h3 className="text-xl font-display italic font-black text-white">{crate.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
          {pool.map((entry: any, i: number) => {
            const itemDef = allItems.find((itm: any) => itm.id === entry.itemId);
            if (!itemDef) return null;
            const pct = Math.round((entry.weight / totalWeight) * 100);
            return (
              <div key={`${entry.itemId}-${i}`} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white truncate">{itemDef.name}</span>
                    <span className="text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 shrink-0">
                      {itemDef.rarity}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-1">{itemDef.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black" style={{ color: crate.color }}>{pct}%</div>
                  <div className="w-10 h-1 mt-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: crate.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

type StoreTab = 'crates' | 'slots' | 'direct' | 'boosts';

export const StorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StoreTab>('crates');
  const [openingCrate, setOpeningCrate] = useState<{ tier: CrateTier; rewardId?: string } | null>(null);
  const [previewCrate, setPreviewCrate] = useState<typeof CRATE_CONFIG[keyof typeof CRATE_CONFIG] | null>(null);
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
        rewardId: res.rewardId,
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
        {previewCrate && (
          <RewardPreviewPopup
            crate={previewCrate}
            onClose={() => setPreviewCrate(null)}
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
                  onPreview={setPreviewCrate}
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
