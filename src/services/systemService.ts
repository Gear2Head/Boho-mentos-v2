/**
 * AMAÇ: Sistem genelindeki global ayarların yönetimi (Bakım modu, Duyuru vs.)
 * MANTIK: Supabase system_config tablosundan okur/yazar.
 *         Realtime subscription ile canlı dinleme.
 */

import { getSupabaseClient } from './supabaseClient';
import type { UserRole } from '../config/admin';

export interface SystemConfig {
  maintenanceMode: boolean;
  globalAnnouncement: string | null;
  lastUpdatedBy?: string;
  updatedAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getConfigValue<T>(key: string): Promise<T | null> {
  const { data, error } = await (getSupabaseClient() as any)
    .from('system_config')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return null;
  return data.value as T;
}

async function setConfigValue(key: string, value: unknown, actorUid: string): Promise<void> {
  await (getSupabaseClient() as any)
    .from('system_config')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: actorUid }, { onConflict: 'key' });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSystemConfig(): Promise<SystemConfig | null> {
  const [maintenance, announcement] = await Promise.all([
    getConfigValue<boolean>('maintenanceMode'),
    getConfigValue<string | null>('globalAnnouncement'),
  ]);
  return {
    maintenanceMode: maintenance ?? false,
    globalAnnouncement: announcement ?? null,
  };
}

export function subscribeToSystemConfig(callback: (config: SystemConfig) => void): () => void {
  const sb = getSupabaseClient();

  // Initial fetch
  getSystemConfig().then((c) => { if (c) callback(c); });

  // Realtime
  const channel = sb
    .channel('system-config')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_config' },
      async () => {
        const c = await getSystemConfig();
        if (c) callback(c);
      }
    )
    .subscribe();

  return () => { sb.removeChannel(channel); };
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

export async function getSystemStats() {
  const sb = getSupabaseClient() as any;
  const { count } = await sb.from('users').select('uid', { count: 'exact', head: true });
  const { data: recentLogs } = await sb.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10);
  return { totalUsers: count ?? 0, recentLogs: recentLogs ?? [] };
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
    await (getSupabaseClient() as any).from('admin_logs').insert({
      actor_uid: payload.actorUid,
      target_uid: payload.targetUid,
      action: payload.action,
      details: payload.details ?? {},
    });
  } catch (e) {
    console.error('[systemService] Audit log yazılamadı:', e);
  }
}
