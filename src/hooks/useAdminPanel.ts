/**
 * AMAÇ: AdminPanelModal (Dev Console) içerisinde kullanılacak reaktif hook.
 * MANTIK: Güvenlik, Yükleme durumları (Loaders) ve Arama/Seçme durumlarını bağlar.
 * UYARI: FALSEFIX-006 — useAuth() kaldırıldı. Auth state store'dan okunuyor.
 *         İkinci auth listener riski ortadan kalktı.
 */

import { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { isSuperAdminClaims, FirestoreUser, UserRole } from '../config/admin';
import * as devService from '../services/developerService';
import * as systemService from '../services/systemService';

export function useAdminPanel() {
  // FALSEFIX-006: useAuth() yerine store'dan direkt oku — ikinci listener açılmıyor
  const authUser = useAppStore((s) => s.authUser);
  const hasAccess = authUser != null && isSuperAdminClaims(
    // claims store'da varsa oradan, yoksa false
    (authUser as { claims?: Record<string, unknown> }).claims ?? null
  );

  const [searchResults, setSearchResults] = useState<FirestoreUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // System States
  const [systemConfig, setSystemConfig] = useState<systemService.SystemConfig | null>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const _runAction = async (actionFn: () => Promise<{ success: boolean, error?: string }>, successMsg: string) => {
    if (!hasAccess) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const res = await actionFn();
    if (res.success) {
      setSuccess(successMsg);
      // Reload user data if selected
      if (selectedUser) {
        const u = await devService.searchUsers(selectedUser.uid);
        if (u[0]) setSelectedUser(u[0]);
      }
    } else {
      setError(res.error || 'İşlem Başarısız.');
    }
    setActionLoading(false);
  };

  const search = useCallback(async (query: string) => {
    if (!hasAccess || query.length < 3) return;
    setIsSearching(true);
    try {
      const res = await devService.searchUsers(query);
      setSearchResults(res);
    } catch (e: any) {
      setError(e.message);
    }
    setIsSearching(false);
  }, [hasAccess]);

  const loadAll = useCallback(async () => {
    if (!hasAccess) return;
    setIsSearching(true);
    const res = await devService.getAllUsers(20);
    setSearchResults(res);
    setIsSearching(false);
  }, [hasAccess]);

  const actorUid = authUser?.uid ?? '';

  const changeRole = (targetUid: string, role: UserRole) => _runAction(() => devService.changeUserRole(actorUid, 'super_admin', targetUid, role), 'Kullanıcı Rolü Güncellendi.');
  const banUser = (targetUid: string, reason: string) => _runAction(() => devService.toggleBan(actorUid, 'super_admin', targetUid, true, reason), 'Kullanıcı IP/Hesap olarak Banlandı.');
  const unbanUser = (targetUid: string) => _runAction(() => devService.toggleBan(actorUid, 'super_admin', targetUid, false), 'Kullanıcı engeli kaldırıldı.');
  
  const addElo = (targetUid: string, amount: number) => _runAction(async () => {
    const res = await devService.injectElo(actorUid, 'super_admin', targetUid, amount);
    if (res.success && targetUid === actorUid) {
       // Kendi kendisine vuruyorsa frontend arayüzündeki (Dashboard) rakamı o an GÜNCELLE
       import('../store/appStore').then(({ useAppStore }) => {
          useAppStore.getState().addElo(amount);
       });
    }
    return res;
  }, `Sisteme ${amount} ELO enjekte edildi.`);

  const clearLogs = (targetUid: string) => _runAction(() => devService.clearUserLogs(actorUid, 'super_admin', targetUid), 'Kullanıcının tüm Log kayıtları tamamen silindi.');
  const mockWarRoom = (targetUid: string) => _runAction(() => devService.pushMockWarRoomSession(actorUid, 'super_admin', targetUid), 'Kullanıcı sahte (Mock) deneme sınav verisi aldı.');
  const repairProfile = (targetUid: string) => _runAction(() => devService.repairProfileDoc(actorUid, 'super_admin', targetUid), 'Zede gören veya olmayan Profil veri tabanına ZORLA yazıldı (Onarıldı).');

  /* --- SYSTEM ACTIONS --- */
  const loadSystemData = useCallback(async () => {
    if (!hasAccess) return;
    setIsStatsLoading(true);
    try {
      const [config, stats] = await Promise.all([
        systemService.getSystemConfig(),
        systemService.getSystemStats()
      ]);
      setSystemConfig(config);
      setSystemStats(stats);
    } catch (e: any) {
      setError(e.message);
    }
    setIsStatsLoading(false);
  }, [hasAccess]);

  const toggleMaintenance = (enabled: boolean) => 
    _runAction(() => systemService.toggleMaintenanceMode(actorUid, 'super_admin', enabled), 
    `Bakım Modu ${enabled ? 'AÇILDI' : 'KAPATILDI'}.`);

  const updateAnnouncement = (msg: string | null) => 
    _runAction(() => systemService.setGlobalAnnouncement(actorUid, 'super_admin', msg), 
    'Global Duyuru Güncellendi.');

  return {
    hasAccess,
    searchResults,
    selectedUser,
    setSelectedUser,
    isSearching,
    actionLoading,
    error,
    success,
    search,
    loadAll,
    changeRole,
    banUser,
    unbanUser,
    addElo,
    clearLogs,
    mockWarRoom,
    repairProfile,
    // System
    systemConfig,
    systemStats,
    isStatsLoading,
    loadSystemData,
    toggleMaintenance,
    updateAnnouncement
  };
}
