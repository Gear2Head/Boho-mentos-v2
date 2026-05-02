import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimation } from 'motion/react';
import {
    Crown, Flame, Gem, Shield, Star, Swords, Target, Trophy, Zap,
    Sparkles, Rocket, Diamond, Coins, Package, Palette, Timer, BrainCircuit, BarChart3, Hexagon
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────
export type CrateTier = 'standard' | 'epic' | 'legendary' | 'wooden' | 'bronze' | 'silver' | 'gold' | 'mythic' | 'cosmic';
export type Rarity = 'basic' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'jackpot';

export interface Reward {
    id: string;
    name: string;
    rarity: Rarity;
    coinReward: number;
    shieldReward?: number;
    icon: React.ReactNode;
    description?: string;
}

import { ALL_SHOP_ITEMS, REWARD_POOLS } from '../../types/economy';

export const ALL_REWARDS: Reward[] = ALL_SHOP_ITEMS.map(item => {
    let icon = <Package size={26} />;
    if (item.icon === 'Shield') icon = <Shield size={26} />;
    else if (item.icon === 'Zap') icon = <Zap size={26} />;
    else if (item.icon === 'Coins') icon = <Coins size={26} />;
    else if (item.icon === 'Rocket') icon = <Rocket size={26} />;
    else if (item.icon === 'Palette') icon = <Palette size={26} />;
    else if (item.icon === 'Sparkles') icon = <Sparkles size={26} />;
    else if (item.icon === 'Gem') icon = <Gem size={26} />;
    else if (item.icon === 'Target') icon = <Target size={26} />;
    else if (item.icon === 'Timer') icon = <Timer size={26} />;
    else if (item.icon === 'Trophy') icon = <Trophy size={26} />;
    else if (item.icon === 'BrainCircuit') icon = <BrainCircuit size={26} />;
    else if (item.icon === 'BarChart3') icon = <BarChart3 size={26} />;
    else if (item.icon === 'Hexagon') icon = <Hexagon size={26} />;
    else if (item.icon === 'Flame') icon = <Flame size={26} />;
    else if (item.icon === 'Crown') icon = <Crown size={26} />;

    return {
        id: item.id,
        name: item.name,
        rarity: (item.rarity === 'common' ? 'basic' : item.rarity === 'cosmic' ? 'mythic' : item.rarity) as Rarity,
        coinReward: 0, // BohoMentos crates give items, not raw coins anymore
        shieldReward: item.metadata?.boostKey === 'streakFreezer' ? Number(item.metadata.amount) || undefined : undefined,
        icon,
        description: item.description,
    };
});

type WeightedReward = { reward: Reward; weight: number };

export const POOLS: Record<CrateTier, WeightedReward[]> = {} as any;

for (const tier of Object.keys(REWARD_POOLS)) {
    const t = tier as CrateTier;
    POOLS[t] = REWARD_POOLS[t].map(entry => {
        const reward = ALL_REWARDS.find(r => r.id === entry.itemId) || ALL_REWARDS[0];
        return { reward, weight: entry.weight };
    });
}

export function pickReward(tier: CrateTier): Reward {
    const pool = POOLS[tier];
    if (!pool || pool.length === 0) return ALL_REWARDS[0];
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const entry of pool) { r -= entry.weight; if (r <= 0) return entry.reward; }
    return pool[0].reward;
}

