/**
 * AMAÇ: Flashcard bubble — 3D kart flip animasyonu, zorluk renkleri, kaydet butonu.
 * T-004: FlashcardBubble component.
 */

import React, { useState } from 'react';
import { BookOpen, RotateCw, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { Flashcard } from '../../types/coach';

export interface FlashcardBubbleData {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  topic?: string;
}

const DIFF_STYLES = {
  easy:   { border: 'border-emerald-500/30 bg-emerald-500/5', tag: 'text-emerald-400 bg-emerald-400/10', label: 'Kolay' },
  medium: { border: 'border-yellow-500/30 bg-yellow-500/5',  tag: 'text-yellow-400 bg-yellow-400/10',   label: 'Orta'  },
  hard:   { border: 'border-red-500/30 bg-red-500/5',        tag: 'text-red-400 bg-red-400/10',         label: 'Zor'   },
};

function FlipCard({ card, index }: { card: FlashcardBubbleData; index: number; key?: React.Key }) {
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const addFlashcard = useAppStore(s => s.addFlashcard);
  const reviewFlashcard = useAppStore(s => s.reviewFlashcard);

  const style = DIFF_STYLES[card.difficulty];

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullCard: Flashcard = {
      id: `fc_${Date.now()}_${index}`,
      front: card.front,
      back: card.back,
      difficulty: card.difficulty,
      subject: card.subject,
      topic: card.topic,
      createdAt: new Date().toISOString(),
      nextReviewAt: new Date().toISOString(),
      reviewCount: 0,
      lastCorrect: null,
    };
    if (addFlashcard) addFlashcard(fullCard);
    setSaved(true);
  };

  const handleReview = (quality: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Not: Gerçek bir review akışı için card.id olması lazım. 
    // Chat bubble içindeki kartlar henüz kaydedilmemiş olabilir.
    // Eğer kaydedilmediyse önce kaydet, sonra review et diyebiliriz ama
    // UX açısından direkt "Öğrendim" butonu kaydı da tetiklemeli.
    
    const cardId = `fc_${Date.now()}_${index}`;
    if (!saved) {
      handleSave(e);
    }
    
    if (reviewFlashcard) {
      // quality: 0 (forgot), 1 (hard), 2 (medium), 3 (easy)
      reviewFlashcard(cardId, quality);
    }
    setReviewed(true);
    setTimeout(() => setFlipped(false), 600);
  };

  return (
    <div
      className="cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped(f => !f)}
      aria-label={flipped ? 'Ön yüze dön' : 'Cevabı gör'}
    >
      <div
        className={`relative h-36 border rounded-xl overflow-hidden transition-transform duration-500 ${style.border}`}
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* Front */}
        <div className="absolute inset-0 p-3 flex flex-col" style={{ backfaceVisibility: 'hidden' }}>
          <div className="flex justify-between items-start mb-2 gap-1">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold truncate">
              {card.subject}{card.topic ? ` · ${card.topic}` : ''}
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${style.tag}`}>
              {style.label}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-200 flex-1 leading-snug line-clamp-3">{card.front}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="flex items-center gap-1 text-[9px] text-zinc-600">
              <RotateCw size={10} /> Cevabı görmek için tıkla
            </span>
            {!saved ? (
              <button
                onClick={handleSave}
                className="text-[9px] text-[#C17767] hover:underline font-bold"
              >
                Kaydet
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                <CheckCircle2 size={10} /> Kaydedildi
              </span>
            )}
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 p-3 bg-zinc-900/90 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar mb-2">
            <p className="text-sm text-zinc-200 leading-relaxed">{card.back}</p>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {[
              { q: 0, label: 'Unuttum', color: 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' },
              { q: 1, label: 'Zor',     color: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white' },
              { q: 2, label: 'İyi',     color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' },
              { q: 3, label: 'Kolay',   color: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' },
            ].map(btn => (
              <button
                key={btn.q}
                disabled={reviewed}
                onClick={(e) => handleReview(btn.q, e)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all disabled:opacity-30 ${btn.color}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlashcardBubble({ cards }: { cards: FlashcardBubbleData[] }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-[#C17767]" />
        <span className="text-xs font-bold text-[#C17767] uppercase tracking-widest">
          {cards.length} Çalışma Kartı
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <FlipCard key={i} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
