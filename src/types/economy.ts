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
    description: 'Baslangic seviyesi rutin takviyeler. Kucuk xp destekleri ve temel unvanlar icerir.',
    color: '#8B4513',
  },
  bronze: {
    tier: 'bronze',
    name: 'Bronz Sandik',
    price: 300,
    description: 'Gunluk calismalari canlandiran hizlandiricilar, streak dondurucular ve profil atesleri.',
    color: '#B45309',
  },
  silver: {
    tier: 'silver',
    name: 'Gumus Sandik',
    price: 500,
    description: 'Verimli calisma icin uretilen ozel siber temalar, neon cerceveler ve elit takviyeler.',
    color: '#C0C0C0',
  },
  gold: {
    tier: 'gold',
    name: 'Altin Sandik',
    price: 1500,
    description: 'Premium AI personalari, prestijli altin profil eklentileri ve guclu motivasyon elementleri.',
    color: '#FFD700',
  },
  mythic: {
    tier: 'mythic',
    name: 'Mitik Sandik',
    price: 3000,
    description: 'Sadece seckin odaklananlar icin efsanevi aurora temasi, veri cerrahi AI ve nadir taclar.',
    color: '#EC4899',
  },
  cosmic: {
    tier: 'cosmic',
    name: 'Kozmik Sandik',
    price: 5000,
    description: 'Evrenin sirlari. Kozmik tac, jackpot odulleri ve var olan en yuksek nadirlik seviyesindeki butun luks parcalar.',
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
  { id: 'freeze_1', name: 'Zaman Bükücü Dondurucu', description: 'Calismadigin bir gun icin streak serini bozulmaktan kurtarir. Geriye donuk etki etmez.', price: 1000, rarity: 'rare', category: 'boost', icon: 'Shield', metadata: { boostKey: 'streakFreezer', amount: 1 } },
  { id: 'freeze_3', name: 'Kuantum Kalkanı', description: 'Zorlu haftalar icin uclu koruma saglar. Streak serin icin 3 adet mutlak kalkan.', price: 2400, rarity: 'legendary', category: 'boost', icon: 'Shield', metadata: { boostKey: 'streakFreezer', amount: 3 } },
  { id: 'xp_2x_1h', name: 'Nöral Hizlandirici (2x XP)', description: 'Odaklanma modundayken beyin dalgalarini hizlandirarak 1 saat boyunca cift XP kazandirir.', price: 450, rarity: 'common', category: 'boost', icon: 'Zap', metadata: { boostKey: 'xpMultiplier', amount: 1 } },
  { id: 'coin_1.5x_1h', name: 'Altın Atesi (1.5x Coin)', description: 'Calismalarindan elde ettigin boho coin miktarini 1 saat boyunca yuzde 50 ekstra arttirir.', price: 600, rarity: 'rare', category: 'boost', icon: 'Coins', metadata: { boostKey: 'coinMultiplier', amount: 1 } },
  { id: 'rival_ticket', name: 'Hayalet Rakip Bileti', description: 'Seni zorlayacak kurgusal bir rakip cagirir, rekabet modunda ekstra kiskirtma gucu saglar.', price: 250, rarity: 'common', category: 'boost', icon: 'Rocket', metadata: { boostKey: 'ghostRivalTickets', amount: 1 } },
  { id: 'theme_cyber', name: 'Siberpunk Matrix Tema', description: 'Gelecekten gelen neon isiklarla donatilmis, karanlik ve goz alici siber calisma ortami.', price: 2500, rarity: 'epic', category: 'cosmetic', icon: 'Palette', metadata: { equipSlot: 'theme', theme: 'dark' } },
  { id: 'theme_aurora', name: 'Kutup Aurorası Tema', description: 'Profil ve magaza yuzeylerine doganin en buyuleyici sicak isik hüzmelerini ekler.', price: 4200, rarity: 'legendary', category: 'cosmetic', icon: 'Sparkles', metadata: { equipSlot: 'theme', theme: 'dark' } },
  { id: 'theme_obsidian', name: 'Obsidyen Karanlık Tema', description: 'Saf karanliktan uretilmis, gozu asla yormayan, keskin ve agresif elit vitrin modu.', price: 5600, rarity: 'mythic', category: 'cosmetic', icon: 'Gem', metadata: { equipSlot: 'theme', theme: 'dark' } },
  { id: 'title_limit', name: 'Limitleri Yıkan', description: 'Kendi sinirlarini astigini gosteren, isminin hemen yanina ilistirilmis havali prestij unvani.', price: 1200, rarity: 'rare', category: 'cosmetic', icon: 'Target', metadata: { equipSlot: 'title' } },
  { id: 'title_focus', name: 'Derin Odak Operatörü', description: 'Etrafdaki her seyi susturup yalnizca hedefine kitlenenler icin uretilmis nadir unvan.', price: 1600, rarity: 'rare', category: 'cosmetic', icon: 'Timer', metadata: { equipSlot: 'title' } },
  { id: 'focus_badge', name: 'Olimpos Rozeti', description: 'Sadece en iyilerin tasiyabilecegi, kariyer vitrinini parlatan altin islemeli premium rozet.', price: 3200, rarity: 'legendary', category: 'cosmetic', icon: 'Trophy', metadata: { equipSlot: 'title' } },
  { id: 'persona_soldier', name: 'General Çelik - Askeri AI', description: 'Bahane kabul etmez. Kisa, sert, emredici tarzda konusarak seni hizaya sokar.', price: 3000, rarity: 'epic', category: 'ai_persona', icon: 'BrainCircuit', metadata: { equipSlot: 'persona', coachPersonality: 'enforcer' } },
  { id: 'persona_zen', name: 'Usta Wu - Zen AI', description: 'Huzur ve denge felsefesiyle yaklasir. Stresli gunlerde seni mental olarak rahatlatir.', price: 3000, rarity: 'epic', category: 'ai_persona', icon: 'BrainCircuit', metadata: { equipSlot: 'persona', coachPersonality: 'oracle' } },
  { id: 'persona_analyst', name: 'Dr. Veri Cerrahi AI', description: 'Duygulara yer yok, sadece sayilar. Yanitlari detayli trend tablolarina ve net fark analizlerine donusturur.', price: 4600, rarity: 'legendary', category: 'ai_persona', icon: 'BarChart3', metadata: { equipSlot: 'persona', coachPersonality: 'analyst' } },
  { id: 'frame_neon', name: 'Siber Neon Cerceve', description: 'Profil fotografini siberpunk sokaklarindaki parlayan neon isiklariyla sarmalar.', price: 1500, rarity: 'epic', category: 'cosmetic', icon: 'Hexagon', metadata: { equipSlot: 'frame' } },
  { id: 'frame_fire', name: 'Cehennem Atesi Cerceve', description: 'Alevler icinde yanan bu cerceve, durmaksizin calisan atesli ruhlari temsil eder.', price: 1700, rarity: 'epic', category: 'cosmetic', icon: 'Flame', metadata: { equipSlot: 'frame' } },
  { id: 'frame_gold', name: 'Saf Altin Cerceve', description: 'Krallara layik, saf altindan islenmis agirlikli prestij profil cercevesi.', price: 2000, rarity: 'legendary', category: 'cosmetic', icon: 'Hexagon', metadata: { equipSlot: 'frame' } },
  { id: 'cosmic_crown', name: 'Kozmik Imparator Taci', description: 'Evrenin sirlarina erismis, efsanevi boyutlari asmis kullanicilar icin yaratilan en nadir esya.', price: 7600, rarity: 'cosmic', category: 'cosmetic', icon: 'Crown', metadata: { equipSlot: 'title' } },
];
