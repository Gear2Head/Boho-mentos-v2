import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Target, GraduationCap, ChevronRight, Brain } from 'lucide-react';
import { useProfile, useAcademicData } from '../../hooks/useStore';
import { getCoachResponse } from '../../services/gemini';
import { buildCoachContext } from '../../services/coachContext';
import { CoachParser } from '../coach/CoachParser';

export function StrategyAdvisor() {
  const profile = useProfile();
  const { logs, exams, eloScore, streakDays } = useAcademicData();
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const requestAdvice = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { contextString, userState } = buildCoachContext({ 
        profile, 
        logs, 
        exams, 
        eloScore: eloScore || 0, 
        streakDays: streakDays || 0,
        tytSubjects: [], 
        aytSubjects: [], 
        activeAlerts: [] 
      });

      const prompt = `Hedefim: ${profile.targetUniversity || 'Bilinmiyor'} - ${profile.targetMajor || 'Bilinmiyor'}. 
      Şu anki durumuma göre bana özel bir strateji oluştur. Hangi derslere ağırlık vermeliyim? 
      Hedeflediğim bölüm için gereken netler ve çalışma temposu hakkında detaylı bilgi ver.`;

      const response = await getCoachResponse(
        prompt,
        contextString,
        [],
        { intent: 'topic_explain', coachPersonality: profile.coachPersonality, userState }
      );
      setAdvice(response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-[32px] border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#C17767]/10 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="p-3 bg-[#C17767]/20 rounded-2xl text-[#C17767] border border-[#C17767]/30 shadow-[0_0_20px_rgba(193,119,103,0.2)]">
           <Compass size={24} />
        </div>
        <div>
          <h3 className="text-xl font-display italic font-black text-white leading-none">STRATEJİ DANIŞMANI</h3>
          <p className="text-[10px] text-zinc-500 tracking-[0.2em] mt-1 font-black uppercase">Hedef Odaklı Yol Haritası</p>
        </div>
      </div>

      <div className="space-y-4 mb-8 relative z-10">
        <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
           <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
              <GraduationCap size={20} />
           </div>
           <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-black">HEDEF ÜNİVERSİTE</p>
              <p className="text-sm font-bold text-zinc-200">{profile?.targetUniversity || 'Belirlenmedi'}</p>
           </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
           <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
              <Target size={20} />
           </div>
           <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-black">HEDEF BÖLÜM</p>
              <p className="text-sm font-bold text-zinc-200">{profile?.targetMajor || 'Belirlenmedi'}</p>
           </div>
        </div>
      </div>

      <button
        onClick={requestAdvice}
        disabled={loading}
        className="w-full py-4 bg-[#C17767] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[#C17767]/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Brain size={16} />
        )}
        {loading ? 'ANALİZ EDİLİYOR...' : 'STRATEJİ OLUŞTUR'}
      </button>

      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 border-t border-white/5"
          >
            <div className="prose prose-invert prose-sm max-w-none">
               <CoachParser content={advice} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