// ─── Rarity Config ─────────────────────────────────────────────────────────────
export const RARITY_CFG: Record<Rarity, {
    bg: string; border: string; iconColor: string; glow: string; glowColor: string;
    labelBg: string; labelText: string; labelName: string; accentColor: string;
    gradient: string; winBg: string; particleColors: string[]; particleCount: number;
}> = {
    basic: {
        bg: '#1c1c22', border: '#4a4a5a', iconColor: '#a0a0b8', glow: 'none', glowColor: 'transparent',
        labelBg: '#2a2a35', labelText: '#888', labelName: 'STANDART', accentColor: '#6b6b80',
        gradient: 'linear-gradient(135deg, #1c1c22 0%, #25252f 100%)',
        winBg: 'radial-gradient(ellipse at 50% 30%, rgba(80,80,100,0.4) 0%, rgba(0,0,0,0.97) 70%)',
        particleColors: ['#94a3b8', '#cbd5e1', '#64748b', '#e2e8f0'], particleCount: 20,
    },
    rare: {
        bg: '#082f49', border: '#38bdf8', iconColor: '#7dd3fc', glow: '0 0 24px rgba(56,189,248,0.45)', glowColor: 'rgba(56,189,248,0.35)',
        labelBg: '#0c4a6e', labelText: '#bae6fd', labelName: 'NADIR', accentColor: '#38bdf8',
        gradient: 'linear-gradient(135deg, #071f33 0%, #0c314d 50%, #061827 100%)',
        winBg: 'radial-gradient(ellipse at 50% 30%, rgba(14,116,144,0.45) 0%, rgba(0,0,0,0.97) 70%)',
        particleColors: ['#38bdf8', '#7dd3fc', '#e0f2fe', '#0ea5e9'], particleCount: 32,
    },
    epic: {
        bg: '#160d25', border: '#7c3aed', iconColor: '#c084fc', glow: '0 0 30px rgba(124,58,237,0.7)', glowColor: 'rgba(124,58,237,0.5)',
        labelBg: '#3b1f6b', labelText: '#d8b4fe', labelName: 'EPİK', accentColor: '#a855f7',
        gradient: 'linear-gradient(135deg, #160d25 0%, #1e0f35 50%, #140a20 100%)',
        winBg: 'radial-gradient(ellipse at 50% 30%, rgba(80,0,180,0.55) 0%, rgba(0,0,0,0.97) 70%)',
        particleColors: ['#a855f7', '#c084fc', '#e879f9', '#f0abfc', '#818cf8', '#fff'], particleCount: 45,
    },
    legendary: {
        bg: '#1a0f00', border: '#f59e0b', iconColor: '#fcd34d', glow: '0 0 40px rgba(245,158,11,0.7)', glowColor: 'rgba(245,158,11,0.6)',
        labelBg: '#78350f', labelText: '#fef3c7', labelName: 'EFSANE', accentColor: '#f59e0b',
        gradient: 'linear-gradient(135deg, #1a0f00 0%, #231400 50%, #1a0a00 100%)',
        winBg: 'radial-gradient(ellipse at 50% 30%, rgba(160,90,0,0.6) 0%, rgba(0,0,0,0.97) 70%)',
        particleColors: ['#fbbf24', '#f59e0b', '#fde68a', '#fff', '#f97316', '#fef08a'], particleCount: 40,
    },
    mythic: {
        bg: '#22051b', border: '#ec4899', iconColor: '#f9a8d4', glow: '0 0 54px rgba(236,72,153,0.75)', glowColor: 'rgba(236,72,153,0.65)',
        labelBg: '#831843', labelText: '#fce7f3', labelName: 'MITIK', accentColor: '#ec4899',
        gradient: 'linear-gradient(135deg, #22051b 0%, #3b082c 48%, #160314 100%)',
        winBg: 'radial-gradient(ellipse at 50% 30%, rgba(190,24,93,0.62) 0%, rgba(0,0,0,0.97) 68%)',
        particleColors: ['#ec4899', '#f9a8d4', '#f0abfc', '#fff', '#fb7185'], particleCount: 52,
    },
    jackpot: {
        bg: '#0a0a00', border: '#ffe234', iconColor: '#ffe234', glow: '0 0 60px rgba(255,226,52,0.9)', glowColor: 'rgba(255,226,52,0.8)',
        labelBg: '#7a5c00', labelText: '#fff9c4', labelName: '★ JACKPOT', accentColor: '#ffe234',
        gradient: 'linear-gradient(135deg, #0a0a00 0%, #1a1400 50%, #0a0a00 100%)',
        winBg: 'radial-gradient(ellipse at 50% 30%, rgba(200,160,0,0.7) 0%, rgba(0,0,0,0.97) 65%)',
        particleColors: ['#ffe234', '#ffd700', '#fff', '#ffec8b', '#ffa500', '#ff6347', '#ff1493'], particleCount: 60,
    },
};

