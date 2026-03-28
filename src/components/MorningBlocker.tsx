import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shuffle, Lightbulb, Calculator, CheckCircle2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

export function MorningBlocker({ onUnlock }: { onUnlock: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sahte matematik sorusu (Gerçekte Gemini'den gelecek)
  const mathQuestion = {
    topic: 'Trigonometri',
    expression: "|AB|^2 = (\\cos x - \\cos y)^2 + (\\sin x - \\sin y)^2",
    details: "Verilen: $x + y = \\frac{\\pi}{2} \\Rightarrow \\sin y = \\cos x$ ve $\\cos y = \\sin x$. Denklem: $(\\cos x - \\sin x)^2 + (\\sin x - \\cos x)^2 = 1.5$",
    questionStr: "Buna göre x değerinin sinüsü nedir?",
    correctAnswer: "0.5",
    hints: [
      "1. İpucu: Tam kare açılımı yapmayı dene.",
      "2. İpucu: sin²x + cos²x = 1 özelliğini kullan.",
      "3. İpucu: Kök nedeni bul: Denklem sonucunu 1.5 veren sinx, cosx çarpımını düşün."
    ]
  };

  useEffect(() => {
    // Sadece sabahları veya günün ilk girişinde çalışacak mantık
    // Şimdilik her girişte %50 ihtimalle açılsın (mock)
    const hasSolvedToday = localStorage.getItem('yks_solved_morning');
    const today = new Date().toLocaleDateString('tr-TR');
    
    if (hasSolvedToday !== today) {
      setIsOpen(true);
    } else {
      onUnlock();
    }
  }, [onUnlock]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() === mathQuestion.correctAnswer || answer.trim() === '1/2') {
      setSuccess(true);
      setError(false);
      setTimeout(() => {
        localStorage.setItem('yks_solved_morning', new Date().toLocaleDateString('tr-TR'));
        setIsOpen(false);
        onUnlock();
      }, 2000);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#C17767]/30 rounded-2xl p-8 max-w-xl w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(193,119,103,0.15)]"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C17767] to-[#E09F3E]" />
        
        <div className="w-16 h-16 bg-[#F5F2EB] dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 text-[#C17767] dark:text-rose-400">
          {success ? <CheckCircle2 size={32} /> : <Lock size={32} />}
        </div>
        
        <h2 className="font-serif italic text-3xl text-[#4A443C] dark:text-zinc-200 mb-2">
          {success ? 'Günün Kilidi Açıldı!' : 'Sabah Direktifi: Kilitli Ekran'}
        </h2>
        
        <p className="text-sm opacity-60 mb-8 max-w-md mx-auto dark:text-zinc-400">
          Güne başlamak ve Dashboard'a erişmek için günün anahtar sorusunu çözmelisin. Hedeflerinden kaçamazsın.
        </p>

        <AnimatePresence mode="wait">
          {!success && (
            <motion.div 
              key="question" 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 text-left"
            >
              <div className="flex items-center gap-2 mb-4 text-[#C17767] dark:text-rose-400">
                <Calculator size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest">{mathQuestion.topic}</span>
              </div>
              
              <div className="mb-6 font-serif text-lg text-[#4A443C] dark:text-zinc-200 overflow-x-auto overflow-y-hidden pb-4">
                <BlockMath math={mathQuestion.expression} />
                {mathQuestion.details.split('$').map((part, i) => 
                  i % 2 === 1 ? <InlineMath key={i} math={part} /> : <span key={i}>{part}</span>
                )}
                <p className="mt-4 font-bold">{mathQuestion.questionStr}</p>
              </div>

              {hintLevel > 0 && (
                <div className="mb-6 space-y-2">
                  {mathQuestion.hints.slice(0, hintLevel).map((hint, i) => (
                    <div key={i} className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 p-2 rounded border border-orange-200 dark:border-orange-800 flex items-start gap-2">
                      <Lightbulb size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Cevabını gir (Örn: 0.5 veya 1/2)" 
                  className={`flex-1 bg-[#FFFFFF] dark:bg-zinc-900 border py-3 px-4 rounded-xl text-[#4A443C] dark:text-zinc-200 focus:outline-none transition-colors ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-[#EAE6DF] dark:border-zinc-800 focus:border-[#C17767]'}`}
                />
                <button type="submit" className="px-6 bg-[#C17767] text-[#FDFBF7] font-bold rounded-xl hover:opacity-90 transition-opacity uppercase text-xs tracking-widest">
                  Doğrula
                </button>
              </form>

              <div className="mt-4 flex justify-between items-center text-xs">
                <button 
                  type="button"
                  onClick={() => setHintLevel(prev => Math.min(prev + 1, 3))}
                  disabled={hintLevel === 3}
                  className="text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 font-bold"
                >
                  <Lightbulb size={12} /> İpucu İstiyorum
                </button>
                <button 
                  type="button"
                  onClick={() => onUnlock()}
                  className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity text-[#4A443C] dark:text-zinc-400 font-bold"
                  title="Admin Yetkisi ile Atla"
                >
                  <Shuffle size={12} />
                  <span>Soruyu Geç (Admin)</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
