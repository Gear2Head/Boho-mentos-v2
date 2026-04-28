import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Palette, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const PRESETS = [
  { name: 'Boho Rose', color: '#C17767', description: 'Klasik · Sıcak' },
  { name: 'Cyber Blue', color: '#3B82F6', description: 'Teknolojik · Soğuk' },
  { name: 'Forest Green', color: '#10B981', description: 'Doğal · Sakin' },
  { name: 'Gold Rush', color: '#F59E0B', description: 'Prestij · Altın' },
  { name: 'Crimson War', color: '#EF4444', description: 'Agresif · Güçlü' },
  { name: 'Royal Purple', color: '#8B5CF6', description: 'Mistik · Derin' },
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ThemeStudio() {
  const eloScore = useAppStore(s => s.eloScore);
  const isLocked = eloScore < 1000;

  if (isLocked) {
    return (
      <div className="glass-card p-8 rounded-[32px] border border-white/5 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
        <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)] group-hover:scale-110 transition-transform">
           <Palette size={32} />
        </div>
        <div>
          <h3 className="font-display italic text-xl font-bold text-zinc-100">Theme Studio Kilitli</h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-[240px]">
            Bu özellik yalnızca <span className="text-amber-500 font-bold">1000 ELO</span> ve üzeri savaşçılar içindir. Savaşmaya devam et!
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl border border-white/5">
           <span className="text-[10px] font-black text-zinc-600">MEVCUT ELO:</span>
           <span className="text-sm font-mono font-bold text-amber-500">{eloScore}</span>
        </div>
      </div>
    );
  }

  const accentColor = useAppStore(s => s.ambientColor !== 'transparent' ? '#C17767' : '#C17767');
  const [selectedColor, setSelectedColor] = useState('#C17767');
  const [applied, setApplied] = useState(false);

  const applyColor = (color: string) => {
    setSelectedColor(color);
    document.documentElement.style.setProperty('--accent-color', color);
    // Also update CSS vars for hover/transparency variants
    const { h, s, l } = hexToHsl(color);
    document.documentElement.style.setProperty('--accent-h', String(h));
    document.documentElement.style.setProperty('--accent-s', `${s}%`);
    document.documentElement.style.setProperty('--accent-l', `${l}%`);
    localStorage.setItem('boho_accent_color', color);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-[28px] border border-app"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl border" style={{ backgroundColor: `${selectedColor}15`, borderColor: `${selectedColor}30` }}>
          <Palette size={18} style={{ color: selectedColor }} />
        </div>
        <div>
          <h3 className="font-display italic text-lg font-bold text-zinc-100 leading-none">Theme Studio</h3>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5 font-black">Renk Paleti Kişiselleştirme</p>
        </div>
        {applied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ml-auto flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase tracking-widest"
          >
            <Check size={12} /> Uygulandı
          </motion.div>
        )}
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyColor(preset.color)}
            className={`relative p-3 rounded-2xl border transition-all group ${
              selectedColor === preset.color
                ? 'border-white/20 scale-[1.02]'
                : 'border-white/5 hover:border-white/15'
            }`}
            style={{ backgroundColor: `${preset.color}10` }}
          >
            <div
              className="w-8 h-8 rounded-xl mx-auto mb-2 shadow-lg transition-transform group-hover:scale-110"
              style={{ backgroundColor: preset.color, boxShadow: `0 4px 12px ${preset.color}40` }}
            />
            {selectedColor === preset.color && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <Check size={10} className="text-white" />
              </div>
            )}
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 text-center">{preset.name}</p>
            <p className="text-[8px] text-zinc-600 text-center mt-0.5">{preset.description}</p>
          </button>
        ))}
      </div>

      {/* Custom Color Picker */}
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-widest font-black text-zinc-500 mb-2">Özel Renk</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={selectedColor}
              onChange={e => setSelectedColor(e.target.value)}
              className="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={selectedColor}
              onChange={e => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setSelectedColor(e.target.value);
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-white/30"
              placeholder="#C17767"
            />
          </div>
        </div>
        <button
          onClick={() => applyColor(selectedColor)}
          className="px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:brightness-110"
          style={{ backgroundColor: selectedColor }}
        >
          Uygula
        </button>
      </div>

      {/* Live Preview */}
      <div className="mt-4 p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
        <p className="text-[9px] uppercase tracking-widest font-black text-zinc-600 mb-3">Önizleme</p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl" style={{ backgroundColor: selectedColor }} />
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: selectedColor }} />
          </div>
          <div
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
            style={{ backgroundColor: selectedColor }}
          >
            Boho
          </div>
        </div>
      </div>
    </motion.div>
  );
}
