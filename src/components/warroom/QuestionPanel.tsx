/** 
 * AMAÇ: War Room Soru Paneli ve Bağımsız Çizim Katmanı
 * MANTIK: QuestionPanel (static, scrollable), CanvasLayer (overlay, mode-driven)
 */

import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import CanvasDraw from 'react-canvas-draw';
import { useAppStore } from '../../store/appStore';

const LaTeXRenderer = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
  return (
    <div className="leading-relaxed whitespace-pre-line text-lg flex flex-wrap items-center">
      {parts.map((p, i) => {
        if (p.startsWith('\\(') && p.endsWith('\\)')) return <InlineMath key={i}>{p.slice(2, -2)}</InlineMath>;
        if (p.startsWith('\\[') && p.endsWith('\\]')) return <BlockMath key={i}>{p.slice(2, -2)}</BlockMath>;
        return <span key={i} dangerouslySetInnerHTML={{ __html: p }} />;
      })}
    </div>
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

export function CanvasLayer({ canvasRef }: { canvasRef: React.RefObject<any> }) {
  const store = useAppStore();
  const isDrawing = store.drawingMode !== 'pointer';

  return (
    <div 
      className="absolute inset-0 z-30 transition-opacity duration-300 pointer-events-none"
      style={{ 
        pointerEvents: isDrawing ? 'auto' : 'none',
        opacity: isDrawing ? 0.7 : 0.3, // Çizim modunda daha opak, çözüm modunda silik
      }}
    >
      <div className="w-[2000px] h-[3000px]">
        <CanvasDraw
          ref={canvasRef}
          brushColor={store.drawingMode === 'eraser' ? 'transparent' : '#C17767'}
          brushRadius={store.drawingMode === 'eraser' ? 20 : 3}
          lazyRadius={0}
          canvasWidth={2000}
          canvasHeight={3000}
          hideGrid={true}
          backgroundColor="transparent"
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
