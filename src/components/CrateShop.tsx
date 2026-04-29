import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
    Coins, Gem, Package, Shield, ShoppingCart, X, ChevronRight, Info, 
    Crown, Flame, Star, Swords, Target, Trophy, Zap, Sparkles, 
    Rocket, Diamond, Palette, User, Music, Layout, Lock
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/appStore';
import { CrateOpening, POOLS, RARITY_CFG, ALL_REWARDS, type Reward, type CrateTier } from './ui/CrateOpening';
import { useToast } from '../contexts/ToastContext';

// ─── Types & Data ─────────────────────────────────────────────────────────────

interface CrateInfo {
    tier: CrateTier;
    name: string;
    cost: number;
    accentColor: string;
    borderColor: string;
    icon: React.ReactNode;
    description: string;
    tagline: string;
    glowColor: string;
}

interface MarketItem {
    id: string;
    name: string;
    cost: number;
    category: 'booster' | 'cosmetic' | 'persona' | 'special';
    icon: React.ReactNode;
    description: string;
    accentColor: string;
}

const CRATES: CrateInfo[] = [
    {
        tier: 'standard',
        name: 'Bronz Kasa',
        cost: 200,
        accentColor: '#b45309',
        borderColor: 'rgba(180,83,9,0.5)',
        glowColor: 'rgba(180,83,9,0.25)',
        icon: <Package size={44} color="#b45309" />,
        description: 'BohoCoin iadesi ve odak destekleri icerir.',
        tagline: 'Temel oduller',
    },
    {
        tier: 'epic',
        name: 'Gumus Kasa',
        cost: 1000,
        accentColor: '#a855f7',
        borderColor: 'rgba(168,85,247,0.5)',
        glowColor: 'rgba(168,85,247,0.2)',
        icon: <Shield size={44} color="#a855f7" />,
        description: 'Seri kalkani ve yuksek BohoCoin odulleri icerir.',
        tagline: 'Yuksek Epic oran',
    },
    {
        tier: 'legendary',
        name: 'Altin Kasa',
        cost: 1300,
        accentColor: '#f59e0b',
        borderColor: 'rgba(245,158,11,0.55)',
        glowColor: 'rgba(245,158,11,0.2)',
        icon: <Gem size={44} color="#f59e0b" />,
        description: 'Sadece Epic / Legendary oduller. Jackpot sadece bu kasada!',
        tagline: '★ JACKPOT MEVCUT',
    },
];

const MARKET_ITEMS: MarketItem[] = [
    {
        id: 'streak_shield',
        name: 'Seri Kalkanı',
        cost: 2000,
        category: 'booster',
        icon: <Shield size={32} />,
        description: 'Çalışma serini (streak) bir günlüğüne koruma altına alır.',
        accentColor: '#3b82f6',
    },
    {
        id: 'theme_cyberpunk',
        name: 'Cyberpunk Teması',
        cost: 7500,
        category: 'cosmetic',
        icon: <Palette size={32} />,
        description: 'Uygulamayı neon ışıkları ve karanlık bir atmosferle donatır.',
        accentColor: '#f43f5e',
    },
    {
        id: 'persona_sergeant',
        name: 'Sert Koç (Çavuş)',
        cost: 12000,
        category: 'persona',
        icon: <User size={32} />,
        description: 'Daha sert, disiplinli ve tavizsiz bir koç kişiliği.',
        accentColor: '#10b981',
    },
    {
        id: 'focus_music_lofi',
        name: 'Lofi Beats Pack',
        cost: 4500,
        category: 'special',
        icon: <Music size={32} />,
        description: 'Focus Tunnel için özel olarak seçilmiş Lo-Fi ritimleri.',
        accentColor: '#8b5cf6',
    },
    {
        id: 'custom_avatar_frame',
        name: 'Altın Çerçeve',
        cost: 6000,
        category: 'cosmetic',
        icon: <Layout size={32} />,
        description: 'Profil fotoğrafın için prestijli bir altın çerçeve.',
        accentColor: '#eab308',
    },
];

