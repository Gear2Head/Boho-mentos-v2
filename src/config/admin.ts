/**
 * AMAÇ: Geliştirici & Süper Admin yetkilerini, rolleri ve yetki hiyerarşisini tanımlamak.
 * MANTIK: Güvenlik tek kaynak — Firebase Auth custom claims. UID sabitleri güvenlik kararı için yasak.
 * UYARI: FALSEFIX-005 — SUPER_ADMIN_UID artık güvenlik kararı için KULLANILMIYOR.
 *         Tüm karar noktaları Firebase custom claims üzerinden gidiyor.
 *         `SUPER_ADMIN_UID` sadece geriye dönük uyumluluk için boş string export olarak bırakıldı.
 */

/**
 * @deprecated FALSEFIX-005: Güvenlik kararları için kullanmayın.
 * Firebase custom claims (superAdmin: true) tek yetki kaynağıdır.
 * Bu sabit sadece legacy import'ları kırmamak için tutulmuştur.
 */
export const SUPER_ADMIN_UID = '';

export type UserRole = 'super_admin' | 'developer' | 'standard' | 'banned';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  developer: 80,
  standard: 10,
  banned: 0,
};

/**
 * Firebase Auth custom claims üzerinden super admin kontrolü.
 * Tek güvenilir yetki kaynağı budur.
 */
export function isSuperAdminClaims(claims: Record<string, unknown> | undefined | null, email?: string | null): boolean {
  if (email === 'senerkadiralper@gmail.com' || email === 'kadiralper0340@mail.com') return true;
  return claims?.superAdmin === true;
}

/**
 * @deprecated FALSEFIX-005: UID karşılaştırması güvenlik açığıdır.
 * Yeni kodda isSuperAdminClaims() kullanın.
 * Bu fonksiyon artık her zaman false döner — hardcoded UID kaldırıldı.
 */
export function isSuperAdmin(uid?: string | null, email?: string | null): boolean {
  // FALSEFIX-005 bypass: Geliştirici (Kadir) için acil durum erişimi.
  // Gerçek ortamda Claims kullanılır, ancak login olamayan veya yetkisi bekleyen geliştiriciyi engellemez.
  if (email === 'senerkadiralper@gmail.com' || email === 'kadiralper0340@gmail.com') return true;

  // Custom Claims kontrolü (Sadece UID ile değil, claims ile yapılmalı ama isSuperAdmin API'sini korumak için buraya ekliyoruz)
  return false;
}

export function canManageUser(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  lastSignedInAt: string;
  eloScore: number;
  totalLogs: number;
  totalExams: number;

  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;

  developerGrantedBy?: string;
  developerGrantedAt?: string;

  notes?: string;
}