// ─── Web Audio Engine ─────────────────────────────────────────────────────────────
const AudioEngine = (() => {
    let ctx: AudioContext | null = null;
    const getCtx = () => {
        if (!ctx) ctx = new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    };

    const playTick = (pitch = 1.0, vol = 0.25) => {
        try {
            const ac = getCtx();
            const osc = ac.createOscillator(); const gain = ac.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 * pitch, ac.currentTime);
            gain.gain.setValueAtTime(vol, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
            osc.connect(gain); gain.connect(ac.destination);
            osc.start(); osc.stop(ac.currentTime + 0.06);
        } catch { }
    };

    const playCrateShake = () => {
        try {
            const ac = getCtx();
            const osc = ac.createOscillator(); const gain = ac.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.25);
            gain.gain.setValueAtTime(0.8, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
            osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.32);
        } catch { }
    };

    const playCrateOpen = () => {
        try {
            const ac = getCtx();
            [0, 0.05, 0.12].forEach((delay, i) => {
                const o = ac.createOscillator(); const g = ac.createGain(); const f = ac.createBiquadFilter();
                f.type = 'highpass'; f.frequency.value = 600 + i * 200;
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(300 - i * 40, ac.currentTime + delay);
                o.frequency.exponentialRampToValueAtTime(80, ac.currentTime + delay + 0.2);
                g.gain.setValueAtTime(0.5, ac.currentTime + delay);
                g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.25);
                o.connect(f); f.connect(g); g.connect(ac.destination);
                o.start(ac.currentTime + delay); o.stop(ac.currentTime + delay + 0.3);
            });
        } catch { }
    };

    const playWin = (rarity: Rarity) => {
        try {
            const ac = getCtx();
            const seqs: Record<Rarity, number[]> = {
                basic: [392, 494, 523],
                rare: [392, 523, 659],
                epic: [392, 523, 659, 784],
                legendary: [523, 659, 784, 1047, 1319],
                mythic: [440, 554, 659, 880, 1108, 1319],
                jackpot: [4400, 5540, 6590, 8800, 10470, 13190, 17600],
            };
            const type = rarity === 'basic' ? 'triangle' : 'sine';
            seqs[rarity].forEach((freq, i) => {
                const o = ac.createOscillator(); const g = ac.createGain();
                const t = ac.currentTime + i * 0.11;
                o.type = type; o.frequency.value = freq;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.4, t + 0.02);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
                o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.6);
            });
            if (rarity === 'jackpot') {
                const o = ac.createOscillator(); const g = ac.createGain();
                o.type = 'sine'; o.frequency.value = 20;
                o.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.5);
                g.gain.setValueAtTime(0.7, ac.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8);
                o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.9);
            }
        } catch { }
    };

    return { playTick, playCrateShake, playCrateOpen, playWin };
})();

