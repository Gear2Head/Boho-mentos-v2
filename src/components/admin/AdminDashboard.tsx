/**
 * AMAÇ: Tam kapsamlı Admin Dashboard — ayrı sayfa olarak açılır.
 * MANTIK: Kullanıcı yönetimi, entity CRUD, audit log, sistem ayarları, cache yönetimi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Users, Database, Shield, Settings, Activity,
  Trash2, Edit3, Eye, RefreshCw, Loader2, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, X, Save, MessageSquare, BookOpen,
  CalendarDays, Target, Brain, Zap, FileText, Clock, Eraser, Bell
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { isSuperAdminClaims } from '../../config/admin';
import type { FirestoreUser, UserRole } from '../../config/admin';
import * as devService from '../../services/developerService';
import type { EntityTable } from '../../services/developerService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

import { DataIntegrationPanel } from './DataIntegrationPanel';
import { PushNotificationPanel } from './PushNotificationPanel';

type AdminTab = 'users' | 'my_data' | 'data_integration' | 'entities' | 'audit' | 'system' | 'push_notifications' | 'analytics';

const ENTITY_LABELS: Record<EntityTable, { label: string; icon: React.ReactNode }> = {
  logs: { label: 'Çalışma Logları', icon: <FileText size={14} /> },
  exams: { label: 'Deneme Sınavları', icon: <Target size={14} /> },
  chatHistory: { label: 'Koç Mesajları', icon: <MessageSquare size={14} /> },
  agendaEntries: { label: 'Ajanda Kayıtları', icon: <CalendarDays size={14} /> },
  focusSessions: { label: 'Odaklanma Oturumları', icon: <Clock size={14} /> },
  failedQuestions: { label: 'Hatalı Sorular', icon: <AlertTriangle size={14} /> },
  directiveHistory: { label: 'Direktif Geçmişi', icon: <Brain size={14} /> },
  flashcards: { label: 'Flashcard\'lar', icon: <BookOpen size={14} /> },
  conversations: { label: 'Sohbet Odaları', icon: <MessageSquare size={14} /> },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard({ onBack }: Props) {
  const authUser = useAppStore(s => s.authUser);
  const hasAccess = authUser != null && isSuperAdminClaims(
    (authUser as { claims?: Record<string, unknown> }).claims ?? null,
    authUser.email
  );

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center text-red-400">
          <Shield size={64} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Yetkisiz Erişim</h2>
          <p className="mt-2 opacity-60">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
          <button onClick={onBack} className="mt-6 px-6 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">Geri Dön</button>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Kullanıcılar', icon: <Users size={16} /> },
    { id: 'my_data', label: 'Kendi Verim', icon: <Database size={16} /> },
    { id: 'data_integration', label: 'Veri & Entegrasyon', icon: <Database size={16} /> },
    { id: 'entities', label: 'Entity Yönetimi', icon: <Edit3 size={16} /> },
    { id: 'audit', label: 'Denetim Logları', icon: <Activity size={16} /> },
    { id: 'system', label: 'Sistem', icon: <Settings size={16} /> },
    { id: 'push_notifications', label: 'Push & Bildirim', icon: <Bell size={16} /> },
    { id: 'analytics', label: 'Analiz', icon: <Activity size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-zinc-200 z-[200] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800/60 bg-[#111] shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-red-400" />
          <h1 className="text-lg font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-mono">SUPER_ADMIN</span>
        <span className="ml-auto text-xs text-zinc-500">{authUser?.email}</span>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 px-6 py-2 border-b border-zinc-800/40 bg-[#0d0d0d] shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'users' && <UsersPanel actorUid={authUser!.uid} showToast={showToast} />}
        {activeTab === 'my_data' && <MyDataPanel actorUid={authUser!.uid} showToast={showToast} />}
        {activeTab === 'data_integration' && <DataIntegrationPanel />}
        {activeTab === 'entities' && <EntitiesPanel actorUid={authUser!.uid} showToast={showToast} />}
        {activeTab === 'audit' && <AuditPanel />}
        {activeTab === 'system' && <SystemPanel actorUid={authUser!.uid} showToast={showToast} />}
        {activeTab === 'push_notifications' && <PushNotificationPanel />}
        {activeTab === 'analytics' && <AnalyticsPanel />}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 z-[300] ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-zinc-700 text-zinc-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : toast.type === 'error' ? <AlertTriangle size={16} /> : <Activity size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Users Panel ──────────────────────────────────────────────────────────────

function UsersPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    const res = query.length >= 3 ? await devService.searchUsers(query) : await devService.getAllUsers(100);
    setUsers(res);
    setLoading(false);
  };

  const pagedUsers = users.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(users.length / pageSize);

  const loadUserDetail = async (uid: string) => {
    setDetailLoading(true);
    const { user, counts, error } = await devService.fetchUserFullProfile(uid);
    if (error) { showToast('error', error); setDetailLoading(false); return; }
    setSelectedUser(user);
    setSelectedCounts(counts);
    setDetailLoading(false);
  };

  const handleAction = async (fn: () => Promise<{ success: boolean; error?: string }>, msg: string) => {
    const res = await fn();
    if (res.success) { showToast('success', msg); if (selectedUser) loadUserDetail(selectedUser.uid); }
    else showToast('error', res.error ?? 'Hata');
  };

  useEffect(() => { search(); }, []);
  useEffect(() => { setPage(1); }, [query, users.length]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* User List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Email, UID veya isim ara..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-600"
          />
          <button onClick={search} className="px-4 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>

        <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-1">
          {pagedUsers.map((u: any) => (
            <button
              key={u.uid}
              onClick={() => loadUserDetail(u.uid)}
              className={`w-full text-left p-3 rounded-xl transition text-sm ${
                selectedUser?.uid === u.uid ? 'bg-zinc-800 border border-zinc-700 shadow-inner' : 'hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <div className="font-bold truncate">{u.display_name || u.email?.split('@')[0] || u.uid.slice(0, 12)}</div>
              <div className="text-[10px] text-zinc-500 truncate mb-2">{u.email}</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400">ELO: {u.elo_score ?? '-'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter ${
                  u.is_banned ? 'bg-red-500/20 text-red-500' : 
                  u.role === 'super_admin' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {u.is_banned ? 'Banned' : u.role.split('_')[0]}
                </span>
              </div>
            </button>
          ))}
          {users.length === 0 && !loading && <p className="text-center text-zinc-600 py-8 text-sm">Kullanıcı bulunamadı</p>}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SAYFA {page} / {totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* User Detail */}
      <div className="lg:col-span-2">
        {detailLoading && <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-zinc-600" /></div>}
        {!detailLoading && selectedUser && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.display_name || 'İsimsiz'}</h3>
                  <p className="text-sm text-zinc-400">{selectedUser.email}</p>
                  <p className="text-xs text-zinc-600 font-mono mt-1">{selectedUser.uid}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedUser.role === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                    selectedUser.role === 'banned' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>{selectedUser.role}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <Stat label="ELO" value={selectedUser.elo_score ?? 1200} />
                <Stat label="Streak" value={`${selectedUser.streak_days ?? 0} gün`} />
                <Stat label="Tema" value={selectedUser.theme ?? 'dark'} />
                <Stat label="Mode" value={selectedUser.is_passive_mode ? 'Pasif' : 'Aktif'} />
              </div>
            </div>

            {/* Entity Counts */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h4 className="font-bold text-sm mb-4 text-zinc-400">Veri Sayıları</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(selectedCounts).map(([table, count]) => (
                  <div key={table} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/50">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      {ENTITY_LABELS[table as EntityTable]?.icon}
                      {ENTITY_LABELS[table as EntityTable]?.label ?? table}
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Actions */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h4 className="font-bold text-sm mb-4 text-zinc-400">Eylemler</h4>
              <div className="flex flex-wrap gap-2">
                <ActionBtn label="ELO +100" color="emerald" onClick={() => handleAction(
                  () => devService.injectElo(actorUid, 'super_admin', selectedUser.uid, 100), '+100 ELO enjekte edildi'
                )} />
                <ActionBtn label="ELO -100" color="orange" onClick={() => handleAction(
                  () => devService.injectElo(actorUid, 'super_admin', selectedUser.uid, -100), '-100 ELO düşürüldü'
                )} />
                <ActionBtn label="Profil Onar" color="blue" onClick={() => handleAction(
                  () => devService.repairProfileDoc(actorUid, 'super_admin', selectedUser.uid), 'Profil onarıldı'
                )} />
                <ActionBtn label="Streak Kurtar" color="emerald" onClick={() => {
                  const days = prompt('Streak günü (sayı):');
                  if (!days || isNaN(Number(days))) return;
                  handleAction(() => devService.injectStreak(actorUid, 'super_admin', selectedUser.uid, Number(days)), 'Streak kurtarıldı');
                }} />
                <ActionBtn label="Logları Sil" color="red" onClick={() => {
                  if (!confirm('Tüm loglar silinecek!')) return;
                  handleAction(() => devService.clearUserLogs(actorUid, 'super_admin', selectedUser.uid), 'Tüm loglar silindi');
                }} />
                <ActionBtn label="Sohbetleri Sil" color="red" onClick={() => {
                  if (!confirm('Tüm sohbetler silinecek!')) return;
                  handleAction(() => devService.bulkDeleteEntities(actorUid, selectedUser.uid, 'conversations', true), 'Tüm sohbetler silindi');
                }} />
                <ActionBtn label="TÜM VERİYİ SIFIRLA" color="red" onClick={async () => {
                  if (!confirm('KRİTİK UYARI: Kullanıcının TÜM verileri (loglar, denemeler, chat, ajanda) kalıcı olarak silinecek! Bu işlem geri alınamaz.')) return;
                  for (const table of devService.ENTITY_TABLE_LIST) {
                    await devService.bulkDeleteEntities(actorUid, selectedUser.uid, table, true);
                  }
                  showToast('success', 'Kullanıcının tüm verileri temizlendi');
                  setSelectedUser(null);
                  handleSearch();
                }} />
                {!selectedUser.is_banned ? (
                  <ActionBtn label="Banla" color="red" onClick={() => {
                    const reason = prompt('Ban sebebi:');
                    if (!reason) return;
                    handleAction(() => devService.toggleBan(actorUid, 'super_admin', selectedUser.uid, true, reason), 'Kullanıcı banlandı');
                  }} />
                ) : (
                  <ActionBtn label="Ban Kaldır" color="emerald" onClick={() => handleAction(
                    () => devService.toggleBan(actorUid, 'super_admin', selectedUser.uid, false), 'Ban kaldırıldı'
                  )} />
                )}
                <ActionBtn label="Role: Admin" color="red" onClick={() => handleAction(
                  () => devService.changeUserRole(actorUid, 'super_admin', selectedUser.uid, 'super_admin'), 'Super Admin yapıldı'
                )} />
                <ActionBtn label="Role: Standard" color="zinc" onClick={() => handleAction(
                  () => devService.changeUserRole(actorUid, 'super_admin', selectedUser.uid, 'standard'), 'Standard yapıldı'
                )} />
              </div>
            </div>
          </div>
        )}
        {!detailLoading && !selectedUser && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Users size={48} className="mb-4 opacity-30" />
            <p>Detay görmek için sol panelden bir kullanıcı seç</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My Data Panel ────────────────────────────────────────────────────────────

function MyDataPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const store = useAppStore.getState();

  const entityTables: EntityTable[] = ['logs', 'exams', 'chatHistory', 'agendaEntries', 'focusSessions', 'failedQuestions', 'directiveHistory', 'flashcards'];
  const [selectedTable, setSelectedTable] = useState<EntityTable>('logs');
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJson, setEditJson] = useState('');

  const loadEntities = async (table: EntityTable) => {
    setSelectedTable(table);
    setLoading(true);
    setEditingId(null);
    const { data, error } = await devService.fetchUserEntities(actorUid, table, 100);
    if (error) showToast('error', error);
    setEntities(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğine emin misin?')) return;
    const res = await devService.deleteEntity(actorUid, actorUid, selectedTable, id, true);
    if (res.success) { showToast('success', 'Kayıt silindi'); loadEntities(selectedTable); }
    else showToast('error', res.error ?? 'Silme hatası');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tüm ${ENTITY_LABELS[selectedTable].label} kayıtları kalıcı olarak silinecek! Emin misin?`)) return;
    const res = await devService.bulkDeleteEntities(actorUid, actorUid, selectedTable, true);
    if (res.success) { showToast('success', 'Tüm kayıtlar silindi'); loadEntities(selectedTable); }
    else showToast('error', res.error ?? 'Toplu silme hatası');
  };

  const startEdit = (entity: any) => {
    setEditingId(entity.id);
    // Filter out meta fields for cleaner editing
    const { id, user_id, created_at, updated_at, deleted_at, device_id, ...rest } = entity;
    setEditJson(JSON.stringify(rest, null, 2));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const updates = JSON.parse(editJson);
      const res = await devService.updateEntity(actorUid, actorUid, selectedTable, editingId, updates);
      if (res.success) { showToast('success', 'Kayıt güncellendi'); setEditingId(null); loadEntities(selectedTable); }
      else showToast('error', res.error ?? 'Güncelleme hatası');
    } catch {
      showToast('error', 'Geçersiz JSON formatı');
    }
  };

  const clearCache = () => {
    const count = devService.clearAiCache();
    showToast('success', `${count} önbellek girişi temizlendi`);
  };

  useEffect(() => { loadEntities('logs'); }, []);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Cloud'dan Çek" color="blue" onClick={async () => {
          try {
            
            const forceSync = async () => null; // Mock
            const data = await forceSync();

            if (data) {
              showToast('success', 'Cloud verileri çekildi ve store güncellendi');
              // Reload current table
              loadEntities(selectedTable);
            } else showToast('info', 'Cloud\'da veri bulunamadı');
          } catch (e: any) { showToast('error', e.message); }
        }} />
        <ActionBtn label="AI Önbellek Temizle" color="orange" onClick={clearCache} icon={<Eraser size={14} />} />
        <ActionBtn label="Sync Kuyruğu Temizle" color="orange" onClick={() => {
          localStorage.removeItem('boho_sync_queue');
          showToast('success', 'Sync kuyruğu temizlendi');
        }} />
      </div>

      {/* Table Selector */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {entityTables.map(table => (
          <button
            key={table}
            onClick={() => loadEntities(table)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedTable === table ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:bg-zinc-900'
            }`}
          >
            {ENTITY_LABELS[table].icon}
            {ENTITY_LABELS[table].label}
            {selectedTable === table && <span className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">{entities.length}</span>}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-400">{ENTITY_LABELS[selectedTable].label} ({entities.length})</h3>
        <div className="flex gap-2">
          <button onClick={() => loadEntities(selectedTable)} className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-500">
            <RefreshCw size={14} />
          </button>
          {entities.length > 0 && (
            <button onClick={handleBulkDelete} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded-lg font-medium transition">
              <Trash2 size={12} className="inline mr-1" /> Tümünü Sil
            </button>
          )}
        </div>
      </div>

      {/* Entity List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-zinc-600" /></div>
      ) : entities.length === 0 ? (
        <div className="text-center py-12 text-zinc-600 text-sm">Bu tabloda kayıt bulunamadı</div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto">
          {entities.map((entity: any) => (
            <div key={entity.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              {editingId === entity.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <textarea
                    value={editJson}
                    onChange={e => setEditJson(e.target.value)}
                    rows={12}
                    className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-600 resize-y"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">
                      <Save size={12} /> Kaydet
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:bg-zinc-700">
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-zinc-600">{entity.id?.slice(0, 16)}...</span>
                        <span className="text-[10px] text-zinc-700">{entity.created_at ? new Date(entity.created_at).toLocaleString('tr') : ''}</span>
                      </div>
                      <EntityPreview entity={entity} table={selectedTable} />
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => startEdit(entity)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-blue-400 transition">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(entity.id)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Entity Preview ───────────────────────────────────────────────────────────

function EntityPreview({ entity, table }: { entity: any; table: EntityTable }) {
  // Try to extract the most meaningful field for preview based on table type
  const payload = entity.payload ?? entity;

  switch (table) {
    case 'logs':
      return (
        <div className="text-sm">
          <span className="text-amber-400 font-medium">{payload.subject || 'Konu yok'}</span>
          <span className="text-zinc-500 ml-2">— {payload.studyMinutes ?? payload.study_minutes ?? '?'} dk</span>
          {payload.date && <span className="text-zinc-600 ml-2 text-xs">{payload.date}</span>}
        </div>
      );
    case 'exams':
      return (
        <div className="text-sm">
          <span className="text-blue-400 font-medium">{payload.type || payload.exam_type || 'Deneme'}</span>
          <span className="text-zinc-500 ml-2">Net: {payload.total_net ?? payload.totalNet ?? '?'}</span>
        </div>
      );
    case 'chatHistory':
      return (
        <div className="text-sm truncate max-w-lg">
          <span className={`font-medium ${payload.role === 'coach' ? 'text-emerald-400' : 'text-zinc-300'}`}>
            [{payload.role ?? 'user'}]
          </span>
          <span className="text-zinc-400 ml-2">{(payload.content || payload.text || '').slice(0, 120)}</span>
        </div>
      );
    case 'agendaEntries':
      return (
        <div className="text-sm">
          <span className="text-purple-400 font-medium">{payload.title || payload.subject || 'Başlıksız'}</span>
          <span className="text-zinc-500 ml-2">{payload.date}</span>
        </div>
      );
    case 'focusSessions':
      return (
        <div className="text-sm">
          <span className="text-cyan-400 font-medium">{payload.subject || 'Konu yok'}</span>
          <span className="text-zinc-500 ml-2">{payload.duration ?? payload.durationMinutes ?? '?'} dk</span>
        </div>
      );
    case 'failedQuestions':
      return (
        <div className="text-sm truncate max-w-lg">
          <span className="text-orange-400 font-medium">{payload.subject || 'Konu yok'}</span>
          <span className="text-zinc-500 ml-2">{(payload.question || payload.text || '').slice(0, 100)}</span>
        </div>
      );
    case 'directiveHistory':
      return (
        <div className="text-sm truncate max-w-lg">
          <span className="text-rose-400 font-medium">{payload.type || 'direktif'}</span>
          <span className="text-zinc-500 ml-2">{(payload.text || payload.summary || '').slice(0, 100)}</span>
        </div>
      );
    case 'flashcards':
      return (
        <div className="text-sm">
          <span className="text-yellow-400 font-medium">{(payload.front || payload.question || '').slice(0, 60)}</span>
        </div>
      );
    case 'conversations':
      return (
        <div className="text-sm">
          <span className="text-[#C17767] font-bold">{payload.title || 'Başlıksız Sohbet'}</span>
          <span className="text-zinc-500 ml-2">— {payload.lastMessage || 'Mesaj yok'}</span>
          {payload.updatedAt && <span className="text-zinc-600 ml-2 text-[10px]">{new Date(payload.updatedAt).toLocaleDateString()}</span>}
        </div>
      );
    default:
      return <pre className="text-xs text-zinc-500 truncate">{JSON.stringify(payload).slice(0, 120)}</pre>;
  }
}

// ─── Entities Panel (Browse any user) ─────────────────────────────────────────

function EntitiesPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [userId, setUserId] = useState(actorUid);
  const [selectedTable, setSelectedTable] = useState<EntityTable>('logs');
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJson, setEditJson] = useState('');
  const entityTables: EntityTable[] = ['logs', 'exams', 'chatHistory', 'agendaEntries', 'focusSessions', 'failedQuestions', 'directiveHistory', 'flashcards'];

  const loadEntities = async (table?: EntityTable) => {
    const t = table ?? selectedTable;
    setSelectedTable(t);
    setLoading(true);
    setEditingId(null);
    const { data, error } = await devService.fetchUserEntities(userId, t, 200);
    if (error) showToast('error', error);
    setEntities(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kalıcı olarak silinecek!')) return;
    const res = await devService.deleteEntity(actorUid, userId, selectedTable, id, true);
    if (res.success) { showToast('success', 'Silindi'); loadEntities(); }
    else showToast('error', res.error ?? 'Hata');
  };

  const startEdit = (entity: any) => {
    setEditingId(entity.id);
    const { id, user_id, created_at, updated_at, deleted_at, device_id, ...rest } = entity;
    setEditJson(JSON.stringify(rest, null, 2));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const updates = JSON.parse(editJson);
      const res = await devService.updateEntity(actorUid, userId, selectedTable, editingId, updates);
      if (res.success) { showToast('success', 'Güncellendi'); setEditingId(null); loadEntities(); }
      else showToast('error', res.error ?? 'Hata');
    } catch { showToast('error', 'Geçersiz JSON'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="User ID gir..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-600"
        />
        <button onClick={() => loadEntities()} className="px-4 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition text-sm font-medium">
          Yükle
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {entityTables.map(table => (
          <button
            key={table}
            onClick={() => loadEntities(table)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedTable === table ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:bg-zinc-900'
            }`}
          >
            {ENTITY_LABELS[table].icon}
            {ENTITY_LABELS[table].label}
          </button>
        ))}
      </div>

      <div className="text-xs text-zinc-500">{entities.length} kayıt bulundu</div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-zinc-600" /></div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
          {entities.map((entity: any) => (
            <div key={entity.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              {editingId === entity.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editJson}
                    onChange={e => setEditJson(e.target.value)}
                    rows={10}
                    className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-600 resize-y"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500"><Save size={12} /> Kaydet</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs">İptal</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-zinc-600">{entity.id?.slice(0, 20)}</span>
                    <span className="text-[10px] text-zinc-700 ml-2">{entity.created_at ? new Date(entity.created_at).toLocaleString('tr') : ''}</span>
                    <div className="mt-1"><EntityPreview entity={entity} table={selectedTable} /></div>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => startEdit(entity)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-blue-400"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(entity.id)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audit Panel ──────────────────────────────────────────────────────────────

function AuditPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await devService.fetchAdminLogs(50);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-400">Sistem Denetim Kayıtları</h3>
        <button onClick={load} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500"><RefreshCw size={14} /></button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-zinc-600" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center text-zinc-600 py-12 text-sm">Denetim kaydı bulunamadı</p>
      ) : (
        <div className="space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto">
          {logs.map((log: any, i: number) => (
            <div key={log.id || i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${
                log.action?.includes('DELETE') ? 'bg-red-500/10 text-red-400' :
                log.action?.includes('BAN') ? 'bg-orange-500/10 text-orange-400' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                <Activity size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-zinc-300">{log.action}</span>
                  <span className="text-zinc-600">→ {(log.target_uid || '').slice(0, 12)}</span>
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {log.created_at ? new Date(log.created_at).toLocaleString('tr') : ''}
                  <span className="ml-2 font-mono">{(log.actor_uid || '').slice(0, 8)}</span>
                </div>
                {log.details && <pre className="text-[10px] text-zinc-700 mt-1 truncate">{JSON.stringify(log.details).slice(0, 200)}</pre>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── System Panel ─────────────────────────────────────────────────────────────

function SystemPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const store = useAppStore.getState();
  const [config, setConfig] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<{ groq?: string, gemini?: string, cerebras?: string }>({ groq: '', gemini: '', cerebras: '' });
  const [killSwitch, setKillSwitch] = useState({ aiEngine: false, pushService: false });

  useEffect(() => {
    import('../../services/systemService').then(s => {
      s.getSystemConfig().then(c => {
        if(c) {
          setConfig(c);
          if(c.apiKeys) setApiKeys({ groq: c.apiKeys.groq || '', gemini: c.apiKeys.gemini || '', cerebras: c.apiKeys.cerebras || '' });
          if(c.killSwitch) setKillSwitch(c.killSwitch);
        }
      });
    });
  }, []);

  const saveApiKeys = async () => {
    const s = await import('../../services/systemService');
    const res = await s.updateApiKeys(actorUid, apiKeys);
    if(res.success) showToast('success', 'API Keyler güncellendi');
    else showToast('error', res.error ?? 'Hata');
  };

  const toggleKillSwitch = async (key: 'aiEngine' | 'pushService') => {
    const newVal = { ...killSwitch, [key]: !killSwitch[key] };
    setKillSwitch(newVal);
    const s = await import('../../services/systemService');
    const res = await s.updateKillSwitch(actorUid, newVal);
    if(res.success) showToast('success', 'Kill Switch güncellendi');
    else showToast('error', res.error ?? 'Hata');
  };


  return (
    <div className="space-y-6">
      {/* Store Snapshot */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h4 className="font-bold text-sm mb-4 text-zinc-400">Lokal Store Snapshot</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="ELO" value={store.eloScore} />
          <Stat label="Streak" value={`${store.streakDays} gün`} />
          <Stat label="Loglar" value={store.logs.length} />
          <Stat label="Denemeler" value={store.exams.length} />
          <Stat label="Mesajlar" value={store.chatHistory.length} />
          <Stat label="Ajanda" value={store.agendaEntries.length} />
          <Stat label="Odaklanma" value={store.focusSessions.length} />
          <Stat label="Flashcard" value={(store.flashcards ?? []).length} />
          <Stat label="AI İstek" value={`${store.dailyAiRequests}/50`} />
          <Stat label="Tema" value={store.theme} />
          <Stat label="Profil" value={store.profile?.name ?? '-'} />
          <Stat label="Son Güncelleme" value={store.lastLocalUpdateAt?.slice(11, 19) ?? '-'} />
        </div>
      </div>

      
        {/* Live Operations & Kill Switch */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h4 className="font-bold text-sm mb-4 text-zinc-400">Live Operations (Taskv3)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-zinc-500 uppercase">API Keys</h5>
              <div className="flex flex-col gap-2">
                <input placeholder="GROQ API KEY" value={apiKeys.groq} onChange={e => setApiKeys({...apiKeys, groq: e.target.value})} className="bg-zinc-900 border border-zinc-700 p-2 rounded text-xs" type="password" />
                <input placeholder="GEMINI API KEY" value={apiKeys.gemini} onChange={e => setApiKeys({...apiKeys, gemini: e.target.value})} className="bg-zinc-900 border border-zinc-700 p-2 rounded text-xs" type="password" />
                <input placeholder="CEREBRAS API KEY" value={apiKeys.cerebras} onChange={e => setApiKeys({...apiKeys, cerebras: e.target.value})} className="bg-zinc-900 border border-zinc-700 p-2 rounded text-xs" type="password" />
                <button onClick={saveApiKeys} className="bg-blue-600/20 text-blue-400 py-2 rounded font-bold text-xs hover:bg-blue-600/30">Keyleri Kaydet</button>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-xs font-bold text-zinc-500 uppercase">Master Kill Switch</h5>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-zinc-900 p-3 rounded border border-zinc-800">
                  <div className="text-sm text-zinc-300">AI Motoru</div>
                  <button onClick={() => toggleKillSwitch('aiEngine')} className={`px-4 py-1.5 rounded text-xs font-bold ${killSwitch.aiEngine ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {killSwitch.aiEngine ? 'KAPALI (DONDURULDU)' : 'AKTİF'}
                  </button>
                </div>
                <div className="flex justify-between items-center bg-zinc-900 p-3 rounded border border-zinc-800">
                  <div className="text-sm text-zinc-300">Push Service</div>
                  <button onClick={() => toggleKillSwitch('pushService')} className={`px-4 py-1.5 rounded text-xs font-bold ${killSwitch.pushService ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {killSwitch.pushService ? 'KAPALI (DONDURULDU)' : 'AKTİF'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Quick System Actions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h4 className="font-bold text-sm mb-4 text-zinc-400">Sistem Araçları</h4>
        <div className="flex flex-wrap gap-2">
          <ActionBtn label="AI Önbellek Temizle" color="orange" icon={<Eraser size={14} />} onClick={() => {
            const count = devService.clearAiCache();
            showToast('success', `${count} önbellek girişi temizlendi`);
          }} />
          <ActionBtn label="Sync Kuyruğu Temizle" color="orange" onClick={() => {
            localStorage.removeItem('boho_sync_queue');
            showToast('success', 'Sync kuyruğu temizlendi');
          }} />
          <ActionBtn label="Admin Loglarını Sil" color="red" onClick={async () => {
            if (!confirm('Tüm denetim logları silinecek!')) return;
            const res = await devService.clearAdminLogs(actorUid, 'super_admin');
            if (res.success) showToast('success', 'Denetim logları silindi');
            else showToast('error', res.error ?? 'Hata');
          }} />
          <ActionBtn label="IndexedDB Temizle" color="red" onClick={() => {
            if (!confirm('IndexedDB tamamen temizlenecek! Uygulama yeniden başlayacak.')) return;
            indexedDB.deleteDatabase('yks-store');
            showToast('info', '3 saniye sonra sayfa yenileniyor...');
            setTimeout(() => location.reload(), 3000);
          }} />
          <ActionBtn label="LocalStorage Temizle" color="red" onClick={() => {
            if (!confirm('LocalStorage tamamen temizlenecek!')) return;
            localStorage.clear();
            showToast('info', '3 saniye sonra sayfa yenileniyor...');
            setTimeout(() => location.reload(), 3000);
          }} />
        </div>
      </div>

      {/* Coach Memory Viewer */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h4 className="font-bold text-sm mb-4 text-zinc-400">Koç Hafızası (Coach Memory)</h4>
        <pre className="bg-black rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-auto max-h-64">
          {JSON.stringify(store.coachMemory, null, 2) || 'null'}
        </pre>
      </div>

      {/* Last Coach Directive */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h4 className="font-bold text-sm mb-4 text-zinc-400">Son Koç Direktifi</h4>
        <pre className="bg-black rounded-xl p-4 text-xs font-mono text-amber-400 overflow-auto max-h-64">
          {JSON.stringify(store.lastCoachDirective, null, 2) || 'null'}
        </pre>
      </div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const data = await devService.fetchSystemAnalytics();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-zinc-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <Activity size={32} className="text-emerald-400 mb-2" />
          <div className="text-3xl font-bold">{stats?.activeUsers24h ?? 0}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">24S Aktif</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <Target size={32} className="text-blue-400 mb-2" />
          <div className="text-3xl font-bold">{stats?.totalQuestionsSolved ?? 0}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Çözülen Soru</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <Zap size={32} className="text-amber-400 mb-2" />
          <div className="text-3xl font-bold">{stats?.systemHealth ?? '98%'}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Sistem Sağlığı</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <Database size={32} className="text-rose-400 mb-2" />
          <div className="text-3xl font-bold">{stats?.totalRecords ?? '~5k'}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Toplam Kayıt</div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h3 className="font-bold mb-6 text-zinc-400 flex items-center gap-2">
          <Activity size={16} /> Kullanıcı Elde Tutma (Retention Heatmap)
        </h3>
        {/* Mock Heatmap */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-[600px]">
             {Array.from({ length: 24 }).map((_, i) => (
               <div key={i} className="flex-1 space-y-1">
                  {Array.from({ length: 7 }).map((_, j) => {
                    const intensity = Math.floor(Math.random() * 5);
                    const colors = ['bg-zinc-800', 'bg-emerald-900/40', 'bg-emerald-700/60', 'bg-emerald-500/80', 'bg-emerald-400'];
                    return (
                      <div key={j} className={`w-full h-8 rounded ${colors[intensity]} border border-white/5`} title="Activity level"></div>
                    );
                  })}
                  <div className="text-[8px] text-zinc-600 text-center uppercase">W{i+1}</div>
               </div>
             ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
           <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-zinc-800"></div> SIFIR</div>
           <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400"></div> MAKSİMUM</div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/50">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-lg font-bold text-zinc-200">{value}</div>
    </div>
  );
}

function ActionBtn({ label, color, onClick, icon }: { label: string; color: string; onClick: () => void; icon?: React.ReactNode }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
    red: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
    zinc: 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${colorClasses[color] ?? colorClasses.zinc}`}
    >
      {icon}
      {label}
    </button>
  );
}
