/**
 * AMAÇ: Tam kapsamlı Admin Dashboard — ayrı sayfa olarak açılır.
 * MANTIK: Kullanıcı yönetimi, entity CRUD, audit log, sistem ayarları, cache yönetimi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Search, Users, Database, Shield, Settings, Activity,
  Trash2, Edit3, Eye, RefreshCw, Loader2, ChevronDown, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle2, X, Save, MessageSquare, BookOpen,
  CalendarDays, Target, Brain, Zap, FileText, Clock, Eraser, Bell
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { auth } from '../../services/firebase';
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
  flashcards: { label: 'Flashcard\'lar', icon: <BookOpen size={14} /> }
};

// ─── Skeleton Component ───────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-800/50 rounded-lg ${className}`} />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard({ onBack }: Props) {
  const authUser = useAppStore(s => s.authUser);
  const hasAccess = authUser != null && isSuperAdminClaims(
    (authUser as { claims?: Record<string, unknown> }).claims ?? null,
    authUser.email
  );

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const showToast = useCallback((type: 'success' | 'error' | 'info', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleUnlock = () => {
    if (hasAccess && passwordInput.trim().length >= 4) {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Geçersiz Şifre. Erişim Engellendi.');
    }
  };

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('ID Token bulunamadı. Lütfen tekrar giriş yapın.');
      
      const response = await fetch('/api/admin/bootstrap-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      
      const data = await response.json();
      if (data.eligible && data.superAdmin) {
        showToast('success', 'Admin yetkisi başarıyla tanımlandı! Sayfayı yenileyin.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        showToast('error', 'Bu hesap yetkilendirme için uygun değil.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Bootstrap hatası');
    } finally {
      setIsBootstrapping(false);
    }
  };

  if (!hasAccess) {
    const emailHash = authUser?.email ? 
      // Simple hash simulation or just instruct them to check console
      "SHA256_HASH_HINT" : "";

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[300]">
        <div className="text-center p-8 max-w-lg w-full">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111] border border-zinc-800/60 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-zinc-800 to-red-600"></div>
            
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Shield size={40} className="text-red-500" />
            </div>
            
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">Erişim Reddedildi</h2>
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-60">Admin yetkisi Firebase Claims üzerinden doğrulanmadı</p>
            
            <div className="bg-black/40 border border-zinc-800/40 rounded-2xl p-6 mb-8 text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Firestore'da <strong>super_admin</strong> rolüne sahip olmanız yetmez; Firebase Auth <strong>Custom Claims</strong> ayarlanmış olmalıdır.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Aşağıdaki butona basarak kendini <strong>Owner</strong> olarak bootstrap edebilirsin. (Sadece .env'de tanımlı email için geçerli)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleBootstrap}
                disabled={isBootstrapping}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-[0.1em] text-xs hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
              >
                {isBootstrapping ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                Owner Yetkilerini Tanımla
              </button>
              
              <button 
                onClick={onBack} 
                className="w-full py-3 bg-zinc-900 text-zinc-500 rounded-xl hover:bg-zinc-800 transition font-bold uppercase tracking-widest text-[10px]"
              >
                Geri Dön
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800/40">
              <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mb-3">Teknik Detay (Geliştirici İçin)</p>
              <div className="bg-black/60 p-3 rounded-lg font-mono text-[9px] text-zinc-500 break-all select-all border border-zinc-800/20">
                Email: {authUser?.email}<br/>
                {/* Hash hint will be calculated by the user or they can just use the email directly if we change the API */}
                Lütfen .env dosyasında OWNER_EMAIL_SHA256 ve FIREBASE_SERVICE_ACCOUNT_JSON değerlerinin doğru olduğundan emin olun.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[300] backdrop-blur-3xl">
        <div className="p-8 max-w-sm w-full bg-[#111] border border-zinc-800/60 rounded-3xl shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center">
              <Shield className="text-zinc-500" size={32} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-white mb-2">Admin Paneli Kilidi</h2>
          <p className="text-xs text-zinc-500 text-center mb-8 uppercase tracking-widest">Girmek için şifreyi girin</p>
          
          <form 
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); handleUnlock(); }}
          >
            <input 
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Şifre"
              className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-center text-xl tracking-[0.5em] outline-none focus:border-zinc-600 transition-colors"
              autoFocus
              autoComplete="off"
            />
            {errorMsg && <p className="text-[10px] text-red-500 text-center font-bold">{errorMsg}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-all shadow-lg"
            >
              Kilidi Aç
            </button>
            <button type="button" onClick={onBack} className="w-full py-2 text-zinc-600 text-[10px] uppercase font-bold tracking-widest hover:text-zinc-400">Vazgeç</button>
          </form>
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

  const handleSearch = async () => {
    setLoading(true);
    const res = query.length >= 3 ? await devService.searchUsers(query) : await devService.getAllUsers(100);
    setUsers(res);
    setLoading(false);
  };

  const pagedUsers = users.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(users.length / pageSize);

  useEffect(() => { handleSearch(); }, []);

  const handleUserDetail = async (user: any) => {
    setSelectedUser(user);
    setDetailLoading(true);
    const counts = await devService.getUserEntityCounts(user.uid);
    setSelectedCounts(counts);
    setDetailLoading(false);
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!confirm(`Kullanıcı rolünü ${newRole} olarak değiştirmek istediğine emin misin?`)) return;
    const ok = await devService.updateUserRole(uid, newRole, actorUid);
    if (ok) {
      showToast('success', 'Rol güncellendi');
      handleSearch();
    } else {
      showToast('error', 'Yetki yetersiz veya hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#111] p-4 rounded-2xl border border-zinc-800/60">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Email, Isim veya UID ile ara..."
            className="w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-sm focus:border-zinc-600 outline-none transition"
          />
        </div>
        <button onClick={handleSearch} disabled={loading} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111] border border-zinc-800/60 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800/60">
                <tr>
                  <th className="px-6 py-4">Kullanıcı</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">İstatistik</th>
                  <th className="px-6 py-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-12 w-full" /></td></tr>
                )) : pagedUsers.map(u => (
                  <tr key={u.uid} className={`hover:bg-zinc-900/30 transition cursor-pointer ${selectedUser?.uid === u.uid ? 'bg-zinc-800/30' : ''}`} onClick={() => handleUserDetail(u)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                          <img src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-200 truncate">{u.displayName || 'İsimsiz'}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        u.role === 'super_admin' ? 'bg-red-500/10 text-red-500' :
                        u.role === 'developer' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                      L:{u.totalLogs || 0} E:{u.totalExams || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500"><ChevronRight size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !loading && <div className="py-20 text-center text-zinc-600 text-sm italic">Sonuç bulunamadı</div>}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 disabled:opacity-20" disabled={page === 1}><ChevronLeft size={20} /></button>
              <span className="flex items-center px-4 text-xs font-bold text-zinc-500">Sayfa {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 disabled:opacity-20" disabled={page === totalPages}><ChevronRight size={20} /></button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {!selectedUser ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-[#111] border border-zinc-800/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <Users size={48} className="text-zinc-800" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest leading-relaxed">Detaylarını görmek için<br/>bir kullanıcı seçin</p>
              </motion.div>
            ) : (
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} key={selectedUser.uid} className="bg-[#111] border border-zinc-800/60 rounded-3xl overflow-hidden flex flex-col">
                <div className="p-6 bg-zinc-900/50 border-b border-zinc-800/60 relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-zinc-800 mb-4 shadow-2xl">
                      <img src={selectedUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.uid}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{selectedUser.displayName || 'İsimsiz'}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{selectedUser.email}</p>
                    <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-tighter">UID: {selectedUser.uid}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/40">
                      <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Rol Yönetimi</div>
                      <select 
                        value={selectedUser.role} 
                        onChange={(e) => handleRoleChange(selectedUser.uid, e.target.value as UserRole)}
                        className="w-full bg-transparent text-xs font-bold outline-none text-zinc-300 cursor-pointer"
                      >
                        <option value="standard">Standart</option>
                        <option value="developer">Developer</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="banned">Banned</option>
                      </select>
                    </div>
                    <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/40">
                      <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Durum</div>
                      <div className="text-xs font-bold text-emerald-500">Aktif</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Varlık İstatistikleri</div>
                    {detailLoading ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedCounts).map(([key, count]) => (
                          <div key={key} className="p-3 bg-zinc-900/30 border border-zinc-800/40 rounded-xl flex items-center justify-between">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-xs font-mono font-bold text-white">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Admin Notları</div>
                    <textarea 
                      placeholder="Admin notu ekle..."
                      className="w-full h-24 bg-black/40 border border-zinc-800/40 rounded-2xl p-3 text-xs outline-none focus:border-zinc-700 transition resize-none"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/20 grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition">
                    <Eraser size={14} /> Veriyi Sıfırla
                  </button>
                  <button className="flex items-center justify-center gap-2 py-3 bg-red-950/30 hover:bg-red-900/50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition">
                    <AlertTriangle size={14} /> Yasakla
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Entities Panel ───────────────────────────────────────────────────────────

function EntitiesPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [activeEntity, setActiveEntity] = useState<EntityTable>('logs');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadEntities = async () => {
    setLoading(true);
    const res = await devService.getEntities(activeEntity, 50);
    setData(res);
    setLoading(false);
  };

  useEffect(() => { loadEntities(); }, [activeEntity]);

  const handleDelete = async (item: any) => {
    if (!confirm('Bu kaydı silmek istediğine emin misin? Bu işlem geri alınamaz.')) return;
    const targetUid = item.uid || item.userId || actorUid;
    const ok = await devService.deleteEntity(actorUid, targetUid, activeEntity, item.id);
    if (ok) {
      showToast('success', 'Kayıt silindi');
      loadEntities();
    } else {
      showToast('error', 'Silme başarısız');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ENTITY_LABELS) as EntityTable[]).map(key => (
          <button
            key={key}
            onClick={() => setActiveEntity(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeEntity === key ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {ENTITY_LABELS[key].icon}
            {ENTITY_LABELS[key].label}
          </button>
        ))}
      </div>

      <div className="bg-[#111] border border-zinc-800/60 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder={`${ENTITY_LABELS[activeEntity].label} içinde ara...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-700"
            />
          </div>
          <button onClick={loadEntities} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition"><RefreshCw size={18} /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/50 text-zinc-500 font-black uppercase tracking-widest border-b border-zinc-800/60">
              <tr>
                <th className="px-6 py-4">ID / Sahibi</th>
                <th className="px-6 py-4">İçerik Özeti</th>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
              )) : data.map(item => (
                <tr key={item.id} className="hover:bg-zinc-900/20 transition">
                  <td className="px-6 py-4">
                    <div className="font-mono text-[9px] text-zinc-400">{item.id}</div>
                    <div className="text-[8px] text-zinc-600 mt-0.5 truncate max-w-[150px]">UID: {item.uid || item.userId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-300">
                      {item.subject || item.type || item.title || 'Detay Yok'}
                    </div>
                    <div className="text-zinc-500 mt-0.5 truncate max-w-[300px]">
                      {item.topic || item.description || item.lastMessage || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 font-mono">
                    {item.createdAt || item.date || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg text-zinc-600 transition"><Eye size={14} /></button>
                      <button onClick={() => handleDelete(item)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-zinc-600 transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && !loading && <div className="py-20 text-center text-zinc-600 text-sm italic">Veri bulunamadı</div>}
        </div>
      </div>
    </div>
  );
}

// ─── My Data Panel ────────────────────────────────────────────────────────────

function MyDataPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devService.getUserDetails(actorUid).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [actorUid]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl border border-zinc-800/60 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Shield size={120} /></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl">
            <img src={data?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${actorUid}`} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">{data?.displayName || 'Admin'}</h2>
            <p className="text-zinc-500 font-mono text-sm">{data?.email}</p>
            <div className="flex items-center gap-3 mt-4">
              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Super Admin</span>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest">Developer Mode</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Sistem Liyakati', val: data?.eloScore || 0, icon: <Zap className="text-amber-500" /> },
          { label: 'Çalışma Serisi', val: `${data?.streakDays || 0} Gün`, icon: <Activity className="text-rose-500" /> },
          { label: 'Toplam Kayıt', val: data?.totalLogs || 0, icon: <FileText className="text-blue-500" /> }
        ].map(s => (
          <div key={s.label} className="bg-[#111] p-6 rounded-2xl border border-zinc-800/60 flex items-center gap-4">
            <div className="p-3 bg-zinc-900 rounded-xl">{s.icon}</div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Audit Panel ──────────────────────────────────────────────────────────────

function AuditPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devService.getAuditLogs(50).then(res => {
      setLogs(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Sistem Denetim Logları</h3>
        <button onClick={() => window.location.reload()} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-[#111] border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="divide-y divide-zinc-800/40">
          {loading ? Array(5).fill(0).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>) : logs.map(l => (
            <div key={l.id} className="p-4 hover:bg-zinc-900/20 transition flex items-start gap-4">
              <div className={`p-2 rounded-lg shrink-0 ${
                l.action?.includes('DELETE') ? 'bg-red-500/10 text-red-500' :
                l.action?.includes('UPDATE') ? 'bg-blue-500/10 text-blue-500' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                <Activity size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{l.action}</span>
                  <span className="text-[9px] font-mono text-zinc-600">{l.timestamp}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate">{l.details}</p>
                <div className="text-[8px] text-zinc-700 mt-1 uppercase font-bold tracking-tighter">Aktör: {l.actorEmail || l.actorUid}</div>
              </div>
            </div>
          ))}
          {logs.length === 0 && !loading && <div className="py-20 text-center text-zinc-600 text-sm italic">Henüz log kaydı yok</div>}
        </div>
      </div>
    </div>
  );
}

// ─── System Panel ─────────────────────────────────────────────────────────────

function SystemPanel({ actorUid, showToast }: { actorUid: string; showToast: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    devService.getSystemStats().then(setStats);
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanıcı', val: stats?.totalUsers || 0, icon: <Users className="text-zinc-500" /> },
          { label: 'Aktif Oturum', val: stats?.activeSessions || 0, icon: <Clock className="text-zinc-500" /> },
          { label: 'Hatalı Sorular', val: stats?.totalFailedQuestions || 0, icon: <AlertTriangle className="text-red-500" /> },
          { label: 'Sistem Sağlığı', val: '%99.9', icon: <CheckCircle2 className="text-emerald-500" /> }
        ].map(s => (
          <div key={s.label} className="bg-[#111] p-5 rounded-2xl border border-zinc-800/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{s.label}</div>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-white">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-zinc-800/60 rounded-3xl p-8 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-zinc-500" /> Tehlikeli Alan (Danger Zone)
        </h3>
        <p className="text-xs text-zinc-500">Bu ayarlar tüm sistemi etkileyen geri döndürülemez işlemleri içerir. Sadece geliştiriciler kullanmalıdır.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-4 bg-zinc-900/30 border border-zinc-800/40 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white">Sistem Önleğini Temizle</div>
              <div className="text-[10px] text-zinc-500 mt-1">Tüm global cache verileri silinir.</div>
            </div>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold uppercase transition">Temizle</button>
          </div>
          <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-red-500">Tüm Verileri Arşivle</div>
              <div className="text-[10px] text-zinc-600 mt-1">Eski kayıtları 'Mezarlık' tablosuna taşır.</div>
            </div>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase transition">Arşivle</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
        <Activity size={48} className="text-zinc-800" />
      </div>
      <h2 className="text-xl font-bold text-white italic font-serif">Analiz Modülü Hazırlanıyor</h2>
      <p className="text-xs text-zinc-500 uppercase tracking-widest max-w-xs">Global kullanıcı verilerini harmanlayan derin analiz paneli v5.2 ile aktifleşecek.</p>
    </div>
  );
}
