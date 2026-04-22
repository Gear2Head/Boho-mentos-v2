/**
 * AMAÇ: Koç müdahale ekranı (HabitAlerts tetikler)
 * MANTIK: Göz ardı edilemeyen tam ekran modal, AI stratejisi ile destekli
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Target, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

export function CoachInterventionModal() {
  const activeAlerts = useAppStore(s => s.activeAlerts);
  const profile = useAppStore(s => s.profile);
  const dismissAlert = useAppStore(s => s.dismissAlert);
  const alert = activeAlerts?.[0]; // Sadece ilk uyarıyı göster
  const [strategy, setStrategy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (alert && !strategy && !loading) {
      setLoading(true);
      const prompt = `Öğrencinin güncel bir zaafı tespit edildi: ${alert.message} Konu: ${alert.subject}.
Hemen SADECE 3 MADDELİK bir aksiyon planı çıkar. Çok sert, direkt ve kısa konuş. Başlık olarak "ÖZEL OPERASYON: ${alert.subject}" kullan.`;
      
      getCoachResponse(prompt, `Alert Type: ${alert.type}`, [], { coachPersonality: profile?.coachPersonality })
        .then(res => {
          setStrategy(res || 'Strateji oluşturulamadı.');
          setLoading(false);
        })
        .catch(() => {
          setStrategy('Strateji bağlantı kurulamadı. Hemen gidip çalışmaya başla.');
          setLoading(false);
        });
    }
  }, [alert, strategy, loading, profile]);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
      >
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-4 text-red-500 mb-8 border-b border-red-900 pb-6">
            <div className="bg-red-950 p-4 rounded-2xl animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <div>
              <h2 className="font-display italic text-3xl font-bold uppercase tracking-widest">Sistem Müdahalesi</h2>
              <p className="text-zinc-400 font-mono text-sm mt-1">Zaaflar tespit edildi ve kilitlendi.</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-red-900/50 rounded-2xl p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 text-red-900/10 pointer-events-none -mt-4 -mr-4 transform rotate-12">
              <Target size={140} />
            </div>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-red-500 opacity-80 mb-2">Tespİt Edİlen Sorun:</h3>
            <p className="text-lg text-zinc-200 font-medium leading-relaxed">{alert.message}</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 mb-10 min-h-[160px]">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-amber-500 opacity-80 mb-4 flex items-center gap-2">
              Koc Kübra Direktifleri <RefreshCw size={12} className={loading ? 'animate-spin' : 'hidden'} />
            </h3>

            {loading ? (
              <div className="flex items-center text-zinc-500 font-mono text-xs uppercase tracking-widest h-full opacity-60">
                Strateji hesaplanıyor... Lütfen bekle...
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-300">
                <ReactMarkdown>{strategy || ''}</ReactMarkdown>
              </div>
            )}
          </div>

          <button
            disabled={loading}
            onClick={() => {
              dismissAlert(alert.id);
              setStrategy(null);
            }}
            aria-label="Müdahale Uyarısını Onayla ve Kapat"
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl tracking-[0.2em] uppercase text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <CheckCircle2 size={18} />
            UYARIYI ALDIM, GÖREVİ KABUL EDİYORUM
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
