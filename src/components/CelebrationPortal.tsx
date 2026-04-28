import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { ACHIEVEMENTS } from '../data/achievementDefinitions';
import { triggerConfetti } from '../utils/confetti';
import * as LucideIcons from 'lucide-react';

export function CelebrationPortal() {
  const pendingCelebrations = useAppStore(s => s.pendingCelebrations || []);
  const markCelebrationViewed = useAppStore(s => s.markCelebrationViewed);
  
  const currentId = pendingCelebrations[0];
  const achievement = currentId ? ACHIEVEMENTS.find(a => a.id === currentId) : null;

  useEffect(() => {
    if (achievement) {
      triggerConfetti(); // Play confetti!
      // Auto close after 5 seconds if not clicked
      const timer = setTimeout(() => {
        markCelebrationViewed(currentId);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, currentId, markCelebrationViewed]);

  if (!achievement) return null;

  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Trophy;

  // Let's create a huge 3D tilting card
  let cardBg = "bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/50";
  let iconColor = "text-green-400";
  let glow = "shadow-[0_0_50px_rgba(34,197,94,0.3)]";

  switch (achievement.tier) {
    case 'iron':
      cardBg = "bg-zinc-800/80 border-zinc-500/50";
      iconColor = "text-zinc-300";
      glow = "shadow-[0_0_30px_rgba(113,113,122,0.5)]";
      break;
    case 'bronze':
      cardBg = "bg-orange-900/40 border-[#cd7f32]";
      iconColor = "text-[#cd7f32]";
      glow = "shadow-[0_0_40px_rgba(205,127,50,0.4)]";
      break;
    case 'silver':
      cardBg = "bg-gray-800/60 border-gray-400";
      iconColor = "text-gray-300";
      glow = "shadow-[0_0_40px_rgba(156,163,175,0.4)]";
      break;
    case 'gold':
      cardBg = "bg-yellow-900/40 border-yellow-400";
      iconColor = "text-yellow-400";
      glow = "shadow-[0_0_60px_rgba(250,204,21,0.5)]";
      break;
    case 'diamond':
      cardBg = "bg-cyan-900/40 border-cyan-400 backdrop-blur-xl";
      iconColor = "text-cyan-300";
      glow = "shadow-[0_0_80px_rgba(34,211,238,0.6)]";
      break;
    case 'legendary':
      cardBg = "bg-black/60 border-purple-500 backdrop-blur-xl relative overflow-hidden before:absolute before:inset-0 before:-z-10 before:p-[3px] before:bg-gradient-to-r before:from-purple-500 before:via-pink-500 before:to-yellow-500 before:animate-gradient-x";
      iconColor = "text-fuchsia-400";
      glow = "shadow-[0_0_100px_rgba(168,85,247,0.8)]";
      break;
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={() => markCelebrationViewed(currentId)}
      >
        <motion.div 
          initial={{ scale: 0.5, y: 50, rotateX: 45 }}
          animate={{ scale: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -50 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
          className={`relative max-w-sm w-full rounded-3xl border-2 p-8 text-center flex flex-col items-center justify-center ${cardBg} ${glow} cursor-pointer`}
          style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          whileHover={{ scale: 1.05, rotateY: 10, rotateX: -10 }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-6 font-black">
            Yeni Başarım Açıldı
          </div>
          
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className={`w-24 h-24 rounded-full flex items-center justify-center bg-white/10 mb-6 shadow-inner border border-white/20`}
          >
            <IconComponent size={48} className={iconColor} />
          </motion.div>

          <h2 className="text-3xl font-display font-black text-white mb-2 uppercase tracking-tight">
            {achievement.title}
          </h2>
          <p className="text-sm text-white/70 mb-8 font-medium">
            {achievement.description}
          </p>

          <div className="w-full pt-6 border-t border-white/10 flex flex-col items-center gap-2">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Ödüller</div>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-bold border border-yellow-500/30">
                +{achievement.reward.elo} ELO
              </span>
              {achievement.reward.themeUnlock && (
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-bold border border-purple-500/30">
                  Tema: {achievement.reward.themeUnlock}
                </span>
              )}
              {achievement.reward.badgeTitle && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold border border-blue-500/30">
                  Unvan: {achievement.reward.badgeTitle}
                </span>
              )}
            </div>
          </div>
          
          <div className="absolute bottom-4 text-[8px] text-white/30 uppercase tracking-widest animate-pulse">
            Devam etmek için tıkla
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
