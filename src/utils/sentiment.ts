// Lightweight Turkish keyword-based sentiment detector
// No API cost — runs client-side

const STRESSED_KEYWORDS = [
  'yorgun', 'bitik', 'sıkıldım', 'bıktım', 'çok zor', 'yapamıyorum', 'başaramıyorum',
  'panik', 'anksiyete', 'kaygı', 'korku', 'endişe', 'stres', 'bunaldım', 'eziliyorum',
  'hopeless', 'umudum yok', 'olmaz', 'hayır', 'istemiyorum', 'dayanamıyorum',
  'kafayı yiyeceğim', 'delireceğim', 'kötüyüm', 'mahvoldu', 'bitti', 'çaresiz',
];

const CONFIDENT_KEYWORDS = [
  'harika', 'süper', 'mükemmel', 'çok iyi', 'başardım', 'tamamladım', 'hallettim',
  'anladım', 'öğrendim', 'güçlü', 'emin', 'hazır', 'yapabilirim', 'gideceğim',
  'kazanacağım', 'iyi gidiyor', 'ilerliyorum', 'güzeldi', 'tatmin', 'mutlu',
  'enerji', 'motivasyon', 'azimli', 'kararlı', 'odaklandım', 'konsantre',
];

export type SentimentResult = 'stressed' | 'confident' | 'neutral';

export function detectSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();

  let stressScore = 0;
  let confidenceScore = 0;

  for (const kw of STRESSED_KEYWORDS) {
    if (lower.includes(kw)) stressScore++;
  }
  for (const kw of CONFIDENT_KEYWORDS) {
    if (lower.includes(kw)) confidenceScore++;
  }

  if (stressScore > confidenceScore && stressScore >= 1) return 'stressed';
  if (confidenceScore > stressScore && confidenceScore >= 1) return 'confident';
  return 'neutral';
}

export function sentimentToPromptHint(sentiment: SentimentResult): string {
  switch (sentiment) {
    case 'stressed':
      return 'DUYGUSAL BAĞLAM: Öğrencinin ses tonu stresli/yorgun çıkıyor. Kübra olarak biraz daha empatik, motive edici ama yine hardcore bir yaklaşım kullan.';
    case 'confident':
      return 'DUYGUSAL BAĞLAM: Öğrenci kendine güvenli ve motive görünüyor. Kübra olarak bu enerjiyi daha da artır, hedefleri zorla.';
    case 'neutral':
      return '';
  }
}
