/** 
 * AMAÇ: War Room Şık Yönetimi (Options)
 * MANTIK: Sağ tık -> Eleme, Sol tık -> Seçme. LaTeX Renderer ile uyumlu.
 */

import React from 'react';
import { useAppStore } from '../../store/appStore';
import { InlineMath, BlockMath } from 'react-katex';

// LaTeX Renderer (MebiWarRoom.tsx içindekinin aynısı, buraya taşındı)
const LaTeXRenderer = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
  return (
    <div className="leading-relaxed whitespace-pre-line text-lg flex flex-wrap items-center">
      {parts.map((p, i) => {
        if (p.startsWith('\\(') && p.endsWith('\\)')) return <InlineMath key={i}>{p.slice(2, -2)}</InlineMath>;
        if (p.startsWith('\\[') && p.endsWith('\\]')) return <BlockMath key={i}>{p.slice(2, -2)}</BlockMath>;
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
};

export function OptionsPanel({ options, currentQuestionId }: { options: string[]; currentQuestionId: string }) {
  const warRoomAnswers = useAppStore(s => s.warRoomAnswers);
  const warRoomEliminated = useAppStore(s => s.warRoomEliminated);
  const toggleEliminatedOption = useAppStore(s => s.toggleEliminatedOption);
  const updateWarRoomAnswer = useAppStore(s => s.updateWarRoomAnswer);

  const selectedAnswer = warRoomAnswers[currentQuestionId] ?? '';
  const eliminatedOptions = warRoomEliminated[currentQuestionId] ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full max-w-4xl mx-auto pb-24">
      {options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = selectedAnswer === letter;
        const isEliminated = eliminatedOptions.includes(i);

        return (
          <button
            key={i}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleEliminatedOption(currentQuestionId, i);
            }}
            onClick={() => !isEliminated && updateWarRoomAnswer(currentQuestionId, letter)}
            aria-label={`${letter} Şıkkı - ${isSelected ? 'Seçili' : isEliminated ? 'Elenmiş' : 'Seçmek için tıkla, elemek için sağ tıkla'}`}
            className={`
              relative p-5 text-left border rounded-2xl flex gap-4 transition-all duration-300 group
              hover:scale-[1.02] active:scale-95 overflow-hidden
              ${isEliminated 
                ? 'opacity-30 grayscale border-zinc-500 scale-95 pointer-events-none' 
                : isSelected
                  ? 'bg-accent/10 border-accent shadow-xl shadow-accent/20 ring-1 ring-accent' 
                  : 'bg-white dark:bg-zinc-900/50 border-border hover:border-accent/50 dark:hover:border-accent'
              }
            `}
          >
            {/* Elimination Line (Visual) */}
            {isEliminated && (
               <div className="absolute inset-x-4 top-1/2 h-0.5 bg-red-500/50 rotate-[-2deg] z-10" />
            )}
            
            {/* Letter Badge */}
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors
              ${isSelected ? 'bg-accent text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-accent'}
            `}>
              {letter}
            </div>

            <div className="flex-1 my-auto font-medium text-zinc-800 dark:text-zinc-200">
               <LaTeXRenderer text={opt} />
            </div>

            {/* Checkmark if selected */}
            {isSelected && (
              <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-accent rounded-full text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
