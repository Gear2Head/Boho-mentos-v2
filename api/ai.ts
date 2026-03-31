/**
 * AMAÇ: Vercel serverless AI orkestratörü.
 * MANTIK: Provider fallback + key rotation + basic rate-limit.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from "@google/genai";

type ChatHistoryItem = { role: "user" | "coach"; content: string };
type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

type CoachAction = "coach" | "qa_mode";
type AiRequestBody =
  | {
      action?: CoachAction;
      userMessage: string;
      context: string;
      chatHistory?: ChatHistoryItem[];
      coachPersonality?: string;
      forceJson?: boolean;
      maxTokens?: number;
      userState?: any;
    }
  | {
      action: "parseVoiceLog";
      transcript: string;
    };

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_MODEL = "llama-3.1-8b-instant";
const OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct:free";
const CEREBRAS_MODEL = "llama3.1-8b";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

const SYSTEM_INSTRUCTION_BASE = `
Sen Gear_Head YKS koçusun.
- Veriye dayalı konuş.
- Boş motivasyon verme.
- Kullanıcı bağlamını ve logları dikkate al.
`.trim();

const SYSTEM_QA_PROMPT = `
Sen YKS soru/çözüm asistanısın.
- Kısa, net ve doğru yanıt ver.
- İstenirse sadece JSON döndür.
`.trim();

const buildSystemInstruction = (coachPersonality?: string, action?: CoachAction, userState?: any) => {
  const base = action === "qa_mode" ? SYSTEM_QA_PROMPT : SYSTEM_INSTRUCTION_BASE;
  const personality = (coachPersonality ?? "").trim();
  const stateBlock = userState
    ? `\n\n## ANLIK STATE\n\`\`\`json\n${JSON.stringify(userState)}\n\`\`\``
    : "";
  const styleBlock = personality ? `\n\n## KOÇ ÜSLUBU\n${personality}` : "";
  return `${base}${stateBlock}${styleBlock}`;
};

const getKeys = (prefix: string, count: number) => {
  const keys: string[] = [];
  const env = process.env as Record<string, string | undefined>;
  const primary = env[prefix];
  if (primary) keys.push(primary);
  for (let i = 2; i <= count; i++) {
    const v = env[`${prefix}_${i}`];
    if (v) keys.push(v);
  }
  return keys;
};

const GEMINI_KEYS = () => getKeys("GEMINI_API_KEY", 4);
const GROQ_KEYS = () => getKeys("GROQ_API_KEY", 4);
const OPENROUTER_KEYS = () => getKeys("OPENROUTER_API_KEY", 1);
const CEREBRAS_KEYS = () => getKeys("CEREBRAS_API_KEY", 1);

const isRetriableProviderError = (message: string) => {
  const m = message.toLowerCase();
  return m.includes("429") || m.includes("quota") || m.includes("rate limit") || m.includes("overloaded");
};

async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  maxTokens: number
) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://boho-mentos.vercel.app",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callGemini(apiKey: string, prompt: string, systemInstruction: string, chatHistory: ChatHistoryItem[]) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = chatHistory.map((msg) => ({
    role: msg.role === "coach" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
  contents.push({ role: "user", parts: [{ text: prompt }] });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction, temperature: 0.7 },
  });
  return (response as any).text ?? "";
}

async function getCoachResponseServer(body: Extract<AiRequestBody, { action?: CoachAction }>) {
  const userMessage = (body.userMessage ?? "").toString();
  if (!userMessage.trim()) return { text: "Mesaj boş olamaz." };
  const context = (body.context ?? "").toString();
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-6) : [];
  const maxTokens = typeof body.maxTokens === "number" ? Math.max(200, Math.min(2000, body.maxTokens)) : 1200;
  const forceJson = !!body.forceJson;

  const systemInstruction = buildSystemInstruction(body.coachPersonality, body.action, body.userState);
  const fullPrompt = `Mevcut Durum:\n${context}\n\nMesaj:\n${userMessage}${
    forceJson ? "\n\nKURAL: SADECE GEÇERLİ JSON DÖNDÜR." : ""
  }`;

  const openAIMsgs: OpenAIMessage[] = [
    { role: "system", content: systemInstruction },
    ...chatHistory.map(
      (m): OpenAIMessage => ({ role: m.role === "coach" ? "assistant" : "user", content: m.content })
    ),
    { role: "user", content: fullPrompt },
  ];

  for (const key of CEREBRAS_KEYS()) {
    try {
      return { text: await callOpenAICompatible(CEREBRAS_API_URL, key, CEREBRAS_MODEL, openAIMsgs, maxTokens) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
    }
  }
  for (const key of GEMINI_KEYS()) {
    try {
      return { text: await callGemini(key, fullPrompt, systemInstruction, chatHistory) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
    }
  }
  for (const key of GROQ_KEYS()) {
    try {
      return { text: await callOpenAICompatible(GROQ_API_URL, key, GROQ_MODEL, openAIMsgs, Math.min(maxTokens, 1200)) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
    }
  }
  for (const key of OPENROUTER_KEYS()) {
    try {
      return { text: await callOpenAICompatible(OPENROUTER_API_URL, key, OPENROUTER_MODEL, openAIMsgs, maxTokens) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
    }
  }
  return { text: "Tüm AI hatları meşgul veya limitler doldu. Lütfen 1 dakika sonra tekrar dene." };
}

async function parseVoiceLogServer(transcript: string) {
  const prompt = `Analiz et ve SADECE JSON döndür: "${transcript}" -> {examType, subject, topic, questions, correct, wrong, empty, avgTime}`;
  for (const key of GEMINI_KEYS()) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      return JSON.parse((response as any).text ?? "{}");
    } catch {
      continue;
    }
  }
  return null;
}

const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX = 10;
const rateLimitBucket = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: any) {
  const xf = (req.headers?.["x-forwarded-for"] as string | undefined) ?? "";
  return xf.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}
function checkRateLimit(ip: string) {
  const now = Date.now();
  const cur = rateLimitBucket.get(ip);
  if (!cur || now - cur.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBucket.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (cur.count >= RATE_LIMIT_MAX) return { ok: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - cur.windowStart) };
  cur.count += 1;
  return { ok: true };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }));
    return;
  }

  const rl = checkRateLimit(getClientIp(req));
  if (!rl.ok) {
    res.statusCode = 429;
    res.setHeader("Retry-After", String(Math.ceil((rl.retryAfterMs ?? 1000) / 1000)));
    res.end(JSON.stringify({ error: "RATE_LIMITED" }));
    return;
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  let body: AiRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "INVALID_JSON" }));
    return;
  }

  try {
    if ((body as any).action === "parseVoiceLog") {
      const data = await parseVoiceLogServer(String((body as any).transcript ?? ""));
      res.statusCode = 200;
      res.end(JSON.stringify({ data }));
      return;
    }
    const result = await getCoachResponseServer(body as any);
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "AI_SERVER_ERROR", message: String(e?.message ?? "Unknown") }));
  }
}

