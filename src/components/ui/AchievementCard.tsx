import React from 'react';
import { motion } from 'framer-motion'; // Using motion instead of motion/react if possible, but let's stick to motion/react since Boho-mentos uses it
import * as LucideIcons from 'lucide-react';
import { Achievement, UserAchievement } from '../../types';

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress: { current: number; target: number };
}

export function AchievementCard({ achievement, userAchievement, progress }: AchievementCardProps) {
  const isUnlocked = !!userAchievement;
  const isHidden = achievement.isHidden && !isUnlocked;

  // Safely render icon
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Trophy;

  const displayTitle = isHidden ? 'Gizemli Görev' : achievement.title;
  const displayDesc = isHidden ? 'Bilinmeyenleri keşfet...' : achievement.description;

  // Calculate percentage
  let pct = (progress.current / progress.target) * 100;
  if (pct > 100) pct = 100;
  if (isUnlocked) pct = 100;

  let containerClass = "relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between min-h-[140px]";
  let iconContainerClass = "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-all mb-3";
  let titleClass = "font-black text-sm text-ink leading-tight truncate uppercase tracking-tight";
  let descClass = "text-[10px] mt-1 text-ink-muted leading-relaxed font-medium line-clamp-2";
  
  if (!isUnlocked) {
    containerClass += " opacity-60 grayscale border-app bg-surface-2";
    iconContainerClass += " border-app bg-surface text-ink-muted";
  } else {
    // Tiers
    switch (achievement.tier) {
      case 'iron':
        containerClass += " border-zinc-400/30 bg-zinc-400/5";
        iconContainerClass += " border-zinc-400/30 bg-zinc-400/10 text-zinc-500";
        break;
      case 'bronze':
        containerClass += " border-[#cd7f32]/30 bg-[#cd7f32]/5";
        iconContainerClass += " border-[#cd7f32]/30 bg-[#cd7f32]/10 text-[#cd7f32]";
        break;
      case 'silver':
        containerClass += " border-gray-300/40 bg-gray-300/10";
        iconContainerClass += " border-gray-300/40 bg-gray-300/20 text-gray-400";
        break;
      case 'gold':
        containerClass += " border-yellow-400/40 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]";
        iconContainerClass += " border-yellow-400/40 bg-yellow-400/20 text-yellow-500";
        break;
      case 'diamond':
        containerClass += " border-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-md";
        iconContainerClass += " border-cyan-400/50 bg-cyan-400/20 text-cyan-400";
        titleClass += " text-cyan-500";
        break;
      case 'legendary':
        // Animated gradient border achieved via CSS class if possible, or just elaborate inline style
        containerClass += " border-transparent bg-clip-padding relative before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-purple-500 before:via-pink-500 before:to-yellow-500 before:animate-gradient-x shadow-[0_0_20px_rgba(168,85,247,0.4)]";
        iconContainerClass += " border-purple-500/50 bg-purple-500/20 text-purple-400";
        titleClass += " text-purple-400";
        break;
      default:
        containerClass += " border-green-500/20 bg-green-500/5";
        iconContainerClass += " border-green-500/20 bg-green-500/10 text-green-600";
    }
  }

  return (
    <div className={containerClass}>
      <div>
        <div className="flex items-start justify-between">
          <div className={iconContainerClass}>
            {isHidden ? <LucideIcons.HelpCircle size={18} /> : <IconComponent size={18} />}
          </div>
          {isUnlocked && (
            <div className="text-[8px] uppercase tracking-widest text-ink-muted shrink-0 font-black px-2 py-1 rounded-full bg-surface">
              {new Date(userAchievement.unlockedAt).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>
        
        <div className={titleClass}>{displayTitle}</div>
        <div className={descClass}>{displayDesc}</div>
      </div>

      {/* Progress Bar */}
      {!isUnlocked && !isHidden && (
        <div className="mt-4">
          <div className="flex justify-between text-[8px] font-bold text-ink-muted mb-1 uppercase tracking-wider">
            <span>İlerleme</span>
            <span>{Math.floor(progress.current)} / {progress.target}</span>
          </div>
          <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
