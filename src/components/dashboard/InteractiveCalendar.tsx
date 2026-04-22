import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Sparkles } from 'lucide-react';

export function InteractiveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const logs = useAppStore(s => s.logs);
  // (In a real scenario, we'd map logs to dates. For now we just create a visual grid)
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-zinc-800/50 rounded-3xl p-6 relative overflow-hidden flex flex-col h-full">
      
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6 z-10">
        <h3 className="text-xl font-display italic text-[#C17767] uppercase tracking-widest font-bold">
          {currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 bg-black/20 rounded-xl hover:bg-black/40 transition-colors">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <button onClick={nextMonth} className="p-2 bg-black/20 rounded-xl hover:bg-black/40 transition-colors">
            <ChevronRight size={16} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-2 z-10">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
          <div key={d} className="text-center text-[10px] uppercase font-bold tracking-widest text-zinc-500">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 z-10 flex-1">
        {padding.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square bg-transparent rounded-xl opacity-0" />
        ))}
        {days.map(d => {
          const isToday = new Date().getDate() === d && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
          const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentDate.getMonth();

          // Mock Data logic for gradients
          const logCount = logs.length % (d + 1); // Mock randomish value
          const gradient = logCount > 10 ? 'from-[#C17767] to-[#8C5245]' : 
                           logCount > 5 ? 'from-amber-600/40 to-[#C17767]/40' : 
                           'bg-zinc-800/30';

          return (
            <motion.button 
              key={d}
              onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), d))}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`aspect-square relative rounded-xl flex items-center justify-center border transition-all ${
                isSelected ? 'border-[#C17767] shadow-lg shadow-[#C17767]/20 bg-white/10' : 
                isToday ? 'border-zinc-500 bg-white/5' : 'border-transparent hover:border-zinc-700/50'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-20`} />
              <span className={`text-sm font-bold z-10 ${isToday ? 'text-white' : 'text-zinc-400'}`}>{d}</span>
              
              {/* Exam glow marker mock */}
              {d === 20 && currentDate.getMonth() === 5 && (
                <div className="absolute inset-x-0 bottom-1 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] animate-pulse" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Agenda Slide-out Mock */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-0 top-0 bottom-0 w-64 bg-zinc-950/90 backdrop-blur-3xl border-l border-zinc-800/50 p-6 z-20 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-display italic text-[#C17767] text-lg">
                {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              </h4>
              <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-2 mb-2">
                <Clock size={12} /> ZAMAN ÇİZELGESİ
              </div>
              
              {/* Task Mock */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-[#C17767]/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">MATEMATİK</span>
                  <span className="text-[10px] text-zinc-500 font-mono">10:00</span>
                </div>
                <p className="text-sm font-bold text-zinc-300">Türev Soru Çözümü</p>
                <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-1/2 group-hover:w-full transition-all duration-500" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-[#C17767]/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] bg-[#C17767]/10 text-[#C17767] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">KÜBRA</span>
                  <span className="text-[10px] text-zinc-500 font-mono">15:00</span>
                </div>
                <p className="text-sm font-bold text-zinc-300 flex items-center gap-1"><Sparkles size={12} className="text-[#C17767]" /> Deneme Analizi</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
