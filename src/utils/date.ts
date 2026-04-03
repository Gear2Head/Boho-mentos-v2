export function toISODateTime(d: Date = new Date()): string {
  return d.toISOString();
}

export function toISODateOnly(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Geriye dönük uyumluluk:
 * - ISO: 2025-07-03T12:34:56.000Z veya 2025-07-03
 * - tr-TR legacy: 3.7.2025 veya 03.07.2025
 */
export function parseFlexibleDate(input: string): Date | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  // ISO veya RFC benzeri formatlar
  const isoMs = Date.parse(raw);
  if (Number.isFinite(isoMs)) return new Date(isoMs);

  // tr-TR legacy: d.m.yyyy
  const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    const dt = new Date(year, month - 1, day);
    // Guard: JS Date overflow durumlarını yakala (örn 32.13.2025)
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
    return dt;
  }

  return null;
}

export function toDateMs(input: string): number | null {
  const d = parseFlexibleDate(input);
  if (!d) return null;
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

