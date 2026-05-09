/**
 * AMAÇ: Uzayan chat geçmişini özetleyerek AI token kullanımını düşürmek ve context'i temiz tutmak.
 * MANTIK: Son N limitini aşan eski mesajlar background'da küçük bir model çağrısıyla veya heuristik
 * olarak özetlenir, "Sistem Olayı" olarak geçmişin başına eklenir.
 */

import type { ChatMessage } from '../types';

export interface SummarizeConfig {
  maxHistoryLength: number;
  preserveLastN: number;
}

const DEFAULT_CONFIG: SummarizeConfig = {
  maxHistoryLength: 15,
  preserveLastN: 6, // Son 6 mesaj verbatim kalır (3 gidiş-dönüş)
};

/**
 * compactChatHistory: Eski mesajları atarak/özetleyerek context window'u optimize eder.
 */
export function compactChatHistory(
  history: ChatMessage[],
  config: SummarizeConfig = DEFAULT_CONFIG
): ChatMessage[] {
  if (history.length <= config.maxHistoryLength) {
    return history;
  }

  const { preserveLastN } = config;
  const recentMessages = history.slice(-preserveLastN);
  const oldMessages = history.slice(0, history.length - preserveLastN);

  // Zaten özetlenmiş bir mesaj var mı kontrol et
  const existingSummaryIndex = oldMessages.findIndex(m => m.isSystemEvent && m.role === 'system');

  let summaryText = "[SİSTEM NOTU: Geçmiş Konuşmaların Özeti]\n";
  const messagesToSummarize = existingSummaryIndex >= 0
    ? oldMessages.slice(existingSummaryIndex + 1)
    : oldMessages;

  // Heuristic özetleme (AI modeli kullanmadan token dostu ekstraksiyon)
  const keyTopics = new Set<string>();
  let coachPlans = 0;
  
  messagesToSummarize.forEach(msg => {
    // Sadece user ve coach mesajlarını analiz et
    if (msg.role === 'user') {
      const words = msg.content.toLowerCase().split(/\s+/);
      // Basit anahtar kelime heuristiği
      ['net', 'deneme', 'ayt', 'tyt', 'matematik', 'fizik', 'kimya', 'biyoloji', 'türkçe', 'kötü', 'zor'].forEach(w => {
        if (words.includes(w)) keyTopics.add(w);
      });
    } else if (msg.role === 'coach') {
      if (msg.directive) coachPlans++;
    }
  });

  summaryText += `- Kullanıcı bahsedilenler: ${Array.from(keyTopics).join(', ') || 'Genel sohbet'}\n`;
  summaryText += `- Verilen Koç Direktifi Sayısı: ${coachPlans}\n`;
  summaryText += `- Toplam Arşivlenen Mesaj: ${oldMessages.length}\n`;

  const summaryMessage: ChatMessage = {
    id: `summary_${Date.now()}`,
    role: 'system',
    content: summaryText,
    timestamp: new Date().toISOString(),
    isSystemEvent: true
  };

  return [summaryMessage, ...recentMessages];
}
