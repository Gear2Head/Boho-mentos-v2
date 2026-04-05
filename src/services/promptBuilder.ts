/**
 * AMAÇ: Merkezi Koç Prompt Builder — tüm AI yüzeyleri bu modülden türetilir.
 * MANTIK: Intent bazlı tip-güvenli prompt şablonları + context enjeksiyonu + JSON format talimatı.
 * UYARI: BUILD-003 fix — Record<CoachIntent, string> tip-güvenli; hiçbir intent fallback'e düşmez.
 *         Prompt değişiklikleri tek yerden yönetilir; api/ai.ts ve gemini.ts bu modülü kullanmalı.
 */

import type { CoachIntent, CoachSystemContext } from '../types/coach';

export const COACH_PERSONA_BASE = `Sen "Kübra"sın — YKS koçusun. Sert, analitik, mazeret kabul etmeyen ama toksik olmayan bir disiplin anlayışıyla çalışırsın. Veriyle konuşursun, duyguyla değil.`;

/**
 * BUILD-003: Record<CoachIntent, string> — tüm intent'lerin karşılığı zorunlu.
 * Typecheck eksik intent varsa derleme hatası verir; fallback gizlenmez.
 */
const INTENT_INSTRUCTIONS: Record<CoachIntent, string> = {
  daily_plan: `Öğrencinin mevcut durumunu analiz ederek bugün için somut bir çalışma planı oluştur. Konu, süre ve öncelik sırasını belirt. Gerekçeni göster.`,
  log_analysis: `Girilen log verisini incele. Doğruluk oranı, hız, yorgunluk ve alışkanlık örüntülerini analiz et. 3 maddeli aksiyon planı çıkar.`,
  exam_analysis: `Deneme sonucunu hedefle karşılaştır. Güçlü ve zayıf konuları tespit et. Eksik konulara yönelik priorite sırası belirle.`,
  exam_debrief: `Son deneme savaş raporu: konu bazlı kayıplar, tuzak şıklar, hedefle mevcut fark, en riskli 2 ders, korunacak 1 alan, 48 saatlik telafi planı ve tekrar backlog'u çıkar. Sonuç somut görev listesi olmalı.`,
  topic_explain: `Konuyu net ve sade dille açıkla. Türkiye müfredatı bağlamında YKS'ye özgü ipuçları ve yaygın tuzaklar hakkında bilgi ver.`,
  intervention: `Acil müdahale gerekiyor. Öğrencinin düşen verimini veya tehlikeli alışkanlığını doğrudan ve sert biçimde ele al. Empati değil, eylem — somut ve ölçülebilir.`,
  qa_mode: `YKS Asistanı modundasın. Kısa, teknik ve net cevap ver. Kaynak odaklı konuş. Gereksiz methiye veya motivasyon konuşması yapma.`,
  free_chat: `Öğrenci seninle serbest konuşuyor. YKS hedefleriyle ilişkilendirerek yanıt ver ama zorlama. Kısa ve samimi ol.`,
  war_room_analysis: `War Room simülasyonu bitti. Soru bazlı hata analizi yap: hatalı soruların ortak paydası nedir, hangi konu/tip tuzak, doğruluk oranı ve hız dengesi nasıl. Konuya özgü 3 somut aksiyon ver.`,
  weekly_review: `Haftalık retrospektif: Ne oldu (veri), neden oldu (örüntü analizi), gelecek hafta ne değişecek (somut 3 karar). Net veriyle konuş, tahmin değil gözlem.`,
  micro_feedback: `Log kaydedildi. Maksimum 3 cümle: 1 kısa özet (ne yapıldı, nasıl gitti) + 1 risk tespiti + 1 sonraki adım. Gereksiz övgü yasak.`,
};


/**
 * Directive çıktısı için tam JSON şema talimatı.
 * BUILD-003: Schema güncel CoachTask alanlarını kapsar.
 */
