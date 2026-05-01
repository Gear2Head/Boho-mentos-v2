export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'cosmic';

export type ItemCategory = 'cosmetic' | 'functional' | 'ai_persona' | 'boost';

export type BoostKey = 'streakFreezer' | 'xpMultiplier' | 'coinMultiplier' | 'ghostRivalTickets';

export type EquipSlot = 'frame' | 'title' | 'theme' | 'persona';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: ItemRarity;
  category: ItemCategory;
  icon: string;
  image?: string;
  metadata?: {
    boostKey?: BoostKey;
    amount?: number;
    equipSlot?: EquipSlot;
    theme?: 'light' | 'dark';
    coachPersonality?: string;
    [key: string]: unknown;
  };
}

export interface UserInventory {
  items: string[];
  activeFrame?: string;
  activeTitle?: string;
  activeTheme?: string;
  activeCoachPersona?: string;
  boosts: Record<BoostKey, number>;
}

export type CrateTier = 'wooden' | 'bronze' | 'silver' | 'gold' | 'mythic' | 'cosmic';

export interface Crate {
  tier: CrateTier;
  name: string;
  price: number;
  description: string;
  color: string;
}

export const CRATE_CONFIG: Record<CrateTier, Crate> = {
  wooden: {
    tier: 'wooden',
    name: 'Tahta Sandik',
    price: 150,
    description: 'Baslangic boostlari, kucuk coin destekleri ve temel unvanlar.',
    color: '#8B4513',
  },
  bronze: {
    tier: 'bronze',
    name: 'Bronz Sandik',
    price: 300,
    description: 'Streak koruma, calisma hizi boostu ve nadir profil odulleri.',
    color: '#B45309',
  },
  silver: {
    tier: 'silver',
    name: 'Gumus Sandik',
    price: 500,
    description: 'Tema parcalari, cerceveler ve verimli calisma takviyeleri.',
    color: '#C0C0C0',
  },
  gold: {
    tier: 'gold',
    name: 'Altin Sandik',
    price: 1500,
    description: 'Destansi persona, premium unvan ve yuksek degerli boostlar.',
    color: '#FFD700',
  },
  mythic: {
    tier: 'mythic',
    name: 'Mitik Sandik',
    price: 3000,
    description: 'Efsane cerceve, Aurora tema ve guclu coklu koruma odulleri.',
    color: '#EC4899',
  },
  cosmic: {
    tier: 'cosmic',
    name: 'Kozmik Sandik',
    price: 5000,
    description: 'Kozmik persona, jackpot odulleri ve en nadir vitrin esyalari.',
    color: '#8A2BE2',
  },
};

export const REWARD_POOLS: Record<CrateTier, { itemId: string; weight: number }[]> = {
  wooden: [
    { itemId: 'xp_2x_1h', weight: 40 },
    { itemId: 'rival_ticket', weight: 40 },
    { itemId: 'coin_1.5x_1h', weight: 15 },
    { itemId: 'title_limit', weight: 5 },
  ],
  bronze: [
    { itemId: 'xp_2x_1h', weight: 32 },
    { itemId: 'rival_ticket', weight: 28 },
    { itemId: 'freeze_1', weight: 20 },
    { itemId: 'title_limit', weight: 12 },
    { itemId: 'frame_fire', weight: 8 },
  ],
  silver: [
    { itemId: 'freeze_1', weight: 30 },
    { itemId: 'coin_1.5x_1h', weight: 30 },
    { itemId: 'frame_neon', weight: 18 },
    { itemId: 'title_focus', weight: 12 },
    { itemId: 'theme_cyber', weight: 10 },
  ],
  gold: [
    { itemId: 'theme_cyber', weight: 26 },
    { itemId: 'theme_aurora', weight: 18 },
    { itemId: 'persona_soldier', weight: 22 },
    { itemId: 'persona_zen', weight: 22 },
    { itemId: 'frame_gold', weight: 12 },
  ],
  mythic: [
    { itemId: 'theme_aurora', weight: 24 },
    { itemId: 'theme_obsidian', weight: 18 },
    { itemId: 'persona_analyst', weight: 20 },
    { itemId: 'frame_gold', weight: 20 },
    { itemId: 'focus_badge', weight: 12 },
    { itemId: 'freeze_3', weight: 6 },
  ],
  cosmic: [
    { itemId: 'persona_soldier', weight: 16 },
    { itemId: 'persona_zen', weight: 16 },
    { itemId: 'persona_analyst', weight: 18 },
    { itemId: 'theme_obsidian', weight: 18 },
    { itemId: 'frame_gold', weight: 18 },
    { itemId: 'cosmic_crown', weight: 10 },
    { itemId: 'freeze_3', weight: 4 },
  ],
};

