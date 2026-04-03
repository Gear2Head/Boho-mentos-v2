import React, { useState } from 'react';
import { RefreshCw, Play, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { getCoachResponse } from '../services/gemini';
import { useAppStore } from '../store/appStore';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { useToast } from './ToastContext';
import { toISODateTime } from '../utils/date';

interface QuizQuestion {
  id: string;
  topic: string;
  expression: string;
  questionStr: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export function QuizEngine() {
  const store = useAppStore();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const generateQuiz = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setQuizFinished(false);

    try {
      const weakSubjects = store.profile?.weakSubjects || 'Matematik';
      const prompt = `Lütfen öğrencinin zayıf olduğu '${weakSubjects}' konularından 3 adet zorlayıcı YKS tarzı çoktan seçmeli soru hazırla.
      Çıktı FORMATI KESİNLİKLE JSON DİZİSİ olmalıdır. 
      Örnek Format:
      [
        {
          "topic": "Trigonometri",
          "expression": "f(x) = \\\\sin(2x) + \\\\cos(2x)",
          "questionStr": "Fonksiyonun en büyük değeri nedir?",
          "options": ["1", "\\\\sqrt{2}", "2", "0", "-1"],
          "correctAnswerIndex": 1,
          "explanation": "f(x) = a\\\\sin x + b\\\\cos x max değeri \\\\sqrt{a^2+b^2} formülü..."
        }
      ]
      Başka HİÇBİR AÇIKLAMA VEYA YAZI YAZMA. Doğrudan JSON döndür.`;

      const response = await getCoachResponse(
        prompt,
        "Sen YKS soru yazarı bir yapay zekasın. Yalnızca geçerli JSON döndürürsün.",
        [],
        { coachPersonality: store.profile?.coachPersonality, forceJson: true, maxTokens: 1200 }
      );
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let data = JSON.parse(jsonMatch[0]);
        data = data.map((q: any) => ({ ...q, id: Date.now().toString() + Math.random().toString() }));
        setQuestions(data);
      } else {
        toast.error("Soru üretilirken bir hata oluştu. Tekrar deneyin.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleAnswer = (idx: number) => {
    if (showExplanation) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    if (idx === currentQ.correctAnswerIndex) {
      setScore(s => s + 1);
    } else {
      // Hatalıları mezarlığa ekle (otomatik)
      store.addFailedQuestion({
        id: Date.now().toString(),
        date: toISODateTime(),
        subject: currentQ.topic,
        topic: 'AI Quiz',
        book: 'AI Sınav Sistemi',
        page: 'Dijital',
        questionNumber: `${currentIndex + 1}`,
        reason: 'Otomatik eklendi: Quiz hatası'
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-50 text-[#C17767] dark:text-rose-400">
        <RefreshCw size={48} className="animate-spin mb-4" />
        <p className="font-bold text-sm tracking-widest uppercase">Zayıf noktalarına özel sorular derleniyor...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="border border-[#EAE6DF] dark:border-zinc-800 bg-[#FFFFFF] dark:bg-zinc-900 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto">
        <Play size={48} className="mx-auto mb-6 text-[#C17767] dark:text-rose-400 opacity-80" />
        <h2 className="font-serif italic text-3xl mb-4 text-[#4A443C] dark:text-zinc-200">Sınırsız Soru Motoru</h2>
        <p className="opacity-60 text-sm mb-8 text-[#4A443C] dark:text-zinc-400">Yapay zeka analizlerine göre en zayıf olduğun konulardan (<b>{store.profile?.weakSubjects}</b>) özel bir test oluştur.</p>
        <button 
          onClick={generateQuiz}
          className="px-8 py-4 bg-[#C17767] text-[#FDFBF7] font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-[#A56253] transition-colors shadow-lg shadow-[#C17767]/20"
        >
          Teste Başla
        </button>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="border border-[#EAE6DF] dark:border-zinc-800 bg-[#FFFFFF] dark:bg-zinc-900 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto">
        <CheckCircle2 size={64} className="mx-auto mb-6 text-green-500" />
        <h2 className="text-3xl font-serif italic mb-2 text-[#4A443C] dark:text-zinc-200">Test Tamamlandı!</h2>
        <p className="text-xl font-bold mb-8 text-[#C17767] dark:text-rose-400">Skor: {score} / {questions.length}</p>
        <button 
          onClick={() => { setQuestions([]); }}
          className="px-8 py-4 border border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-950 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-[#EAE6DF] transition-colors text-[#4A443C] dark:text-zinc-200"
        >
          Yeni Test Oluştur
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest opacity-60 text-[#4A443C] dark:text-zinc-400">
        <span>Soru {currentIndex + 1} / {questions.length}</span>
        <span className="bg-[#EAE6DF] dark:bg-zinc-800 px-3 py-1 rounded text-[#C17767] dark:text-rose-400">{currentQ.topic}</span>
      </div>
      
      <div className="border border-[#EAE6DF] dark:border-zinc-800 bg-[#FFFFFF] dark:bg-zinc-900 rounded-3xl p-8 mb-6 shadow-sm">
        {currentQ.expression && (
          <div className="mb-6 overflow-x-auto text-[#4A443C] dark:text-zinc-200 text-lg py-4">
            <BlockMath math={currentQ.expression} />
          </div>
        )}
        <p className="font-bold text-lg mb-8 text-[#4A443C] dark:text-zinc-200 font-serif border-l-4 border-[#C17767] pl-4">
          <InlineMath math={currentQ.questionStr} />
        </p>

        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            let btnClass = "border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-950 hover:border-[#C17767] text-[#4A443C] dark:text-zinc-200";
            if (showExplanation) {
              if (idx === currentQ.correctAnswerIndex) btnClass = "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-bold";
              else if (idx === selectedOption) btnClass = "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-bold";
              else btnClass = "opacity-50 border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-950 text-[#4A443C] dark:text-zinc-200";
            }

            return (
              <button 
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={showExplanation}
                className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all ${btnClass}`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-xs font-bold opacity-60">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-base"><InlineMath math={opt} /></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showExplanation && (
        <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 p-6 rounded-3xl animate-in slide-in-from-bottom-4 shadow-sm relative overflow-hidden">
           <div className={`absolute top-0 left-0 w-1.5 h-full ${selectedOption === currentQ.correctAnswerIndex ? 'bg-green-500' : 'bg-red-500'}`} />
          <h4 className="flex items-center gap-2 font-bold mb-3 uppercase tracking-widest text-xs text-[#4A443C] dark:text-zinc-200">
            <AlertTriangle size={16} className="text-[#E09F3E]" /> Çözüm & Kavram
          </h4>
          <p className="text-sm opacity-80 leading-relaxed mb-6 font-mono text-[#4A443C] dark:text-zinc-300 bg-[#F5F2EB] dark:bg-zinc-950 p-4 rounded-xl">
             <InlineMath math={currentQ.explanation} />
          </p>
          <button 
            onClick={handleNext}
            className="flex items-center justify-center gap-2 w-full py-4 bg-[#C17767] text-[#FDFBF7] font-bold rounded-xl hover:bg-[#A56253] transition-colors tracking-widest uppercase text-xs shadow-md"
          >
            Sonraki Soru <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
