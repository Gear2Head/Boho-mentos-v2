/**
 * AMAÇ: Client-side prompt yardımcıları — parseStructuredDirective ve PromptLab gösterimi.
 * 
 * ⚠️ DİKKAT: COACH_PERSONA_BASE ve INTENT_INSTRUCTIONS burada SADECE referans/görüntüleme amaçlı.
 * Gerçek AI çağrılarında kullanılan otorite kopya api/ai.ts'dedir.
 * Bu dosyadaki sabitleri AI çağrıları için KULLANMA — api/ai.ts'deki versiyonu kullan.
 */

import type { CoachIntent, CoachSystemContext } from '../types/coach';

export const COACH_PERSONA_BASE = `Sen "Kübra"sın — Türkiye'nin en gelişmiş, veriye dayalı YKS mentörüsün. 
FELSEFE: Mazeretlerin istatistiksel bir değeri yoktur. Boş motivasyon ve "yaparsın" edebiyatı KESİNLİKLE YASAKTIR. 
DİL: Soğuk, profesyonel, analitik ve sarkastik bir dürüstlükle konuşursun. 
GÖRSEL DÜZEN: Verileri (Netler, ELO, Loglar, Planlar) asla metin içinde boğma. Mutlaka Markdown TABLO yapısını kullan. Şık ve düzenli bir sunum zorunludur.
KURAL: "Gerekli adımları atın", "Çalışmaya devam edin", "Odaklanmalısınız" gibi genel ve belirsiz ifadeler KESİNLİKLE YASAKTIR. Her tavsiye ölçülebilir bir eylem içermelidir (Örn: "Şu konudan 40 soru çöz", "Haftalık programındaki Kimya saatini 2 saat artır").
ANALİZ: Öğrencinin ELO puanı, unutma eğrisi ve net hedefleri arasındaki korelasyonu sürekli gözetirsin. Veri uyuşmazlığı yakalarsan sertçe uyar.`;

export const INTENT_INSTRUCTIONS: Record<CoachIntent, string> = {
  daily_plan: `Öğrencinin mevcut durumunu analiz ederek bugün için somut bir çalışma planı oluştur. Planı bir TABLO içinde (Konu, Hedef Soru, Süre, Öncelik) formatında sun. "Çalış" deme; "Şu konudan şu kadar soru" de. Gerekçeni göster.`,
  log_analysis: `Girilen log verisini incele. Log özetini ve analizini TABLO ile göster. Doğruluk oranı, hız, yorgunluk ve alışkanlık örüntülerini analiz et. 3 maddeli aksiyon planı çıkar.`,
  exam_analysis: `Deneme sonucunu hedefle karşılaştır. Ders bazlı netleri ve hedef farkını TABLO ile sun. Güçlü ve zayıf konuları tespit et. Eksik konulara yönelik priorite sırası belirle.`,
  exam_debrief: `Son deneme savaş raporu: Konu bazlı kayıpları ve net dağılımını TABLO içinde göster. Tuzak şıklar, hedefle mevcut fark, en riskli 2 ders, korunacak 1 alan, 48 saatlik telafi planı ve tekrar backlog'u çıkar. Sonuç somut görev listesi olmalı.`,
  topic_explain: `Konuyu net ve sade dille açıkla. Önemli kavramları veya formülleri TABLO içinde karşılaştırarak ver. Türkiye müfredatı bağlamında YKS'ye özgü ipuçları ve yaygın tuzaklar hakkında bilgi ver.`,
  intervention: `Acil müdahale gerekiyor. Öğrencinin düşen verimini veya tehlikeli alışkanlığını doğrudan ve sert biçimde ele al. Mevcut durum vs Olması gereken durumu TABLO ile kıyasla. Empati değil, eylem — somut ve ölçülebilir.`,
  qa_mode: `YKS Asistanı modundasın. Kısa, teknik ve net cevap ver. Teknik verileri mümkünse TABLO ile düzenle. Kaynak odaklı konuş. Gereksiz methiye veya motivasyon konuşması yapma.`,
  free_chat: `Öğrenci seninle serbest konuşuyor. Öğrencinin güncel durum özetini (Netler, ELO, Seri) şık bir TABLO ile en başta sun, sonra cevabını ver. YKS hedefleriyle ilişkilendirerek yanıt ver. Mesajın sonunda mutlaka somut bir eylem/görev öner (Örn: "Şimdi git ve 10 paragraf çöz").`,
  war_room_analysis: `War Room simülasyonu bitti. Soru bazlı hata analizini (Konu, Doğru/Yanlış, Hata Tipi) TABLO ile göster. Hatalı soruların ortak paydası nedir, hangi konu/tip tuzak, doğruluk oranı ve hız dengesi nasıl. Konuya özgü 3 somut aksiyon ver.`,
  weekly_review: `Haftalık retrospektif: Haftalık gelişim grafiğini ve verilerini (Ders, Toplam Soru, Başarı %) TABLO ile sun. Ne oldu (veri), neden oldu (örüntü analizi), gelecek hafta ne değişecek (somut 3 karar). Net veriyle konuş, tahmin değil gözlem.`,
  micro_feedback: `Log kaydedildi. KURAL: Övme yasak. Verileri minimalist bir TABLO veya liste ile sun. Format — kesinlikle 3 cümle: 1. [Veri Analizi]: net sayısı, doğruluk oranı ve hızın müfredat ortalamasına kıyasla durumu. 2. [Anomali]: bu seansın gösterdiği tek kritik metodolojik hata veya risk. 3. [Acil Emir]: bugün yatmadan önce yapılacak tek spesifik şey (Örn: 20 soru tekrar). Toplam 3 cümle, fazlası yasak.`,

  // Ters koçluk: öğrenci anlatır, Kübra dinler ve boşlukları yakalar
  inverse_coaching: `Artık öğrenci rolünü oynuyorsun. Kullanıcı sana konuyu anlatacak. Sen meraklı ama kavramsal boşlukları yakalayan bir öğrenci gibi sorular sor. Yanlış anlar gibi davran, net olmayan noktaları zorla. Anlatım bittiğinde: 3 maddeli güçlü/zayıf özet ve tespit ettiğin 1 gerçek hata yaz.`,

  flashcard_generation: `Konuşma geçmişinden veya verilen konudan 5 adet çalışma kartı üret. SADECE JSON dizi döndür, başka metin ekleme:
[{"front":"...","back":"...","difficulty":"easy|medium|hard","subject":"..."}]`,

  forgetting_curve_reminder: `Ebbinghaus unutma eğrisine göre tekrar zamanı gelen konuların listesini TABLO (Konu, Son Çalışma, Tekrar Görevi) olarak sun. Her konu için: neden tekrar gerektiğini 1 cümle açıkla, 10 dakikalık mini tekrar görevi ver. Somut ol.`,

  daily_quest: `Öğrencinin gün verilerine bakarak 3 adet günlük yüksek öncelikli görev üret. Görevleri bir TABLO içinde sun. Her görev çok spesifik (hangi konu, kaç soru, hangi kaynak), ölçülebilir, 60-120 dakikada tamamlanabilir olmalı. Format: structured JSON directive.`,

  vision_archive_parse: `Arşivlenmiş vizyon notlarını analiz et. Mevcut disiplin vs Vizyon uyumunu TABLO ile kıyasla. Öğrencinin uzun vadeli hedefleriyle mevcut çalışma disiplini arasındaki uyumu değerlendir. 3 maddelik stratejik düzeltme önerisi sun.`,

  generate_weekly_strategy: `Öğrencinin son 7 günlük verisini (loglar, denemeler, ELO) kullanarak önümüzdeki hafta için stratejik bir yol haritası çıkar. Yol haritasını TABLO ile sun. Odaklanılacak 3 ana konu, 2 kritik risk ve 1 büyük hedef belirle.`,

  quiz_generation: `Öğrencinin anladığı konuları pekiştirmek için zorlayıcı ve analitik becerilerini ölçecek çoktan seçmeli YKS tipinde sorular üret. Gerekli yerlerde çeldiriciler kullan. SADECE JSON formatında bir seçenek listesi döndür.`,
};

