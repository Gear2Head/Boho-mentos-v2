import { isNonEmptyString, isRecord } from './typeGuards.ts';
import { z } from 'zod';

export const DirectiveSchema = z.object({
  analysis: z.string().optional(),
  tasks: z.array(z.object({
    subject: z.string().optional(),
    action: z.string(),
    estimatedMinutes: z.number().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional()
  })).optional(),
  motivation: z.string().optional(),
  questions: z.array(z.string()).optional(),
  score: z.number().optional(),
  adaptiveDiff: z.string().optional(),
  weakTopics: z.array(z.string()).optional()
}).catchall(z.unknown());

export type ParsedDirective = z.infer<typeof DirectiveSchema>;

export function safeParseDirective(rawText: string): ParsedDirective {
  const jsonString = findBalancedSegment(rawText, '{');
  if (!jsonString) return { analysis: 'Model geçersiz bir formatta yanıt verdi.', tasks: [] };

  try {
    const parsed = JSON.parse(jsonString);
    const validated = DirectiveSchema.safeParse(parsed);
    if (!validated.success) {
      console.error('[AI ZOD Error]', validated.error);
      return { analysis: 'AI yanıtı şema dışındaydı.', tasks: [] };
    }
    return validated.data;
  } catch (error) {
    console.error('[AI Parse Error]', error);
    return { analysis: 'Parçalama başarısız oldu.', tasks: [] };
  }
}


const MAX_AI_TEXT_LENGTH = 6_000;

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.includes('```')) return trimmed;

  const blocks = trimmed.split('```');
  const fenced = blocks.find((part) => part.trimStart().startsWith('json'));
  const candidate = fenced ?? blocks[1] ?? trimmed;
  return candidate.replace(/^json\s*/i, '').trim();
}

function findBalancedSegment(raw: string, openChar: '{' | '['): string | null {
  const source = stripMarkdownFences(raw);
  const closeChar = openChar === '{' ? '}' : ']';
  const startIdx = source.indexOf(openChar);
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = startIdx; i < source.length; i += 1) {
    const ch = source[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaping = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) depth += 1;
    if (ch === closeChar) depth -= 1;

    if (depth === 0) {
      return source
        .slice(startIdx, i + 1)
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();
    }
  }

  return null;
}

export function sanitizeAiText(input: string, maxLength = MAX_AI_TEXT_LENGTH): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function parseAiObject<T>(
  raw: string,
  validator: (value: unknown) => T | null
): T | null {
  const json = findBalancedSegment(raw, '{');
  if (!json) return null;

  try {
    return validator(JSON.parse(json));
  } catch {
    return null;
  }
}

export function parseAiArray<T>(
  raw: string,
  validator: (value: unknown) => T | null
): T[] | null {
  const json = findBalancedSegment(raw, '[');
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((item) => validator(item))
      .filter((item): item is T => item !== null);
  } catch {
    return null;
  }
}

export function validateStringArray(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isNonEmptyString)
    .map((item) => sanitizeAiText(item))
    .slice(0, maxItems);
}

export function validateNullableParsedExam(
  value: unknown
): { type: 'TYT' | 'AYT'; totalNet: number } | null {
  if (value == null) return null;
  if (!isRecord(value)) return null;

  const type = value.type === 'TYT' || value.type === 'AYT' ? value.type : null;
  const totalNet = Number(value.totalNet);

  if (!type || !Number.isFinite(totalNet) || totalNet < 0 || totalNet > 200) {
    return null;
  }

  return {
    type,
    totalNet: Math.round(totalNet * 100) / 100,
  };
}
