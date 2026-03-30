import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Paintbrush, Eraser, Trash2, ZoomIn, Clock, AlertTriangle, MonitorPlay } from 'lucide-react';
import CanvasDraw from 'react-canvas-draw';
import { useAppStore } from '../store/appStore';
import { motion } from 'motion/react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// KaTeX ile MathJax Regex Parsed Metinlerini okuyan akıllı Text Renderer
const LaTeXRenderer = ({ text }: { text: string }) => {
  if (!text) return null;
  // OGM Scraper stringlerinde "\( ... \)" ve "\\[ ... \\]" arayacak
  const parts = text.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);

  return (
    <div className="leading-relaxed whitespace-pre-line text-lg flex flex-wrap items-center">
      {parts.map((p, i) => {
        if (p.startsWith('\\(') && p.endsWith('\\)')) {
          return <InlineMath key={i}>{p.slice(2, -2)}</InlineMath>;
        }
        if (p.startsWith('\\[') && p.endsWith('\\]')) {
          return <BlockMath key={i}>{p.slice(2, -2)}</BlockMath>;
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: p }} />;
      })}
    </div>
  );
};

// Dummy OGM Data (Eğer Crawler çalıştırılmazsa Çökmeyi Önler)
const MOCK_QUESTIONS = [
  {
    "id": "OGM-MAT-1",
    "subject": "Matematik",
    "questionText": "Aşağıdaki fonksiyonun \\( f(x) = x^2 - 4x + 3 \\) kökler toplamı kaçtır?",
    "image": null,
    "options": ["-4", "-3", "4", "3", "7"],
    "correctAnswer": "4",
    "source": "OGM Materyal",
    "difficulty": "Orta"
  },
  {
    "id": "OGM-FIZ-2",
    "subject": "Fizik",
    "questionText": "Yerden \( h \) yüksekliğindeki bir cisim serbest düşmeye bırakılıyor. Sürtünmesiz ortamda havada kalma süresi aşağıdakilerden hangisine bağlıdır?",
    "image": null,
    "options": ["Platformun Kütlesine", "Cismin Kütlesine", "Cismin Yüksekliğine ve Yerçekimi ivmesine", "Cismin Hacmine", "Atmosfer Basıncına"],
    "correctAnswer": "E",
    "source": "OGM Materyal",
    "difficulty": "Zor"
  }
];