// ─── Particles ─────────────────────────────────────────────────────────────
function Particles({ rarity }: { rarity: Rarity }) {
    const cfg = RARITY_CFG[rarity];
    const particles = useMemo(() =>
        Array.from({ length: cfg.particleCount }, (_, i) => ({
            id: i, x: Math.random() * 100,
            delay: Math.random() * 1.2, dur: 1.8 + Math.random() * 2,
            color: cfg.particleColors[Math.floor(Math.random() * cfg.particleColors.length)],
            size: rarity === 'jackpot' ? 6 + Math.random() * 10 : 4 + Math.random() * 8,
            shape: Math.random() > 0.4 ? 'rect' : 'circle',
            drift: (Math.random() - 0.5) * 320,
            spin: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 6) * 360,
        }))
        , [rarity]);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9800, overflow: 'hidden' }}>
            {particles.map(p => (
                <motion.div key={p.id}
                    initial={{ y: '-5vh', x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{ y: '115vh', x: `calc(${p.x}vw + ${p.drift}px)`, opacity: [1, 1, 0.6, 0], rotate: p.spin, scale: [1, 1.3, 0.7, 0.3] }}
                    transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
                    style={{ position: 'absolute', top: 0, width: p.size, height: p.size, borderRadius: p.shape === 'circle' ? '50%' : '2px', backgroundColor: p.color }}
                />
            ))}
        </div>
    );
}

