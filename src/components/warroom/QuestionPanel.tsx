/** 
 * AMAÇ: War Room Soru Paneli ve Bağımsız Çizim Katmanı
 * MANTIK: QuestionPanel (static, scrollable), CanvasLayer (overlay, mode-driven)
 */

import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { useAppStore } from '../../store/appStore';
import { KaTeXBoundary } from '../KaTeXBoundary';

const LaTeXRenderer = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\([\s\S]*?\\\)|\\[[\s\S]*?\\])/g);
  return (
    <KaTeXBoundary>
      <div className="leading-relaxed whitespace-pre-line text-lg flex flex-wrap items-center">
        {parts.map((p, i) => {
          if (p.startsWith('$$') && p.endsWith('$$')) return <BlockMath key={i}>{p.slice(2, -2)}</BlockMath>;
          if (p.startsWith('$') && p.endsWith('$')) return <InlineMath key={i}>{p.slice(1, -1)}</InlineMath>;
          if (p.startsWith('\\(') && p.endsWith('\\)')) return <InlineMath key={i}>{p.slice(2, -2)}</InlineMath>;
          if (p.startsWith('\\[') && p.endsWith('\\]')) return <BlockMath key={i}>{p.slice(2, -2)}</BlockMath>;
          return <span key={i} dangerouslySetInnerHTML={{ __html: p }} />;
        })}
      </div>
    </KaTeXBoundary>
  );
};

export function QuestionPanel({ question, children }: { question: any, children?: React.ReactNode }) {
  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <LaTeXRenderer text={question.questionText} />
      </div>
      
      {question.image && (
        <div className="relative group overflow-hidden rounded-2xl border border-border bg-white/50 dark:bg-black/20 p-2 shadow-2xl shadow-black/5">
          <img 
            src={question.image} 
            alt="Soru Görseli" 
            className="w-full h-auto object-contain max-h-[400px] rounded-xl transition-transform duration-500 group-hover:scale-[1.01]" 
          />
        </div>
      )}

      {children}
    </div>
  );
}
