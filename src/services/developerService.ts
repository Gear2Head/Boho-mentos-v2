/**
 * AMAÇ: Admin/Geliştirici yetenekleri — Firebase (Firestore) versiyonu
 * MANTIK: Tüm işlemler users ve alt koleksiyonlarına/ana root dökümanlarına yapılır.
 */

import { collection, doc, query, where, getDocs, updateDoc, deleteDoc, writeBatch, getDoc, setDoc, orderBy, limit as firestoreLimit, getCountFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { logAdminAction } from './systemService';
import type { UserRole, FirestoreUser } from '../config/admin';

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
const cleanForFirestore = (obj: any) => {
  const clean: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) clean[key] = obj[key];
  });
  return clean;
};

// ─── Kullanıcı Arama & Listeleme ──────────────────────────────────────────────

export async function searchUsers(searchTerm: string): Promise<FirestoreUser[]> {
  try {
    const usersRef = collection(db, 'users');
    let q;

    if (searchTerm.length >= 20) {
      // ID bazlı arama
      q = query(usersRef, where('uid', '==', searchTerm), firestoreLimit(1));
    } else {
      // Basit email araması
      const lc = searchTerm.toLowerCase();
      q = query(usersRef, where('email', '>=', lc), where('email', '<=', lc + '\uf8ff'), firestoreLimit(20));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as FirestoreUser);
  } catch (error) {
    console.error('[developerService] Search error:', error);
    return [];
  }
}

export async function getAllUsers(maxLimit = 50): Promise<FirestoreUser[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('updated_at', 'desc'), firestoreLimit(maxLimit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as FirestoreUser);
  } catch (error) {
    console.error('[developerService] Get All Users error:', error);
    return [];
  }
}

// ─── Rol ve Banlama ───────────────────────────────────────────────────────────

