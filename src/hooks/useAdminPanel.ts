/**
 * AMAÇ: AdminPanelModal (Dev Console) içerisinde kullanılacak reaktif hook.
 * MANTIK: Güvenlik, Yükleme durumları (Loaders) ve Arama/Seçme durumlarını bağlar.
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { isSuperAdmin, FirestoreUser, UserRole } from '../config/admin';
import * as devService from '../services/developerService';

export function useAdminPanel() {
  const { user } = useAuth(); // from app auth store wrapper
  const hasAccess = user && isSuperAdmin(user.uid);

  const [searchResults, setSearchResults] = useState<FirestoreUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const changeRole = (targetUid: string, role: UserRole) => _runAction(() => devService.changeUserRole(user.uid, 'super_admin', targetUid, role), 'Kullanıcı Rolü Güncellendi.');
  const banUser = (targetUid: string, reason: string) => _runAction(() => devService.toggleBan(user.uid, 'super_admin', targetUid, true, reason), 'Kullanıcı IP/Hesap olarak Banlandı.');
  const unbanUser = (targetUid: string) => _runAction(() => devService.toggleBan(user.uid, 'super_admin', targetUid, false), 'Kullanıcı engeli kaldırıldı.');
  
  const addElo = (targetUid: string, amount: number) => _runAction(() => devService.injectElo(user.uid, 'super_admin', targetUid, amount), `Sisteme ${amount} ELO enjekte edildi.`);
  const clearLogs = (targetUid: string) => _runAction(() => devService.clearUserLogs(user.uid, 'super_admin', targetUid), 'Kullanıcının tüm Log kayıtları tamamen silindi.');
  const mockWarRoom = (targetUid: string) => _runAction(() => devService.pushMockWarRoomSession(user.uid, 'super_admin', targetUid), 'Kullanıcı sahte (Mock) deneme sınav verisi aldı.');

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
    mockWarRoom
  };
}