// ─── Crate Cinematic ─────────────────────────────────────────────────────────────
function CrateCinematic({ tier, onDone }: { tier: CrateTier; onDone: () => void }) {
    const [phase, setPhase] = useState<'appear' | 'shake' | 'open' | 'gone'>('appear');
    const accent = 
        tier === 'mythic' ? '#ec4899' :
        tier === 'legendary' || tier === 'cosmic' ? '#f59e0b' : 
        tier === 'epic' || tier === 'gold' ? '#7c3aed' : 
        tier === 'silver' ? '#94a3b8' : 
        tier === 'bronze' ? '#b45309' :
        tier === 'wooden' ? '#8b4513' : '#6b7280';

    useEffect(() => {
        const t0 = setTimeout(() => { setPhase('shake'); AudioEngine.playCrateShake(); }, 350);
        const t1 = setTimeout(() => AudioEngine.playCrateShake(), 750);
        const t2 = setTimeout(() => AudioEngine.playCrateShake(), 1050);
        const t3 = setTimeout(() => { setPhase('open'); AudioEngine.playCrateOpen(); }, 1350);
        const t4 = setTimeout(() => { setPhase('gone'); onDone(); }, 2100);
        return () => [t0, t1, t2, t3, t4].forEach(clearTimeout);
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <AnimatePresence>
                {phase !== 'gone' && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.2, opacity: 0, filter: 'blur(20px)' }}
                        transition={{ duration: 0.45, type: 'spring', damping: 16 }}
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                        <motion.div
                            animate={phase === 'shake' ? { x: [0, -14, 14, -11, 11, -8, 8, -5, 5, 0], rotate: [0, -5, 5, -4, 4, -2, 2, 0] } : {}}
                            transition={{ duration: 0.22, repeat: phase === 'shake' ? Infinity : 0 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                            {/* LID */}
                            <motion.div
                                animate={phase === 'open' ? { y: -320, rotate: -45, opacity: 0, scale: 0.5 } : { y: 0, rotate: 0, opacity: 1, scale: 1 }}
                                transition={{ duration: 0.55, ease: [0.15, 0, 0.2, 1] }}
                                style={{
                                    width: 200, height: 60, borderRadius: '18px 18px 4px 4px',
                                    background: `linear-gradient(180deg, ${accent}22 0%, ${accent}12 100%)`,
                                    border: `2px solid ${accent}`, boxShadow: `0 0 30px ${accent}50`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <div style={{ width: 48, height: 10, borderRadius: 5, backgroundColor: `${accent}70` }} />
                            </motion.div>

                            {/* BODY */}
                            <div style={{
                                width: 200, height: 160, borderRadius: '4px 4px 22px 22px',
                                background: 'linear-gradient(180deg, #1a1a24 0%, #0d0d14 100%)',
                                border: `2px solid ${accent}`, borderTop: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', overflow: 'hidden',
                                boxShadow: `0 12px 50px rgba(0,0,0,0.7), 0 0 30px ${accent}30`,
                            }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '100%', height: 1, backgroundColor: `${accent}20` }} />
                                </div>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 1, height: '100%', backgroundColor: `${accent}20` }} />
                                </div>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', border: `2px solid ${accent}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: `${accent}35` }} />
                                </div>
                                <AnimatePresence>
                                    {phase === 'open' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 0], scale: [0.4, 2.5, 4] }}
                                            transition={{ duration: 0.55 }}
                                            style={{ position: 'absolute', inset: -60, borderRadius: '50%', background: `radial-gradient(circle, ${accent}dd 0%, transparent 60%)` }}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Reward Zoom Reveal ─────────────────────────────────────────────────────────────
function RewardReveal({ reward, onDone }: { reward: Reward; onDone: () => void }) {
    const cfg = RARITY_CFG[reward.rarity];
    const [stage, setStage] = useState<'zoom' | 'settle' | 'show'>('zoom');

    useEffect(() => {
        AudioEngine.playWin(reward.rarity);
        const t1 = setTimeout(() => setStage('settle'), 500);
        const t2 = setTimeout(() => setStage('show'), 900);
        const t3 = setTimeout(onDone, 4200);
        return () => [t1, t2, t3].forEach(clearTimeout);
    }, []);

    const isRich = reward.rarity === 'legendary' || reward.rarity === 'mythic' || reward.rarity === 'jackpot';

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9700, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: cfg.winBg }}
        >
            {/* Light beams */}
            {isRich && (
                <motion.div
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: [0, 0.25, 0.15], rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear', opacity: { duration: 1.5 } }}
                    style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: `conic-gradient(from 0deg, transparent 0deg, ${cfg.accentColor}22 12deg, transparent 24deg, transparent 48deg, ${cfg.accentColor}18 60deg, transparent 72deg)`,
                    }}
                />
            )}

            {/* Jackpot screen shake */}
            <motion.div
                animate={reward.rarity === 'jackpot' && stage === 'zoom' ? { x: [0, -8, 8, -6, 6, -3, 3, 0], y: [0, -4, 4, -3, 3, 0] } : {}}
                transition={{ duration: 0.5, repeat: 2 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}
            >
                {/* ICON */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={stage === 'zoom' ? { scale: 2.8, rotate: 8 } : { scale: 1, rotate: 0 }}
                    transition={stage === 'zoom'
                        ? { type: 'spring', damping: 7, stiffness: 180 }
                        : { type: 'spring', damping: 14, stiffness: 260 }}
                    style={{ position: 'relative' }}
                >
                    {/* Outer glow pulse */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        style={{ position: 'absolute', inset: -28, borderRadius: '50%', background: `radial-gradient(circle, ${cfg.glowColor} 0%, transparent 65%)`, pointerEvents: 'none' }}
                    />

                    {/* Card */}
                    <motion.div
                        animate={{ boxShadow: [cfg.glow, `0 0 90px ${cfg.glowColor}`, cfg.glow] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        style={{
                            width: 150, height: 150, borderRadius: 32,
                            background: cfg.gradient,
                            border: `3px solid ${cfg.border}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', overflow: 'hidden',
                        }}
                    >
                        {/* Shimmer sweep */}
                        <motion.div
                            animate={{ x: [-200, 320] }}
                            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.4 }}
                            style={{
                                position: 'absolute', top: 0, bottom: 0, width: 80,
                                background: `linear-gradient(90deg, transparent, ${cfg.accentColor}35, transparent)`,
                                transform: 'skewX(-20deg)', pointerEvents: 'none',
                            }}
                        />
                        <div style={{ color: cfg.iconColor, transform: 'scale(1.6)' }}>{reward.icon}</div>
                    </motion.div>
                </motion.div>

                {/* TEXT */}
                <AnimatePresence>
                    {stage === 'show' && (
                        <motion.div
                            initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 140 }}
                            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                        >
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring', damping: 9 }}
                                style={{
                                    display: 'inline-block', padding: '6px 22px', borderRadius: 99,
                                    backgroundColor: cfg.labelBg, color: cfg.labelText,
                                    fontSize: 10, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase',
                                }}
                            >
                                {cfg.labelName}
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                                style={{ color: cfg.accentColor, fontSize: 12, fontWeight: 900, letterSpacing: '0.45em', textTransform: 'uppercase', margin: 0 }}
                            >
                                KAZANDIN!
                            </motion.p>

                            <motion.h2
                                initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring', damping: 11 }}
                                style={{
                                    fontSize: reward.rarity === 'jackpot' ? 56 : 46,
                                    fontWeight: 900, fontStyle: 'italic', margin: 0,
                                    color: reward.rarity === 'jackpot' ? '#ffe234' : reward.rarity === 'legendary' ? '#fcd34d' : reward.rarity === 'epic' ? '#c084fc' : '#e2e8f0',
                                    letterSpacing: '-0.02em', lineHeight: 1,
                                    textShadow: reward.rarity === 'jackpot' ? '0 0 50px #ffe234bb' : 'none',
                                }}
                            >
                                {reward.name}
                            </motion.h2>

                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}
                            >
                                {reward.coinReward > 0 && (
                                    <span style={{ fontWeight: 900, color: '#fff', fontSize: 20 }}>+{reward.coinReward.toLocaleString()} BohoCoin</span>
                                )}
                                {reward.shieldReward && (
                                    <>
                                        {reward.coinReward > 0 && <span style={{ color: '#4b5563' }}>·</span>}
                                        <span style={{ fontWeight: 900, color: '#fff', fontSize: 20 }}>+{reward.shieldReward} Kalkan</span>
                                    </>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

// ─── MAIN CrateOpening COMPONENT ─────────────────────────────────────────────────────────────
const CARD_W = 132;
const CARD_GAP = 8;
const STRIDE = CARD_W + CARD_GAP;
const WINNER_IDX = 54;
const REEL_LEN = 66;

export function CrateOpening({
    onComplete,
    crateTier = 'standard',
    targetRewardId,
}: {
    onComplete: (reward: Reward) => void;
    crateTier?: CrateTier;
    targetRewardId?: string;
    key?: React.Key;
}) {
    const [phase, setPhase] = useState<'crate' | 'spin' | 'result'>('crate');
    const [result, setResult] = useState<Reward | null>(null);
    const controls = useAnimation();
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const pool = POOLS[crateTier];

    const reelRewards = useMemo(() => {
        const poolRewards = pool.map(e => e.reward);
        const arr: Reward[] = Array.from({ length: REEL_LEN }, () =>
            poolRewards[Math.floor(Math.random() * poolRewards.length)]
        );
        const winner = targetRewardId
            ? pool.find(e => e.reward.id === targetRewardId)?.reward ?? pickReward(crateTier)
            : pickReward(crateTier);
        arr[WINNER_IDX] = winner;
        return arr;
    }, [crateTier, targetRewardId]);

    const winner = reelRewards[WINNER_IDX];

    const startSpin = useCallback(async () => {
        const finalOffset = WINNER_IDX * STRIDE + CARD_W / 2;
        const DURATION = 7000;
        const startTime = Date.now();
        let lastFired = -1;

        tickRef.current = setInterval(() => {
            const el = Date.now() - startTime;
            const p = Math.min(el / DURATION, 1);
            const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            const currentOff = eased * finalOffset;
            const idx = Math.round((currentOff - CARD_W / 2) / STRIDE);
            if (idx !== lastFired && idx >= 0 && idx < REEL_LEN) {
                lastFired = idx;
                const speed = 1 - p;
                AudioEngine.playTick(0.6 + speed * 0.95, 0.1 + speed * 0.28);
            }
        }, 22);

        await controls.start({
            x: -finalOffset,
            transition: { duration: DURATION / 1000, ease: [0.15, 0, 0.05, 1] },
        });

        if (tickRef.current) clearInterval(tickRef.current);
        setResult(winner);
        setPhase('result');
    }, [controls, winner]);

    const handleCrateDone = useCallback(() => {
        setPhase('spin');
        setTimeout(startSpin, 60);
    }, [startSpin]);

    const handleResultDone = useCallback(() => {
        onComplete(winner);
    }, [onComplete, winner]);

    useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

    const content = (
        <>
            {phase === 'result' && result && <Particles rarity={result.rarity} />}
            {phase === 'crate' && <CrateCinematic tier={crateTier} onDone={handleCrateDone} />}
            {phase === 'result' && result && <RewardReveal reward={result} onDone={handleResultDone} />}

            <AnimatePresence>
                {phase === 'spin' && (
                    <motion.div
                        key="spin"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.96)' }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            style={{ textAlign: 'center', marginBottom: 40 }}
                        >
                            <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', fontWeight: 900, fontStyle: 'italic', color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>
                                ODUL KASASI ACILIYOR
                            </h2>
                            <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 900 }}>
                                BohoCoin Odul Hatti
                            </p>
                        </motion.div>

                        <div style={{ position: 'relative', width: '100%', maxWidth: 920 }}>
                            {/* Fade sides */}
                            {(['left', 'right'] as const).map(side => (
                                <div key={side} style={{
                                    position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 130, zIndex: 10, pointerEvents: 'none',
                                    background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgba(0,0,0,0.99) 0%, transparent 100%)`,
                                }} />
                            ))}

                            {/* Center marker */}
                            <div style={{ position: 'absolute', inset: 0, left: '50%', transform: 'translateX(-50%)', width: CARD_W + 4, zIndex: 20, pointerEvents: 'none' }}>
                                <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '14px solid #f59e0b', filter: 'drop-shadow(0 0 8px #f59e0b)' }} />
                                <div style={{ position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '14px solid #f59e0b', filter: 'drop-shadow(0 0 8px #f59e0b)' }} />
                                <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 2, background: '#f59e0b', boxShadow: '0 0 14px #f59e0b, 0 0 28px #f59e0b80' }} />
                                <div style={{ position: 'absolute', inset: '0 0 0 auto', width: 2, background: '#f59e0b', boxShadow: '0 0 14px #f59e0b, 0 0 28px #f59e0b80' }} />
                            </div>

                            {/* Track */}
                            <div style={{
                                height: 158, overflow: 'hidden',
                                borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                                background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
                            }}>
                                <motion.div animate={controls} style={{ display: 'flex', gap: CARD_GAP, paddingLeft: '50%', x: 0, willChange: 'transform' }}>
                                    {reelRewards.map((rw, i) => {
                                        const rcfg = RARITY_CFG[rw.rarity];
                                        return (
                                            <div key={`${rw.id}-${i}`} style={{
                                                width: CARD_W, height: 136, flexShrink: 0, borderRadius: 20,
                                                background: rcfg.gradient, border: `2px solid ${rcfg.border}`,
                                                boxShadow: rw.rarity !== 'basic' ? rcfg.glow : 'none',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                gap: 6, position: 'relative', overflow: 'hidden',
                                            }}>
                                                {rw.rarity !== 'basic' && (
                                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(135deg, transparent 30%, ${rcfg.accentColor}18 50%, transparent 70%)` }} />
                                                )}
                                                <div style={{ color: rcfg.iconColor }}>{rw.icon}</div>
                                                <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: rcfg.iconColor, opacity: 0.85, textAlign: 'center', padding: '0 6px', lineHeight: 1.3 }}>
                                                    {rw.name}
                                                </span>
                                                <span style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 99, backgroundColor: rcfg.labelBg, color: rcfg.labelText }}>
                                                    {rcfg.labelName}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            </div>
                        </div>

                        <motion.p
                            animate={{ opacity: [0.25, 0.65, 0.25] }} transition={{ duration: 1.4, repeat: Infinity }}
                            style={{ marginTop: 28, fontSize: 10, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 900 }}
                        >
                            Kasa donuyor...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
