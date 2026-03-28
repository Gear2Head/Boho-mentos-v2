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
      <div className="relative w-16 h-20 md:w-24 md:h-32 bg-[#1C1C1C] rounded-lg overflow-hidden border border-[#333] shadow-2xl">
        {/* Top Half */}
        <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-6xl font-display font-bold text-[#EAE6DF] bg-[#222] h-1/2 border-b border-black/50">
          <span className="translate-y-1/2">{formattedValue}</span>
        </div>
        
        {/* Bottom Half */}
        <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-6xl font-display font-bold text-[#EAE6DF] h-1/2 mt-[50%] overflow-hidden bg-[#1C1C1C]">
          <span className="-translate-y-1/2">{formattedValue}</span>
        </div>

        {/* Animation Layer (Flip) */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -180 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 bg-[#222] origin-bottom h-1/2 border-b border-black/50 overflow-hidden backface-hidden z-10"
            style={{ transformStyle: 'preserve-3d' }}
          >
             <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-6xl font-display font-bold text-[#EAE6DF] translate-y-1/2">
                {formattedValue}
             </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <span className="mt-2 text-[10px] md:text-xs uppercase tracking-widest opacity-40 font-bold">{label}</span>
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
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      const months = Math.floor(distance / (1000 * 60 * 60 * 24 * 30.44));
      const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ months, days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-2 md:gap-4 p-4 items-center justify-center">
      <FlapUnit value={timeLeft.months} label="Ay" />
      <FlapUnit value={timeLeft.days} label="Gün" />
      <FlapUnit value={timeLeft.hours} label="Saat" />
      <FlapUnit value={timeLeft.minutes} label="Dak" />
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
        <div className="flex items-center bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-[10px] uppercase tracking-widest opacity-40 mr-3 font-bold">YKS SAYAÇ</span>
            <div className="flex items-center gap-1">
                <span className="font-display font-bold text-[#C17767] text-lg tabular-nums">{days}</span>
                <span className="text-[10px] opacity-30 font-bold uppercase">GÜN KALDI</span>
            </div>
        </div>
    );
};
