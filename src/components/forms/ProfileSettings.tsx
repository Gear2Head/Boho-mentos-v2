/**
 * AMAÇ: Profil ayarları, hesap kurulum sihirbazı ve avatar yönetimi
 * MANTIK: Setup wizard (ilk açılış) ve edit mode arasında geçiş yapar. Avatar Base64 olarak store'a kaydedilir.
 * UYARI: Avatar Base64 büyük olabilir — IndexedDB persist ile sorunsuz çalışır.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Target, Save, Search, Camera, X, User } from 'lucide-react';
import type { StudentProfile } from '../../types';
import { searchUniGoals, type UniGoal } from '../../data/uniGoals';

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
  const [uniSuggestions, setUniSuggestions] = useState<UniGoal[]>([]);
  const [majorSuggestions, setMajorSuggestions] = useState<UniGoal[]>([]);

  useEffect(() => {
    if (uniSearchFocus && targetUni.length >= 2) {
      setUniSuggestions(searchUniGoals(targetUni));
    } else {
      setUniSuggestions([]);
    }
  }, [targetUni, uniSearchFocus]);

  useEffect(() => {
    if (majorSearchFocus && targetMajor.length >= 2) {
      setMajorSuggestions(searchUniGoals(targetMajor));
    } else {
      setMajorSuggestions([]);
    }
  }, [targetMajor, majorSearchFocus]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 2;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Resim çok büyük. Maksimum ${MAX_SIZE_MB}MB yükleyebilirsin.`);
      return;
    }

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
      callback(canvas.toDataURL('image/jpeg', 0.82));
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

  const handleSelectUni = (goal: UniGoal) => {
    setTargetUni(goal.university);
    setTargetMajor(goal.major);
    if (goal.examType === 'TYT') {
      setTytTarget(goal.lastEntrantNet);
      setAytTarget(0);
    } else {
      setAytTarget(goal.lastEntrantNet);
      setTytTarget(Math.round(goal.lastEntrantNet * 1.2));
    }
    setUniSearchFocus(false);
  };

  const handleSelectMajor = (goal: UniGoal) => {
    setTargetMajor(goal.major);
    setTargetUni(goal.university);
    if (goal.examType === 'TYT') {
      setTytTarget(goal.lastEntrantNet);
      setAytTarget(0);
    } else {
      setAytTarget(goal.lastEntrantNet);
      setTytTarget(Math.round(goal.lastEntrantNet * 1.2));
    }
    setMajorSearchFocus(false);
  };

  const wrapperClass = isEditMode
    ? 'bg-transparent text-ink'
    : 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl';

  const containerClass = isEditMode
    ? 'w-full space-y-8'
    : 'bg-[#121212] border border-[#2A2A2A] rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar';

  return (
    <div className={wrapperClass}>
      <div className={containerClass}>
        {!isEditMode && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#C17767]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target size={32} className="text-[#C17767]" />
            </div>
            <h2 className="font-serif italic text-4xl text-[#C17767] mb-2">Hesap Kurulumu</h2>
            <p className="text-xs uppercase tracking-widest text-ink-muted font-bold">Rotanı çizmeden yelken açamazsın</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar Picker */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border border-[#2A2A2A] rounded-2xl bg-[#161616]">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#C17767]/40 bg-[#1A1A1A]">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {name ? (
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
                        alt="default"
                        className="w-full h-full"
                      />
                    ) : (
                      <User size={36} className="text-zinc-600" />
                    )}
                  </div>
                )}
              </div>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(undefined)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={12} className="text-white" />
                </button>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs uppercase tracking-widest font-bold text-[#C17767] mb-1">Profil Resmi</p>
              <p className="text-sm text-ink-muted mb-4">Fotoğraf, çizim veya avatar yükle. Maks 2MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C17767]/10 border border-[#C17767]/40 text-[#C17767] rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[#C17767] hover:text-white transition-all"
              >
                <Camera size={14} /> Fotoğraf Seç
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">Adın / Mahlasın</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none text-zinc-200" placeholder="Örn: Savaşçı" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">Alan</label>
              <select value={track} onChange={e => setTrack(e.target.value as any)} className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none text-zinc-200">
                <option value="Sayısal">Sayısal - Mühendislik/Tıp</option>
                <option value="Eşit Ağırlık">Eşit Ağırlık - Hukuk/İşletme</option>
                <option value="Sözel">Sözel - İletişim/Tarih</option>
                <option value="Dil">Dil - Mütercim/Öğretmenlik</option>
              </select>
            </div>
          </div>

          <div className="space-y-6 p-6 border border-[#2A2A2A] bg-[#161616] rounded-2xl relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Search size={48} />
            </div>
            <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C17767] border-b border-[#2A2A2A] pb-2">YÖK Atlas Entegrasyonlu Hedef</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 relative">
                <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">Hedef Üniversite</label>
                <input
                  type="text" required value={targetUni} onChange={e => setTargetUni(e.target.value)}
                  onFocus={() => setUniSearchFocus(true)} onBlur={() => setTimeout(() => setUniSearchFocus(false), 200)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none text-zinc-200"
                  placeholder="Örn: Boğaziçi Üniversitesi"
                />
                {uniSearchFocus && uniSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {uniSuggestions.map(g => (
                      <div key={g.id} onMouseDown={() => handleSelectUni(g)} className="p-3 hover:bg-[#C17767]/20 border-b border-[#2A2A2A] cursor-pointer group">
                        <div className="text-sm font-bold text-zinc-200 group-hover:text-[#C17767]">{g.university}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">{g.major} • {g.examType} {g.lastEntrantNet} NET</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 relative">
                <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">Hedef Bölüm</label>
                <input
                  type="text" required value={targetMajor} onChange={e => setTargetMajor(e.target.value)}
                  onFocus={() => setMajorSearchFocus(true)} onBlur={() => setTimeout(() => setMajorSearchFocus(false), 200)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none text-zinc-200"
                  placeholder="Örn: Bilgisayar Mühendisliği"
                />
                {majorSearchFocus && majorSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {majorSuggestions.map(g => (
                      <div key={g.id} onMouseDown={() => handleSelectMajor(g)} className="p-3 hover:bg-[#C17767]/20 border-b border-[#2A2A2A] cursor-pointer group">
                        <div className="text-sm font-bold text-zinc-200 group-hover:text-[#C17767]">{g.major}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">{g.university} • {g.examType} {g.lastEntrantNet} NET</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-amber-500/80 bg-amber-950/20 px-3 py-2 rounded uppercase tracking-widest">
              Öneri: YÖK Atlas veritabanından seçim yaparsan, TYT ve AYT hedeflerin otomatik hesaplanır.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-[#2A2A2A] rounded-2xl bg-[#1A1A1A]">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">TYT Net Hedefi</label>
              <input type="number" required min="0" max="120" value={tytTarget} onChange={e => setTytTarget(Number(e.target.value))} className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none font-mono text-zinc-200" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">AYT Net Hedefi</label>
              <input type="number" required min="0" max="80" value={aytTarget} onChange={e => setAytTarget(Number(e.target.value))} className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none font-mono text-zinc-200" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 text-[#C17767]">Koç Karakteri</label>
            <select value={coachPersonality} onChange={e => setCoachPersonality(e.target.value as any)} className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-sm focus:border-[#C17767] transition-colors outline-none text-zinc-200">
              <option value="harsh">Disipliner — Gerçekleri yüzüne vurur, mazeret sevmez (Önerilen)</option>
              <option value="motivational">Destekleyici — Hata yapsan da motive eder, sakinleştirir</option>
              <option value="analytical">Analitik — Sadece sayılarla ve mantıkla konuşur</option>
            </select>
          </div>

          <button type="submit" className="w-full py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold tracking-[0.3em] uppercase hover:bg-[#A56253] transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
            <Save size={18} /> {isEditMode ? 'DEĞİŞİKLİKLERİ KAYDET' : 'HEDEFİ KİLİTLE VE BAŞLA'}
          </button>
        </form>
      </div>
    </div>
  );
}
