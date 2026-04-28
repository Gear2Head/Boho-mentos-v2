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
    { id: '1', type: 'video', title: 'Türev Alma Kuralları | Eyüp B.', url: 'https://www.youtube.com/results?search_query=T%C3%BCrev+Alma+Kurallar%C4%B1+Ey%C3%BCp+B', provider: 'Eyüp B.' },
    { id: '2', type: 'playlist', title: 'Calculus - Türev', url: 'https://www.youtube.com/results?search_query=yks+t%C3%BCrev+konu+anlat%C4%B1m%C4%B1', provider: 'YouTube' },
  ],
  'integral': [
    { id: '3', type: 'video', title: 'Belirli İntegral Soru Çözümü', url: 'https://www.youtube.com/results?search_query=Belirli+%C4%B0ntegral+Soru+%C3%87%C3%B6z%C3%BCm%C3%BC+Mert+Hoca', provider: 'Mert Hoca' },
  ],
  'problem': [
    { id: '4', type: 'video', title: 'Sayı Kesir Problemleri Pratik Taktikler', url: 'https://www.youtube.com/results?search_query=Say%C4%B1+Kesir+Problemleri+Pratik+Taktikler+Rehber+Matematik', provider: 'Rehber Matematik' },
    { id: '5', type: 'video', title: 'Derece İsteyenlere Özel Problemler', url: 'https://www.youtube.com/results?search_query=yks+problemler+zor+soru+%C3%A7%C3%B6z%C3%BCm%C3%BC', provider: 'YouTube' },
  ],
  'paragraf': [
    { id: '6', type: 'video', title: 'Paragraf Hızlandırma Taktikleri', url: 'https://www.youtube.com/results?search_query=Paragraf+H%C4%B1zland%C4%B1rma+Taktikleri+R%C3%BC%C5%9Ft%C3%BC+Hoca', provider: 'Rüştü Hoca' },
    { id: '7', type: 'video', title: 'Ales/DGS Çıkmış Paragraf Soruları', url: 'https://www.youtube.com/results?search_query=ales+dgs+%C3%A7%C4%B1km%C4%B1%C5%9F+paragraf+sorular%C4%B1', provider: 'YouTube' },
  ],
  'fizik': [
    { id: '8', type: 'video', title: 'AYT Fizik Full Tekrar', url: 'https://www.youtube.com/results?search_query=AYT+Fizik+Full+Tekrar+Vip+Fizik', provider: 'Vip Fizik' },
    { id: '9', type: 'video', title: 'Fizik Bilimine Giriş', url: 'https://www.youtube.com/results?search_query=Fizik+Bilimine+Giri%C5%9F+%C3%96zcan+Ayk%C4%B1n', provider: 'Özcan Aykın' },
  ],
  'kimya': [
    { id: '10', type: 'video', title: 'Modern Atom Teorisi', url: 'https://www.youtube.com/results?search_query=Modern+Atom+Teorisi+G%C3%B6rkem+%C5%9Eahin', provider: 'Görkem Şahin' },
    { id: '11', type: 'video', title: 'Kimya ve Elektrik', url: 'https://www.youtube.com/results?search_query=Kimya+ve+Elektrik+Kimya+Adas%C4%B1', provider: 'Kimya Adası' },
  ],
  'biyoloji': [
    { id: '12', type: 'video', title: 'Sistemler Full Tekrar', url: 'https://www.youtube.com/results?search_query=Sistemler+Full+Tekrar+Selin+Hoca', provider: 'Selin Hoca' },
    { id: '13', type: 'video', title: 'Hücre Bölünmeleri', url: 'https://www.youtube.com/results?search_query=H%C3%BCcre+B%C3%B6l%C3%BCnmeleri+Biosem', provider: 'Biosem' },
  ],
  'geometri': [
    { id: '14', type: 'video', title: 'Üçgenler Dev Konu Anlatımı', url: 'https://www.youtube.com/results?search_query=%C3%9C%C3%A7genler+Dev+Konu+Anlat%C4%B1m%C4%B1+Kenan+Kara', provider: 'Kenan Kara' },
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