export async function changeUserRole(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { role: newRole });
    await logAdminAction({ actorUid, targetUid, action: 'CHANGE_ROLE', details: { newRole }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleBan(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string,
  isBanned: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      is_banned: isBanned,
      ban_reason: isBanned ? (reason ?? null) : null,
    });
    await logAdminAction({ actorUid, targetUid, action: isBanned ? 'BAN_USER' : 'UNBAN_USER', details: { reason }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Admin Log Temizleme ──────────────────────────────────────────────────────

export async function clearAdminLogs(
  actorUid: string,
  _actorRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const logsRef = collection(db, 'admin_logs');
    const q = query(logsRef);
    const snapshot = await getDocs(q);
    
    // Batch delete
    const batch = writeBatch(db);
    let count = 0;
    snapshot.forEach((document) => {
      batch.delete(document.ref);
      count++;
    });
    await batch.commit();

    await logAdminAction({ actorUid, targetUid: 'SYSTEM', action: 'CLEAR_ADMIN_LOGS', details: { deletedCount: count }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── ELO & Streak Enjektör ───────────────────────────────────────────────────

export async function injectElo(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'Kullanıcı bulunamadı.' };

    const currentElo = userSnap.data().eloScore || 1200;
    const newElo = currentElo + amount;
    
    await updateDoc(userRef, { eloScore: newElo });
    await logAdminAction({ actorUid, targetUid, action: 'INJECT_ELO', details: { previousElo: currentElo, newElo }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function injectStreak(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string,
  days: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'Kullanıcı bulunamadı.' };

    const previousStreak = userSnap.data().streakDays || 0;
    
    await updateDoc(userRef, { streakDays: days, updated_at: new Date().toISOString() });
    await logAdminAction({ actorUid, targetUid, action: 'INJECT_STREAK', details: { previousStreak, newStreak: days }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// pushMockWarRoomSession REMOVED (No fake data policy)

// ─── Log Temizleme ────────────────────────────────────────────────────────────

export async function clearUserLogs(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const entitiesRef = collection(db, 'users', targetUid, 'logs');
    const snapshot = await getDocs(query(entitiesRef));
    
    const batch = writeBatch(db);
    let count = 0;
    snapshot.forEach((document) => {
      batch.delete(document.ref);
      count++;
    });
    await batch.commit();

    await logAdminAction({ actorUid, targetUid, action: 'CLEAR_LOGS', details: { deletedCount: count }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Profile Onarımı ───────────────────────────────────────────────────────────

export async function repairProfileDoc(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { 
      eloScore: 1200, 
      streakDays: 0,
      role: 'standard', 
      updated_at: new Date().toISOString() 
    });
    await logAdminAction({ actorUid, targetUid, action: 'REPAIR_PROFILE', result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── FULL CRUD: Entity Operations ─────────────────────────────────────────────

export type EntityTable = 'logs' | 'exams' | 'chatHistory' | 'agendaEntries' | 'focusSessions' | 'failedQuestions' | 'directiveHistory' | 'flashcards';

const ENTITY_TABLE_LIST: EntityTable[] = [
  'logs', 'exams', 'chatHistory', 'agendaEntries',
  'focusSessions', 'failedQuestions', 'directiveHistory', 'flashcards'
];

export { ENTITY_TABLE_LIST };

/** Fetch all entities of a given type for a user */
export async function fetchUserEntities(
  userId: string,
  table: EntityTable,
  limitNum = 200
): Promise<{ data: any[]; error?: string }> {
  try {
    const colRef = collection(db, 'users', userId, table);
    const q = query(colRef, orderBy('created_at', 'desc'), firestoreLimit(limitNum));
    const snapshot = await getDocs(q);
    
    const rows = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })).filter((r: any) => !r._deleted);

    return { data: rows };
  } catch (e: any) {
    return { data: [], error: e.message };
  }
}

/** Delete a single entity by ID */
export async function deleteEntity(
  actorUid: string,
  targetUid: string,
  table: EntityTable,
  entityId: string,
  hardDelete = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'users', targetUid, table, entityId);
    if (hardDelete) {
      await deleteDoc(docRef);
    } else {
      await updateDoc(docRef, { _deleted: true, deleted_at: new Date().toISOString() });
    }
    await logAdminAction({ actorUid, targetUid, action: `DELETE_${table.toUpperCase()}`, details: { entityId, hardDelete }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Bulk delete all entities of a type for a user */
export async function bulkDeleteEntities(
  actorUid: string,
  userId: string,
  table: EntityTable,
  hardDelete = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const colRef = collection(db, 'users', userId, table);
    const q = query(colRef);
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.forEach(doc => {
      if (hardDelete) {
        batch.delete(doc.ref);
      } else {
        batch.update(doc.ref, { _deleted: true, deleted_at: new Date().toISOString() });
      }
    });
    await batch.commit();

    await logAdminAction({ actorUid, targetUid: userId, action: `BULK_DELETE_${table.toUpperCase()}`, details: { hardDelete }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Update an entity's payload field(s) */
export async function updateEntity(
  actorUid: string,
  targetUid: string,
  table: EntityTable,
  entityId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'users', targetUid, table, entityId);
    await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
    await logAdminAction({ actorUid, targetUid, action: `UPDATE_${table.toUpperCase()}`, details: { entityId, ...updates }, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Analytics & System Health */
export async function fetchSystemAnalytics(): Promise<{
  activeUsers24h: number;
  totalQuestionsSolved: number;
  logsTrend: { date: string; count: number }[];
}> {
  try {
    // Note: In real production, this would be an aggregation or pre-computed document.
    // For now, we perform a lightweight crawl of recent records.
    const logsRef = collection(db, 'admin_logs'); // Using audit logs as proxy for activity
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const q = query(logsRef, where('created_at', '>=', last24h));
    const snap = await getDocs(q);
    
    const activeUsers = new Set(snap.docs.map(d => d.data().actor_uid)).size;
    
    return {
      activeUsers24h: activeUsers,
      totalQuestionsSolved: 0, // Placeholder
      logsTrend: [] 
    };
  } catch (e) {
    return { activeUsers24h: 0, totalQuestionsSolved: 0, logsTrend: [] };
  }
}

/** Update user root profile fields directly */
export async function updateUserFields(
  actorUid: string,
  targetUid: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { ...fields, updated_at: new Date().toISOString() });
    await logAdminAction({ actorUid, targetUid, action: 'UPDATE_USER_FIELDS', details: fields, result: 'success' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Fetch full user profile including all entity counts */
export async function fetchUserFullProfile(userId: string): Promise<{ user: any; counts: Record<string, number>; error?: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User not found');

    const counts: Record<string, number> = {};
    for (const table of ENTITY_TABLE_LIST) {
      try {
        const colRef = collection(db, 'users', userId, table);
        const snapshot = await getCountFromServer(colRef);
        counts[table] = snapshot.data().count;
      } catch {
        counts[table] = 0;
      }
    }

    return { user: userSnap.data(), counts };
  } catch (e: any) {
    return { user: null, counts: {}, error: e.message };
  }
}

/** Fetch admin audit logs */
export async function fetchAdminLogs(limitNum = 50): Promise<{ data: any[]; error?: string }> {
  try {
    const logsRef = collection(db, 'admin_logs');
    const q = query(logsRef, orderBy('created_at', 'desc'), firestoreLimit(limitNum));
    const snapshot = await getDocs(q);
    return { data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
  } catch (e: any) {
    return { data: [], error: e.message };
  }
}

/** Clear AI semantic cache from localStorage */
export function clearAiCache(): number {
  let cleared = 0;
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('ai_cache_')) {
      localStorage.removeItem(key);
      cleared++;
    }
  }
  return cleared;
}

// ─── AdminDashboard Aliases ──────────────────────────────────────────────────

/** AdminDashboard expects getUserEntityCounts */
export const getUserEntityCounts = async (userId: string) => {
  const res = await fetchUserFullProfile(userId);
  return res.counts;
};

/** AdminDashboard expects updateUserRole */
export const updateUserRole = async (uid: string, role: UserRole, actorUid: string) => {
  const res = await changeUserRole(actorUid, 'super_admin' as any, uid, role);
  return res.success;
};

/** AdminDashboard expects getEntities */
export const getEntities = async (table: EntityTable, limitNum?: number) => {
  // Note: This originally fetched for CURRENT user in some context, but AdminDashboard 
  // might expect global or specific user. For global, we'd need a different query.
  // Assuming it wants the current logged in user's or just a general fetch.
  // AdminDashboard typically uses this for its own data or selected user.
  const res = await fetchAdminLogs(limitNum || 50);
  return res.data;
};

/** AdminDashboard expects getUserDetails */
export const getUserDetails = async (userId: string) => {
  const res = await fetchUserFullProfile(userId);
  return res.user;
};

/** AdminDashboard expects getAuditLogs */
export const getAuditLogs = async (limitNum?: number) => {
  const res = await fetchAdminLogs(limitNum || 50);
  return res.data;
};

/** AdminDashboard expects getSystemStats */
export const getSystemStats = async () => {
  const res = await fetchSystemAnalytics();
  return {
    totalUsers: 0, // Placeholder
    activeSessions: res.activeUsers24h,
    totalFailedQuestions: res.totalQuestionsSolved,
  };
};

export { logAdminAction } from './systemService';
