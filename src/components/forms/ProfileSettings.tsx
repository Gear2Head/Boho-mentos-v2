/**
 * AMAÇ: Profil ayarları ve hedef yönetimi
 * MANTIK: YÖK Atlas veritabanından dinamik autocomplete ile hedef üniversite/bölüm seçimi
 */

import React, { useState, useEffect } from 'react';
import { Target, Save, X, Search } from 'lucide-react';
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

  // Autocomplete state
  const [uniSearchFocus, setUniSearchFocus] = useState(false);
  const [majorSearchFocus, setMajorSearchFocus] = useState(false);
  const [uniSuggestions, setUniSuggestions] = useState<UniGoal[]>([]);
  const [majorSuggestions, setMajorSuggestions] = useState<UniGoal[]>([]);

  // Üniversite Arama
  useEffect(() => {
    if (uniSearchFocus && targetUni.length >= 2) {
      setUniSuggestions(searchUniGoals(targetUni));
    } else {
      setUniSuggestions([]);
    }
  }, [targetUni, uniSearchFocus]);

  // Bölüm Arama
  useEffect(() => {
    if (majorSearchFocus && targetMajor.length >= 2) {
      setMajorSuggestions(searchUniGoals(targetMajor));
    } else {
      setMajorSuggestions([]);
    }
  }, [targetMajor, majorSearchFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name, track, targetUniversity: targetUni, targetMajor, tytTarget, aytTarget, examYear, coachPersonality, minHours,
      dailyGoalHours: minHours, // default mapping
      minDailyQuestions: initialData?.minDailyQuestions || 100,
      maxDailyQuestions: initialData?.maxDailyQuestions || 300,
      exam: 'YKS', maxHours: minHours + 2, startTime: '09:00', endTime: '22:00',
      difficultyLevel: 'Ortalama'
    } as unknown as StudentProfile);
  };

  const handleSelectUni = (goal: UniGoal) => {
    setTargetUni(goal.university);
    setTargetMajor(goal.major);
    // Tipik TYT AYT hedeflerini otomatik çek
    if (goal.examType === 'TYT') {
      setTytTarget(goal.lastEntrantNet);
      setAytTarget(0);
    } else {
      setAytTarget(goal.lastEntrantNet);
      setTytTarget(Math.round(goal.lastEntrantNet * 1.2)); // Kaba TYT tahmini tahmini
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
    ? "bg-transparent text-zinc-200" 
    : "fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl";

  const containerClass = isEditMode
    ? "w-full space-y-8"
    : "bg-[#121212] border border-[#2A2A2A] rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar";

  return (
    <div className={wrapperClass}>
      <div className={containerClass}>
        {!isEditMode && (
          <div className="text-center mb-8">
            <h2 className="font-serif italic text-4xl text-[#C17767] mb-2">Hedef Belirleme</h2>
            <p className="text-xs uppercase tracking-widest text-[#4A443C] dark:text-zinc-500 font-bold">Rotanı çizmeden yelken açamazsın</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <button type="submit" className="w-full py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold tracking-[0.3em] uppercase hover:bg-[#A56253] transition-all flex items-center justify-center gap-3">
            <Save size={18} /> {isEditMode ? 'DEĞİŞİKLİKLERİ KAYDET' : 'HEDEFİ KİLİTLE VE BAŞLA'}
          </button>
        </form>
      </div>
    </div>
  );
}
