import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlapUnitProps {
  value: number;
  label: string;
}

export const FlapUnit: React.FC<FlapUnitProps> = ({ value, label }) => {
  const formattedValue = value.toString().padStart(2, '0');
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-20 md:w-24 md:h-32 bg-[#1A1A1A] rounded-lg overflow-hidden border border-white/5 shadow-2xl">
        {/* Top Half */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#222] border-b border-black/30 flex items-end justify-center overflow-hidden">
          <span className="text-4xl md:text-6xl font-display font-bold text-[#EAE6DF] leading-none translate-y-1/2">
            {formattedValue}
          </span>
        </div>
        
        {/* Bottom Half */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#1A1A1A] flex items-start justify-center overflow-hidden">
          <span className="text-4xl md:text-6xl font-display font-bold text-[#EAE6DF] leading-none -translate-y-1/2">
            {formattedValue}
          </span>
        </div>

        {/* Animation Layer (Flip) */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -180 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute top-0 left-0 right-0 h-1/2 bg-[#222] origin-bottom border-b border-black/30 flex items-end justify-center overflow-hidden backface-hidden z-10"
            style={{ transformStyle: 'preserve-3d' }}
          >
             <div className="text-4xl md:text-6xl font-display font-bold text-[#EAE6DF] leading-none translate-y-1/2">
                {formattedValue}
             </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <span className="mt-2 text-[10px] md:text-xs uppercase tracking-widest opacity-30 font-display font-bold">{label}</span>
    </div>
  );
};

export const FlapClock: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        return;
      }

      const months = Math.floor(distance / (1000 * 60 * 60 * 24 * 30.44));
      const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ months, days, hours, minutes, seconds });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-1.5 md:gap-4 p-4 items-center justify-center scale-[0.85] md:scale-100 origin-center">
      <FlapUnit value={timeLeft.months} label="Ay" />
      <FlapUnit value={timeLeft.days} label="Gün" />
      <FlapUnit value={timeLeft.hours} label="Saat" />
      <FlapUnit value={timeLeft.minutes} label="Dak" />
      <FlapUnit value={timeLeft.seconds} label="San" />
    </div>
  );
};

export const MiniFlapClock: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [days, setDays] = useState(() => {
        const distance = new Date(targetDate).getTime() - new Date().getTime();
        return Math.max(0, Math.floor(distance / (1000 * 60 * 60 * 24)));
    });
    
    useEffect(() => {
        const interval = setInterval(() => {
            const distance = new Date(targetDate).getTime() - new Date().getTime();
            setDays(Math.floor(distance / (1000 * 60 * 60 * 24)));
        }, 1000 * 60); // Update every minute is enough for Mini
        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <div className="flex items-center bg-white/5 dark:bg-black/40 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-50 mr-4 font-display font-bold text-zinc-400">YKS SAYAÇ</span>
            <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-[#C17767] text-xl md:text-2xl tabular-nums drop-shadow-[0_0_10px_rgba(193,119,103,0.3)]">{days}</span>
                <span className="text-[10px] md:text-xs opacity-40 font-bold uppercase tracking-widest">GÜN</span>
            </div>
        </div>
    );
};
