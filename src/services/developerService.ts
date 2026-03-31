/**
 * AMAÇ: Geliştirici (Admin) Yetenekleri İçin Firebase Servisi
 * MANTIK: Güvenlik kuralları (Backend) bu işlemleri doğrular, burada frontend tetikleyicileri yer alır.
 */

import { doc, getDoc, getDocs, updateDoc, collection, query, where, limit, orderBy, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SUPER_ADMIN_UID, isSuperAdmin, canManageUser, UserRole, FirestoreUser } from '../config/admin';

/* --- LOGGING --- */
export async function logAdminAction(actorUid: string, actorRole: UserRole, targetUid: string, action: string, details?: any) {
  try {
    const logRef = doc(collection(db, 'adminLogs'));
    await setDoc(logRef, {
      actorUid,
      actorRole,
      targetUid,
      action,
      details: details || {},
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Audit layera yazılamadı", e);
  }
}

/* --- KULLANICI ARAMA & LISTELEME --- */
export async function searchUsers(searchTerm: string): Promise<FirestoreUser[]> {
  // UID tam eşleşmesi deneriz
  if (searchTerm.length >= 20) {
    const d = await getDoc(doc(db, 'users', searchTerm));
    if (d.exists()) return [d.data() as FirestoreUser];
  }

  // E-mail prefix araması
  const q = query(
    collection(db, 'users'), 
    where('email', '>=', searchTerm.toLowerCase()),
    where('email', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(20)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as FirestoreUser);
}

export async function getAllUsers(maxLimit = 50): Promise<FirestoreUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(maxLimit));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as FirestoreUser);
}

/* --- ROL VE BANNLAMA YÖNETİMİ --- */
export async function changeUserRole(actorUid: string, actorRole: UserRole, targetUid: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  if (targetUid === SUPER_ADMIN_UID) return { success: false, error: 'Sistem Yöneticisine dokunulamaz.' };
  if (!canManageUser(actorRole, newRole)) return { success: false, error: 'Bu rütbe için yetkin yok.' };

  try {
    const updatePayload: any = { role: newRole };
    if (newRole === 'developer') {
      updatePayload.developerGrantedBy = actorUid;
      updatePayload.developerGrantedAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'users', targetUid), updatePayload);
    await logAdminAction(actorUid, actorRole, targetUid, 'CHANGE_ROLE', { newRole });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleBan(actorUid: string, actorRole: UserRole, targetUid: string, isBanned: boolean, reason?: string): Promise<{ success: boolean; error?: string }> {
  if (targetUid === SUPER_ADMIN_UID) return { success: false, error: 'Sistem Yöneticisi banlanamaz.' };
  
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      isBanned,
      banReason: isBanned ? reason : null,
      bannedAt: isBanned ? new Date().toISOString() : null,
      bannedBy: isBanned ? actorUid : null
    });
    await logAdminAction(actorUid, actorRole, targetUid, isBanned ? 'BAN_USER' : 'UNBAN_USER', { reason });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* --- TEHLİKELİ VERİ İŞLEMLERİ --- */
// Sisteme ELO puanı ekler
export async function injectElo(actorUid: string, actorRole: UserRole, targetUid: string, amount: number): Promise<{ success: boolean; error?: string }> {
  try {
    const ud = await getDoc(doc(db, 'userData', targetUid));
    if (!ud.exists()) return { success: false, error: 'Kullanıcı veri dosyası yok.' };
    
    // update state in doc
    const currentElo = ud.data().eloScore || 1200;
    await updateDoc(doc(db, 'userData', targetUid), { eloScore: currentElo + amount });
    await updateDoc(doc(db, 'users', targetUid), { eloScore: currentElo + amount }); // cache sync
    
    await logAdminAction(actorUid, actorRole, targetUid, 'INJECT_ELO', { amount });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function clearUserLogs(actorUid: string, actorRole: UserRole, targetUid: string): Promise<{ success: boolean; error?: string }> {
  if (!isSuperAdmin(actorUid)) return { success: false, error: 'Sadece Super Admin silebilir.' };
  try {
    await updateDoc(doc(db, 'userData', targetUid), { logs: [] });
    await updateDoc(doc(db, 'users', targetUid), { totalLogs: 0 }); // cache sync
    await logAdminAction(actorUid, actorRole, targetUid, 'CLEAR_LOGS');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Sahte/Mock Sınav Pushlama
export async function pushMockWarRoomSession(actorUid: string, actorRole: UserRole, targetUid: string): Promise<{ success: boolean; error?: string }> {
   try {
     const ud = await getDoc(doc(db, 'userData', targetUid));
     if (!ud.exists()) return { success: false, error: 'Kullanıcı veri dökümanı yok.' };
     
     const mockExam = {
       id: `WR_MOCK_${Date.now()}`,
       date: new Date().toISOString(),
       mode: 'AYT',
       difficulty: 'hard',
       correct: 12, wrong: 3, empty: 0, net: 11.25, timeSpentSeconds: 600, accuracy: 80, items: []
     };

     const exams = ud.data().exams || [];
     exams.push(mockExam);
     await updateDoc(doc(db, 'userData', targetUid), { exams });
     await updateDoc(doc(db, 'users', targetUid), { totalExams: exams.length }); // cache sync

     await logAdminAction(actorUid, actorRole, targetUid, 'PUSH_MOCK_WARROOM');
     return { success: true };
   } catch (e: any) {
     return { success: false, error: e.message };
   }
}

// PROFİL ONARIM (Zorla Veri Ekleme)
export async function repairProfileDoc(actorUid: string, actorRole: UserRole, targetUid: string): Promise<{ success: boolean; error?: string }> {
    try {
      // userData doc
      await setDoc(doc(db, "userData", targetUid), {
        eloScore: 1200,
        createdAt: serverTimestamp()
      }, { merge: true });
      
      // users doc garanti
      await setDoc(doc(db, "users", targetUid), {
        uid: targetUid,
        role: targetUid === SUPER_ADMIN_UID ? 'super_admin' : 'standard',
      }, { merge: true });
      
      await logAdminAction(actorUid, actorRole, targetUid, 'REPAIR_PROFILE');
      return { success: true };
    } catch(e: any) {
      return { success: false, error: e.message };
    }
}