// ─── Components ─────────────────────────────────────────────────────────────

function RewardPreviewPopup({ crate, onClose }: { crate: CrateInfo; onClose: () => void; key?: React.Key }) {
    const pool = POOLS[crate.tier];
    const total = pool.reduce((s, e) => s + e.weight, 0);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 18, stiffness: 260 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 480,
                    background: 'linear-gradient(160deg, #0f0f14 0%, #0a0a0f 100%)',
                    border: `1.5px solid ${crate.borderColor}`,
                    borderRadius: 28,
                    overflow: 'hidden',
                    boxShadow: `0 0 60px ${crate.glowColor}, 0 30px 80px rgba(0,0,0,0.7)`,
                }}
            >
                <div style={{
                    padding: '22px 24px 18px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: `linear-gradient(90deg, ${crate.glowColor}, transparent)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {crate.icon}
                        <div>
                            <p style={{ color: crate.accentColor, fontSize: 10, fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 2 }}>
                                ODUL HAVUZU
                            </p>
                            <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 900, fontStyle: 'italic', margin: 0 }}>
                                {crate.name.toUpperCase()}
                            </h3>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                    {pool.map(({ reward, weight }, i) => {
                        const rcfg = RARITY_CFG[reward.rarity];
                        const pct = Math.round((weight / total) * 100);
                        return (
                            <motion.div
                                key={reward.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.045 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 14px', borderRadius: 14,
                                    background: rcfg.gradient,
                                    border: `1.5px solid ${rcfg.border}`,
                                    boxShadow: reward.rarity !== 'basic' ? rcfg.glow : 'none',
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {reward.rarity !== 'basic' && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, transparent 35%, ${rcfg.accentColor}12 52%, transparent 68%)`, pointerEvents: 'none' }} />}
                                <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, border: `1.5px solid ${rcfg.border}`, background: `${rcfg.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rcfg.iconColor }}>
                                    {reward.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{reward.name}</span>
                                        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 99, backgroundColor: rcfg.labelBg, color: rcfg.labelText, flexShrink: 0 }}>
                                            {rcfg.labelName}
                                        </span>
                                    </div>
                                    <span style={{ color: rcfg.iconColor, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{reward.description}</span>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 900, color: rcfg.accentColor, lineHeight: 1 }}>{pct}%</div>
                                    <div style={{ width: 44, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: rcfg.accentColor }} />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}

function CrateCard({ crate, canAfford, onBuy, onPreview }: {
    crate: CrateInfo;
    canAfford: boolean;
    onBuy: () => void;
    onPreview: () => void;
    key?: React.Key;
}) {
    const [hovered, setHovered] = useState(false);
    const isLegendary = crate.tier === 'legendary';

    return (
        <motion.div
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{ scale: hovered ? 1.025 : 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
                background: `linear-gradient(160deg, #111116 0%, #0c0c10 100%)`,
                border: `1.5px solid ${hovered ? crate.borderColor : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 28,
                padding: '28px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                cursor: 'default', position: 'relative', overflow: 'hidden',
                boxShadow: hovered ? `0 0 50px ${crate.glowColor}, 0 20px 60px rgba(0,0,0,0.5)` : '0 8px 30px rgba(0,0,0,0.3)',
                transition: 'border-color 0.25s, box-shadow 0.25s',
            }}
        >
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: hovered ? 1 : 0,
                background: `radial-gradient(ellipse at 50% 0%, ${crate.glowColor} 0%, transparent 65%)`,
                transition: 'opacity 0.35s',
            }} />

            {isLegendary && (
                <div style={{
                    position: 'absolute', top: 16, right: 16,
                    padding: '3px 10px', borderRadius: 99,
                    background: 'rgba(255,226,52,0.12)', border: '1px solid rgba(255,226,52,0.35)',
                    color: '#ffe234', fontSize: 9, fontWeight: 900, letterSpacing: '0.2em',
                }}>
                    JACKPOT
                </div>
            )}

            <motion.div
                animate={hovered ? { rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.1, 1.05] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{ marginBottom: 18 }}
            >
                {crate.icon}
            </motion.div>

            <h3 style={{ color: crate.accentColor, fontSize: 18, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.01em', marginBottom: 6 }}>
                {crate.name.toUpperCase()}
            </h3>

            <div style={{
                fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: crate.accentColor, opacity: 0.7, marginBottom: 10,
            }}>
                {crate.tagline}
            </div>

            <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6, marginBottom: 22, padding: '0 8px' }}>
                {crate.description}
            </p>

            <div className="flex flex-col w-full gap-3">
                <button
                    onClick={onPreview}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 99,
                        border: `1px solid ${crate.borderColor}`, background: 'transparent',
                        color: crate.accentColor, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        letterSpacing: '0.05em',
                    }}
                >
                    <Info size={12} /> Odul Listesi <ChevronRight size={11} />
                </button>

                <button
                    onClick={onBuy}
                    disabled={!canAfford}
                    style={{
                        width: '100%', padding: '14px 0', borderRadius: 14,
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        background: canAfford ? '#fff' : '#27272a',
                        color: canAfford ? '#000' : '#52525b',
                        border: 'none',
                        transition: 'background 0.2s, color 0.2s, transform 0.1s',
                    }}
                    onMouseEnter={e => { if (canAfford) (e.currentTarget as HTMLButtonElement).style.background = crate.accentColor; }}
                    onMouseLeave={e => { if (canAfford) (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                >
                    <ShoppingCart size={15} />
                    {crate.cost.toLocaleString()} BOHOCOIN
                </button>
            </div>
        </motion.div>
    );
}

function MarketCard({ item, canAfford, isOwned, onBuy }: {
    item: MarketItem;
    canAfford: boolean;
    isOwned: boolean;
    onBuy: () => void;
    key?: React.Key;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{ scale: hovered ? 1.025 : 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
                background: `linear-gradient(160deg, #111116 0%, #0c0c10 100%)`,
                border: `1.5px solid ${hovered ? `${item.accentColor}50` : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 24,
                padding: '24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: hovered ? `0 0 40px ${item.accentColor}20, 0 15px 40px rgba(0,0,0,0.5)` : '0 4px 20px rgba(0,0,0,0.2)',
            }}
        >
            <div style={{
                position: 'absolute', top: -10, left: -10, padding: '4px 12px',
                background: `${item.accentColor}20`, border: `1px solid ${item.accentColor}40`,
                borderRadius: 12, color: item.accentColor, fontSize: 8, fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.1em', transform: 'rotate(-5deg)'
            }}>
                {item.category}
            </div>

            <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: `${item.accentColor}10`, border: `1.5px solid ${item.accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.accentColor, marginBottom: 16
            }}>
                {item.icon}
            </div>

            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{item.name}</h3>
            <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.5, marginBottom: 20, minHeight: 33 }}>{item.description}</p>

            <button
                onClick={onBuy}
                disabled={!canAfford || isOwned}
                style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: (canAfford && !isOwned) ? 'pointer' : 'not-allowed',
                    background: isOwned ? '#166534' : (canAfford ? '#fff' : '#27272a'),
                    color: isOwned ? '#fff' : (canAfford ? '#000' : '#52525b'),
                    border: 'none',
                    transition: 'all 0.2s',
                }}
            >
                {isOwned ? (
                    <>SAHİPSİN</>
                ) : (
                    <>
                        <ShoppingCart size={14} />
                        {item.cost.toLocaleString()} BOHOCOIN
                    </>
                )}
            </button>
        </motion.div>
    );
}

