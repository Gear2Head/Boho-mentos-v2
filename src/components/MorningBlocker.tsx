import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shuffle, Lightbulb, Calculator, CheckCircle2, Loader2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import { parseAiObject, sanitizeAiText, validateStringArray } from '../utils/aiJson';
import { isNonEmptyString, isRecord } from '../utils/typeGuards';
import { useToast } from './ToastContext';

// ─── Math Components ─────────────────────────────────────────────────────────

function MixedMathRenderer({ text }: { text: string }) {
  if (!text) return null;
  // Regex to detect LaTeX patterns: \frac, \(...\), \sum, \% etc.
  const parts = text.split(/(\\\([^\)]+\\\)|\\frac\{[^\}]+\}\{[^\}]+\}|\\\%|\\text\{[^\}]+\})/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('\\')) {
          try {
            // Remove \( \) if present for Katex
            const cleaned = part.replace(/^\\\(|\\\)$/g, '');
            return <InlineMath key={i} math={cleaned} />;
          } catch (e) {
            return <span key={i}>{part}</span>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MorningQuestion {
  topic: string;
  expression: string; // LaTeX or empty string
  questionStr: string;
  correctAnswers: string[]; // Multiple accepted forms (e.g. "0.5", "1/2", "½")
  hints: string[];
  difficulty: 'medium';
}

function validateMorningQuestion(value: unknown): MorningQuestion | null {
  if (!isRecord(value)) return null;

  const questionStr = isNonEmptyString(value.questionStr) ? sanitizeAiText(value.questionStr, 220) : '';
  const correctAnswers = validateStringArray(value.correctAnswers, 6);
  if (!questionStr || correctAnswers.length === 0) return null;

  return {
    topic: isNonEmptyString(value.topic) ? sanitizeAiText(value.topic, 80) : 'Günün Sorusu',
    expression: isNonEmptyString(value.expression) ? String(value.expression).trim().slice(0, 120) : '',
    questionStr,
    correctAnswers,
    hints: validateStringArray(value.hints, 3),
    difficulty: 'medium',
  };
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
Zorluk: orta. Kısa soru. Günlük sıkılmayacak kadar değişken konu seç. 
HÜKÜM: LaTeX kullanırken \\% gibi literal kaçışlar yapma, doğrudan % kullan veya LaTeX blokları içine al. 
Matematiksel ifadeleri mutlaka \\( ... \\) içine al.`,
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
        className="bg-surface border border-app rounded-[3rem] p-8 md:p-12 max-w-xl w-full text-center relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-accent to-accent-subtle" />

        <div className="w-20 h-20 bg-surface-2 rounded-3xl flex items-center justify-center mx-auto mb-8 text-accent border border-app shadow-inner">
          {success ? <CheckCircle2 size={40} className="text-emerald-500" /> : <Lock size={40} />}
        </div>

        <h2 className="font-serif italic text-3xl md:text-4xl text-ink mb-3 font-black">
          {success ? 'Günün Kilidi Açıldı!' : 'Morning Directive'}
        </h2>

        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-ink-muted mb-10 max-w-md mx-auto">
          Güne başlamak için anahtar soruyu çöz. 
          <span className="ml-2 text-accent">[{track}]</span>
        </p>

        <AnimatePresence mode="wait">
          {!success && (
            <motion.div
              key="question"
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-2 border border-app rounded-2xl p-6 md:p-8 text-left shadow-inner"
            >
              {isLoadingQ ? (
                <div className="flex flex-col items-center gap-3 py-8 text-accent">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Kübra soruyu hazırlıyor...</span>
                </div>
              ) : question ? (
                <>
                  <div className="flex items-center gap-2 mb-6 text-accent">
                    <Calculator size={16} />
                    <span className="text-[10px] uppercase font-black tracking-[0.3em]">{question.topic}</span>
                  </div>

                  <div className="mb-8 font-serif text-xl border-l-[3px] border-accent pl-6 py-1 text-ink-muted leading-relaxed">
                    {question.expression && (
                      <div className="mb-4 bg-app-subtle p-4 rounded-xl">
                        <BlockMath math={question.expression} />
                      </div>
                    )}
                    <div className="font-serif italic font-medium">
                      <MixedMathRenderer text={question.questionStr} />
                    </div>
                  </div>

                  {hintLevel > 0 && (
                    <div className="mb-8 space-y-3">
                      {question.hints.slice(0, hintLevel).map((hint, i) => (
                        <div
                          key={i}
                          className="text-[10px] bg-amber-500/5 text-amber-600 p-4 rounded-xl border border-amber-500/20 flex items-start gap-3  font-medium italic leading-relaxed shadow-sm"
                        >
                          <Lightbulb size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
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
                      className={`flex-1 bg-surface border py-4 px-6 rounded-2xl text-ink focus:outline-none transition-all font-mono font-bold shadow-sm ${
                        error
                          ? 'border-red-500 bg-red-500/5'
                          : 'border-app focus:border-accent'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-8 bg-accent text-white font-black rounded-2xl hover:bg-accent/90 transition-all uppercase text-[10px] tracking-widest shadow-xl shadow-accent/20 border border-white/10 active:scale-95"
                    >
                      Doğrula
                    </button>
                  </form>

                  <div className="mt-8 flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <button
                      type="button"
                      onClick={() => setHintLevel((prev) => Math.min(prev + 1, question.hints.length))}
                      disabled={hintLevel >= question.hints.length}
                      className="text-amber-600 hover:text-amber-700 disabled:opacity-30 flex items-center gap-1.5 transition-colors p-2 rounded-lg hover:bg-amber-500/5"
                    >
                      <Lightbulb size={12} /> İpucu İstiyorum
                    </button>
                    <button
                      type="button"
                      onClick={() => onUnlock()}
                      className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-all text-ink-muted p-2 rounded-lg hover:bg-ink/5"
                      title="Admin Yetkisi ile Atla"
                    >
                      <Shuffle size={12} />
                      <span>Atla (Admin)</span>
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
