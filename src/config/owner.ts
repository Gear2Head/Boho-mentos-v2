/**
 * Owner-only UI hints.
 *
 * This value is intentionally not a security boundary. Admin writes must still
 * be enforced by Firebase custom claims / Firestore rules.
 */
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL ?? 'senerkadiralper@gmail.com').trim().toLowerCase();

export function isOwnerEmail(email?: string | null): boolean {
  return Boolean(OWNER_EMAIL && email && email.trim().toLowerCase() === OWNER_EMAIL);
}