export const ALL_SHOP_ITEMS: ShopItem[] = [
  { id: 'freeze_1', name: 'Seri Dondurucu', description: 'Bir gun calismadiginda serini korur.', price: 1000, rarity: 'rare', category: 'boost', icon: 'Shield', metadata: { boostKey: 'streakFreezer', amount: 1 } },
  { id: 'freeze_3', name: 'Uclu Seri Kalkani', description: 'Seri korumasina 3 kalkan ekler.', price: 2400, rarity: 'legendary', category: 'boost', icon: 'Shield', metadata: { boostKey: 'streakFreezer', amount: 3 } },
  { id: 'xp_2x_1h', name: 'XP Katlayici', description: 'Odaklanma modundan 2 kat XP verir.', price: 450, rarity: 'common', category: 'boost', icon: 'Zap', metadata: { boostKey: 'xpMultiplier', amount: 1 } },
  { id: 'coin_1.5x_1h', name: 'Coin Katlayici', description: 'Kazanilan coin miktarini yuzde 50 artirir.', price: 600, rarity: 'rare', category: 'boost', icon: 'Coins', metadata: { boostKey: 'coinMultiplier', amount: 1 } },
  { id: 'rival_ticket', name: 'Ghost Rival Bileti', description: 'Ekstra kiskirtma ve rakip simule etme hakki.', price: 250, rarity: 'common', category: 'boost', icon: 'Rocket', metadata: { boostKey: 'ghostRivalTickets', amount: 1 } },
  { id: 'theme_cyber', name: 'Siberpunk Tema', description: 'Neon dolu calisma ortami.', price: 2500, rarity: 'epic', category: 'cosmetic', icon: 'Palette', metadata: { equipSlot: 'theme', theme: 'dark' } },
  { id: 'theme_aurora', name: 'Aurora Tema', description: 'Profil ve magaza yuzeylerine sicak aurora parlamasi verir.', price: 4200, rarity: 'legendary', category: 'cosmetic', icon: 'Sparkles', metadata: { equipSlot: 'theme', theme: 'dark' } },
  { id: 'theme_obsidian', name: 'Obsidyen Tema', description: 'Daha koyu, daha sert, kontrastli vitrin modu.', price: 5600, rarity: 'mythic', category: 'cosmetic', icon: 'Gem', metadata: { equipSlot: 'theme', theme: 'dark' } },
  { id: 'title_limit', name: 'Limit Yikici', description: 'Isminin yaninda duran havali unvan.', price: 1200, rarity: 'rare', category: 'cosmetic', icon: 'Target', metadata: { equipSlot: 'title' } },
  { id: 'title_focus', name: 'Odak Operatoru', description: 'Profilinde gorunen calisma disiplini unvani.', price: 1600, rarity: 'rare', category: 'cosmetic', icon: 'Timer', metadata: { equipSlot: 'title' } },
  { id: 'focus_badge', name: 'Derin Odak Rozeti', description: 'Kariyer vitrininde premium odak rozeti.', price: 3200, rarity: 'legendary', category: 'cosmetic', icon: 'Trophy', metadata: { equipSlot: 'title' } },
  { id: 'persona_soldier', name: 'Motivasyonel Asker', description: 'Sert ve disiplinli AI koc.', price: 3000, rarity: 'epic', category: 'ai_persona', icon: 'BrainCircuit', metadata: { equipSlot: 'persona', coachPersonality: 'enforcer' } },
  { id: 'persona_zen', name: 'Sakin Zen Ustasi', description: 'Huzur veren, sakinlestirici AI koc.', price: 3000, rarity: 'epic', category: 'ai_persona', icon: 'BrainCircuit', metadata: { equipSlot: 'persona', coachPersonality: 'oracle' } },
  { id: 'persona_analyst', name: 'Veri Cerrahi', description: 'Yanitlari tablo, trend ve net farki odakli hale getirir.', price: 4600, rarity: 'legendary', category: 'ai_persona', icon: 'BarChart3', metadata: { equipSlot: 'persona', coachPersonality: 'analyst' } },
  { id: 'frame_neon', name: 'Neon Cerceve', description: 'Profilin icin parlayan neon cerceve.', price: 1500, rarity: 'epic', category: 'cosmetic', icon: 'Hexagon', metadata: { equipSlot: 'frame' } },
  { id: 'frame_fire', name: 'Alev Cerceve', description: 'Seri odakli oyuncular icin turuncu profil cercevesi.', price: 1700, rarity: 'epic', category: 'cosmetic', icon: 'Flame', metadata: { equipSlot: 'frame' } },
  { id: 'frame_gold', name: 'Altin Cerceve', description: 'Prestijli altin profil cercevesi.', price: 2000, rarity: 'legendary', category: 'cosmetic', icon: 'Hexagon', metadata: { equipSlot: 'frame' } },
  { id: 'cosmic_crown', name: 'Kozmik Tac', description: 'En nadir profil vitrini esyasi.', price: 7600, rarity: 'cosmic', category: 'cosmetic', icon: 'Crown', metadata: { equipSlot: 'title' } },
];
