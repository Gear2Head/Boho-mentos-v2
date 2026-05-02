import React from 'react';
import { useAppStore } from '../store/appStore';
import { ACHIEVEMENTS } from '../data/achievementDefinitions';
import { AchievementCard } from './ui/AchievementCard';
import { AchievementCategory } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  streak: 'Disiplin & Seri',
  volume: 'Çalışma Hacmi',
  performance: 'Performans & Hedef',
  focus: 'Odak & Zaman',
  hidden: 'Gizli & Efsanevi'
};

export function AchievementsPanel() {
  const userAchievements = useAppStore(s => s.userAchievements || []);
  const storeState = useAppStore(); // Getting the whole state for progress calculation
  
  const [isOpen, setIsOpen] = React.useState(false);

  // Group achievements by category
  const grouped = ACHIEVEMENTS.reduce((acc, ach) => {
    if (!acc[ach.category]) acc[ach.category] = [];
    acc[ach.category].push(ach);
    return acc;
  }, {} as Record<AchievementCategory, typeof ACHIEVEMENTS>);

  return (
    <section className="bg-surface rounded-3xl p-6 border border-app shadow-sm">
      <div 
        className="flex items-center justify-between mb-8 pb-4 border-b border-app cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <h3 className="font-display text-2xl uppercase tracking-tight text-accent font-black">Başarımlar & Kariyer</h3>
          {isOpen ? <ChevronUp size={24} className="text-accent" /> : <ChevronDown size={24} className="text-zinc-500 group-hover:text-accent" />}
        </div>
        <span className="text-xs uppercase tracking-widest text-ink-muted font-black bg-surface-2 px-4 py-2 rounded-xl">
          Açılan: {userAchievements.length} / {ACHIEVEMENTS.length}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-12"
          >
            {Object.entries(grouped).map(([category, achs]) => {
          // Sort achievements: Unlocked first, then by tier, then hidden last
          const sorted = [...achs].sort((a, b) => {
            const aUnlocked = userAchievements.find(ua => ua.id === a.id);
            const bUnlocked = userAchievements.find(ua => ua.id === b.id);
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;
            return 0; // Simple sort for now, can be expanded
          });

          return (
            <motion.div variants={itemVariants} key={category}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 flex-1 bg-gradient-to-r from-transparent to-app rounded-full opacity-50" />
                <h4 className="text-[10px] uppercase tracking-widest font-black text-ink-muted opacity-80">
                  {CATEGORY_LABELS[category as AchievementCategory]}
                </h4>
                <div className="h-1 flex-1 bg-gradient-to-l from-transparent to-app rounded-full opacity-50" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sorted.map(ach => {
                  const ua = userAchievements.find(u => u.id === ach.id);
                  let progress = { current: 0, target: 1 };
                  try {
                    progress = ach.calculateProgress(storeState);
                  } catch (e) {
                    console.error("Progress calc error", e);
                  }

                  return (
                    <AchievementCard 
                      key={ach.id} 
                      achievement={ach} 
                      userAchievement={ua}
                      progress={progress}
                    />
                  );
                })}
              </div>
            </motion.div>
          );
        })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
