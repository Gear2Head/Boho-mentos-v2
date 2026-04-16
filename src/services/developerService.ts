/**
 * AMAÇ: Admin/Geliştirici yetenekleri — Supabase versiyonu.
 * MANTIK: Tüm işlemler users tablosu ve entity tablolarına yapılır.
 *         firestoreSync bağımlılığı tamamen kaldırıldı.
 */

import { getSupabaseClient } from './supabaseClient';
import { logAdminAction } from './systemService';
import type { UserRole, FirestoreUser } from '../config/admin';

// ─── Kullanıcı Arama & Listeleme ──────────────────────────────────────────────

export async function searchUsers(searchTerm: string): Promise<FirestoreUser[]> {
  const sb = getSupabaseClient();

  // If term looks like a UID (long string), search by uid first
  if (searchTerm.length >= 20) {
    const { data } = await sb.from('users').select('*').eq('uid', searchTerm).limit(1);
    if (data?.length) return data as unknown as FirestoreUser[];
  }

  const lc = searchTerm.toLowerCase();
  const { data } = await sb
    .from('users')
    .select('*')
    .gte('email', lc)
    .lte('email', lc + '\uf8ff')
    .limit(20);

  return (data ?? []) as unknown as FirestoreUser[];
}

export async function getAllUsers(maxLimit = 50): Promise<FirestoreUser[]> {
  const { data } = await getSupabaseClient()
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(maxLimit);
  return (data ?? []) as unknown as FirestoreUser[];
}

// ─── Rol ve Banlama ───────────────────────────────────────────────────────────

export async function changeUserRole(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseClient()
      .from('users')
      .update({ role: newRole } as never)
      .eq('uid', targetUid);
    if (error) throw error;
    await logAdminAction({ actorUid, targetUid, action: 'CHANGE_ROLE', details: { newRole }, result: 'success' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
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
    const { error } = await getSupabaseClient()
      .from('users')
      .update({
        is_banned: isBanned,
        ban_reason: isBanned ? (reason ?? null) : null,
      } as never)
      .eq('uid', targetUid);
    if (error) throw error;
    await logAdminAction({ actorUid, targetUid, action: isBanned ? 'BAN_USER' : 'UNBAN_USER', details: { reason }, result: 'success' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Admin Log Temizleme ──────────────────────────────────────────────────────

export async function clearAdminLogs(
  actorUid: string,
  _actorRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const { count } = await getSupabaseClient().from('admin_logs').select('id', { count: 'exact', head: true });
    await getSupabaseClient().from('admin_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    await logAdminAction({ actorUid, targetUid: 'SYSTEM', action: 'CLEAR_ADMIN_LOGS', details: { deletedCount: count }, result: 'success' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── ELO Enjektör ────────────────────────────────────────────────────────────

export async function injectElo(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient();
  const { data: user } = await sb.from('users').select('elo_score').eq('uid', targetUid).single();
  if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };

  const currentElo = (user as unknown as { elo_score: number }).elo_score || 1200;
  const newElo = currentElo + amount;
  const { error } = await sb.from('users').update({ elo_score: newElo } as never).eq('uid', targetUid);
  if (error) return { success: false, error: error.message };

  await logAdminAction({ actorUid, targetUid, action: 'INJECT_ELO', details: { previousElo: currentElo, newElo }, result: 'success' });
  return { success: true };
}

// ─── Log Temizleme ────────────────────────────────────────────────────────────

export async function clearUserLogs(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  const { count, error } = await getSupabaseClient()
    .from('logs')
    .delete()
    .eq('user_id', targetUid);
  if (error) return { success: false, error: error.message };
  await logAdminAction({ actorUid, targetUid, action: 'CLEAR_LOGS', details: { deletedCount: count }, result: 'success' });
  return { success: true };
}

// ─── Mock Warroom ─────────────────────────────────────────────────────────────

export async function pushMockWarRoomSession(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  const mockExam = {
    id: `WR_MOCK_${Date.now()}`,
    date: new Date().toISOString(),
    type: 'AYT',
    total_net: 11.25,
    scores: {},
    user_id: targetUid,
    source: 'manual',
  };
  const { error } = await getSupabaseClient().from('exams').insert(mockExam as never);
  if (error) return { success: false, error: error.message };
  await logAdminAction({ actorUid, targetUid, action: 'PUSH_MOCK_WARROOM', result: 'success' });
  return { success: true };
}

// ─── Profil Onarımı ───────────────────────────────────────────────────────────

export async function repairProfileDoc(
  actorUid: string,
  _actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await getSupabaseClient()
    .from('users')
    .update({ elo_score: 1200, role: 'standard', updated_at: new Date().toISOString() } as never)
    .eq('uid', targetUid);
  if (error) return { success: false, error: error.message };
  await logAdminAction({ actorUid, targetUid, action: 'REPAIR_PROFILE', result: 'success' });
  return { success: true };
}

// ─── Backward compat ─────────────────────────────────────────────────────────

export { logAdminAction } from './systemService';