export function MebiWarRoom() {
  const store = useAppStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90); // 90 Saniye İdeal Süre
  const [isExamActive, setIsExamActive] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<number, boolean>>({});
  
  // Canvas State
  const canvasRef = useRef<any>(null);
  const [brushColor, setBrushColor] = useState('#C17767'); // Boho Red
  const [brushRadius, setBrushRadius] = useState(3);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Veritabanı Yükleme Simülasyonu
  useEffect(() => {
    // Gerçekte fetch('/assets/questions/questions-db.json') veya import ile çekilir.
    // Şimdilik Local'de Fetch deneyelim (Vite public içinden)
    fetch('/assets/questions/questions-db.json')
      .then(r => {
         if(!r.ok) throw new Error("Bot henüz çalışmamış.");
         return r.json();
      })
      .then(data => setQuestions(data.slice(0, 10))) // 10 Random Soru (Demo Limit)
      .catch((e) => {
         console.warn("Crawler JSON'u bulunamadı, Mock veriler yükleniyor: ", e);
         setQuestions(MOCK_QUESTIONS);
      });
  }, []);

  // Timer
  useEffect(() => {
    let timer: any;
    if (isExamActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isExamActive, timeLeft]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(90); // Süreyi Sıfırla
      setEliminatedOptions({});
      canvasRef.current?.clear();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setTimeLeft(90);
      setEliminatedOptions({});
      canvasRef.current?.clear();
    }
  };

  const currentQ = questions[currentIndex];

  if (!isExamActive) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-full">
        <MonitorPlay size={64} className="text-[#C17767] mb-6" />
        <h1 className="font-display italic text-4xl mb-4 text-[#C17767]">Savaş Odası (MEBİ Çizim)</h1>
        <p className="max-w-md text-center text-zinc-400 mb-8 uppercase tracking-widest text-xs font-bold leading-relaxed">
          Bu modül, OGM Materyal sunucularından çekilmiş soruları tıpkı MEBİ arayüzündeki gibi 
          kalemle çözmeni ve liyakat ELO'su kazanmanı sağlar. Tüm formüller OGM MathJax altyapısından 
          çekilerek LaTeX standardına büründürülmüştür.
        </p>
        <button 
          onClick={() => setIsExamActive(true)}
          className="px-8 py-4 bg-[#C17767] text-white rounded-xl shadow-[0_0_20px_rgba(193,119,103,0.3)] hover:bg-[#A56253] font-bold tracking-widest uppercase transition-all flex items-center gap-3"
        >
          <AlertTriangle size={20} /> Savaşı Başlat 
        </button>
      </div>
    );
  }

  if (!currentQ) return <div className="p-8 text-center mt-20 text-[#C17767] font-bold">Soru Bulunamadı</div>;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* SOL: TOOLS (Tuval Araçları) */}
      <div className="w-full md:w-20 bg-[#121212] flex md:flex-col items-center justify-around md:justify-start gap-4 p-4 border-r border-[#2A2A2A]">
         <div className="text-[10px] hidden md:block uppercase font-bold text-[#C17767] tracking-widest opacity-60">Araçlar</div>
         
         <button 
           onClick={() => { store.setDrawingMode('pointer'); }} 
           className={`p-3 rounded-xl transition-all ${store.drawingMode === 'pointer' ? 'bg-zinc-700 border border-zinc-500' : 'hover:bg-zinc-800'}`} 
           title="İşaretleme Modu (Şıklara Tıkla)"
         >
           <MonitorPlay size={20} className={store.drawingMode === 'pointer' ? 'text-white' : 'text-zinc-500'} />
         </button>

         <button 
           onClick={() => { store.setDrawingMode('pen'); setBrushColor('#C17767'); setBrushRadius(3); }} 
           className={`p-3 rounded-xl transition-all ${store.drawingMode === 'pen' && brushColor === '#C17767' ? 'bg-[#C17767]/20 border border-[#C17767]' : 'hover:bg-zinc-800'}`} 
           title="Kırmızı Kalem"
         >
           <Paintbrush size={20} className={store.drawingMode === 'pen' && brushColor === '#C17767' ? 'text-[#C17767]' : 'text-zinc-500'} />
         </button>
         
         <button 
           onClick={() => { store.setDrawingMode('pen'); setBrushColor('#3B82F6'); setBrushRadius(3); }} 
           className={`p-3 rounded-xl transition-all ${store.drawingMode === 'pen' && brushColor === '#3B82F6' ? 'bg-blue-500/20 border border-blue-500' : 'hover:bg-zinc-800'}`} 
           title="Mavi Kalem"
         >
           <Paintbrush size={20} className={store.drawingMode === 'pen' && brushColor === '#3B82F6' ? 'text-blue-500' : 'text-zinc-500'} />
         </button>

         <button 
           onClick={() => { store.setDrawingMode('eraser'); setBrushColor('white'); setBrushRadius(20); }} 
           className={`p-3 rounded-xl transition-all ${store.drawingMode === 'eraser' ? 'bg-white/20 border border-white' : 'hover:bg-zinc-800'}`} 
           title="Silgi (Whiteout)"
         >
           <Eraser size={20} className={store.drawingMode === 'eraser' ? 'text-white' : 'text-zinc-500'} />
         </button>

         <button onClick={() => canvasRef.current?.clear()} className="p-3 rounded-xl hover:bg-red-900/30 transition-all text-red-500 mt-0 md:mt-8" title="Tüm Çizimi Temizle">
           <Trash2 size={20} />
         </button>

         <button onClick={() => setZoomLevel(p => p === 1 ? 1.2 : 1)} className={`p-3 rounded-xl transition-all ${zoomLevel > 1 ? 'bg-green-500/20 text-green-500 border border-green-500' : 'hover:bg-zinc-800 text-zinc-500'}`} title="Büyüteç">
           <ZoomIn size={20} />
         </button>
      </div>

      {/* ORTA: SORU VE CANVAS KATMANI */}
      <div className="flex-1 relative overflow-hidden bg-[#FDFBF7] dark:bg-[#1A1A1A] transition-all flex flex-col">
          
          <div className="absolute top-4 right-4 z-20 flex bg-black/80 backdrop-blur-md rounded-lg border border-zinc-800 p-2 gap-2 text-white items-center shadow-xl">
             <Clock size={16} className={timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-white'} />
             <span className={`font-mono text-xl font-bold ${timeLeft <= 30 ? 'text-red-500' : ''}`}>
               {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
             </span>
          </div>

          <div className="absolute top-4 left-4 z-20">
             <span className="px-3 py-1 bg-[#C17767] text-white uppercase tracking-widest text-[10px] font-bold rounded-lg shadow-xl shadow-[#C17767]/20">
               {currentQ.subject} {currentQ.difficulty ? `- ${currentQ.difficulty}` : ''}
             </span>
          </div>

          {/* Soru İçeriği Divi (Canvas Altında / Pointer Events Auto) */}
          <div 
             className="absolute inset-0 overflow-y-auto px-8 md:px-20 pt-24 pb-32 max-w-full overflow-x-hidden"
             style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.3s ease-in-out' }}
          >
             <div className="w-full break-words">
                <LaTeXRenderer text={currentQ.questionText} />
             </div>

             {currentQ.image && (
                <div className="my-8 w-full max-w-2xl mx-auto flex justify-center">
                   <img src={currentQ.image} alt="Soru Görseli" className="rounded-xl shadow-lg object-contain max-h-96" />
                </div>
             )}

             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
               {currentQ.options?.map((opt: string, i: number) => {
                 const letter = String.fromCharCode(65 + i);
                 const isEliminated = eliminatedOptions[i];
                 return (
                   <button 
                     key={i}
                     onContextMenu={(e) => {
                        e.preventDefault();
                        setEliminatedOptions(p => ({ ...p, [i]: !p[i] }));
                     }}
                     className={`p-4 text-left border rounded-xl flex gap-4 transition-all z-30 group relative ${isEliminated ? 'opacity-30 border-red-900 bg-red-900/10' : 'bg-white dark:bg-[#2A2A2A] border-zinc-200 dark:border-zinc-800 hover:border-[#C17767] cursor-crosshair'}`}
                   >
                     {isEliminated && (
                       <svg className="absolute inset-0 w-full h-full text-red-500/50" viewBox="0 0 100 100" preserveAspectRatio="none">
                         <line x1="5" y1="5" x2="95" y2="95" stroke="currentColor" strokeWidth="2" />
                       </svg>
                     )}
                     <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[#C17767] shrink-0">
                       {letter}
                     </div>
                     <div className="flex-1 my-auto font-medium text-lg text-zinc-800 dark:text-zinc-200">
                       <LaTeXRenderer text={opt} />
                     </div>
                   </button>
                 );
               })}
             </div>
             
             <div className="mt-8 text-[10px] text-zinc-500 uppercase tracking-widest">
               * Şıkları elemek (üzerini çizmek) için SAĞ TIKLA (veya uzun bas).  Tuval üzerinde fareyle veya kalemle dilediğin gibi denklemleri çözebilirsin.
             </div>
          </div>

          {/* CanvasDraw Katmanı (Pointer-events yönetimi kritik) */}
          <div 
             className="absolute inset-0 z-10" 
             style={{ 
                pointerEvents: store.drawingMode === 'pointer' ? 'none' : 'auto',
                cursor: store.drawingMode === 'pointer' ? 'default' : 'crosshair'
             }}
          >
             {/* Yetersiz boyutlandırma getPointerCoordinates hatasına yol açar; 100% yerine fixed w/h wrapper kullanıyoruz */}
             <div style={{ width: '1000px', height: '1000px' }}> 
               <CanvasDraw
                 ref={canvasRef}
                 brushColor={brushColor}
                 brushRadius={brushRadius}
                 lazyRadius={0}
                 canvasWidth={2000}
                 canvasHeight={2000}
                 hideGrid={true}
                 backgroundColor="transparent"
                 className="h-full w-full opacity-60"
               />
             </div>
          </div>
      </div>

      {/* FOOTER: NAVIGATION */}
      <div className="w-full md:w-auto absolute bottom-0 left-0 right-0 md:relative bg-[#121212] p-4 border-t md:border-t-0 md:border-l border-[#2A2A2A] flex md:flex-col justify-between items-center z-20">
         <span className="font-mono text-zinc-500 text-sm font-bold">{currentIndex + 1} / {questions.length}</span>
         <div className="flex md:flex-col gap-4">
           <button onClick={handlePrev} disabled={currentIndex === 0} className="w-12 h-12 bg-zinc-800 text-white rounded-full flex items-center justify-center hover:bg-[#C17767] disabled:opacity-30 transition-colors">
              <ChevronLeft size={24} />
           </button>
           <button onClick={handleNext} disabled={currentIndex === questions.length - 1} className="w-12 h-12 bg-zinc-800 text-white rounded-full flex items-center justify-center hover:bg-[#C17767] disabled:opacity-30 transition-colors">
              <ChevronRight size={24} />
           </button>
         </div>
      </div>
    </div>
  );
}
