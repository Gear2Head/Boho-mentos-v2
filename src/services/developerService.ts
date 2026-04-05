/**
 * AMAÇ: Geliştirici (Admin) Yetenekleri İçin Firebase Servisi
 * MANTIK: Tüm admin yazmaları users/{uid} ve users/{uid}/{subcollection} yolunu kullanır.
 * UYARI: FALSEFIX-004 — 'userData' koleksiyonu tamamen kaldırıldı.
 *         Güvenlik: Bu servis frontend tetikleyicisidir; kritik işlemler için Cloud Function kullanın.
 */

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { isSuperAdminClaims, canManageUser, UserRole, FirestoreUser } from '../config/admin';

// ─── Audit Logging ───────────────────────────────────────────────────────────

interface AuditLogPayload {
  actorUid: string;
  actorRole: UserRole;
  targetUid: string;
  action: string;
  previousState?: Record<string, unknown>;
  nextState?: Record<string, unknown>;
  details?: Record<string, unknown>;
  result?: 'success' | 'failure';
  errorMessage?: string;
}

export async function logAdminAction(payload: AuditLogPayload): Promise<void> {
  try {
    const logRef = doc(collection(db, 'adminLogs'));
    await setDoc(logRef, {
      ...payload,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('[developerService] Audit log yazılamadı:', e);
  }
}

// ─── Kullanıcı Arama & Listeleme ──────────────────────────────────────────────

export async function searchUsers(searchTerm: string): Promise<FirestoreUser[]> {
  if (searchTerm.length >= 20) {
    const d = await getDoc(doc(db, 'users', searchTerm));
    if (d.exists()) return [d.data() as FirestoreUser];
  }

  const q = query(
    collection(db, 'users'),
    where('email', '>=', searchTerm.toLowerCase()),
    where('email', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(20)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FirestoreUser);
}

export async function getAllUsers(maxLimit = 50): Promise<FirestoreUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(maxLimit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FirestoreUser);
}

// ─── Rol ve Banlama Yönetimi ──────────────────────────────────────────────────

export async function changeUserRole(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canManageUser(actorRole, newRole)) {
    return { success: false, error: 'Bu rütbe için yetkin yok.' };
  }

  try {
    const updatePayload: Record<string, unknown> = { role: newRole };
    if (newRole === 'developer') {
      updatePayload.developerGrantedBy = actorUid;
      updatePayload.developerGrantedAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'users', targetUid), updatePayload);
    await logAdminAction({ actorUid, actorRole, targetUid, action: 'CHANGE_ROLE', nextState: { newRole }, result: 'success' });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function toggleBan(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string,
  isBanned: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      isBanned,
      banReason: isBanned ? (reason ?? null) : null,
      bannedAt: isBanned ? new Date().toISOString() : null,
      bannedBy: isBanned ? actorUid : null,
    });
    await logAdminAction({ actorUid, actorRole, targetUid, action: isBanned ? 'BAN_USER' : 'UNBAN_USER', details: { reason }, result: 'success' });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

// ─── Tehlikeli Veri İşlemleri ─────────────────────────────────────────────────

/**
 * FALSEFIX-004: userData koleksiyonu kaldırıldı.
 * ELO artık users/{uid} dokümanı üzerinde tutuluyor (aynı yerden okunuyor).
 */
export async function injectElo(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    const ud = await getDoc(userRef);
    if (!ud.exists()) return { success: false, error: 'Kullanıcı bulunamadı.' };

    const currentElo = (ud.data().eloScore as number) || 1200;
    const newElo = currentElo + amount;
    await updateDoc(userRef, { eloScore: newElo });

    await logAdminAction({
      actorUid, actorRole, targetUid,
      action: 'INJECT_ELO',
      previousState: { eloScore: currentElo },
      nextState: { eloScore: newElo },
      result: 'success',
    });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/**
 * FALSEFIX-004: Log silme artık users/{uid}/logs subcollection üzerinden yapılıyor.
 * Güvenlik: Sadece claims bazlı super admin çağırabilir (caller kontrolü hook'ta).
 */
export async function clearUserLogs(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const logsRef = collection(db, 'users', targetUid, 'logs');
    const snap = await getDocs(logsRef);

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    await logAdminAction({ actorUid, actorRole, targetUid, action: 'CLEAR_LOGS', details: { deletedCount: snap.size }, result: 'success' });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/**
 * FALSEFIX-004: Mock exam artık users/{uid}/exams subcollection'a yazılıyor.
 */
export async function pushMockWarRoomSession(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const mockExam = {
      id: `WR_MOCK_${Date.now()}`,
      date: new Date().toISOString(),
      mode: 'AYT',
      difficulty: 'hard',
      correct: 12, wrong: 3, empty: 0, net: 11.25,
      timeSpentSeconds: 600, accuracy: 80, items: [],
    };

    const examRef = doc(db, 'users', targetUid, 'exams', mockExam.id);
    await setDoc(examRef, mockExam);

    await logAdminAction({ actorUid, actorRole, targetUid, action: 'PUSH_MOCK_WARROOM', result: 'success' });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/**
 * FALSEFIX-004: Profil onarımı artık sadece users/{uid} dokümanını kullanıyor.
 * userData koleksiyonu referansı kaldırıldı.
 */
export async function repairProfileDoc(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(
      doc(db, 'users', targetUid),
      {
        uid: targetUid,
        role: 'standard', // FALSEFIX-005: UID karşılaştırması kaldırıldı — claims yönetir
        eloScore: 1200,
        repairedAt: new Date().toISOString(),
        repairedBy: actorUid,
      },
      { merge: true }
    );

    await logAdminAction({ actorUid, actorRole, targetUid, action: 'REPAIR_PROFILE', result: 'success' });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

// ─── Backward Compat Export ───────────────────────────────────────────────────

/** @deprecated isSuperAdminClaims kullanın */
export { isSuperAdminClaims };

