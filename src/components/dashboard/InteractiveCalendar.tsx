import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Sparkles } from 'lucide-react';

export function InteractiveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const logs = useAppStore(s => s.logs);
  const agendaEntries = useAppStore(s => s.agendaEntries);
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Tarih karşılaştırma yardımcısı (Local)
  const isSameDay = (isoStr: string, targetDate: Date) => {
    const d = new Date(isoStr);
    return d.getFullYear() === targetDate.getFullYear() &&
           d.getMonth() === targetDate.getMonth() &&
           d.getDate() === targetDate.getDate();
  };

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
          const target = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
          const isToday = new Date().getDate() === d && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
          const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentDate.getMonth();

          // Isı haritası için loglar ve ajanda girişlerini topla
          const dayLogCount = logs.filter(l => isSameDay(l.date, target)).length;
          const dayAgendaCount = agendaEntries.filter(e => isSameDay(e.date, target)).length;
          const totalActivity = dayLogCount + dayAgendaCount;
          
          const gradient = totalActivity > 5 ? 'from-[#C17767] to-[#8C5245]' : 
                           totalActivity > 0 ? 'from-amber-600/40 to-[#C17767]/40' : 
                           'bg-zinc-800/30';

          return (
            <motion.button 
              key={d}
              onClick={() => setSelectedDate(target)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`aspect-square relative rounded-xl flex items-center justify-center border transition-all ${
                isSelected ? 'border-[#C17767] shadow-lg shadow-[#C17767]/20 bg-white/10' : 
                isToday ? 'border-zinc-500 bg-white/5' : 'border-transparent hover:border-zinc-700/50'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-20`} />
              <span className={`text-sm font-bold z-10 ${isToday ? 'text-white' : 'text-zinc-400'}`}>{d}</span>
              
            </motion.button>
          );
        })}
      </div>

      {/* Agenda Slide-out */}
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-2 mb-2">
                <Clock size={12} /> GÜNLÜK KAYITLAR
              </div>
              
              {/* Ajanda Girişleri */}
              {agendaEntries
                .filter(e => isSameDay(e.date, selectedDate))
                .map(e => (
                  <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-[#C17767]/30 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] bg-[#C17767]/10 text-[#C17767] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                        {e.parsedExam ? e.parsedExam.type : 'AJANDA'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(e.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 break-words">{e.content.slice(0, 100)}{e.content.length > 100 ? '...' : ''}</p>
                  </div>
                ))}
              
              {/* Ders Çalışma Logları (Opsiyonel: Takvimde loglar da görünsün istenirse eklenebilir) */}
              {logs
                .filter(l => isSameDay(l.date, selectedDate))
                .map(l => (
                  <div key={l.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[8px] text-amber-500 uppercase font-bold">{l.subject}</span>
                      <span className="text-[8px] text-zinc-600 font-mono">LOG</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{l.questions} Soru | {l.avgTime} Dakika</p>
                  </div>
                ))}

              {(agendaEntries.filter(e => isSameDay(e.date, selectedDate)).length === 0 && 
                logs.filter(l => isSameDay(l.date, selectedDate)).length === 0) && (
                <p className="text-[10px] text-zinc-600 italic text-center py-8">Bu güne ait kayıt bulunamadı.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
