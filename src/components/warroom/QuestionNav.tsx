/**
 * AMAÇ: Savaş odası içerisindeki soru geçişi ve seçenekler
 * MANTIK: Elenen (üstü çizilmiş) seçenekler zustand ile tutulur
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { useWarRoom } from '../../hooks/useWarRoom';

interface QuestionNavProps {
  currentIdx: number;
  totalCount: number;
  onNavigate: (idx: number) => void;
}

export function QuestionNav({ currentIdx, totalCount, onNavigate }: QuestionNavProps) {
  const warRoomSession = useAppStore(s => s.warRoomSession);
  const warRoomAnswers = useAppStore(s => s.warRoomAnswers);
  const warRoomEliminated = useAppStore(s => s.warRoomEliminated);
  const drawingMode = useAppStore(s => s.drawingMode);
  const updateWarRoomAnswer = useAppStore(s => s.updateWarRoomAnswer);
  const toggleEliminatedOption = useAppStore(s => s.toggleEliminatedOption);

  const { finishSession } = useWarRoom();
  const session = warRoomSession;

  if (!session) return null;

  const currentQId = session.questions[currentIdx]?.id;
  if (!currentQId) return null;
  const currentAnswer = warRoomAnswers[currentQId];
  const eliminated = warRoomEliminated[currentQId] || [];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-app/80 backdrop-blur-xl border border-[#EAE6DF] dark:border-[#2A2A2A] rounded-[2rem] p-2 shadow-2xl">
      
      {/* Soru Seçenekleri: A B C D E */}
      <div className="flex bg-[#F5F2EB] dark:bg-[#121212] rounded-[1.5rem] p-1.5 shadow-inner">
        {['A', 'B', 'C', 'D', 'E'].map((opt, i) => {
          const isSelected = currentAnswer === opt;
          const isElim = eliminated.includes(i);
          
          return (
            <button
              key={opt}
              onClick={(e) => {
                if (drawingMode !== 'pointer') return; // Sadece imleçleysek çalış
                // Shift veya Sağ tık benzeri bir şey basıldıysa ele. Biz bunu çift tık veya sağ tık ile yapabilirdik ama en basit: Seç tuşudur. Eşit ise iptal et.
                if (isSelected) {
                   updateWarRoomAnswer(currentQId, ''); // İptal
                } else {
                   updateWarRoomAnswer(currentQId, opt);
                }
              }}
              onContextMenu={(e) => {
                 e.preventDefault();
                 if (drawingMode === 'pointer') {
                    toggleEliminatedOption(currentQId, i);
                 }
              }}
              aria-label={`Seçenek ${opt}`}
              className={`
                relative w-10 h-10 flex items-center justify-center rounded-[1.2rem] text-sm font-bold font-mono transition-all duration-300 select-none
                ${isSelected ? 'bg-[#C17767] text-white shadow-lg scale-110 z-10' : 'text-[#4A443C] dark:text-zinc-500 hover:bg-[#EAE6DF] dark:hover:bg-[#2A2A2A]'}
                ${isElim ? 'opacity-30' : 'opacity-100'}
              `}
            >
              <span className={isElim ? 'line-through decoration-2 decoration-red-500/50' : ''}>{opt}</span>
              {isSelected && (
                <motion.div
                  layoutId="selRing"
                  className="absolute -inset-1 rounded-[1.4rem] border-2 border-[#C17767]/30"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="w-px h-8 bg-[#EAE6DF] dark:bg-[#2A2A2A] mx-2" />

      {/* Navigasyon Okları */}
      <div className="flex gap-2 pr-2">
        <button
          onClick={() => onNavigate(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          className="w-10 h-10 flex items-center justify-center rounded-[1.2rem] bg-[#F5F2EB] dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 disabled:opacity-30 transition-colors"
          aria-label="Önceki Soru"
        >
          <ChevronLeft size={20} />
        </button>

        {currentIdx === totalCount - 1 ? (
          <button
            onClick={finishSession}
            className="px-6 h-10 flex items-center justify-center gap-2 rounded-[1.2rem] bg-[#22C55E] text-white hover:bg-[#16A34A] transition-colors shadow-lg shadow-[#22C55E]/20"
            aria-label="Sınavı Bitir ve Sonuçları Gör"
          >
            <Check size={16} /> <span className="font-bold text-xs uppercase tracking-widest hidden sm:inline">BİTİR</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate(Math.min(totalCount - 1, currentIdx + 1))}
            className="w-10 h-10 flex items-center justify-center rounded-[1.2rem] bg-[#F5F2EB] dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            aria-label="Sonraki Soru"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

    </div>
  );
}
