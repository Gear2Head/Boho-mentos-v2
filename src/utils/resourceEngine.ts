export interface ResourceItem {
  id: string;
  type: 'video' | 'pdf' | 'article' | 'playlist';
  title: string;
  url: string;
  provider: string; // e.g., "YouTube", "PDF", "Khan Academy"
}

/**
 * Maps subject keywords to relevant learning resources.
 * This acts as a fallback or intelligent wrapper to inject actual study material links
 * when the AI prescribes a subject focus.
 */
const RESOURCE_DATABASE: Record<string, ResourceItem[]> = {
  'türev': [
    { id: '1', type: 'video', title: 'Türev Alma Kuralları | Eyüp B.', url: 'https://youtube.com/watch?v=sample1', provider: 'YouTube' },
    { id: '2', type: 'playlist', title: 'Calculus - Türev (Boğaziçi Notları)', url: 'https://example.com/pdf1', provider: 'PDF' },
  ],
  'integral': [
    { id: '3', type: 'video', title: 'Belirli İntegral Soru Çözümü', url: 'https://youtube.com/watch?v=sample2', provider: 'YouTube' },
  ],
  'problem': [
    { id: '4', type: 'video', title: 'Sayı Kesir Problemleri Pratik Taktikler', url: 'https://youtube.com/watch?v=sample3', provider: 'YouTube' },
    { id: '5', type: 'pdf', title: 'Derece İsteyenlere Özel Problemler Föyleri', url: 'https://example.com/pdf2', provider: 'PDF' },
  ],
  'paragraf': [
    { id: '6', type: 'video', title: 'Paragraf Hızlandırma Taktikleri', url: 'https://youtube.com/watch?v=sample4', provider: 'YouTube' },
    { id: '7', type: 'article', title: 'Ales/DGS Çıkmış Paragraf Soruları', url: 'https://example.com/pdf3', provider: 'ÖSYM' },
  ]
};

export function getResourcesForSubject(subject: string): ResourceItem[] {
  if (!subject) return [];
  
  const keywordMatch = subject.toLowerCase();
  for (const [key, resources] of Object.entries(RESOURCE_DATABASE)) {
    if (keywordMatch.includes(key)) {
      return resources;
    }
  }
  
  // Return generic resources if no exact match found
  return [
    { id: 'fallback-1', type: 'video', title: `${subject} Konu Anlatımı Serisi`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' konu anlatımı')}`, provider: 'YouTube' },
    { id: 'fallback-2', type: 'pdf', title: `${subject} Çıkmış Sorular / MEB Kazanım Testleri`, url: `https://www.google.com/search?q=${encodeURIComponent(subject + ' Meb kazanım testi pdf')}`, provider: 'Google Link' }
  ];
}
