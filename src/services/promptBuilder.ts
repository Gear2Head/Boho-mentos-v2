/**
 * AMAÇ: Merkezi Koç Prompt Builder — tüm AI yüzeyleri bu modülden türetilir.
 * MANTIK: Intent bazlı tip-güvenli prompt şablonları + context enjeksiyonu + JSON format talimatı.
 * V20: inverse_coaching, flashcard_generation, forgetting_curve_reminder, daily_quest eklendi.
 *      parseStructuredDirective bracket-balance parser ile yeniden yazıldı (TODO-001 fix).
 */

import type { CoachIntent, CoachSystemContext } from '../types/coach';

export const COACH_PERSONA_BASE = `Sen "Kübra"sın — YKS koçusun. Sert, analitik, mazeret kabul etmeyen ama toksik olmayan bir disiplin anlayışıyla çalışırsın. Veriyle konuşursun, duyguyla değil.`;

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

  // TODO-007: Kübra v2 intent'leri
  inverse_coaching: `Artık öğrenci rolünü oynuyorsun. Kullanıcı sana konuyu anlatacak. Sen meraklı ama kavramsal boşlukları yakalayan bir öğrenci gibi sorular sor. Yanlış anlar gibi davran, net olmayan noktaları zorla. Anlatım bittiğinde: 3 maddeli güçlü/zayıf özet ve tespit ettiğin 1 gerçek hata yaz.`,

  flashcard_generation: `Konuşma geçmişinden veya verilen konudan 5 adet çalışma kartı üret. SADECE JSON dizi döndür, başka metin ekleme:
[{"front":"...","back":"...","difficulty":"easy|medium|hard","subject":"..."}]`,

  forgetting_curve_reminder: `Ebbinghaus unutma eğrisine göre tekrar zamanı gelen konuların listesi verildi. Her konu için: neden tekrar gerektiğini 1 cümle açıkla, 10 dakikalık mini tekrar görevi ver. Somut ol.`,

  daily_quest: `Öğrencinin gün verilerine bakarak 3 adet günlük yüksek öncelikli görev üret. Her görev çok spesifik (hangi konu, kaç soru, hangi kaynak), ölçülebilir, 60-120 dakikada tamamlanabilir olmalı. Format: structured JSON directive.`,
};

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

export function buildStructuredSystemInstruction(
  intent: CoachIntent,
  context?: Partial<CoachSystemContext>,
  coachPersonality?: string
): string {
  return buildSystemInstruction(intent, context, coachPersonality) + STRUCTURED_JSON_INSTRUCTION;
}

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
 * TODO-001: Bracket-balance JSON parser — greedy regex yerine.
 * Nested array/object içeren directive'lerde parse hatasını önler.
 */
function extractFirstJsonObject(raw: string): string | null {
  let s = raw.trim();
  if (s.includes('```')) {
    const parts = s.split('```');
    const block = parts.find((p) => p.startsWith('json')) || parts[1] || '';
    s = block.replace(/^json/, '').trim();
  }
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.substring(start, i + 1).replace(/,(\s*[}\]])/g, '$1');
    }
  }
  return null;
}

export function parseStructuredDirective(
  rawText: string,
  intent: CoachIntent
): { isStructured: boolean; directive: import('../types/coach').CoachDirective } {
  try {
    const jsonStr = extractFirstJsonObject(rawText);
    if (!jsonStr) throw new Error('No JSON object found');
    const parsed = JSON.parse(jsonStr) as Partial<import('../types/coach').CoachDirective>;

    const headline = parsed.headline?.trim() || `${intent} analizi tamamlandı`;
    const summary = parsed.summary?.trim() || rawText.slice(0, 300);
    const tasks = (parsed.tasks ?? []).map((task, i) => ({
      ...task,
      id: task.id?.trim() ? task.id : `task_${Date.now()}_${i}`,
    }));

    return {
      isStructured: true,
      directive: {
        headline,
        summary,
        tasks,
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
