/** 
 * AMAÇ: War Room AI Koç (CoachPanel) Paneli
 * MANTIK: Gear_Head analizlerini ve strateji kartlarını gösterir.
 */

import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Brain, Star, Target, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function CoachPanel() {
  const store = useAppStore();
  const { chatHistory, profile } = store;

  // Soru özelinde yapılmış analizleri filtreleyip gösterir
  const coachMessages = chatHistory.filter(m => m.role === 'coach').slice(-3);

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-black/30 backdrop-blur-xl border-l border-border p-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
      <header className="space-y-1">
        <h3 className="font-display italic text-2xl text-accent flex items-center gap-3">
          <Brain size={24} /> <span>Savaş Planı</span>
        </h3>
        <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Gear_Head. Analiz Merkezi</p>
      </header>

      {/* AI Strateji Tavsiyeleri */}
      <div className="space-y-4">
        {coachMessages.length === 0 ? (
          <div className="p-8 text-center bg-white/50 dark:bg-zinc-950/50 rounded-2xl border border-dashed border-border">
             <MessageSquare size={24} className="mx-auto mb-4 opacity-20" />
             <p className="text-xs uppercase tracking-widest opacity-40 leading-relaxed font-bold">
                Henüz bir analiz yok. Soruyu incele veya ipucu için 'Anlat' modunu kullan.
             </p>
          </div>
        ) : (
          coachMessages.map((msg, i) => (
            <div key={i} className="p-5 bg-white dark:bg-zinc-950/80 rounded-2xl border border-border shadow-soft animate-in zoom-in-95 duration-300">
               <div className="text-[10px] font-bold text-accent mb-3 uppercase tracking-widest flex items-center gap-2">
                 <Star size={12} /> {i === coachMessages.length - 1 ? 'Aktif Strateji' : 'Eski Kayıt'}
               </div>
               <div className="text-xs font-mono leading-relaxed opacity-80 text-zinc-700 dark:text-zinc-300 prose prose-sm prose-invert max-w-none">
                 <ReactMarkdown>{msg.content}</ReactMarkdown>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Stats/Badge Alanı */}
      <div className="mt-auto pt-8 border-t border-border">
         <div className="p-4 bg-accent/5 rounded-2xl border border-accent/20 flex items-center gap-4 group hover:bg-accent/10 transition-colors">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
               <Target size={24} />
            </div>
            <div>
               <div className="text-[10px] uppercase font-bold tracking-widest text-accent leading-none">LİYAKAT POTANSİYELİ</div>
               <div className="text-xl font-bold font-mono mt-1">+45 Puan</div>
            </div>
         </div>
         <p className="text-[9px] uppercase tracking-widest opacity-30 mt-4 text-center font-bold">
            OGM MATERYAL // GEAR_HEAD OS v5.1
         </p>
      </div>
    </div>
  );
}
