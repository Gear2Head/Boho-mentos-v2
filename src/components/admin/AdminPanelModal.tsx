/**
 * AMAÇ: Sistem yöneticisine ait Super Yetkili Panel Modülü (UI)
 * MANTIK: Sekmeli yapı ile arama, veri silme/push'lama ve analiz fonksiyonlarına erişim.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ShieldAlert, Database, Users, AlertTriangle, CheckCircle2, Flame, Trash2, Radio, Activity, FileText, RefreshCw, HeartPulse, Code } from 'lucide-react';
import { useAdminPanel } from '../../hooks/useAdminPanel';
import type { FirestoreUser } from '../../config/admin';
import { computeHealthScore } from '../../utils/healthScore';
// STUB: anomalyDetection module deleted. Using inline type.
type AnomalyAlert = { type: string; message: string; severity: 'low' | 'medium' | 'high' };
import * as devService from '../../services/developerService';
import { PromptLab } from './PromptLab';
import type { DailyLog } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanelModal({ isOpen, onClose }: Props) {
  const admin = useAdminPanel();
  const [activeTab, setActiveTab] = useState<'users' | 'anomaly' | 'tools' | 'system' | 'prompt_lab'>('users');
  const [query, setQuery] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [showCoachMemory, setShowCoachMemory] = useState(false);
  const [coachMemData, setCoachMemData] = useState<any>(null);

  // Anomaly tab state
  const [anomalyUsers, setAnomalyUsers] = useState<FirestoreUser[]>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [selectedAnomalyUser, setSelectedAnomalyUser] = useState<FirestoreUser | null>(null);
  const [userAnomalies, setUserAnomalies] = useState<AnomalyAlert[]>([]);
  const [userHealth, setUserHealth] = useState<ReturnType<typeof computeHealthScore> | null>(null);
  const [userChurn, setUserChurn] = useState<number | null>(null);
  const [anomalyDetailLoading, setAnomalyDetailLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'system') admin.loadSystemData();
    if (isOpen && activeTab === 'anomaly' && anomalyUsers.length === 0) loadAnomalyUsers();
  }, [isOpen, activeTab]);

  const loadAnomalyUsers = useCallback(async () => {
    setAnomalyLoading(true);
    const users = await devService.getAllUsers(50);
    setAnomalyUsers(users);
    setAnomalyLoading(false);
  }, []);

  const loadUserAnomalyDetail = useCallback(async (user: FirestoreUser) => {
    setSelectedAnomalyUser(user);
    setAnomalyDetailLoading(true);
    setUserAnomalies([]);
    setUserHealth(null);
    setUserChurn(null);
    try {
      const { collection, getDocs, query } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      const logsSnap = await getDocs(query(collection(db, 'users', user.uid, 'logs')));
      const examsSnap = await getDocs(query(collection(db, 'users', user.uid, 'exams')));
      const logs = logsSnap.docs.map(d => d.data());
      const exams = examsSnap.docs.map(d => d.data());
      const profile = user.profile;
      if (profile) {
        const health = computeHealthScore(logs as DailyLog[], exams as any[], profile as any, user.streak_days ?? 0);
        setUserHealth(health);
      }
      // Inline stub: anomaly detection removed, always returns empty.
      setUserAnomalies([]);
      setUserChurn(0);
    } catch {
      // silent
    } finally {
      setAnomalyDetailLoading(false);
    }
  }, []);

  if (!isOpen || !admin.hasAccess) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row h-[85vh] shadow-[0_0_50px_rgba(193,119,103,0.1)]"
        >
          {/* Left Tabs */}
          <div className="md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-800 shrink-0 p-4">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-[#C17767]" size={24} />
                <h2 className="font-display italic font-bold text-lg text-white">Dev Console</h2>
              </div>
              <button onClick={onClose} className="md:hidden p-2 text-zinc-500"><X size={20} /></button>
            </div>
            <div className="flex md:flex-col gap-2 overflow-x-auto">
              {[
                { id: 'users', label: 'Kullanıcı Haritası', icon: <Users size={16} /> },
                { id: 'anomaly', label: 'Anomali İstihbaratı', icon: <HeartPulse size={16} /> },
                { id: 'system', label: 'Sistem Odası', icon: <Activity size={16} /> },
                { id: 'prompt_lab', label: 'Prompt Lab', icon: <Code size={16} /> },
                { id: 'tools', label: 'Güç Araçları', icon: <Database size={16} /> },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl tracking-widest uppercase font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20' : 'text-zinc-500 hover:bg-white/5'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 overflow-auto bg-zinc-950 p-6 md:p-8 relative">
            <button onClick={onClose} className="absolute hidden md:flex top-6 right-6 p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 text-zinc-500 transition-colors z-10"><X size={20} /></button>

            {(admin.error || admin.success) && (
              <div className={`mb-6 p-4 rounded-xl text-xs font-mono font-bold border ${admin.error ? 'bg-red-900/10 text-red-400 border-red-700' : 'bg-green-900/10 text-green-400 border-green-700'}`}>
                {admin.error || admin.success}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400 mb-4">Sistem Kullanıcıları</h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="UID veya Email ile ara..."
                    className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-medium focus:border-[#C17767] transition-colors"
                  />
                  <button onClick={() => admin.search(query)} disabled={admin.isSearching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#C17767] text-white rounded-xl text-[10px] font-bold uppercase disabled:opacity-50">
                    BUL
                  </button>
                </div>
                {admin.isSearching ? (
                  <div className="p-8 text-center text-zinc-500 animate-pulse">Aranıyor...</div>
                ) : admin.searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {admin.searchResults.map(u => (
                      <button key={u.uid} onClick={() => admin.setSelectedUser(u)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${admin.selectedUser?.uid === u.uid ? 'bg-[#C17767]/5 border-[#C17767]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{u.email}</p>
                            <p className="text-[10px] font-mono text-zinc-500 mt-1">UID: {u.uid}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-[#C17767]">{u.eloScore || 0} ELO</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (query && <div className="p-8 text-center text-zinc-500 text-sm">Hiçbir kullanıcı bulunamadı.</div>)}

                {admin.selectedUser && (
                  <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
                    <h4 className="font-bold uppercase tracking-widest text-zinc-500 text-xs mb-4">Müdahale: {admin.selectedUser.email}</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <button onClick={() => admin.addElo(admin.selectedUser!.uid, +500)} disabled={admin.actionLoading} className="p-3 bg-green-500/10 text-green-400 rounded-xl text-[10px] font-bold uppercase border border-green-500/20 hover:bg-green-500/20">+500 ELO Bas</button>
                      <button onClick={() => admin.addElo(admin.selectedUser!.uid, -250)} disabled={admin.actionLoading} className="p-3 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-bold uppercase border border-red-500/20">-250 ELO</button>
                      <button onClick={() => admin.clearLogs(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-bold uppercase border border-zinc-700 flex items-center justify-center gap-1"><Trash2 size={12} /> Logları Sil</button>
                      <button onClick={() => admin.repairProfile(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-bold uppercase border border-blue-500/20">Profili Onar</button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      {admin.selectedUser.isBanned ? (
                        <button onClick={() => admin.unbanUser(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="w-full p-3 bg-zinc-800 rounded-xl text-[10px] font-bold uppercase">Hesap Engelini Kaldır (UNBAN)</button>
                      ) : (
                        <button onClick={() => admin.banUser(admin.selectedUser!.uid, 'Kurallara Aykırılık')} disabled={admin.actionLoading} className="w-full p-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase">Uzaklaştırma Ver (BAN)</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Anomaly Tab */}
            {activeTab === 'anomaly' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Anomali İstihbaratı</h3>
                  <button onClick={loadAnomalyUsers} disabled={anomalyLoading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-xs font-bold uppercase hover:bg-zinc-800">
                    <RefreshCw size={12} className={anomalyLoading ? 'animate-spin' : ''} /> Yenile
                  </button>
                </div>
                {anomalyLoading ? (
                  <div className="p-8 text-center animate-pulse text-zinc-500">Yükleniyor...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {anomalyUsers.map(u => (
                        <button key={u.uid} onClick={() => loadUserAnomalyDetail(u)}
                          className={`w-full text-left p-3 rounded-xl border text-[11px] transition-all ${selectedAnomalyUser?.uid === u.uid ? 'bg-[#C17767]/10 border-[#C17767]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                          <div className="font-semibold truncate">{u.email}</div>
                          <div className="text-zinc-500 font-mono text-[9px] mt-0.5">{u.eloScore ?? 0} ELO</div>
                        </button>
                      ))}
                    </div>
                    <div className="lg:col-span-2">
                      {!selectedAnomalyUser ? (
                        <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Bir kullanıcı seç</div>
                      ) : anomalyDetailLoading ? (
                        <div className="p-8 text-center animate-pulse text-zinc-500">Analiz ediliyor...</div>
                      ) : (
                        <div className="space-y-4">
                          {userHealth && (
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Sağlık Skoru</div>
                              <div className={`text-3xl font-black font-mono ${userHealth.total >= 75 ? 'text-emerald-400' : userHealth.total >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{userHealth.total}<span className="text-sm text-zinc-500 ml-2 font-bold">/100</span></div>
                            </div>
                          )}
                          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Anomali Bayrakları</div>
                            {userAnomalies.length === 0 ? (
                              <div className="flex items-center gap-2 text-emerald-400 text-xs"><CheckCircle2 size={14} /> Anomali tespit edilmedi.</div>
                            ) : (
                              userAnomalies.map((a, i) => (
                                <div key={i} className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 mt-2">
                                  <div className="font-bold uppercase text-[9px] opacity-70 mb-1">{a.type} - {a.severity}</div>
                                  <div>{a.message}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Toplam Kayıt</p>
                    <p className="text-2xl font-black text-[#C17767]">{admin.systemStats?.totalUsers || '...'}</p>
                  </div>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Sistem Durumu</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${admin.systemConfig?.maintenanceMode ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <p className="text-sm font-bold text-white">{admin.systemConfig?.maintenanceMode ? 'Bakım Modunda' : 'Operasyonel'}</p>
                    </div>
                  </div>
                  <button onClick={() => admin.loadSystemData()} className="p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase">
                    <Activity size={16} /> Tazele
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                    <h4 className="font-bold uppercase tracking-widest text-zinc-400 text-[10px] mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Bakım Modu</h4>
                    <button onClick={() => admin.toggleMaintenance(!admin.systemConfig?.maintenanceMode)} disabled={admin.actionLoading}
                      className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase ${admin.systemConfig?.maintenanceMode ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}`}>
                      {admin.systemConfig?.maintenanceMode ? 'Bakımı Kapat' : 'Bakım Başlat'}
                    </button>
                  </div>
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                    <h4 className="font-bold uppercase tracking-widest text-zinc-400 text-[10px] mb-4 flex items-center gap-2"><Radio size={14} /> Duyuru</h4>
                    <input type="text" value={announcementMsg} onChange={e => setAnnouncementMsg(e.target.value)}
                      placeholder="Tüm kullanıcılara mesaj..." className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] mb-3" />
                    <div className="flex gap-2">
                      <button onClick={() => admin.updateAnnouncement(announcementMsg)} disabled={admin.actionLoading || !announcementMsg}
                        className="flex-1 py-3 bg-[#C17767] text-white rounded-xl text-[10px] font-bold uppercase disabled:opacity-50">Yayınla</button>
                      <button onClick={() => { admin.updateAnnouncement(null); setAnnouncementMsg(''); }} className="px-4 py-3 bg-zinc-800 rounded-xl text-[10px] font-bold uppercase">Temizle</button>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col h-[300px]">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
                    <FileText size={14} /><h4 className="font-bold uppercase tracking-widest text-zinc-400 text-[10px]">Audit Logs</h4>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-[9px]">
                    {admin.systemStats?.recentLogs?.map((log: any) => (
                      <div key={log.id} className="p-2 border-b border-zinc-800/50 flex justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-[#C17767] font-bold">{log.action}</span>
                          <span className="mx-2 opacity-50">BY</span>
                          <span className="text-blue-500 font-bold">#{log.actorUid?.slice(0, 6)}</span>
                        </div>
                        <span className="opacity-30 whitespace-nowrap">{admin.formatTimestamp(log.timestamp)}</span>
                      </div>
                    ))}
                    {(!admin.systemStats?.recentLogs?.length) && (
                      <div className="h-full flex items-center justify-center opacity-30 italic">Henüz kayıt yok.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-6">
                <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400 mb-4">Tehlikeli Araç Kutusu</h3>
                <div className="p-6 border-l-4 border-red-500 bg-red-900/10 rounded-r-2xl mb-8">
                  <h4 className="text-red-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Uyarı</h4>
                  <p className="text-xs text-red-400/80 leading-relaxed">Buradaki işlemlerin geri dönüşü yoktur.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                    <h4 className="font-bold uppercase tracking-widest text-zinc-400 text-[10px] mb-4 flex items-center gap-2"><Radio size={14} className="text-blue-500" /> Senkronizasyon</h4>
                    <button onClick={() => admin.forceSyncMyData()} disabled={admin.actionLoading} className="w-full p-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                      <RefreshCw size={14} className={admin.actionLoading ? 'animate-spin' : ''} /> Buluttan Zorla Çek
                    </button>
                  </div>
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                    <h4 className="font-bold uppercase tracking-widest text-zinc-400 text-[10px] mb-4 flex items-center gap-2"><Flame size={14} className="text-orange-500" /> Müfredat Sıfırla</h4>
                    <button onClick={() => admin.resetMySubjects()} disabled={admin.actionLoading} className="w-full p-4 bg-orange-600 text-white rounded-2xl text-[10px] font-bold uppercase">
                      TÜM KONULARI SIFIRLA
                    </button>
                  </div>
                </div>
                <button onClick={() => { setCoachMemData(admin.getCoachMemory()); setShowCoachMemory(v => !v); }}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-2xl text-left text-xs font-bold uppercase tracking-widest">
                  Coach Belleğini Gör (Ham JSON)
                </button>
                <AnimatePresence>
                  {showCoachMemory && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      <pre className="text-[10px] font-mono text-zinc-400 overflow-auto max-h-[300px] whitespace-pre-wrap">
                        {JSON.stringify(coachMemData, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'prompt_lab' && (
              <div className="h-full"><PromptLab /></div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