// ─── Main Shop ─────────────────────────────────────────────────────────────

export function CrateShop() {
    const {
        bohoCoins, spendBohoCoins, addBohoCoins,
        profile, setProfile, purchasedItems, purchaseItem
    } = useAppStore(useShallow((s) => ({
        bohoCoins: s.bohoCoins,
        spendBohoCoins: s.spendBohoCoins,
        addBohoCoins: s.addBohoCoins,
        profile: s.profile,
        setProfile: s.setProfile,
        purchasedItems: s.purchasedItems || [],
        purchaseItem: s.purchaseItem
    })));

    const [view, setView] = useState<'crates' | 'market'>('crates');
    const [activeCrate, setActiveCrate] = useState<CrateTier | null>(null);
    const [previewCrate, setPreviewCrate] = useState<CrateInfo | null>(null);
    const { toast } = useToast();

    const buyCrate = (crate: CrateInfo) => {
        if (bohoCoins < crate.cost) { toast.error('Yetersiz BohoCoin.'); return; }
        if (!spendBohoCoins(crate.cost, `crate_${crate.tier}`)) return;
        setActiveCrate(crate.tier);
    };

    const handleMarketBuy = (item: MarketItem) => {
        if (purchasedItems.includes(item.id)) {
            toast.info('Bu ürüne zaten sahipsin.');
            return;
        }
        if (bohoCoins < item.cost) {
            toast.error('Yetersiz BohoCoin.');
            return;
        }

        if (purchaseItem(item.id, item.cost)) {
            toast.success(`${item.name} başarıyla satın alındı!`);
            if (item.id === 'streak_shield' && profile) {
                setProfile({ ...profile, streakShields: (profile.streakShields || 0) + 1 });
            }
        }
    };

    const handleCrateComplete = (reward: Reward) => {
        addBohoCoins(reward.coinReward, 'crate_reward');
        if (reward.shieldReward && profile) {
            setProfile({ ...profile, streakShields: (profile.streakShields || 0) + reward.shieldReward });
        }
        toast.success(`${reward.name} kazandin! +${reward.coinReward.toLocaleString()} BohoCoin${reward.shieldReward ? ` & +${reward.shieldReward} Kalkan` : ''}`);
        setActiveCrate(null);
    };

    return (
        <div className="bg-surface rounded-[32px] p-5 md:p-8 border border-app shadow-xl relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-app pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-display italic text-2xl md:text-3xl text-zinc-100 uppercase">Boho Mağaza</h2>
                        <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[8px] font-black uppercase tracking-widest">v2.0</div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setView('crates')}
                            className={`text-[10px] uppercase font-black tracking-widest transition-colors ${view === 'crates' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Ganimet Kasaları
                        </button>
                        <button
                            onClick={() => setView('market')}
                            className={`text-[10px] uppercase font-black tracking-widest transition-colors ${view === 'market' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Özel Market
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-app px-5 py-3 rounded-2xl border border-app-subtle flex items-center gap-3 shadow-lg group">
                        <Coins size={20} className="text-[#C17767] group-hover:rotate-12 transition-transform" />
                        <span className="text-2xl font-black text-white font-mono">{bohoCoins.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {view === 'crates' ? (
                    <motion.div
                        key="crates"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-5"
                    >
                        {CRATES.map((crate) => (
                            <CrateCard
                                key={crate.tier}
                                crate={crate}
                                canAfford={bohoCoins >= crate.cost}
                                onBuy={() => buyCrate(crate)}
                                onPreview={() => setPreviewCrate(crate)}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="market"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        {MARKET_ITEMS.map((item) => (
                            <MarketCard
                                key={item.id}
                                item={item}
                                canAfford={bohoCoins >= item.cost}
                                isOwned={purchasedItems.includes(item.id)}
                                onBuy={() => handleMarketBuy(item)}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlays */}
            <AnimatePresence>
                {activeCrate && (
                    <CrateOpening
                        key={activeCrate}
                        onComplete={handleCrateComplete}
                        crateTier={activeCrate}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewCrate && (
                    <RewardPreviewPopup crate={previewCrate} onClose={() => setPreviewCrate(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
