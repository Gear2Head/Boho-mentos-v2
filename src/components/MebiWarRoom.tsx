import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import CanvasDraw from 'react-canvas-draw';
import { 
  Clock, X, ChevronRight, ChevronLeft, PenTool, 
  MousePointer2, Trash2, BrainCircuit, CheckCircle2,
  AlertTriangle, RotateCcw, Share2
} from 'lucide-react';

const MOCK_QUESTIONS = [
  {
    id: 'q1',
    subject: 'Matematik',
    topic: 'Türev',
    text: 'f(x) = x³ - 3x² + 5 fonksiyonunun [0, 3] aralığındaki mutlak maksimum değeri kaçtır?',
    options: ['3', '5', '7', '9', '2'],
    correctAnswer: '5',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    analysis: 'Türev alınıp sıfıra eşitlenir. f\'(x) = 3x² - 6x = 0 => 3x(x-2)=0. x=0 ve x=2 kritik noktalar. f(0)=5, f(2)=1, f(3)=5. Maksimum değer 5.'
  }
];

export const MebiWarRoom = () => {
  const store = useAppStore();
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); 
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    if (!isStarted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleExit = () => {
    if (window.confirm("Savaştan çekilmek istediğine emin misin? Mevcut ilerlemen silinecek.")) {
      setIsStarted(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-[#FDFBF7] dark:bg-zinc-950">
        <div className="w-20 h-20 bg-[#C17767]/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <BrainCircuit className="text-[#C17767]" size={40} />
        </div>
        <h2 className="text-3xl font-display italic font-bold mb-4 text-[#4A443C] dark:text-zinc-100">War Room</h2>
        <p className="text-center max-w-md opacity-60 mb-8 text-[#4A443C] dark:text-zinc-400">
          Gerçek sınav atmosferinde, zaman baskısı altında soru çözme ve strateji geliştirme simülasyonu.
        </p>
        <button 
          onClick={() => setIsStarted(true)}
          className="px-10 py-5 bg-[#C17767] text-white rounded-2xl shadow-xl shadow-[#C17767]/20 hover:scale-105 transition-all font-bold tracking-widest uppercase"
        >
          Savaşı Başlat
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#FDFBF7] dark:bg-zinc-950 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#EAE6DF] dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button onClick={handleExit} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-[#4A443C] dark:text-zinc-400">
            <X size={24} />
          </button>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">Savaş Durumu</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-mono font-bold tracking-tight text-[#4A443C] dark:text-zinc-200">AKTİF OPERASYON</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold opacity-40 text-[#4A443C] dark:text-zinc-400">Kalan Süre</span>
            <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-[#4A443C] dark:text-zinc-200'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs tracking-widest uppercase shadow-lg shadow-green-600/20 hover:scale-105 transition-all">
            <CheckCircle2 size={16} />
            Savaşı Bitir
          </button>
        </div>
      </header>

      {/* Main Command Area */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        {/* Left Side - Question & Canvas */}
        <div className="flex-1 relative flex flex-col p-6 min-w-0">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#EAE6DF] dark:border-zinc-800 p-8 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <span className="px-3 py-1 bg-[#C17767]/10 text-[#C17767] text-[10px] font-bold uppercase tracking-widest rounded-full">{MOCK_QUESTIONS[0].subject} • {MOCK_QUESTIONS[0].topic}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => store.setDrawingMode(store.drawingMode === 'pen' ? 'pointer' : 'pen')}
                  className={`p-3 rounded-xl transition-all ${store.drawingMode === 'pen' ? 'bg-[#C17767] text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-400'}`}
                >
                  <PenTool size={20} />
                </button>
                <button onClick={() => canvasRef.current?.clear()} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[#4A443C] dark:text-zinc-400">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
              <p className="text-xl leading-relaxed font-serif text-[#4A443C] dark:text-zinc-200 mb-8">{MOCK_QUESTIONS[0].text}</p>
              {MOCK_QUESTIONS[0].image && (
                <img src={MOCK_QUESTIONS[0].image} alt="Question" className="w-full max-w-2xl mx-auto rounded-2xl border-4 border-zinc-100 dark:border-zinc-800 shadow-xl mb-8" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {MOCK_QUESTIONS[0].options.map((opt, idx) => (
                  <button 
                    key={idx}
                    className="p-6 text-left bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-[#C17767] group transition-all"
                  >
                    <span className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold mr-4 group-hover:bg-[#C17767] group-hover:text-white transition-colors">{String.fromCharCode(65 + idx)}</span>
                    <span className="font-bold text-[#4A443C] dark:text-zinc-200">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drawing Layer */}
          <div className={`absolute inset-0 z-10 transition-opacity ${store.drawingMode === 'pen' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <CanvasDraw
              ref={canvasRef}
              brushColor="#C17767"
              brushRadius={2}
              lazyRadius={0}
              canvasWidth="100%"
              canvasHeight="100%"
              hideGrid
              backgroundColor="transparent"
            />
          </div>
        </div>

        {/* Right Side - Analysis & Tools */}
        <aside className="w-full md:w-96 border-l border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB]/50 dark:bg-zinc-900/50 p-6 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#EAE6DF] dark:border-zinc-800">
             <div className="flex items-center gap-3 mb-4">
               <BrainCircuit className="text-[#C17767]" size={24} />
               <h3 className="font-bold tracking-tight uppercase text-xs text-[#4A443C] dark:text-zinc-200">Strateji Masası</h3>
             </div>
             <p className="text-xs text-zinc-500 italic leading-relaxed">
               Sınav esnasında bu alan sadece mod seçimi ve araçlar içindir. Çözüm bittiğinde analiz buraya gelecektir.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
             <button className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex flex-col items-center gap-2 opacity-50 cursor-not-allowed">
               <RotateCcw size={20} className="text-[#4A443C] dark:text-zinc-400" />
               <span className="text-[10px] font-bold uppercase text-[#4A443C] dark:text-zinc-400">Pas geç</span>
             </button>
             <button className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex flex-col items-center gap-2 opacity-50 cursor-not-allowed">
               <Share2 size={20} className="text-[#4A443C] dark:text-zinc-400" />
               <span className="text-[10px] font-bold uppercase text-[#4A443C] dark:text-zinc-400">İpucu</span>
             </button>
          </div>
        </aside>
      </main>
    </div>
  );
};
