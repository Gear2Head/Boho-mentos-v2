/**
 * AMAÇ: İstemciden güvenli AI çağrısı (Vercel Serverless üzerinden)
 * MANTIK: Secret'lar istemcide tutulmaz; `/api/ai` orkestratörü key rotation + fallback yapar.
 * UYARI: İstemci sadece context/prompt gönderir, anahtarlar asla bundle'a gömülmez.
 */

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function getCoachResponse(
  userMessage: string,
  context: string,
  chatHistory: { role: "user" | "coach"; content: string }[] = [],
  options?: { action?: "coach" | "qa_mode"; coachPersonality?: string; forceJson?: boolean; maxTokens?: number }
): Promise<string> {
  const payload = {
    action: options?.action || "coach",
    userMessage,
    context,
    chatHistory: chatHistory.slice(-6),
    coachPersonality: options?.coachPersonality,
    forceJson: options?.forceJson,
    maxTokens: options?.maxTokens,
  };

  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const txt = await response.text();
    return `AI HATASI: ${response.status} ${txt}`;
  }

  const data = (await response.json()) as { text?: string; error?: string };
  return data.text ?? "Tüm AI hatları meşgul veya limitler doldu. Lütfen 1 dakika sonra tekrar dene.";
}

export async function parseVoiceLog(transcript: string): Promise<Record<string, any> | null> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "parseVoiceLog", transcript }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { data?: Record<string, any> | null };
  return data.data ?? null;
}