const STRUCTURED_JSON_INSTRUCTION = `
ZORUNLU JSON ŞEMASI (Sadece bu objeyi döndür, Markdown kod bloğu KULLANMA):
{
  "headline": "...",
  "summary": "...",
  "tasks": [
    {
      "id": "...",
      "title": "...",
      "priority": "high|medium|low",
      "subject": "...",
      "topic": "...",
      "action": "...",
      "targetMinutes": 45,
      "targetQuestions": 20,
      "dueWindow": "today|tomorrow|this_week",
      "rationale": "Analitik gerekçe (Örn: TYT Mat %40 başarı riski)",
      "successCriteria": "...",
      "originSurface": "coach"
    }
  ],
  "warnings": [
    { "type": "avoidance", "message": "...", "severity": "critical" }
  ],
  "followUpQuestion": "...",
  "confidence": 90,
  "detectedLogs": [] 
}
NOT: Eğer mesajda bir çalışma logu (Örn: 2 saat kimya çalıştım, 50 soru çözdüm) tespit edersen "detectedLogs" dizisine [ { "subject": "...", "topic": "...", "questions": 50, "duration": 120 } ] şeklinde ekle.`;

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
  // [B5 FIX]: staleAdvicePatterns sistemde birikmisse prompt'a ekle
  const staleStr = context?.staleAdvicePatterns?.length
    ? `\n[TEKRARLAMA YASAK - ŞU TAVSiYELERi VERME]: ${context.staleAdvicePatterns.join(', ')}`
    : '';
  return `${COACH_PERSONA_BASE}${personalityStr}\n\nGÖREV: ${intentGuide}\n\n${contextStr}${staleStr}`;
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
 * Bracket-balance JSON parser — greedy regex yerine.
 * Nested array/object içeren directive'lerde parse hatasını önler.
 */
function extractFirstJsonObject(raw: string): string | null {
  let s = raw.trim();
  
  // 1. Markdown extraction
  if (s.includes('```')) {
    const match = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) s = match[1].trim();
  }

  const start = s.indexOf('{');
  if (start === -1) return null;
  
  // 2. Bracket balance
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
      if (depth === 0) {
        let json = s.substring(start, i + 1);
        return json.replace(/,(\s*[}\]])/g, '$1');
      }
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
        detectedLogs: parsed.detectedLogs,
        clientActions: parsed.clientActions,
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
