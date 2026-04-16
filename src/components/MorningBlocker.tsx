import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shuffle, Lightbulb, Calculator, CheckCircle2, Loader2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MorningQuestion {
  topic: string;
  expression: string; // LaTeX or empty string
  questionStr: string;
  correctAnswers: string[]; // Multiple accepted forms (e.g. "0.5", "1/2", "½")
  hints: string[];
  difficulty: 'medium';
}

// ─── TODO-005: Track-aware fallback questions ─────────────────────────────────

type StudentTrack = 'Sayısal' | 'Eşit Ağırlık' | 'Sözel' | 'Dil';

const FALLBACK_QUESTIONS: Record<StudentTrack, MorningQuestion[]> = {
  Sayısal: [
    {
      topic: 'Kümeler',
      expression: '',
      questionStr: 'A = {1, 2, 3, 4, 5} ve B = {3, 4, 5, 6, 7} kümelerinin birleşimi kaç elemanlıdır?',
      correctAnswers: ['7', 'yedi'],
      hints: ['A∪B, her iki kümedeki tüm elemanları kapsar', 'Tekrar eden elemanları bir kez say'],
      difficulty: 'medium',
    },
    {
      topic: 'Temel Matematik',
      expression: '|2x - 4| = 6',
      questionStr: 'Bu denklemin çözüm kümesi nedir? Toplam kaçtır?',
      correctAnswers: ['5', 'beş'],
      hints: ['Mutlak değer denklemlerinde iki durum vardır', '2x-4=6 ve 2x-4=-6'],
      difficulty: 'medium',
    },
    {
      topic: 'Olasılık',
      expression: '',
      questionStr: 'Bir zarın atılmasında çift sayı gelme olasılığı nedir?',
      correctAnswers: ['1/2', '0.5', '%50', 'yarım'],
      hints: ['6 yüzlü zarın çift yüzleri: 2, 4, 6'],
      difficulty: 'medium',
    },
    {
      topic: 'Üslü Sayılar',
      expression: '2^{10}',
      questionStr: 'Bu ifadenin değeri kaçtır?',
      correctAnswers: ['1024'],
      hints: ['2^10 = 2^5 × 2^5', '2^5 = 32'],
      difficulty: 'medium',
    },
    {
      topic: 'Fonksiyonlar',
      expression: 'f(x) = 2x + 3',
      questionStr: 'f(5) kaçtır?',
      correctAnswers: ['13', 'on üç'],
      hints: ['x yerine 5 yaz'],
      difficulty: 'medium',
    },
  ],
  'Eşit Ağırlık': [
    {
      topic: 'Mantık',
      expression: '',
      questionStr: '"Tüm kuşlar uçar. Penguen bir kuştur." önermelerinden hareketle klasik mantık hatası nedir?',
      correctAnswers: ['penguenler uçar', 'penguenler uçamaz'],
      hints: ['Genel önermeyi tek istisnaya uygulamamak gerekir'],
      difficulty: 'medium',
    },
    {
      topic: 'Temel Matematik',
      expression: '',
      questionStr: 'Bir sayının %30\'u 90 ise bu sayı kaçtır?',
      correctAnswers: ['300'],
      hints: ['%30 = 0.30', '90 / 0.30 = ?'],
      difficulty: 'medium',
    },
    {
      topic: 'Paragraf',
      expression: '',
      questionStr: 'Ana fikir ve konu arasındaki fark nedir? Bir örnekle açıkla.',
      correctAnswers: ['konu ne anlatıldığı', 'ana fikir ne verilmek istendiği'],
      hints: ['Konu: Yazının genel konusu', 'Ana fikir: Yazarın vermek istediği mesaj'],
      difficulty: 'medium',
    },
    {
      topic: 'Türkçe',
      expression: '',
      questionStr: '"Kitabı bitirmeden eve gitmedi" cümlesinde kaç eylem vardır?',
      correctAnswers: ['2', 'iki'],
      hints: ['bitirmeden ve gitmedi birer eylemdir'],
      difficulty: 'medium',
    },
    {
      topic: 'Coğrafya',
      expression: '',
      questionStr: 'Türkiye\'nin en uzun nehri hangisidir?',
      correctAnswers: ['kızılırmak', 'kızıl ırmak'],
      hints: ['Bu nehir Karadeniz\'e dökülür'],
      difficulty: 'medium',
    },
  ],
  Sözel: [
    {
      topic: 'Dil Bilgisi',
      expression: '',
      questionStr: '"Güzel" kelimesi hangi tür sıfattır?',
      correctAnswers: ['niteleme sıfatı', 'niteleme'],
      hints: ['Nesnenin bir özelliğini bildiren sıfata ne denir?'],
      difficulty: 'medium',
    },
    {
      topic: 'Edebi Sanatlar',
      expression: '',
      questionStr: '"Taşlar konuşsa, bu dağlar ne anlatır" dizesinde hangi edebi sanat kullanılmıştır?',
      correctAnswers: ['teşhis', 'kişileştirme'],
      hints: ['Cansız varlıklara insan özellikleri yüklemek'],
      difficulty: 'medium',
    },
    {
      topic: 'Sözcük Türleri',
      expression: '',
      questionStr: '"Hızlıca koştu" cümlesinde "hızlıca" hangi sözcük türüdür?',
      correctAnswers: ['zarf', 'belirteç'],
      hints: ['Fiili niteleyen sözcükler'],
      difficulty: 'medium',
    },
    {
      topic: 'Tarih',
      expression: '',
      questionStr: 'Millet Meclisi\'nin açıldığı yıl hangisidir?',
      correctAnswers: ['1920', 'bin dokuz yüz yirmi'],
      hints: ['Kurtuluş Savaşı başlarında Ankara\'da açıldı'],
      difficulty: 'medium',
    },
    {
      topic: 'Edebiyat',
      expression: '',
      questionStr: 'Servet-i Fünun döneminin önemli roman yazarı kimdir?',
      correctAnswers: ['halit ziya', 'halit ziya uşaklıgil'],
      hints: ['Mai ve Siyah romanının yazarı'],
      difficulty: 'medium',
    },
  ],
  Dil: [
    {
      topic: 'English Grammar',
      expression: '',
      questionStr: 'Fill in the blank: "She ___ to school every day." (go)',
      correctAnswers: ['goes'],
      hints: ['Third person singular present simple'],
      difficulty: 'medium',
    },
    {
      topic: 'Vocabulary',
      expression: '',
      questionStr: 'What is the opposite of "generous"?',
      correctAnswers: ['stingy', 'miserly', 'selfish'],
      hints: ['Someone who does not like to share'],
      difficulty: 'medium',
    },
    {
      topic: 'English Grammar',
      expression: '',
      questionStr: 'Which sentence is correct? A) "I have been to Paris last year" B) "I went to Paris last year"',
      correctAnswers: ['b', 'B'],
      hints: ['Past simple is used with specific past time expressions'],
      difficulty: 'medium',
    },
    {
      topic: 'Reading',
      expression: '',
      questionStr: 'What does "ambiguous" mean?',
      correctAnswers: ['belirsiz', 'muğlak', 'unclear', 'having multiple meanings'],
      hints: ['Am-bi-gu-ous: can be interpreted in more than one way'],
      difficulty: 'medium',
    },
    {
      topic: 'Word Formation',
      expression: '',
      questionStr: 'Add the correct suffix: "care" + ___ = "careless"',
      correctAnswers: ['less', '-less'],
      hints: ['This suffix means "without"'],
      difficulty: 'medium',
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MorningBlocker({ onUnlock }: { onUnlock: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const tytSubjects = useAppStore((s) => s.tytSubjects);
  const aytSubjects = useAppStore((s) => s.aytSubjects);
  
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState<MorningQuestion | null>(null);
  const [isLoadingQ, setIsLoadingQ] = useState(true);
  const [hintLevel, setHintLevel] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const track: StudentTrack = (profile?.track as StudentTrack) || 'Sayısal';
  const todayIso = new Date().toISOString().split('T')[0];
  const sessionKey = `boho_morning_q_${todayIso}`;
  const solvedKey = `boho_morning_solved`;

  // ─── Load question ────────────────────────────────────────────────────────

  const loadQuestion = useCallback(async () => {
    setIsLoadingQ(true);

    // Check sessionStorage cache first
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      try {
        setQuestion(JSON.parse(cached) as MorningQuestion);
        setIsLoadingQ(false);
        return;
      } catch { /* fallthrough */ }
    }

    // Try AI generation
    try {
      const weakTopics = [...tytSubjects, ...aytSubjects]
        .filter((s) => s.status === 'not-started' || s.status === 'in-progress')
        .map((s) => `${s.subject}/${s.name}`);
      const randomWeak = weakTopics.sort(() => 0.5 - Math.random()).slice(0, 3).join(', ');
      const weakContext = randomWeak ? `Şu zayıf konulardan birini seç: ${randomWeak}.` : `Rastgele bir konudan seç.`;

      const raw = await getCoachResponse(
        `Kullanıcının alanı: ${track}. Bugün için bir sabah kilidi sorusu üret. ${weakContext} SADECE JSON döndür (başka metin ekleme):
{"topic":"...","expression":"latex_string_or_empty_string","questionStr":"...","correctAnswers":["cevap1","cevap2"],"hints":["...","...","..."]}
Zorluk: orta. Kısa soru. Günlük sıkılmayacak kadar değişken konu seç. LaTeX'i sadece matematiksel ifade varsa kullan.`,
        '',
        [],
        { intent: 'qa_mode', forceJson: true, maxTokens: 500 }
      );

      // Parse AI response
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(raw.substring(jsonStart, jsonEnd + 1)) as Partial<MorningQuestion>;
        if (parsed.questionStr && parsed.correctAnswers?.length) {
          const q: MorningQuestion = {
            topic: parsed.topic || 'Günün Sorusu',
            expression: parsed.expression || '',
            questionStr: parsed.questionStr,
            correctAnswers: parsed.correctAnswers,
            hints: parsed.hints || ['İpucu mevcut değil.'],
            difficulty: 'medium',
          };
          sessionStorage.setItem(sessionKey, JSON.stringify(q));
          setQuestion(q);
          setIsLoadingQ(false);
          return;
        }
      }
    } catch {
      // Silently fall through to fallback
    }

    // TODO-005: Track-aware fallback
    const fallbacks = FALLBACK_QUESTIONS[track] || FALLBACK_QUESTIONS['Sayısal'];
    const dayIndex = new Date().getDate() % fallbacks.length;
    const fallback = fallbacks[dayIndex];
    sessionStorage.setItem(sessionKey, JSON.stringify(fallback));
    setQuestion(fallback);
    setIsLoadingQ(false);
  }, [track, sessionKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem(solvedKey);
    if (stored === todayIso) {
      onUnlock();
    } else {
      setIsOpen(true);
      loadQuestion();
    }
  }, [onUnlock, todayIso, loadQuestion]);

  if (!isOpen) return null;

  // ─── Answer check ─────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    const normalized = answer.trim().toLowerCase().replace(',', '.').replace('½', '0.5');
    const isCorrect = question.correctAnswers.some(
      (ans) => ans.toLowerCase().replace(',', '.').replace('½', '0.5') === normalized
    );

    if (isCorrect) {
      setSuccess(true);
      setError(false);
      setTimeout(() => {
        sessionStorage.setItem(solvedKey, todayIso);
        setIsOpen(false);
        onUnlock();
      }, 2000);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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
          Güne başlamak için anahtar soruyu çöz. Hedeflerinden kaçamazsın.
          <span className="ml-2 text-xs font-bold text-[#C17767]">[{track}]</span>
        </p>

        <AnimatePresence mode="wait">
          {!success && (
            <motion.div
              key="question"
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 text-left"
            >
              {isLoadingQ ? (
                <div className="flex flex-col items-center gap-3 py-8 text-[#C17767]">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-sm opacity-70">Kübra soruyu hazırlıyor...</span>
                </div>
              ) : question ? (
                <>
                  <div className="flex items-center gap-2 mb-4 text-[#C17767] dark:text-rose-400">
                    <Calculator size={16} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">{question.topic}</span>
                  </div>

                  <div className="mb-6 font-serif text-lg text-[#4A443C] dark:text-zinc-200 overflow-x-auto overflow-y-hidden pb-4">
                    {question.expression && <BlockMath math={question.expression} />}
                    <p className="mt-2 font-bold leading-relaxed">{question.questionStr}</p>
                  </div>

                  {hintLevel > 0 && (
                    <div className="mb-6 space-y-2">
                      {question.hints.slice(0, hintLevel).map((hint, i) => (
                        <div
                          key={i}
                          className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 p-2 rounded border border-orange-200 dark:border-orange-800 flex items-start gap-2"
                        >
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
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Cevabını gir..."
                      className={`flex-1 bg-[#FFFFFF] dark:bg-zinc-900 border py-3 px-4 rounded-xl text-[#4A443C] dark:text-zinc-200 focus:outline-none transition-colors ${
                        error
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-[#EAE6DF] dark:border-zinc-800 focus:border-[#C17767]'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-6 bg-[#C17767] text-[#FDFBF7] font-bold rounded-xl hover:opacity-90 transition-opacity uppercase text-xs tracking-widest"
                    >
                      Doğrula
                    </button>
                  </form>

                  <div className="mt-4 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setHintLevel((prev) => Math.min(prev + 1, question.hints.length))}
                      disabled={hintLevel >= question.hints.length}
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
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