const STRUCTURED_JSON_INSTRUCTION = `
ZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON şemasıyla döndür, başka hiçbir metin ekleme:
{
  "headline": "Tek cümlelik genel değerlendirme",
  "summary": "2-3 cümlelik özet",
  "tasks": [
    {
      "id": "uuid-benzeri-id",
      "title": "Kısa görev başlığı",
      "priority": "high|medium|low",
      "subject": "ders",
      "topic": "konu",
      "action": "yapılacak iş detayı",
      "targetMinutes": 45,
      "targetQuestions": 20,
      "dueWindow": "today|tomorrow|this_week",
      "rationale": "1 satır veri temelli gerekçe",
      "successCriteria": "başarı ölçütü",
      "originSurface": "coach|strategy|warroom|system"
    }
  ],
  "warnings": [
    {
      "type": "avoidance|memorization_risk|time_loss|low_accuracy|streak_break|burnout_risk|target_gap",
      "message": "uyarı",
      "severity": "info|warning|critical"
    }
  ],
  "followUpQuestion": "Bir sonraki seansta sorulacak soru",
  "confidence": 75
}
`;

/**
 * buildSystemInstruction: Intent + context → sistem prompt
 */
export function buildSystemInstruction(
  intent: CoachIntent = 'free_chat',
  context?: Partial<CoachSystemContext>,
  coachPersonality?: string
): string {
  const intentGuide = INTENT_INSTRUCTIONS[intent];
  const contextStr = buildContextString(context);
  const personalityStr = coachPersonality
    ? `\n[Koçluk Kişiliği: ${coachPersonality}]`
    : '';

  return `${COACH_PERSONA_BASE}${personalityStr}\n\nGÖREV: ${intentGuide}\n\n${contextStr}`;
}

/**
 * buildStructuredSystemInstruction: JSON directive çıktısı için
 */
export function buildStructuredSystemInstruction(
  intent: CoachIntent,
  context?: Partial<CoachSystemContext>,
  coachPersonality?: string
): string {
  return buildSystemInstruction(intent, context, coachPersonality) + STRUCTURED_JSON_INSTRUCTION;
}

/**
 * buildContextString: CoachSystemContext → okunabilir metin bloğu
 */
export function buildContextString(ctx?: Partial<CoachSystemContext>): string {
  if (!ctx) return '';

  const lines: string[] = ['[ÖĞRENCİ DURUMU]'];

  if (ctx.name) lines.push(`İsim: ${ctx.name}`);
  if (ctx.track) lines.push(`Alan: ${ctx.track}`);
  if (ctx.targetUniversity) lines.push(`Hedef: ${ctx.targetUniversity} / ${ctx.targetMajor ?? '-'}`);
  if (ctx.tytTarget !== undefined) lines.push(`Hedef Net: TYT ${ctx.tytTarget} / AYT ${ctx.aytTarget ?? '-'}`);
  if (ctx.lastTytNet !== undefined) lines.push(`Son Deneme: TYT ${ctx.lastTytNet} / AYT ${ctx.lastAytNet ?? '-'}`);
  if (ctx.eloScore !== undefined) lines.push(`ELO: ${ctx.eloScore} | Seri: ${ctx.streakDays ?? 0} gün`);
  if (ctx.tytProgressPercent !== undefined) {
    lines.push(`Müfredat: TYT %${ctx.tytProgressPercent} / AYT %${ctx.aytProgressPercent ?? 0} tamamlandı`);
  }
  if (ctx.lastLogs?.length) lines.push(`Son Loglar: ${ctx.lastLogs.join(' | ')}`);
  if (ctx.lastExams?.length) lines.push(`Son Denemeler: ${ctx.lastExams.join(' | ')}`);
  if (ctx.alertCount) lines.push(`Uyarı Sayısı: ${ctx.alertCount}`);

  return lines.join('\n');
}

/**
 * parseStructuredDirective: AI yanıtından JSON direktif çıkar, hata olursa text fallback
 */
export function parseStructuredDirective(
  rawText: string,
  intent: CoachIntent
): { isStructured: boolean; directive: import('../types/coach').CoachDirective } {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON block found');
    const parsed = JSON.parse(jsonMatch[0]) as Partial<import('../types/coach').CoachDirective>;
    if (!parsed.headline || !parsed.summary) throw new Error('Missing required fields');
    return {
      isStructured: true,
      directive: {
        headline: parsed.headline,
        summary: parsed.summary,
        tasks: parsed.tasks ?? [],
        warnings: parsed.warnings,
        followUpQuestion: parsed.followUpQuestion,
        text: rawText,
        createdAt: new Date().toISOString(),
        intent,
      },
    };
  } catch {
    return {
      isStructured: false,
      directive: {
        headline: 'Koç Yanıtı',
        summary: rawText.slice(0, 300),
        tasks: [],
        text: rawText,
        createdAt: new Date().toISOString(),
        intent,
      },
    };
  }
}
