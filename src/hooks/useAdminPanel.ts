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
import { formatTimestamp, formatRelativeTime } from '../utils/formatTimestamp';

export function useAdminPanel() {
  // FALSEFIX-006: useAuth() yerine store'dan direkt oku — ikinci listener açılmıyor
  const authUser = useAppStore((s) => s.authUser);
  const hasAccess = authUser != null && isSuperAdminClaims(
    // claims store'da varsa oradan, yoksa false
    (authUser as { claims?: Record<string, unknown> }).claims ?? null,
    authUser.email
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
  
  /** FALSEFIX-007: Tüm audit loglarını temizleme */
  const clearAdminLogs = () => _runAction(() => devService.clearAdminLogs(actorUid, 'super_admin'), 'Tüm Sistem Denetim Kayıtları Silindi.');
  
  const mockWarRoom = (targetUid: string) => _runAction(() => devService.pushMockWarRoomSession(actorUid, 'super_admin', targetUid), 'Kullanıcı sahte (Mock) deneme sınav verisi aldı.');
  const repairProfile = (targetUid: string) => _runAction(() => devService.repairProfileDoc(actorUid, 'super_admin', targetUid), 'Zede gören veya olmayan Profil veri tabanına ZORLA yazıldı (Onarıldı).');

  /**
   * GÜÇ ARAÇLARI (POWER TOOLS)
   */
  const forceSyncMyData = async () => {
    if (!authUser?.uid) return;
    setActionLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const { pullFromSupabase } = await import('../services/supabaseSync');
      const data = await pullFromSupabase(authUser.uid);
      if (data) {
        useAppStore.setState({
          profile: data.profile,
          tytSubjects: data.tytSubjects,
          aytSubjects: data.aytSubjects,
          eloScore: data.eloScore,
          streakDays: data.streakDays,
          theme: data.theme,
          subjectViewMode: data.subjectViewMode,
          trophies: data.trophies || [],
          logs: data.logs,
          exams: data.exams,
          failedQuestions: data.failedQuestions,
          agendaEntries: data.agendaEntries,
          focusSessions: data.focusSessions || [],
          activeAlerts: data.activeAlerts || [],
          chatHistory: data.chatHistory || [],
          directiveHistory: data.directiveHistory || [],
          coachMemory: data.coachMemory,
          lastCoachDirective: data.lastCoachDirective,
          isPassiveMode: data.isPassiveMode,
        });
        setSuccess('Tüm verilerin buluttan başarıyla çekildi ve yerel kopya güncellendi.');
      } else {
        setError('Bulutta veri bulunamadı.');
      }
    } catch (e: any) {
      setError('Senkronizasyon hatası: ' + e.message);
    }
    setActionLoading(false);
  };

  const getCoachMemory = () => {
    const memory = useAppStore.getState().coachMemory;
    const history = useAppStore.getState().chatHistory;
    return {
      memory,
      historyCount: history.length,
      lastMessages: history.slice(-5)
    };
  };

  const resetMySubjects = async () => {
    if (!authUser?.uid || !confirm('Tüm müfredat ilerlemen sıfırlanacak! Emin misin?')) return;
    setActionLoading(true);
    try {
      const { TYT_SUBJECTS, AYT_SUBJECTS } = await import('../constants');
      const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) => 
        topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
      );
      const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) => 
        topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
      );

      useAppStore.setState({ tytSubjects: INITIAL_TYT, aytSubjects: INITIAL_AYT });
      const { pushToSupabase } = await import('../services/supabaseSync');
      await pushToSupabase(authUser.uid, { tytSubjects: INITIAL_TYT, aytSubjects: INITIAL_AYT });
      setSuccess('Müfredat verilerin fabrika ayarlarına döndürüldü.');
    } catch (e: any) {
      setError('Sıfırlama hatası: ' + e.message);
    }
    setActionLoading(false);
  };

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
    clearAdminLogs,
    mockWarRoom,
    repairProfile,
    forceSyncMyData,
    resetMySubjects,
    // System
    systemConfig,
    systemStats,
    isStatsLoading,
    loadSystemData,
    toggleMaintenance,
    updateAnnouncement,
    getCoachMemory,
    // Utils
    formatTimestamp,
    formatRelativeTime,
  };
}
