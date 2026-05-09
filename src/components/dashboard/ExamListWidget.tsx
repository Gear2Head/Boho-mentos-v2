import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Calendar, Target, ChevronRight } from 'lucide-react';
import { useAcademicData } from '../../hooks/useStore';

export function ExamListWidget({ onSelect }: { onSelect: (exam: any) => void }) {
  const { exams } = useAcademicData();
  
  const sortedExams = [...exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {sortedExams.length === 0 ? (
        <div className="glass-card p-12 text-center opacity-30 italic rounded-3xl border-dashed">
          Henüz deneme kaydı yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedExams.map((exam, idx) => {
            const prevExam = sortedExams.slice(idx + 1).find((item) => item.type === exam.type);
            const isImproving = prevExam ? exam.totalNet >= prevExam.totalNet : true;
            const delta = prevExam ? exam.totalNet - prevExam.totalNet : 0;
            
            return (
              <motion.button
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelect(exam)}
                className="glass-card p-5 rounded-[28px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all group flex flex-col gap-4 text-left relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl opacity-10 pointer-events-none ${exam.type === 'TYT' ? 'from-blue-500' : 'from-amber-500'}`} />
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-sm ${
                      exam.type === 'TYT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {exam.type}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-100 text-sm">{new Date(exam.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                         <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">{exam.source || 'SERBEST'}</span>
                         {prevExam && (
                           <div className={`flex items-center gap-0.5 text-[9px] font-black ${isImproving ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {isImproving ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                             {exam.type} {Math.abs(delta).toFixed(2)}
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display italic font-black text-white">{exam.totalNet}</span>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">NET</span>
                    </div>
                  </div>
                </div>

                {/* Mini Stats Bar */}
                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/5">
                   {Object.entries(exam.scores || {}).slice(0, 4).map(([name, data]: [string, any]) => (
                     <div key={name} className="text-center">
                        <p className="text-[8px] text-zinc-600 uppercase font-black truncate">{name.slice(0, 3)}</p>
                        <p className="text-xs font-mono font-bold text-zinc-300">{data.net}</p>
                     </div>
                   ))}
                   <div className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#C17767]/20 group-hover:text-[#C17767] transition-all">
                      <ChevronRight size={14} />
                   </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
