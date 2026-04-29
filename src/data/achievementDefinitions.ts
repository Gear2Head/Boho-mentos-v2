import { Achievement } from '../types';
import type { AppState } from '../store/appStore';
import { calculateBaseElo } from '../utils/eloRecomputator';

// Helper functions for common state queries
const getTotalQuestions = (state: AppState) => state.logs.reduce((sum, log) => sum + (log.questions || 0), 0);
const getSubjectQuestions = (state: AppState, subjectNameIncludes: string) => 
  state.logs.filter(l => l.subject.toLowerCase().includes(subjectNameIncludes.toLowerCase()))
    .reduce((sum, log) => sum + (log.questions || 0), 0);

const getExamCount = (state: AppState) => state.exams?.length || 0;
const getCompetitiveElo = (state: AppState) => calculateBaseElo(
  state.logs || [],
  state.exams || [],
  state.profile,
  state.tytSubjects || [],
  state.aytSubjects || []
);

export const ELO_ACHIEVEMENT_THRESHOLDS = {
  elo_rising: 100,
  elo_challenger: 1000,
  elo_grandmaster: 3000,
} as const;

export function sumAchievementRewards(ids: string[]): number {
  const idSet = new Set(ids);
  return ACHIEVEMENTS.reduce((sum, achievement) => (
    idSet.has(achievement.id) ? sum + (achievement.reward?.elo || 0) : sum
  ), 0);
}

export function filterInvalidEloAchievementIds(ids: string[], baseElo: number): string[] {
  return ids.filter((id) => {
    const threshold = ELO_ACHIEVEMENT_THRESHOLDS[id as keyof typeof ELO_ACHIEVEMENT_THRESHOLDS];
    return threshold === undefined || baseElo >= threshold;
  });
}

