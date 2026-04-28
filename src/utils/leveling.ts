// XP / Leveling system — based on ELO score
// Level thresholds: every 500 ELO = 1 level, cap at 20

export interface LevelInfo {
  level: number;
  title: string;
  skin: 'default' | 'silver' | 'gold' | 'crimson' | 'obsidian' | 'legendary';
  xpToNext: number;
  xpCurrent: number;
  xpRequired: number;
  progressPercent: number;
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Ham Elmas',
  2: 'Çırak Savaşçı',
  3: 'Disiplinli',
  4: 'Odaklı',
  5: 'Azimkar',
  6: 'İnatçı',
  7: 'Güçlü Aday',
  8: 'Sistematik',
  9: 'Verimli',
  10: 'Bronz Şövalye',
  11: 'Gümüş Şövalye',
  12: 'Kademeli İlerleme',
  13: 'Yıldız Aday',
  14: 'Altın Savaşçı',
  15: 'Platin Beyin',
  16: 'Elmas Zeka',
  17: 'Usta Stratejist',
  18: 'Grandmaster',
  19: 'Efsane',
  20: 'YKS Lideri',
};

const SKINS: Record<number, LevelInfo['skin']> = {
  1: 'default', 2: 'default', 3: 'default', 4: 'default', 5: 'default',
  6: 'silver', 7: 'silver', 8: 'silver', 9: 'silver', 10: 'silver',
  11: 'gold', 12: 'gold', 13: 'gold', 14: 'gold', 15: 'gold',
  16: 'crimson', 17: 'crimson', 18: 'obsidian', 19: 'obsidian', 20: 'legendary',
};

const ELO_PER_LEVEL = 500;
const MAX_LEVEL = 20;

export function getLevelFromElo(elo: number): LevelInfo {
  const rawLevel = Math.floor(elo / ELO_PER_LEVEL) + 1;
  const level = Math.min(rawLevel, MAX_LEVEL);
  const xpRequired = level < MAX_LEVEL ? ELO_PER_LEVEL : ELO_PER_LEVEL;
  const xpCurrent = elo % ELO_PER_LEVEL;
  const xpToNext = level < MAX_LEVEL ? xpRequired - xpCurrent : 0;
  const progressPercent = level < MAX_LEVEL ? Math.round((xpCurrent / xpRequired) * 100) : 100;

  return {
    level,
    title: LEVEL_TITLES[level] ?? 'Efsane',
    skin: SKINS[level] ?? 'legendary',
    xpToNext,
    xpCurrent,
    xpRequired,
    progressPercent,
  };
}

// CSS class map for each skin — applied to coach panel
export const SKIN_CLASSES: Record<LevelInfo['skin'], string> = {
  default: 'skin-default',
  silver: 'skin-silver',
  gold: 'skin-gold',
  crimson: 'skin-crimson',
  obsidian: 'skin-obsidian',
  legendary: 'skin-legendary',
};
