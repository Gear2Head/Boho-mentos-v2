/**
 * AMAÇ: Admin audit log ve genel timestamp değerlerini güvenli şekilde formatlamak.
 * MANTIK: Firestore Timestamp nesnesi, ISO string ve eksik değer için birleşik formatter.
 * UYARI: FALSEFIX-008 — `log.timestamp?.seconds` varsayımı ortadan kaldırıldı.
 *         timestamp.seconds okurken crash verebiliyordu; artık her durum için safe fallback var.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Firestore'dan gelen timestamp değerini JS Date'e dönüştürür.
 * Desteklenen formatlar:
 *  - Firestore Timestamp nesnesi (seconds + nanoseconds)
 *  - ISO 8601 string
 *  - Unix epoch number (milisaniye)
 *  - null | undefined → null döner
 */
export function toDate(
  raw: Timestamp | { seconds: number; nanoseconds?: number } | string | number | null | undefined
): Date | null {
  if (raw == null) return null;

  // Firestore SDK Timestamp instance
  if (raw instanceof Timestamp) return raw.toDate();

  // Plain object with seconds (Firestore serialized)
  if (typeof raw === 'object' && 'seconds' in raw && typeof raw.seconds === 'number') {
    return new Date(raw.seconds * 1000);
  }

  // ISO string or number
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Timestamp değerini Türkçe tarih/saat formatında string'e çevirir.
 * Geçersiz veya eksik değer için fallback string döner.
 */
export function formatTimestamp(
  raw: Parameters<typeof toDate>[0],
  fallback = '—'
): string {
  const date = toDate(raw);
  if (!date) return fallback;

  try {
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return date.toISOString();
  }
}

/**
 * Timestamp değerini göreli süre olarak formatlar (ör. "3 dakika önce").
 * RTF API kullanır — tarayıcı desteği geniştir.
 */
export function formatRelativeTime(
  raw: Parameters<typeof toDate>[0],
  fallback = '—'
): string {
  const date = toDate(raw);
  if (!date) return fallback;

  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });

  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}