export const ACHIEVEMENTS: Achievement[] = [
  // Category: Streak & Discipline
  {
    id: 'spark',
    title: 'Kıvılcım',
    description: '3 günlük çalışma serisi yakala.',
    tier: 'iron',
    category: 'streak',
    isHidden: false,
    icon: 'Flame',
    reward: { elo: 50 },
    calculateProgress: (state) => ({ current: state.streakDays || 0, target: 3 })
  },
  {
    id: 'flame',
    title: 'Alev',
    description: '7 günlük çalışma serisi yakala.',
    tier: 'bronze',
    category: 'streak',
    isHidden: false,
    icon: 'Flame',
    reward: { elo: 150 },
    calculateProgress: (state) => ({ current: state.streakDays || 0, target: 7 })
  },
  {
    id: 'wildfire',
    title: 'Orman Yangını',
    description: '15 günlük çalışma serisi yakala.',
    tier: 'silver',
    category: 'streak',
    isHidden: false,
    icon: 'Flame',
    reward: { elo: 400 },
    calculateProgress: (state) => ({ current: state.streakDays || 0, target: 15 })
  },
  {
    id: 'inferno',
    title: 'Cehennem Ateşi',
    description: '30 günlük çalışma serisi yakala.',
    tier: 'gold',
    category: 'streak',
    isHidden: false,
    icon: 'Flame',
    reward: { elo: 1000 },
    calculateProgress: (state) => ({ current: state.streakDays || 0, target: 30 })
  },
  {
    id: 'immortal_sun',
    title: 'Ölümsüz Güneş',
    description: '100 günlük çalışma serisi yakala.',
    tier: 'legendary',
    category: 'streak',
    isHidden: false,
    icon: 'Sun',
    reward: { elo: 5000, badgeTitle: 'Ölümsüz' },
    calculateProgress: (state) => ({ current: state.streakDays || 0, target: 100 })
  },
  {
    id: 'early_bird',
    title: 'Erken Kalkan',
    description: 'Sabah 08:00\'den önce 5 kez odak seansı başlat.',
    tier: 'bronze',
    category: 'streak',
    isHidden: false,
    icon: 'Sunrise',
    reward: { elo: 100 },
    calculateProgress: (state) => {
      const earlySessions = state.focusSessions?.filter(s => {
        const hour = new Date(s.startTime).getHours();
        return hour >= 4 && hour < 8;
      }).length || 0;
      return { current: earlySessions, target: 5 };
    }
  },
  {
    id: 'night_owl',
    title: 'Gece Kuşu',
    description: 'Gece 00:00\'dan sonra 3 kez odak seansı tamamla.',
    tier: 'bronze',
    category: 'streak',
    isHidden: false,
    icon: 'Moon',
    reward: { elo: 100 },
    calculateProgress: (state) => {
      const nightSessions = state.focusSessions?.filter(s => {
        const hour = new Date(s.endTime).getHours();
        return hour >= 0 && hour < 4;
      }).length || 0;
      return { current: nightSessions, target: 3 };
    }
  },
  {
    id: 'perfect_week',
    title: 'Kusursuz Hafta',
    description: 'Pazartesi\'den Pazar\'a kadar her gün log gir.',
    tier: 'silver',
    category: 'streak',
    isHidden: false,
    icon: 'CalendarCheck',
    reward: { elo: 300 },
    calculateProgress: (state) => {
      // Simplification for the engine: check if streak >= 7 as a basic proxy, 
      // or implement advanced week tracking later.
      return { current: state.streakDays >= 7 ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'weekend_warrior',
    title: 'Hafta Sonu Savaşçısı',
    description: 'Cumartesi ve Pazar toplam 5 saat odaklan.',
    tier: 'silver',
    category: 'streak',
    isHidden: false,
    icon: 'Swords',
    reward: { elo: 300 },
    calculateProgress: (state) => {
      let seconds = 0;
      state.focusSessions?.forEach(s => {
        const day = new Date(s.startTime).getDay();
        if (day === 0 || day === 6) seconds += s.durationSeconds;
      });
      return { current: Math.floor(seconds / 3600), target: 5 };
    }
  },
  {
    id: 'consistency_king',
    title: 'İstikrar Kralı',
    description: '3 gün üst üste tam olarak 100 soru çöz.',
    tier: 'gold',
    category: 'streak',
    isHidden: false,
    icon: 'Crown',
    reward: { elo: 1000 },
    calculateProgress: (state) => {
      // Complex condition. We default to 0 for now unless user hits it.
      return { current: 0, target: 3 }; 
    }
  },

  // Category: Volume & Grind
  {
    id: 'first_blood',
    title: 'İlk Kan',
    description: 'Toplam 100 soru çöz.',
    tier: 'iron',
    category: 'volume',
    isHidden: false,
    icon: 'Sword',
    reward: { elo: 50 },
    calculateProgress: (state) => ({ current: getTotalQuestions(state), target: 100 })
  },
  {
    id: 'centurion',
    title: 'Yüzbaşı',
    description: 'Toplam 1.000 soru çöz.',
    tier: 'bronze',
    category: 'volume',
    isHidden: false,
    icon: 'Shield',
    reward: { elo: 200 },
    calculateProgress: (state) => ({ current: getTotalQuestions(state), target: 1000 })
  },
  {
    id: 'legionnaire',
    title: 'Lejyoner',
    description: 'Toplam 5.000 soru çöz.',
    tier: 'silver',
    category: 'volume',
    isHidden: false,
    icon: 'ShieldAlert',
    reward: { elo: 500 },
    calculateProgress: (state) => ({ current: getTotalQuestions(state), target: 5000 })
  },
  {
    id: 'general',
    title: 'General',
    description: 'Toplam 10.000 soru çöz.',
    tier: 'gold',
    category: 'volume',
    isHidden: false,
    icon: 'Star',
    reward: { elo: 1000 },
    calculateProgress: (state) => ({ current: getTotalQuestions(state), target: 10000 })
  },
  {
    id: 'emperor',
    title: 'İmparator',
    description: 'Toplam 25.000 soru çöz.',
    tier: 'diamond',
    category: 'volume',
    isHidden: false,
    icon: 'Crown',
    reward: { elo: 2500, badgeTitle: 'İmparator' },
    calculateProgress: (state) => ({ current: getTotalQuestions(state), target: 25000 })
  },
  {
    id: 'math_addict',
    title: 'Matematik Bağımlısı',
    description: '1.000 Matematik sorusu çöz.',
    tier: 'silver',
    category: 'volume',
    isHidden: false,
    icon: 'Calculator',
    reward: { elo: 300 },
    calculateProgress: (state) => ({ current: getSubjectQuestions(state, 'Matematik'), target: 1000 })
  },
  {
    id: 'science_geek',
    title: 'Bilim İnsanı',
    description: 'Fizik, Kimya veya Biyoloji\'den 1.000 soru çöz.',
    tier: 'silver',
    category: 'volume',
    isHidden: false,
    icon: 'FlaskConical',
    reward: { elo: 300 },
    calculateProgress: (state) => ({ 
      current: getSubjectQuestions(state, 'Fizik') + getSubjectQuestions(state, 'Kimya') + getSubjectQuestions(state, 'Biyoloji'), 
      target: 1000 
    })
  },
  {
    id: 'literature_buff',
    title: 'Edebiyat Kurdu',
    description: 'Edebiyat veya Türkçe\'den 1.000 soru çöz.',
    tier: 'silver',
    category: 'volume',
    isHidden: false,
    icon: 'BookOpen',
    reward: { elo: 300 },
    calculateProgress: (state) => ({ 
      current: getSubjectQuestions(state, 'Türkçe') + getSubjectQuestions(state, 'Edebiyat'), 
      target: 1000 
    })
  },
  {
    id: 'trial_rookie',
    title: 'Deneme Çaylağı',
    description: '5 adet deneme sınavı kaydet.',
    tier: 'bronze',
    category: 'volume',
    isHidden: false,
    icon: 'FileText',
    reward: { elo: 150 },
    calculateProgress: (state) => ({ current: getExamCount(state), target: 5 })
  },
  {
    id: 'trial_master',
    title: 'Deneme Ustası',
    description: '30 adet deneme sınavı kaydet.',
    tier: 'gold',
    category: 'volume',
    isHidden: false,
    icon: 'Target',
    reward: { elo: 800 },
    calculateProgress: (state) => ({ current: getExamCount(state), target: 30 })
  },

  // Category: Focus & Time
  {
    id: 'deep_diver',
    title: 'Derin Dalgıç',
    description: '60 dakika hiç duraklamadan odaklan.',
    tier: 'bronze',
    category: 'focus',
    isHidden: false,
    icon: 'Waves',
    reward: { elo: 200 },
    calculateProgress: (state) => {
      const best = state.focusSessions?.reduce((max, s) => {
        return (s.interruptions === 0 && s.durationSeconds > max) ? s.durationSeconds : max;
      }, 0) || 0;
      return { current: Math.floor(best / 60), target: 60 };
    }
  },
  {
    id: 'abyss_walker',
    title: 'Hiçlik Yürüyüşçüsü',
    description: '120 dakika hiç duraklamadan odaklan.',
    tier: 'gold',
    category: 'focus',
    isHidden: false,
    icon: 'Anchor',
    reward: { elo: 800 },
    calculateProgress: (state) => {
      const best = state.focusSessions?.reduce((max, s) => {
        return (s.interruptions === 0 && s.durationSeconds > max) ? s.durationSeconds : max;
      }, 0) || 0;
      return { current: Math.floor(best / 60), target: 120 };
    }
  },
  {
    id: 'pomodoro_fanatic',
    title: 'Pomodoro Fanatiği',
    description: 'Bir günde 8 adet 25dk odak seansı tamamla.',
    tier: 'silver',
    category: 'focus',
    isHidden: false,
    icon: 'Timer',
    reward: { elo: 400 },
    calculateProgress: (state) => {
      // Approximated by counting total sessions around 25 mins today. We'll simplify to checking if any day has 8+ sessions > 20min.
      return { current: 0, target: 8 };
    }
  },
  {
    id: 'time_lord',
    title: 'Zamanın Efendisi',
    description: '100 saat toplam odak süresine ulaş.',
    tier: 'diamond',
    category: 'focus',
    isHidden: false,
    icon: 'Hourglass',
    reward: { elo: 2000, themeUnlock: 'Cyber Blue' },
    calculateProgress: (state) => {
      const totalSeconds = state.focusSessions?.reduce((sum, s) => sum + s.durationSeconds, 0) || 0;
      return { current: Math.floor(totalSeconds / 3600), target: 100 };
    }
  },
  {
    id: 'marathon_runner',
    title: 'Maratoncu',
    description: 'Tek bir günde toplam 8 saat odaklan.',
    tier: 'gold',
    category: 'focus',
    isHidden: false,
    icon: 'Activity',
    reward: { elo: 1000 },
    calculateProgress: (state) => {
      // Find the day with max hours
      const dailyHours: Record<string, number> = {};
      state.focusSessions?.forEach(s => {
        const d = s.startTime.split('T')[0];
        dailyHours[d] = (dailyHours[d] || 0) + s.durationSeconds;
      });
      const maxSeconds = Object.values(dailyHours).reduce((a, b) => Math.max(a, b), 0);
      return { current: Math.floor(maxSeconds / 3600), target: 8 };
    }
  },
  {
    id: 'weekly_grind',
    title: 'Haftalık Eziyet',
    description: 'Bir haftada 40 saati aşan odak süresi yakala.',
    tier: 'diamond',
    category: 'focus',
    isHidden: false,
    icon: 'BatteryCharging',
    reward: { elo: 2500 },
    calculateProgress: (state) => ({ current: 0, target: 40 }) // Hard to calculate historically without week boundaries, keep default
  },
  {
    id: 'morning_sprint',
    title: 'Sabah Sprinti',
    description: 'Sabah 10:00\'dan önce toplam 10 saat çalışma biriktir.',
    tier: 'silver',
    category: 'focus',
    isHidden: false,
    icon: 'Sun',
    reward: { elo: 500 },
    calculateProgress: (state) => {
      let seconds = 0;
      state.focusSessions?.forEach(s => {
        const hour = new Date(s.startTime).getHours();
        if (hour < 10) seconds += s.durationSeconds;
      });
      return { current: Math.floor(seconds / 3600), target: 10 };
    }
  },
  {
    id: 'unbroken_focus',
    title: 'Bozulmaz Odak',
    description: 'Sabah Engelleyicisini 10 gün üst üste başarıyla geç.',
    tier: 'gold',
    category: 'focus',
    isHidden: false,
    icon: 'ShieldCheck',
    reward: { elo: 800 },
    calculateProgress: (state) => ({ current: 0, target: 10 })
  },
  {
    id: 'zen_state',
    title: 'Zen Hali',
    description: 'Beyaz/Pembe/Kahverengi gürültü ile toplam 5 saat odaklan.',
    tier: 'silver',
    category: 'focus',
    isHidden: false,
    icon: 'Headphones',
    reward: { elo: 400 },
    calculateProgress: (state) => ({ current: 0, target: 5 }) // Requires tracking ambient usage
  },
  {
    id: 'hyperbolic_chamber',
    title: 'Hiperbolik Zaman Odası',
    description: 'Gürültüyle 20 saat odaklan.',
    tier: 'gold',
    category: 'focus',
    isHidden: false,
    icon: 'Zap',
    reward: { elo: 1000 },
    calculateProgress: (state) => ({ current: 0, target: 20 })
  },

  // Category: Performance & ELO
  {
    id: 'elo_rising',
    title: 'Yükseliş',
    description: '100 ELO barajını geç.',
    tier: 'iron',
    category: 'performance',
    isHidden: false,
    icon: 'TrendingUp',
    reward: { elo: 50 },
    calculateProgress: (state) => ({ current: getCompetitiveElo(state), target: 100 })
  },
  {
    id: 'elo_challenger',
    title: 'Meydan Okuyan',
    description: '1.000 ELO barajını geç.',
    tier: 'gold',
    category: 'performance',
    isHidden: false,
    icon: 'Crosshair',
    reward: { elo: 500 },
    calculateProgress: (state) => ({ current: getCompetitiveElo(state), target: 1000 })
  },
  {
    id: 'elo_grandmaster',
    title: 'Büyük Usta',
    description: '3.000 ELO barajını geç.',
    tier: 'diamond',
    category: 'performance',
    isHidden: false,
    icon: 'Crown',
    reward: { elo: 1500, badgeTitle: 'Grandmaster' },
    calculateProgress: (state) => ({ current: getCompetitiveElo(state), target: 3000 })
  },
  {
    id: 'flawless_victory',
    title: 'Kusursuz Zafer',
    description: '40\'tan fazla soruluk bir seansı %100 doğrulukla tamamla.',
    tier: 'gold',
    category: 'performance',
    isHidden: false,
    icon: 'CheckCircle',
    reward: { elo: 800 },
    calculateProgress: (state) => {
      const hasFlawless = state.logs.some(l => l.questions >= 40 && l.correct === l.questions);
      return { current: hasFlawless ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'sniper',
    title: 'Keskin Nişancı',
    description: 'Üst üste 5 seansta %90 üzeri doğruluk tuttur.',
    tier: 'silver',
    category: 'performance',
    isHidden: false,
    icon: 'Crosshair',
    reward: { elo: 500 },
    calculateProgress: (state) => ({ current: 0, target: 5 }) 
  },
  {
    id: 'comeback_kid',
    title: 'Geri Dönüş',
    description: 'Eski hatalarını düzeltip netlerini artır.',
    tier: 'gold',
    category: 'performance',
    isHidden: false,
    icon: 'RefreshCw',
    reward: { elo: 800 },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'speed_reader',
    title: 'Hızlı Okuyucu',
    description: 'Türkçe ortalama süreni 40 saniyenin altına düşür (En az 50 soru).',
    tier: 'silver',
    category: 'performance',
    isHidden: false,
    icon: 'Zap',
    reward: { elo: 500 },
    calculateProgress: (state) => {
      const turkceLogs = state.logs.filter(l => l.subject.includes('Türkçe'));
      const q = turkceLogs.reduce((acc, l) => acc + l.questions, 0);
      if (q < 50) return { current: 0, target: 1 };
      const avg = turkceLogs.reduce((acc, l) => acc + (l.avgTime || 60), 0) / turkceLogs.length;
      return { current: avg < 40 ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'calculator',
    title: 'Hesap Makinesi',
    description: 'Matematik ortalama süreni 60 saniyenin altına düşür (En az 50 soru).',
    tier: 'silver',
    category: 'performance',
    isHidden: false,
    icon: 'Calculator',
    reward: { elo: 500 },
    calculateProgress: (state) => {
      const matLogs = state.logs.filter(l => l.subject.includes('Matematik'));
      const q = matLogs.reduce((acc, l) => acc + l.questions, 0);
      if (q < 50) return { current: 0, target: 1 };
      const avg = matLogs.reduce((acc, l) => acc + (l.avgTime || 90), 0) / matLogs.length;
      return { current: avg < 60 ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'target_shattered',
    title: 'Hedef Parçalayıcı',
    description: 'Haftalık net hedefini 10 puan aş.',
    tier: 'gold',
    category: 'performance',
    isHidden: false,
    icon: 'TrendingUp',
    reward: { elo: 1000 },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'ghost_slayer',
    title: 'Hayalet Avcısı',
    description: 'Hayalet rakibini 5 gün üst üste yen.',
    tier: 'diamond',
    category: 'performance',
    isHidden: false,
    icon: 'Ghost',
    reward: { elo: 2000 },
    calculateProgress: (state) => ({ current: 0, target: 5 })
  },

  // Category: Hidden & Legendary
  {
    id: 'kubras_respect',
    title: 'Kübra\'nın Saygısı',
    description: 'Kübra\'dan üst üste 3 kez pozitif geri bildirim al.',
    tier: 'diamond',
    category: 'hidden',
    isHidden: true,
    icon: 'Smile',
    reward: { elo: 3000, personaUnlock: 'Respected' },
    calculateProgress: (state) => ({ current: 0, target: 3 })
  },
  {
    id: 'obsidian_mind',
    title: 'Obsidyen Zihin',
    description: 'Kübra seni azarladıktan hemen sonra çalışmaya başla ve log gir.',
    tier: 'legendary',
    category: 'hidden',
    isHidden: true,
    icon: 'Gem',
    reward: { elo: 5000, themeUnlock: 'Obsidian' },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'phoenix',
    title: 'Anka Kuşu',
    description: 'ELO puanın 0\'a düştükten sonra 500 ELO\'ya geri dön.',
    tier: 'legendary',
    category: 'hidden',
    isHidden: true,
    icon: 'Flame',
    reward: { elo: 5000, badgeTitle: 'Anka Kuşu' },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'insomniac',
    title: 'Uykusuz',
    description: 'Farklı günlerde 03:00, 04:00 ve 05:00\'te çalışma kaydı gir.',
    tier: 'gold',
    category: 'hidden',
    isHidden: true,
    icon: 'Moon',
    reward: { elo: 1000 },
    calculateProgress: (state) => ({ current: 0, target: 3 })
  },
  {
    id: 'the_1_percent',
    title: '%1',
    description: 'AYT Matematik denemesinde 38+ net yap.',
    tier: 'legendary',
    category: 'hidden',
    isHidden: true,
    icon: 'Star',
    reward: { elo: 5000 },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'polymath',
    title: 'Hezarfen',
    description: 'Sayısal, Sözel ve Eşit Ağırlık derslerinden aynı anda %100 konuyu bitir.',
    tier: 'diamond',
    category: 'hidden',
    isHidden: true,
    icon: 'Brain',
    reward: { elo: 3000 },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'touch_grass',
    title: 'Çimlere Dokun',
    description: '3 gün boyunca hiç log girmeyip döndüğünde tek günde 300 soru çöz.',
    tier: 'silver',
    category: 'hidden',
    isHidden: true,
    icon: 'Leaf',
    reward: { elo: 500 },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  },
  {
    id: 'hacker',
    title: 'Hacker',
    description: 'Tek bir günde 5 başarı kilidini aç.',
    tier: 'gold',
    category: 'hidden',
    isHidden: true,
    icon: 'Terminal',
    reward: { elo: 1500 },
    calculateProgress: (state) => ({ current: 0, target: 5 })
  },
  {
    id: 'kubras_nightmare',
    title: 'Kübra\'nın Kabusu',
    description: 'Hiçbir veri girmeden yapay zeka koçuyla 10 mesaj tartış.',
    tier: 'bronze',
    category: 'hidden',
    isHidden: true,
    icon: 'MessageSquareWarning',
    reward: { elo: 200 },
    calculateProgress: (state) => ({ current: 0, target: 10 })
  },
  {
    id: 'the_architect',
    title: 'Mimar',
    description: 'Tüm Boho Mentos konu haritasını (%100) tamamla.',
    tier: 'legendary',
    category: 'hidden',
    isHidden: true,
    icon: 'Map',
    reward: { elo: 10000, themeUnlock: 'Architect' },
    calculateProgress: (state) => ({ current: 0, target: 1 })
  }
];
