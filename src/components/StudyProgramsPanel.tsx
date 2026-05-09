import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/appStore';
import { studyPrograms } from '../data/studyPrograms';
import { FileText, Download, Calendar, ArrowRight, Target, Activity, CheckCircle2 } from 'lucide-react';

export function StudyProgramsPanel() {
  const profile = useAppStore(s => s.profile);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  
  const userTrack = profile?.track || 'SAY';

  const getAytSubjectsForTrack = (track: string) => {
    if (track === 'EA') return ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'];
    return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
  };

  const activeAytSubjects = aytSubjects.filter(s => getAytSubjectsForTrack(userTrack).includes(s.subject));
  
  const tytMastered = tytSubjects.filter(s => s.status === 'mastered').length;
  const aytMastered = activeAytSubjects.filter(s => s.status === 'mastered').length;
  
  const totalMastered = tytMastered + aytMastered;
  const totalSubjects = tytSubjects.length + activeAytSubjects.length;
  
  // 39 haftalık toplam müfredatta öğrencinin tahmini konumu
  let estimatedWeek = Math.max(1, Math.ceil((totalMastered / Math.max(1, totalSubjects)) * 39));
  
  // Eğer TYT %80'den fazla bitmişse, öğrenci en az 15. haftadadır (AYT ağırlıklı dönem)
  if (tytMastered / Math.max(1, tytSubjects.length) > 0.8 && estimatedWeek < 15) {
     estimatedWeek = 15;
  }

  // Sadece öğrencinin alanına ve ortak programlara ait olanları filtrele
  const relevantPrograms = useMemo(() => {
    return studyPrograms.filter(p => p.track === userTrack || p.track === 'Ortak');
  }, [userTrack]);

  const activeProgram = relevantPrograms.find(p => p.week === estimatedWeek) || relevantPrograms[0];

  const [showAll, setShowAll] = useState(false);
  const displayedPrograms = showAll ? relevantPrograms.filter(p => p.week !== estimatedWeek) : [];

  if (!activeProgram) return null;

  return (
    <div className="glass-card p-8 rounded-[32px] relative overflow-hidden group border border-app shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none opacity-50" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
            <Target size={24} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-display italic text-2xl font-bold text-zinc-100 leading-none">Resmi Müfredat Planı</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1.5 font-black">Sistem Analizi • {userTrack} Alanı</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sol Analiz Paneli */}
        <div className="bg-surface-2/50 border border-app rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
               <Activity size={14} className="text-blue-400" />
               <span className="text-[10px] uppercase tracking-widest font-black text-blue-400">Durum Analizi</span>
             </div>
             <span className="text-xs font-mono text-zinc-400">Hafta {estimatedWeek} / 39</span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed font-medium mb-6">
            Yapay zeka analizine göre TYT'de <strong>%{Math.round((tytMastered/Math.max(1, tytSubjects.length))*100)}</strong>, AYT'de <strong>%{Math.round((aytMastered/Math.max(1, activeAytSubjects.length))*100)}</strong> başarı sağladın. 
            Müfredat ilerlemene göre şu an <strong className="text-white">Hafta {estimatedWeek}</strong> seviyesindesin. Aşağıdaki resmi planı indirip haftalık check-in yapabilirsin.
          </p>

          <a 
            href={activeProgram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
          >
            <Download size={16} />
            Hafta {estimatedWeek} Planını İndir
          </a>
        </div>

        {/* Sağ Özet Paneli */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-2">GELECEK HAFTALAR</h4>
          {relevantPrograms.filter(p => p.week > estimatedWeek).slice(0, 3).map((prog, idx) => (
            <a
              key={idx}
              href={prog.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-surface hover:bg-zinc-800/80 border border-app hover:border-blue-500/30 rounded-xl transition-all group/item"
            >
              <div className="flex items-center gap-3">
                <FileText size={14} className="text-zinc-500 group-hover/item:text-blue-400" />
                <span className="text-sm font-bold text-zinc-300 group-hover/item:text-blue-100">{prog.title}</span>
              </div>
              <ArrowRight size={14} className="text-zinc-600 group-hover/item:text-blue-400 opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0" />
            </a>
          ))}
          
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-3 mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            {showAll ? 'Gizle' : 'Tüm Arşivi Gör'}
          </button>
        </div>
      </div>

      {showAll && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-6 border-t border-app grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10"
        >
          {displayedPrograms.map((prog, idx) => (
            <a
              key={idx}
              href={prog.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-surface border border-app hover:border-zinc-500 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <Calendar size={12} className="text-zinc-400" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-zinc-300 truncate">{prog.title}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">Hafta {prog.week}</div>
              </div>
            </a>
          ))}
        </motion.div>
      )}
    </div>
  );
}

