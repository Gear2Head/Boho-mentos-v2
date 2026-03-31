/**
 * AMAÇ: Geliştirici & Süper Admin yetkilerini, rolleri ve kilit UID'yi tanımlamak
 * MANTIK: Güvenlik, Hiyerarşi ve Rol atama kuralları
 */

// Sistemin Sahibi: UID'i değiştirilmez.
export const SUPER_ADMIN_UID = '9z9OAxBXsFU3oPT8AqIxnDSfzNy2';

export type UserRole = 'super_admin' | 'developer' | 'standard' | 'banned';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  developer: 80,
  standard: 10,
  banned: 0,
};

export function isSuperAdmin(uid?: string | null): boolean {
  if (!uid) return false;
  return uid === SUPER_ADMIN_UID;
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
