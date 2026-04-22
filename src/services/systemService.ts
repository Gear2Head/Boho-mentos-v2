/**
 * AMAÇ: Sistem genelindeki global ayarların yönetimi (Bakım modu, Duyuru vs.) Firebase versiyonu
 */

import { collection, doc, getDoc, setDoc, onSnapshot, getDocs, orderBy, limit as firestoreLimit, addDoc, query } from 'firebase/firestore';
import { db } from './firebase';
import type { UserRole } from '../config/admin';

export interface SystemConfig {
  maintenanceMode: boolean;
  globalAnnouncement: string | null;
  killSwitch: {
    aiEngine: boolean;
    pushService: boolean;
  };
  apiKeys: {
    groq?: string;
    gemini?: string;
    cerebras?: string;
  };
  lastUpdatedBy?: string;
  updatedAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getConfigValue<T>(key: string): Promise<T | null> {
  try {
    const configRef = doc(db, 'system_config', key);
    const snap = await getDoc(configRef);
    if (!snap.exists()) return null;
    return snap.data().value as T;
  } catch (error) {
    return null;
  }
}

async function setConfigValue(key: string, value: unknown, actorUid: string): Promise<void> {
  const configRef = doc(db, 'system_config', key);
  await setDoc(configRef, { 
    value, 
    updated_at: new Date().toISOString(), 
    updated_by: actorUid 
  }, { merge: true });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSystemConfig(): Promise<SystemConfig | null> {
  const [maintenance, announcement, killSwitch, apiKeys] = await Promise.all([
    getConfigValue<boolean>('maintenanceMode'),
    getConfigValue<string | null>('globalAnnouncement'),
    getConfigValue<{ aiEngine: boolean, pushService: boolean }>('killSwitch'),
    getConfigValue<{ groq?: string, gemini?: string, cerebras?: string }>('apiKeys'),
  ]);
  return {
    maintenanceMode: maintenance ?? false,
    globalAnnouncement: announcement ?? null,
    killSwitch: killSwitch ?? { aiEngine: false, pushService: false },
    apiKeys: apiKeys ?? {},
  };
}

export function subscribeToSystemConfig(callback: (config: SystemConfig) => void): () => void {
  // Initial fetch
  getSystemConfig().then((c) => { if (c) callback(c); });

  // Realtime
  const configColRef = collection(db, 'system_config');
  const unsubscribe = onSnapshot(configColRef, async () => {
    const c = await getSystemConfig();
    if (c) callback(c);
  });

  return unsubscribe;
}

export async function toggleMaintenanceMode(
  actorUid: string,
  _actorRole: UserRole,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await setConfigValue('maintenanceMode', enabled, actorUid);
    await logAdminAction({ actorUid, targetUid: 'SYSTEM', action: enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE', result: 'success' });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setGlobalAnnouncement(
  actorUid: string,
  _actorRole: UserRole,
  message: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await setConfigValue('globalAnnouncement', message, actorUid);
    await logAdminAction({ actorUid, targetUid: 'SYSTEM', action: 'SET_ANNOUNCEMENT', details: { message }, result: 'success' });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateKillSwitch(
  actorUid: string,
  killSwitch: { aiEngine: boolean; pushService: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    await setConfigValue('killSwitch', killSwitch, actorUid);
    await logAdminAction({ actorUid, targetUid: 'SYSTEM', action: 'UPDATE_KILL_SWITCH', details: killSwitch, result: 'success' });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateApiKeys(
  actorUid: string,
  apiKeys: { groq?: string; gemini?: string; cerebras?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await setConfigValue('apiKeys', apiKeys, actorUid);
    await logAdminAction({ actorUid, targetUid: 'SYSTEM', action: 'UPDATE_API_KEYS', result: 'success' }); // not logging keys
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getSystemStats() {
  try {
    const usersColRef = collection(db, 'users');
    const usersSnap = await getDocs(usersColRef); // Use count() aggregated query in production
    const totalUsers = usersSnap.size;

    const logsColRef = collection(db, 'admin_logs');
    const logsSnap = await getDocs(query(logsColRef, orderBy('created_at', 'desc'), firestoreLimit(10)));
    const recentLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return { totalUsers, recentLogs };
  } catch (e) {
    return { totalUsers: 0, recentLogs: [] };
  }
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

interface AuditPayload {
  actorUid: string;
  targetUid: string;
  action: string;
  details?: Record<string, unknown>;
  result?: 'success' | 'failure';
}

export async function logAdminAction(payload: AuditPayload): Promise<void> {
  try {
    const logsColRef = collection(db, 'admin_logs');
    await addDoc(logsColRef, {
      actor_uid: payload.actorUid,
      target_uid: payload.targetUid,
      action: payload.action,
      details: payload.details ?? {},
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('[systemService] Audit log yazılamadı:', e);
  }
}
