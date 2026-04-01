/**
 * AMAÇ: Sistem genelindeki global ayarların yönetimi (Bakım modu, Duyuru vs.)
 * MANTIK: /systemConfig/settings belgesinden okur/yazar.
 */

import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { logAdminAction } from './developerService';
import { UserRole } from '../config/admin';

export interface SystemConfig {
  maintenanceMode: boolean;
  globalAnnouncement: string | null;
  lastUpdatedBy?: string;
  updatedAt?: any;
}

const CONFIG_DOC_PATH = 'systemConfig/settings';

/**
 * Global konfigürasyonu getir
 */
export async function getSystemConfig(): Promise<SystemConfig | null> {
  const d = await getDoc(doc(db, CONFIG_DOC_PATH));
  return d.exists() ? d.data() as SystemConfig : null;
}

/**
 * Konfigürasyonu canlı dinle
 */
export function subscribeToSystemConfig(callback: (config: SystemConfig) => void) {
  return onSnapshot(doc(db, CONFIG_DOC_PATH), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SystemConfig);
    }
  });
}

/**
 * Bakım Modunu Toggle Et
 */
export async function toggleMaintenanceMode(actorUid: string, actorRole: UserRole, enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, CONFIG_DOC_PATH), {
      maintenanceMode: enabled,
      lastUpdatedBy: actorUid,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await logAdminAction(actorUid, actorRole, 'SYSTEM', enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Global Duyuru Gönder
 */
export async function setGlobalAnnouncement(actorUid: string, actorRole: UserRole, message: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, CONFIG_DOC_PATH), {
      globalAnnouncement: message,
      lastUpdatedBy: actorUid,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await logAdminAction(actorUid, actorRole, 'SYSTEM', 'SET_ANNOUNCEMENT', { message });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Sistem İstatistiklerini Getir
 */
export async function getSystemStats() {
    const usersSnap = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnap.size;
    
    // Basit bir aktiflik ölçüsü (son 24 saatte login olanlar)
    const activeLimit = new Date();
    activeLimit.setHours(activeLimit.getHours() - 24);
    
    const logsSnap = await getDocs(query(collection(db, 'adminLogs'), limit(10)));
    const recentLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
        totalUsers,
        recentLogs
    };
}
