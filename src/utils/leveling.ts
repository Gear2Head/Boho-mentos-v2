// XP / Leveling system — based on ELO score
// Now much more challenging: XP required increases with level

export interface LevelInfo {
  level: number;
  title: string;
  skin: 'default' | 'silver' | 'gold' | 'crimson' | 'obsidian' | 'legendary' | 'void' | 'divine';
  xpToNext: number;
  xpCurrent: number;
  xpRequired: number;
  progressPercent: number;
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Yeni Başlayan',
  5: 'Hevesli Aday',
  10: 'Disiplinli Çırak',
  15: 'Düzenli Çalışan',
  20: 'Müfredat Avcısı',
  25: 'Soru Canavarı',
  30: 'Bronz Şövalye',
  35: 'Gümüş Savaşçı',
  40: 'Altın Muhafız',
  45: 'Platin Zeka',
  50: 'Elmas Stratejist',
  60: 'Kızıl Master',
  70: 'Obsidyen Uzman',
  80: 'Efsanevi Lider',
  90: 'Boho İlahı',
  100: 'Mutlak Zirve',
};

function getLevelTitle(lvl: number): string {
    const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
    for (const k of keys) { if (lvl >= k) return LEVEL_TITLES[k]; }
    return 'Yeni Başlayan';
}

const MAX_LEVEL = 100;
const BASE_XP = 1000;
const XP_STEP = 100; // Her levelde gereken ELO 100 artar

/**
 * Toplam ELO'dan seviye hesapla
 * Seviye 1: 0 - 1000
 * Seviye 2: 1000 - 2100 (1000 + 1100)
 * Seviye 3: 2100 - 3300 (2100 + 1200)
 */
export function getLevelFromElo(elo: number): LevelInfo {
  let level = 1;
  let remainingElo = elo;
  let xpRequired = BASE_XP;

  while (remainingElo >= xpRequired && level < MAX_LEVEL) {
    remainingElo -= xpRequired;
    level++;
    xpRequired = BASE_XP + (level - 1) * XP_STEP;
  }

  const xpCurrent = remainingElo;
  const progressPercent = level < MAX_LEVEL ? Math.round((xpCurrent / xpRequired) * 100) : 100;
  
  let skin: LevelInfo['skin'] = 'default';
  if (level >= 80) skin = 'divine';
  else if (level >= 65) skin = 'void';
  else if (level >= 50) skin = 'legendary';
  else if (level >= 40) skin = 'obsidian';
  else if (level >= 30) skin = 'crimson';
  else if (level >= 20) skin = 'gold';
  else if (level >= 10) skin = 'silver';

  return {
    level,
    title: getLevelTitle(level),
    skin,
    xpToNext: level < MAX_LEVEL ? xpRequired - xpCurrent : 0,
    xpCurrent,
    xpRequired,
    progressPercent,
  };
}

export const SKIN_CLASSES: Record<LevelInfo['skin'], string> = {
  default: 'skin-default',
  silver: 'skin-silver',
  gold: 'skin-gold',
  crimson: 'skin-crimson',
  obsidian: 'skin-obsidian',
  legendary: 'skin-legendary',
  void: 'skin-void',
  divine: 'skin-divine',
};
