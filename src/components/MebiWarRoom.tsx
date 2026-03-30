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
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasDim, setCanvasDim] = useState({ width: 800, height: 600 });

  // --- Real-time Pixel-Perfect Sizing ---
  useEffect(() => {
    if (!containerRef.current) return;
    
    // ResizeObserver ensures we always have the current pixel dimensions
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // getBoundingClientRect is needed for absolute pixel precision regardless of padding/zoom
        const rect = entry.target.getBoundingClientRect();
        setCanvasDim({ 
          width: Math.floor(rect.width), 
          height: Math.floor(rect.height) 
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isStarted]); // Initialize when starts

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
    <div className="fixed inset-0 z-[100] bg-[#FDFBF7] dark:bg-zinc-950 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-14 md:h-16 border-b border-[#EAE6DF] dark:border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-zinc-900 shrink-0 relative z-[110]">
        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={handleExit} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-[#4A443C] dark:text-zinc-400">
            <X size={24} />
          </button>
          <div className="h-6 md:h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
          <div className="hidden xs:block">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">Savaş Durumu</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] md:text-sm font-mono font-bold tracking-tight text-[#4A443C] dark:text-zinc-200">AKTİF</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-center">
            <span className="text-[8px] md:text-[10px] uppercase font-bold opacity-40 text-[#4A443C] dark:text-zinc-400">Süre</span>
            <div className={`text-lg md:text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-[#4A443C] dark:text-zinc-200'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-green-600 text-white rounded-xl font-bold text-[10px] md:text-xs tracking-widest uppercase shadow-lg shadow-green-600/20 hover:scale-105 transition-all">
            <CheckCircle2 size={14} />
            <span className="hidden sm:inline">BİTİR</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Question Engine */}
        <div className="flex-1 relative flex flex-col min-w-0 p-0 md:p-4">
          <div 
            ref={containerRef}
            className="bg-white dark:bg-zinc-900 rounded-none md:rounded-3xl border-0 md:border md:border-[#EAE6DF] dark:border-zinc-800 shadow-sm flex-1 flex flex-col overflow-hidden relative"
          >
            {/* Drawing Layer - ZERO PADDING for Perfect Sync */}
            <div className={`absolute inset-0 z-10 transition-opacity bg-transparent overflow-hidden ${store.drawingMode === 'pen' ? 'opacity-100 pointer-events-auto cursor-crosshair' : 'opacity-0 pointer-events-none'}`}>
              <CanvasDraw
                ref={canvasRef}
                brushColor="#C17767"
                brushRadius={2}
                lazyRadius={0}
                canvasWidth={canvasDim.width} 
                canvasHeight={canvasDim.height}
                hideGrid
                backgroundColor="transparent"
                style={{ background: 'transparent' }}
              />
            </div>

            {/* UI Content Layer - INTERNAL PADDING ONLY */}
            <div className="p-4 md:p-8 flex-1 flex flex-col overflow-hidden relative z-0">
               {/* Controls */}
               <div className="flex justify-between items-start mb-4 md:mb-6 shrink-0 relative z-30">
                 <span className="px-2 py-0.5 bg-[#C17767]/10 text-[#C17767] text-[8px] md:text-[10px] font-bold uppercase tracking-widest rounded-full">{MOCK_QUESTIONS[0].subject} • {MOCK_QUESTIONS[0].topic}</span>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => store.setDrawingMode(store.drawingMode === 'pen' ? 'pointer' : 'pen')}
                     className={`p-2.5 rounded-xl transition-all shadow-sm ${store.drawingMode === 'pen' ? 'bg-[#C17767] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-[#4A443C] dark:text-zinc-400'}`}
                   >
                     {store.drawingMode === 'pen' ? <PenTool size={20} /> : <MousePointer2 size={20} />}
                   </button>
                   <button onClick={() => canvasRef.current?.clear()} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[#4A443C] dark:text-zinc-400 shadow-sm">
                     <Trash2 size={20} />
                   </button>
                 </div>
               </div>

               {/* Scrollable Question Content */}
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 md:pr-4 relative z-0">
                 <p className="text-base md:text-xl leading-relaxed font-serif text-[#4A443C] dark:text-zinc-200 mb-6 md:mb-8 select-none">{MOCK_QUESTIONS[0].text}</p>
                 {MOCK_QUESTIONS[0].image && (
                   <img src={MOCK_QUESTIONS[0].image} alt="Question" className="w-full max-w-2xl mx-auto rounded-xl md:rounded-2xl border-2 md:border-4 border-zinc-100 dark:border-zinc-800 shadow-xl mb-6 md:mb-8 pointer-events-none select-none" />
                 )}

                 {/* Options - Use high z-index and pointer-events-auto for clickability through the ghost canvas */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-6 md:mt-8 relative z-40">
                   {MOCK_QUESTIONS[0].options.map((opt, idx) => (
                     <button 
                       key={idx}
                       className="p-4 md:p-6 text-left bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl md:rounded-2xl hover:border-[#C17767] group transition-all flex items-center shadow-sm pointer-events-auto relative"
                     >
                       <span className="w-6 h-6 md:w-8 md:h-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] md:text-xs font-bold mr-3 md:mr-4 group-hover:bg-[#C17767] group-hover:text-white transition-colors">{String.fromCharCode(65 + idx)}</span>
                       <span className="font-bold text-sm md:text-base text-[#4A443C] dark:text-zinc-200">{opt}</span>
                     </button>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right: Tactics Aside */}
        <aside className="w-full md:w-96 border-l border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB]/50 dark:bg-zinc-900/50 p-6 flex flex-col gap-6 overflow-y-auto relative z-[105]">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-[#EAE6DF] dark:border-zinc-800 shadow-sm leading-relaxed">
             <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="text-[#C17767]" size={24} />
                <h3 className="font-bold tracking-tight uppercase text-xs text-[#4A443C] dark:text-zinc-200">Strateji Masası</h3>
             </div>
             <p className="text-xs text-zinc-500 italic">
               Sayısal olarak %{Math.round(((1800-timeLeft)/1800)*100)} verimlilikle ilerliyorsun. Sınav esnasında bu alan statiktir.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
             <button className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex flex-col items-center gap-2 opacity-30 cursor-not-allowed">
               <RotateCcw size={20} className="text-[#4A443C] dark:text-zinc-400" />
               <span className="text-[10px] font-bold uppercase text-[#4A443C] dark:text-zinc-400">Pas geç</span>
             </button>
             <button className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex flex-col items-center gap-2 opacity-30 cursor-not-allowed">
               <Share2 size={20} className="text-[#4A443C] dark:text-zinc-400" />
               <span className="text-[10px] font-bold uppercase text-[#4A443C] dark:text-zinc-400">İpucu</span>
             </button>
          </div>
        </aside>
      </main>
    </div>
  );
};
