/**
 * AMAÇ: Profil ayarları, hesap kurulum sihirbazı ve avatar yönetimi
 * MANTIK: Ultra-Elite Boho tasarımı (Glassmorphism, High-Energy Backdrop).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Target, Save, Search, Camera, User } from 'lucide-react';
import type { StudentProfile } from '../../types';
import { searchYokAtlas, getYokAtlasById, type YokAtlasProgram } from '../../data/yokAtlasData';

interface ProfileSettingsProps {
  onSubmit: (profile: StudentProfile) => void;
  initialData?: StudentProfile | null;
  isEditMode?: boolean;
}

export function ProfileSettings({ onSubmit, initialData, isEditMode = false }: ProfileSettingsProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [track, setTrack] = useState<'Sayısal' | 'Eşit Ağırlık' | 'Sözel' | 'Dil'>(initialData?.track || 'Sayısal');
  const [targetUni, setTargetUni] = useState(initialData?.targetUniversity || '');
  const [targetMajor, setTargetMajor] = useState(initialData?.targetMajor || '');
  const [tytTarget, setTytTarget] = useState(initialData?.tytTarget || 80);
  const [aytTarget, setAytTarget] = useState(initialData?.aytTarget || 60);
  const [examYear, setExamYear] = useState(initialData?.examYear || '2026');
  const [coachPersonality, setCoachPersonality] = useState(initialData?.coachPersonality || 'harsh');
  const [minHours, setMinHours] = useState(initialData?.minHours || 4);
  const [avatar, setAvatar] = useState<string | undefined>(initialData?.avatar);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uniSearchFocus, setUniSearchFocus] = useState(false);
  const [majorSearchFocus, setMajorSearchFocus] = useState(false);
  const [uniSuggestions, setUniSuggestions] = useState<YokAtlasProgram[]>([]);

  useEffect(() => {
    if (uniSearchFocus && targetUni.length >= 2) {
      setUniSuggestions(searchYokAtlas(targetUni, track));
    } else {
      setUniSuggestions([]);
    }
  }, [targetUni, uniSearchFocus, track]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      compressImage(dataUrl, 400, (compressed) => setAvatar(compressed));
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (dataUrl: string, maxPx: number, callback: (result: string) => void) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxPx / img.width, maxPx / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) { callback(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name, track, targetUniversity: targetUni, targetMajor, tytTarget, aytTarget,
      examYear, coachPersonality, minHours, avatar,
      dailyGoalHours: minHours,
      minDailyQuestions: initialData?.minDailyQuestions || 100,
      maxDailyQuestions: initialData?.maxDailyQuestions || 300,
      exam: 'YKS', maxHours: minHours + 2, startTime: '09:00', endTime: '22:00',
      difficultyLevel: 'Ortalama'
    } as unknown as StudentProfile);
  };

  const handleSelectUni = (program: YokAtlasProgram) => {
    setTargetUni(program.university);
    setTargetMajor(program.major);
    setTytTarget(program.tytNet);
    setAytTarget(program.aytNet);
    setUniSearchFocus(false);
  };

  return (
    <div className={isEditMode ? "p-0" : "fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 overflow-hidden"}>
      {!isEditMode && (
        <div className="absolute inset-0 bg-[#020202] overflow-hidden">
          {/* Hareketli Leke Efektleri (Dynamic Backdrop) */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#C17767]/15 rounded-full blur-[140px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.05]" />
        </div>
      )}

      <div className={isEditMode ? "w-full" : "relative w-full max-w-2xl bg-[#0F0F0F]/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] p-6 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] max-h-[95vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-500"}>
        <div className="text-center mb-8 md:mb-12">
          {!isEditMode && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-[#C17767]/30 to-transparent rounded-2xl md:rounded-[2rem] mb-4 md:mb-6 border border-[#C17767]/30 shadow-2xl shadow-[#C17767]/10 group transition-all duration-500 hover:rotate-12">
                <Target size={32} className="text-[#C17767] transition-transform group-hover:scale-110 md:hidden" />
                <Target size={44} className="text-[#C17767] transition-transform group-hover:scale-110 hidden md:block" />
              </div>
              <h2 className="font-serif italic text-3xl md:text-5xl text-white mb-2 md:mb-3 tracking-tight">Kaderini Çiz</h2>
              <p className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] md:tracking-[0.5em] text-zinc-500 font-black opacity-80">Gelecek, onu bugünden inşa edenlerindir</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10 pb-8">
          {/* Avatar Section - Premium Feel */}
          <div className="group relative flex flex-col items-center p-0.5 rounded-[1.5rem] md:rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent">
            <div className="w-full bg-[#1A1A1A]/90 backdrop-blur-md rounded-[1.4rem] md:rounded-[2.4rem] p-4 md:p-8 flex flex-col items-center">
              <div className="relative mb-3 md:mb-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl overflow-hidden border-[3px] border-[#C17767]/40 bg-zinc-950 p-1.5 shadow-[0_0_40px_rgba(193,119,103,0.15)] transition-all duration-500 group-hover:border-[#C17767]">
                  {avatar ? (
                    <img src={avatar} alt="P" className="w-full h-full object-cover rounded-xl md:rounded-2xl" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
                      <User size={40} className="text-zinc-800" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 md:gap-4">
                <p className="text-[9px] md:text-xs font-bold text-[#C17767] uppercase tracking-widest mb-0.5 md:mb-1">Görsel Kimlik</p>
                <label htmlFor="avatar-up" className="px-4 py-1.5 md:px-6 md:py-2 bg-[#C17767]/10 border border-[#C17767]/30 text-[#C17767] rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#C17767] hover:text-white transition-all duration-300">
                  Karakter Seç
                  <input ref={fileInputRef} id="avatar-up" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-[#C17767] ml-2">KOD ADIN / MAHLASIN</label>
              <div className="relative">
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white placeholder:text-zinc-700 focus:border-[#C17767] focus:ring-1 focus:ring-[#C17767]/30 transition-all outline-none"
                  placeholder="Örn: Savaşçı"
                />
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-[#C17767] ml-2">AKADEMİK ALAN</label>
              <div className="relative">
                <select
                  value={track} onChange={e => setTrack(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white focus:border-[#C17767] transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="Sayısal">Sayısal — Mühendislik / Tıp</option>
                  <option value="Eşit Ağırlık">Eşit Ağırlık — Hukuk / İşletme</option>
                  <option value="Sözel">Sözel — İletişim / Tarih</option>
                  <option value="Dil">Dil — Mütercim / Edebiyat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Atlas Section - Neon Accent */}
          <div className="relative p-[1px] rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-gradient-to-br from-white/10 via-transparent to-white/5 shadow-2xl">
            <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl rounded-[1.9rem] md:rounded-[2.9rem] p-5 md:p-8 space-y-6 md:space-y-8">
              <div className="flex items-center gap-3 md:gap-4 border-b border-white/[0.05] pb-4 md:pb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#C17767]/20 rounded-lg md:rounded-xl flex items-center justify-center shadow-inner">
                  <Search size={14} className="text-[#C17767] md:hidden" />
                  <Search size={18} className="text-[#C17767] hidden md:block" />
                </div>
                <div>
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-white leading-tight">YÖK Atlas Entegrasyonu</h3>
                  <p className="text-[8px] md:text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">Gerçek verilerle hedefini seç</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-2 md:space-y-3 relative">
                  <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">ÜNİVERSİTE</label>
                  <input
                    type="text" required value={targetUni} onChange={e => setTargetUni(e.target.value)}
                    onFocus={() => setUniSearchFocus(true)} onBlur={() => setTimeout(() => setUniSearchFocus(false), 250)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white focus:bg-white/5 focus:border-[#C17767] transition-all outline-none"
                    placeholder="Kurum ara..."
                  />
                  {uniSearchFocus && uniSuggestions.length > 0 && (
                    <div className="absolute z-[100] w-full mt-2 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-top-4 duration-300 max-h-[30vh] overflow-y-auto custom-scrollbar">
                      {uniSuggestions.map(g => (
                        <div key={g.id} onMouseDown={() => handleSelectUni(g)} className="p-4 hover:bg-[#C17767] transition-all cursor-pointer border-b border-white/5 last:border-0 group">
                          <div className="text-[11px] font-bold text-white group-hover:text-white leading-tight">{g.university}</div>
                          <div className="text-[9px] text-zinc-500 group-hover:text-white/70 mt-1 uppercase tracking-tighter">{g.major} • {g.examType}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3 relative">
                  <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">BÖLÜM / FAKÜLTE</label>
                  <input
                    type="text" required value={targetMajor} onChange={e => setTargetMajor(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm text-white focus:bg-white/5 focus:border-[#C17767] transition-all outline-none"
                    placeholder="Fakülte/Bölüm..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            <div className="p-4 md:p-6 bg-black/40 border border-white/[0.03] rounded-2xl md:rounded-[2rem] flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 transition-all hover:border-[#C17767]/30">
              <label className="text-[8px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">TYT HEDEF</label>
              <input type="number" value={tytTarget} onChange={e => setTytTarget(Number(e.target.value))} className="w-20 md:w-full bg-transparent text-2xl md:text-4xl font-serif italic text-center text-[#C17767] outline-none" />
            </div>
            <div className="p-4 md:p-6 bg-black/40 border border-white/[0.03] rounded-2xl md:rounded-[2rem] flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 transition-all hover:border-[#C17767]/30">
              <label className="text-[8px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">AYT HEDEF</label>
              <input type="number" value={aytTarget} onChange={e => setAytTarget(Number(e.target.value))} className="w-20 md:w-full bg-transparent text-2xl md:text-4xl font-serif italic text-center text-[#C17767] outline-none" />
            </div>
            <div className="p-4 md:p-6 bg-black/40 border border-white/[0.03] rounded-2xl md:rounded-[2rem] flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 transition-all hover:border-[#C17767]/30">
              <label className="text-[8px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">GECE MESAİ</label>
              <input type="number" value={minHours} onChange={e => setMinHours(Number(e.target.value))} className="w-20 md:w-full bg-transparent text-2xl md:text-4xl font-serif italic text-center text-blue-400 outline-none" />
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            <label className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.3em] md:tracking-[0.4em] text-[#C17767] ml-2">KOÇ KARAKTERİN</label>
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {[
                { id: 'harsh', label: 'DİSİPLİNER', desc: 'Gerçekleri yüzüne vurur, mazeret sevmez.', icon: '💀' },
                { id: 'motivational', label: 'DESTEKLEYİCİ', desc: 'Potansiyelini hatırlar, sana inanır.', icon: '🔥' },
                { id: 'analytical', label: 'ANALİTİK', desc: 'Verilerle konuşur, mantıkla yolunu çizer.', icon: '📊' }
              ].map(p => (
                <button
                  key={p.id} type="button"
                  onClick={() => setCoachPersonality(p.id as any)}
                  className={`relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 text-left transition-all duration-500 overflow-hidden ${coachPersonality === p.id ? 'bg-[#C17767] border-[#C17767] text-white shadow-2xl scale-[1.01]' : 'bg-white/[0.03] border-white/[0.05] text-zinc-400 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className="text-xl md:text-2xl">{p.icon}</span>
                    <div>
                      <div className="text-[10px] md:text-xs font-black tracking-widest mb-0.5 md:mb-1">{p.label}</div>
                      <div className={`text-[8px] md:text-[10px] uppercase font-medium leading-none ${coachPersonality === p.id ? 'text-white/80' : 'text-zinc-600'}`}>{p.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="group relative w-full py-5 md:py-6 bg-[#C17767] text-white rounded-2xl md:rounded-[2rem] text-xs md:text-sm font-black tracking-[0.4em] md:tracking-[0.5em] uppercase shadow-[0_20px_50px_rgba(193,119,103,0.3)] hover:bg-[#A56253] transition-all duration-500 overflow-hidden active:scale-95"
          >
            SİSTEMİ BAŞLAT
          </button>
        </form>
      </div>
    </div>
  );
}
