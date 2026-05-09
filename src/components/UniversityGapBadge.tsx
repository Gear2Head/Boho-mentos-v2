/**
 * AMAÇ: Hedef üniversiteye kaç net kaldığını gösteren kompakt badge
 * MANTIK: Son deneme netleri ile profil hedef netlerini karşılaştırır
 */

import React from 'react';
import { Target } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function UniversityGapBadge() {
  const profile = useAppStore(s => s.profile);
  const exams = useAppStore(s => s.exams);

  if (!profile?.targetUniversity) return null;

  const lastTyt = [...exams].reverse().find(e => e.type === 'TYT');
  const lastAyt = [...exams].reverse().find(e => e.type === 'AYT');

  const tytGap = (profile.tytTarget ?? 0) - (lastTyt?.totalNet ?? 0);
  const aytGap = (profile.aytTarget ?? 0) - (lastAyt?.totalNet ?? 0);

  const tytAhead = tytGap <= 0;
  const aytAhead = aytGap <= 0;

  return (
    <div className="bg-gradient-to-r from-[#C17767]/10 to-transparent border border-[#C17767]/20 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="p-1.5 bg-[#C17767]/20 rounded-lg">
        <Target size={16} className="text-[#C17767]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-[#C17767] font-bold truncate">
          {profile.targetUniversity} {profile.targetMajor ? `/ ${profile.targetMajor}` : ''}
        </p>
        <div className="flex gap-3 mt-0.5">
          <span className={`text-xs font-mono font-bold ${tytAhead ? 'text-[#22C55E]' : 'text-zinc-300'}`}>
            TYT: {tytAhead ? `+${Math.abs(tytGap).toFixed(1)}` : `-${tytGap.toFixed(1)}`} net
          </span>
          <span className={`text-xs font-mono font-bold ${aytAhead ? 'text-[#22C55E]' : 'text-zinc-300'}`}>
            AYT: {aytAhead ? `+${Math.abs(aytGap).toFixed(1)}` : `-${aytGap.toFixed(1)}`} net
          </span>
        </div>
      </div>
    </div>
  );
}
