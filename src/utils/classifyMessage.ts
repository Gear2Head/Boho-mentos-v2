/**
 * AMAÇ: Koç mesajlarını otomatik kategorize et — sol şerit rengi ve badge için.
 * MANTIK: Keyword analizi + intent bazlı overload. "any" kullanımı yasak.
 */

export type MessageType =
  | 'directive'   // kırmızı — plan, direktif, görev
  | 'analysis'    // mavi — analiz, rapor, inceleme
  | 'explanation' // mor — açıklama, konu anlatımı
  | 'praise'      // yeşil — tebrik, başarı
  | 'warning'     // turuncu — uyarı, risk
  | 'general';    // gri — diğer

export interface MessageClassification {
  type: MessageType;
  badge: string;
  emoji: string;
  color: string;  // Tailwind border color class
  bgColor: string;
}

const CLASSIFICATION_MAP: Array<{
  type: MessageType;
  keywords: string[];
  badge: string;
  emoji: string;
  color: string;
  bgColor: string;
}> = [
  {
    type: 'directive',
    keywords: ['plan', 'görev', 'direktif', 'aksiyon', 'yapman gereken', 'öncelik', 'hedef', 'direktif hazırlandı'],
    badge: 'DİREKTİF',
    emoji: '⚔️',
    color: 'border-l-red-500',
    bgColor: 'bg-red-500/5',
  },
  {
    type: 'analysis',
    keywords: ['analiz', 'inceleme', 'rapor', 'değerlendirme', 'istatistik', 'performans', 'hata oranı', 'log analiz', 'war room'],
    badge: 'ANALİZ',
    emoji: '📊',
    color: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
  },
  {
    type: 'explanation',
    keywords: ['açıklama', 'konu', 'tanım', 'formül', 'anlatım', 'nasıl', 'nedir', 'öğren', 'kavra'],
    badge: 'ANLATIM',
    emoji: '📖',
    color: 'border-l-purple-500',
    bgColor: 'bg-purple-500/5',
  },
  {
    type: 'praise',
    keywords: ['tebrik', 'harika', 'başarı', 'mükemmel', 'bravo', 'aferin', 'süper', 'ilerleme', 'kazandın'],
    badge: 'BAŞARI',
    emoji: '🏆',
    color: 'border-l-green-500',
    bgColor: 'bg-green-500/5',
  },
  {
    type: 'warning',
    keywords: ['uyarı', 'risk', 'dikkat', 'tehlike', 'ihmal', 'düşüş', 'kötüleşme', 'kritik', 'alarm'],
    badge: 'UYARI',
    emoji: '⚠️',
    color: 'border-l-amber-500',
    bgColor: 'bg-amber-500/5',
  },
];

const DEFAULT: MessageClassification = {
  type: 'general',
  badge: 'MESAJ',
  emoji: '💬',
  color: 'border-l-zinc-600',
  bgColor: 'bg-zinc-800/20',
};

export function classifyMessage(content: string): MessageClassification {
  const lower = content.toLowerCase();

  for (const entry of CLASSIFICATION_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return {
        type: entry.type,
        badge: entry.badge,
        emoji: entry.emoji,
        color: entry.color,
        bgColor: entry.bgColor,
      };
    }
  }

  return DEFAULT;
}
