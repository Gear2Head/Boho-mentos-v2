/**
 * AMAÇ: War Room Ana Modülü
 * MANTIK: State'e göre Setup, Solve veya Result ekranını gösterir.
 * [UX-001 FIX]: quitSession artık ToastContext confirm dialog'u kullanıyor.
 */

import React, { useState } from 'react';
import { Target, X, Clock as ClockIcon, PenTool, MousePointer2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useWarRoom } from '../hooks/useWarRoom';
import { useToast } from '../contexts/ToastContext';
import { WarRoomSetupScreen } from './warroom/WarRoomSetupScreen';
import { WarRoomResultScreen } from './warroom/WarRoomResultScreen';
import { CanvasLayer } from './warroom/CanvasLayer';
import { QuestionNav } from './warroom/QuestionNav';
import { OptionsPanel } from './warroom/OptionsPanel';

export function MebiWarRoom() {
  const store = useAppStore();
  const { warRoomMode, warRoomSession, warRoomTimeLeft } = store;

  // [UX-001 FIX]: confirm hook'tan alındı
  const { confirm } = useToast();
  const { quitSession } = useWarRoom();

  const [currentIdx, setCurrentIdx] = useState(0);

  if (warRoomMode === 'setup') return <WarRoomSetupScreen />;
  if (warRoomMode === 'result') return <WarRoomResultScreen />;
  if (!warRoomSession || !warRoomSession.questions.length) return <WarRoomSetupScreen />;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const question = warRoomSession.questions[currentIdx];

  return (
    <div className="fixed inset-0 z-[100] bg-app flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-[#EAE6DF] dark:border-zinc-800 flex items-center justify-between px-6 bg-app shrink-0 relative z-[110]">
        <div className="flex items-center gap-6">
          {/* [UX-001 FIX]: confirm fonksiyonu geçildi */}
          <button
            onClick={() => quitSession(confirm)}
            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-[#4A443C] dark:text-zinc-400"
          >
            <X size={24} />
          </button>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="hidden xs:block">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">
              Savaş Durumu
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-mono font-bold tracking-tight text-[#4A443C] dark:text-zinc-200">
                {warRoomSession.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold opacity-40 text-[#4A443C] dark:text-zinc-400">
              KALAN SÜRE
            </span>
            <div
              className={`text-2xl font-mono font-bold flex items-center gap-2 ${
                warRoomTimeLeft < 300
                  ? 'text-red-500 animate-pulse'
                  : 'text-[#4A443C] dark:text-zinc-200'
              }`}
            >
              <ClockIcon
                size={20}
                className={
                  warRoomTimeLeft < 300 ? 'text-red-500 opacity-60' : 'text-[#C17767] opacity-60'
                }
              />
              {formatTime(warRoomTimeLeft)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Framework */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#FDFBF7] dark:bg-[#121212]">
        {/* Left Side: Question & Canvas */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {/* Top Bar for Tools */}
          <div className="absolute top-4 right-4 z-40 flex gap-2">
            <button
              onClick={() =>
                store.setDrawingMode(store.drawingMode === 'eraser' ? 'pointer' : 'eraser')
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-widest uppercase transition-all shadow-sm ${
                store.drawingMode === 'eraser'
                  ? 'bg-[#C17767] text-white scale-105'
                  : 'bg-white dark:bg-zinc-900 text-[#4A443C] dark:text-zinc-300 border border-[#EAE6DF] dark:border-zinc-800'
              }`}
            >
              Silgi
            </button>
            <button
              onClick={() =>
                store.setDrawingMode(store.drawingMode === 'pen' ? 'pointer' : 'pen')
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-2 transition-all shadow-sm ${
                store.drawingMode === 'pen'
                  ? 'bg-[#C17767] text-white scale-105'
                  : 'bg-white dark:bg-zinc-900 text-[#4A443C] dark:text-zinc-300 border border-[#EAE6DF] dark:border-zinc-800'
              }`}
            >
              {store.drawingMode === 'pen' ? <PenTool size={16} /> : <MousePointer2 size={16} />}
              {store.drawingMode === 'pen' ? 'Kalem' : 'İmleç'}
            </button>
          </div>

          <CanvasLayer />

          {/* Question UI */}
          <div className="absolute inset-x-0 top-0 bottom-24 p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="pointer-events-none mb-4">
              <span className="inline-block px-3 py-1 bg-[#C17767]/10 text-[#C17767] text-[10px] uppercase font-bold tracking-widest rounded mb-6">
                SORU {currentIdx + 1} / {warRoomSession.questions.length} • {question.subject} •{' '}
                {question.topic}
              </span>
              <div className="text-xl md:text-3xl leading-relaxed md:leading-[1.7] font-serif text-[#4A443C] dark:text-zinc-100 select-none drop-shadow-sm max-w-4xl">
                {question.text}
              </div>
              {question.image && (
                <img
                  src={question.image}
                  alt="Soru görseli"
                  className="mt-8 rounded-xl border-4 border-white dark:border-zinc-800 shadow-2xl max-w-3xl pointer-events-none"
                />
              )}
            </div>

            {/* Şıklar Paneli (Tıklanabilir) */}
            <div className="relative z-10 pointer-events-auto">
              <OptionsPanel 
                options={question.options} 
                currentQuestionId={question.id} 
              />
            </div>
          </div>

          <QuestionNav
            currentIdx={currentIdx}
            totalCount={warRoomSession.questions.length}
            onNavigate={setCurrentIdx}
          />
        </div>

        {/* Right Aside: AI Coach */}
        <aside className="hidden md:flex flex-col w-80 lg:w-96 border-l border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-950 p-6 relative z-50">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-[#C17767]" size={24} />
            <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#4A443C] dark:text-zinc-400">
              Simülasyon Aktif
            </h3>
          </div>
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 border border-[#EAE6DF] dark:border-zinc-800 shadow-sm flex-1">
            <div className="space-y-4 text-sm font-mono text-[#4A443C] dark:text-zinc-400">
              <p>Oturum kilitli.</p>
              <p>
                Soruyu dikkatlice oku, kalemi (sağ üst) seçtiğinde ekran boyunca serbest çizim
                yapabilirsin.
              </p>
              <p>Tıklama ve seçenek işaretlemek için "İmleç" moduna dönmelisin.</p>
              <p>
                İmleç modundayken bir şıkka sağ tıkladığında (veya uzun bastığında) şıkkın üstünü
                çizersin.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
