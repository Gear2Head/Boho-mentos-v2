/**
 * AMAÇ: Sistem yöneticisine ait Super Yetkili Panel Modülü (UI)
 * MANTIK: Sekmeli yapı ile arama, veri silme/push'lama ve analiz fonksiyonlarına erişim.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShieldAlert, Database, Users, Settings, AlertTriangle, CheckCircle2, Flame, Loader2, Trash2, Radio, Activity, FileText, RefreshCw } from 'lucide-react';
import { useAdminPanel } from '../../hooks/useAdminPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanelModal({ isOpen, onClose }: Props) {
  const admin = useAdminPanel();
  const [activeTab, setActiveTab] = useState<'users' | 'tools' | 'system'>('users');
  const [query, setQuery] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [showCoachMemory, setShowCoachMemory] = useState(false);
  const [coachMemData, setCoachMemData] = useState<any>(null);

  // Sistem verilerini yükle
  useEffect(() => {
    if (isOpen && activeTab === 'system') {
      admin.loadSystemData();
    }
  }, [isOpen, activeTab]);

  // Sadece süper admin olan açabilir.
  if(!isOpen || !admin.hasAccess) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-[#FDFBF7] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row h-[85vh] shadow-[0_0_50px_rgba(193,119,103,0.1)]"
        >
          {/* Sol Sekmeler Barı */}
          <div className="md:w-64 bg-zinc-100 dark:bg-zinc-900 border-b md:border-b-0 md:border-r border-[#EAE6DF] dark:border-zinc-800 shrink-0 p-4">
             <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-2">
                 <ShieldAlert className="text-[#C17767]" size={24} />
                 <h2 className="font-display italic font-bold text-lg dark:text-white">Dev Console</h2>
               </div>
               <button onClick={onClose} className="md:hidden p-2 text-zinc-500"><X size={20} /></button>
             </div>
             
             <div className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar">
               {[
                 { id: 'users', label: 'Kullanıcı Haritası', icon: <Users size={16} /> },
                 { id: 'system', label: 'Sistem Odası', icon: <Activity size={16} /> },
                 { id: 'tools', label: 'Güç Araçları', icon: <Database size={16} /> }
               ].map(t => (
                 <button
                   key={t.id}
                   onClick={() => setActiveTab(t.id as any)}
                   className={`flex items-center gap-3 px-4 py-3 rounded-xl tracking-widest uppercase font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20 scale-[1.02]' : 'bg-transparent text-[#4A443C] dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                 >
                   {t.icon} {t.label}
                 </button>
               ))}
             </div>
             
             <div className="absolute hidden md:block bottom-8 left-8">
               <span className="text-[8px] uppercase tracking-[0.2em] opacity-40">System Access Level</span><br/>
               <span className="text-[10px] uppercase font-mono tracking-widest opacity-20">Super Admin (Claims)</span>
             </div>
          </div>

          {/* Sağ Panel */}
          <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950 p-6 md:p-8 relative">
            <button onClick={onClose} className="absolute hidden md:flex top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors z-10"><X size={20} /></button>
            
            {(admin.error || admin.success) && (
              <div className={`mb-6 p-4 rounded-xl text-xs font-mono font-bold flex items-center justify-between border ${admin.error ? 'bg-red-50 dark:bg-red-900/10 text-red-600 border-red-200' : 'bg-green-50 dark:bg-green-900/10 text-green-600 border-green-200'}`}>
                {admin.error || admin.success} 
              </div>
            )}

            {activeTab === 'users' && (
               <div className="space-y-6">
                 <div>
                   <h3 className="font-bold text-sm uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 mb-4">Sistem Kullanıcıları</h3>
                   <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                     <input 
                       type="text"
                       value={query}
                       onChange={e => setQuery(e.target.value)}
                       placeholder="UID veya Email ile arama yap..."
                       className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl text-sm font-medium focus:border-[#C17767] transition-colors"
                     />
                     <button 
                       onClick={() => admin.search(query)}
                       disabled={admin.isSearching}
                       className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#C17767] text-white rounded-xl text-[10px] font-bold uppercase disabled:opacity-50"
                     >
                        BUL
                     </button>
                   </div>
                 </div>

                 {/* Kullanıcı Listesi / Detay */}
                 {admin.isSearching ? (
                   <div className="p-8 text-center text-zinc-500 animate-pulse">Aranıyor...</div>
                 ) : admin.searchResults.length > 0 ? (
                   <div className="space-y-4">
                     {admin.searchResults.map(u => (
                       <button
                         key={u.uid}
                         onClick={() => admin.setSelectedUser(u)}
                         className={`w-full text-left p-4 rounded-2xl border transition-all ${admin.selectedUser?.uid === u.uid ? 'bg-[#C17767]/5 border-[#C17767]' : 'bg-white dark:bg-[#121212] border-[#EAE6DF] dark:border-zinc-800 hover:border-zinc-400'}`}
                       >
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="font-bold text-sm relative">{u.email} {u.isBanned && <span className="ml-2 text-[9px] bg-red-500 text-white px-2 rounded">BANNED</span>}</p>
                             <p className="text-[10px] font-mono text-zinc-500 mt-1">UID: {u.uid}</p>
                           </div>
                           <div className="text-right">
                             <div className="text-xs font-bold text-[#C17767]">{u.eloScore || 1200} ELO</div>
                             <div className="text-[9px] uppercase tracking-widest opacity-50 mt-1">{u.role}</div>
                             <div className="text-[8px] text-zinc-500 mt-1">Son: {admin.formatRelativeTime(u.lastSignedInAt)}</div>
                           </div>
                         </div>
                       </button>
                     ))}
                   </div>
                 ) : (
                   query && <div className="p-8 text-center text-zinc-500 text-sm">Hiçbir kullanıcı bulunamadı.</div>
                 )}

                 {/* Focuslanılan Kullanıcı Araçları */}
                 {admin.selectedUser && (
                   <div className="mt-8 p-6 bg-zinc-50 dark:bg-[#121212] rounded-3xl border border-[#EAE6DF] dark:border-zinc-800">
                     <h4 className="font-bold uppercase tracking-widest text-[#4A443C] dark:text-zinc-500 text-xs mb-4">Müdahale Paneli : {admin.selectedUser.email}</h4>
                     
                     <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                       <button onClick={() => admin.addElo(admin.selectedUser!.uid, +500)} disabled={admin.actionLoading} className="p-3 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-bold uppercase border border-green-500/20 hover:bg-green-500/20">+500 ELO Bas</button>
                       <button onClick={() => admin.addElo(admin.selectedUser!.uid, -250)} disabled={admin.actionLoading} className="p-3 bg-red-500/10 text-red-600 rounded-xl text-[10px] font-bold uppercase border border-red-500/20 hover:bg-red-500/20">-250 ELO Tırpanla</button>
                       <button onClick={() => admin.mockWarRoom(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="p-3 bg-[#C17767]/10 text-[#C17767] rounded-xl text-[10px] font-bold uppercase border border-[#C17767]/20 hover:bg-[#C17767]/20">War Room Yolla</button>
                       <button onClick={() => admin.clearLogs(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-bold uppercase border border-zinc-700 hover:text-white flex items-center justify-center gap-2"><Trash2 size={12}/> Tüm Logları Sil</button>
                       <button onClick={() => admin.repairProfile(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] font-bold uppercase border border-blue-500/20 hover:bg-blue-500/20 flex items-center justify-center text-center leading-tight">Profili Onar</button>
                     </div>

                     <div className="mt-4 pt-4 border-t border-[#EAE6DF] dark:border-zinc-800 grid grid-cols-2 gap-3">
                       {admin.selectedUser.isBanned ? (
                         <button onClick={() => admin.unbanUser(admin.selectedUser!.uid)} disabled={admin.actionLoading} className="col-span-2 p-3 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-[10px] font-bold uppercase">Hesap Engelini Kaldır (UNBAN)</button>
                       ) : (
                         <button onClick={() => admin.banUser(admin.selectedUser!.uid, "Kurallara Aykırılık")} disabled={admin.actionLoading} className="col-span-2 p-3 bg-red-600 text-white shadow-lg shadow-red-600/20 rounded-xl text-[10px] font-bold uppercase">Uzaklaştırma Ver (BAN)</button>
                       )}
                     </div>
                   </div>
                 )}
               </div>
            )}

             {activeTab === 'system' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl">
                      <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1 text-ink-muted">Toplam Kayıt</p>
                      <p className="text-2xl font-display font-bold text-[#C17767]">{admin.systemStats?.totalUsers || '...'}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl">
                      <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1 text-ink-muted">Sistem Durumu</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${admin.systemConfig?.maintenanceMode ? 'bg-amber-500' : 'bg-green-500'}`} />
                        <p className="text-sm font-bold dark:text-white">{admin.systemConfig?.maintenanceMode ? 'Bakım Modunda' : 'Operasyonel'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => admin.loadSystemData()}
                      className="p-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-app rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors"
                    >
                      <Activity size={16} /> Verileri Tazele
                    </button>
                  </div>

                  {/* Bakım Modu & Duyuru */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-app rounded-3xl">
                      <h4 className="font-bold uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 text-[10px] mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} /> Global Erişim Kontrolü
                      </h4>
                      <p className="text-[10px] text-zinc-500 mb-4">Bakım modunu açtığınızda yetkili olmayan kullanıcıların sisteme girişi engellenir.</p>
                      <button 
                         onClick={() => admin.toggleMaintenance(!admin.systemConfig?.maintenanceMode)}
                         disabled={admin.actionLoading}
                         className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${admin.systemConfig?.maintenanceMode ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'}`}
                      >
                        {admin.systemConfig?.maintenanceMode ? 'Bakım Modunu Kapat' : 'Bakım Modunu Başlat'}
                      </button>
                    </div>

                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-app rounded-3xl">
                      <h4 className="font-bold uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 text-[10px] mb-4 flex items-center gap-2">
                        <Radio size={14} /> Global Duyuru (Broadcaster)
                      </h4>
                      <div className="space-y-3">
                        <input 
                          type="text"
                          value={announcementMsg}
                          onChange={e => setAnnouncementMsg(e.target.value)}
                          placeholder="Tüm kullanıcılara gidecek mesaj..."
                          className="w-full px-4 py-3 bg-white dark:bg-black border border-app rounded-xl text-[11px]"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => admin.updateAnnouncement(announcementMsg)}
                            disabled={admin.actionLoading || !announcementMsg}
                            className="flex-1 py-3 bg-[#C17767] text-white rounded-xl text-[10px] font-bold uppercase disabled:opacity-50"
                          >
                            Duyuru Yap
                          </button>
                          <button 
                            onClick={() => { admin.updateAnnouncement(null); setAnnouncementMsg(''); }}
                            disabled={admin.actionLoading}
                            className="px-4 py-3 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-[10px] font-bold uppercase"
                          >
                            Temizle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Logs */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-app rounded-3xl overflow-hidden flex flex-col h-[300px]">
                    <div className="px-6 py-4 border-b border-app flex justify-between items-center bg-white/50 dark:bg-black/50">
                       <h4 className="font-bold uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 text-[10px] flex items-center gap-2">
                         <FileText size={14} /> Denetim Kayıtları (Audit Logs)
                       </h4>
                    </div>
                    <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-[9px]">
                       {admin.systemStats?.recentLogs?.map((log: any) => (
                         <div key={log.id} className="p-2 border-b border-app/50 flex justify-between items-start gap-4">
                            <div className="flex-1">
                               <span className="text-[#C17767] font-bold">{log.action}</span>
                               <span className="mx-2 opacity-50">BY</span>
                               <span className="text-blue-500 font-bold">#{log.actorUid.slice(0, 6)}</span>
                               <p className="text-zinc-400 mt-0.5">{JSON.stringify(log.details)}</p>
                            </div>
                            <span className="opacity-30 whitespace-nowrap">{admin.formatTimestamp(log.timestamp)}</span>
                         </div>
                       ))}
                       {(!admin.systemStats?.recentLogs || admin.systemStats.recentLogs.length === 0) && (
                         <div className="h-full flex items-center justify-center opacity-30 italic">Henüz bir kayıt yok.</div>
                       )}
                    </div>
                  </div>
                </div>
             )}

            {activeTab === 'tools' && (
               <div className="space-y-6">
                 <h3 className="font-bold text-sm uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 mb-4">Tehlikeli Araç Kutusu</h3>
                 <div className="p-6 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 rounded-r-2xl mb-8">
                    <h4 className="text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Uyarı</h4>
                    <p className="text-xs text-red-600/80 leading-relaxed">Burada yapılacak işlemlerin geri dönüşü yoktur. Veritabanının bütünlüğünü bozmamak için işlemleri dikkatli gerçekleştirin. (Büyük yetki büyük sorumluluk...)</p>
                 </div>

                 {/* Senkronizasyon Merkezi */}
                 <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-app rounded-3xl mb-6">
                    <h4 className="font-bold uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 text-[10px] mb-4 flex items-center gap-2">
                       <Radio size={14} className="text-blue-500" /> Senkronizasyon Merkezi (Kişisel)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <button 
                         onClick={() => admin.forceSyncMyData()}
                         disabled={admin.actionLoading}
                         className="p-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                       >
                         <RefreshCw size={14} className={admin.actionLoading ? 'animate-spin' : ''} /> Buluttan Zorla Çek (Pull)
                       </button>
                       <div className="p-4 bg-white dark:bg-black border border-app rounded-2xl">
                          <p className="text-[9px] text-zinc-500 leading-tight">Yerel verileriniz (idb) bozulduysa veya diğer cihazdaki veriler gelmiyorsa buluttaki kopyayı buraya zorla indirir.</p>
                       </div>
                    </div>
                 </div>

                 {/* Müfredat Tamiri */}
                 <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-app rounded-3xl mb-6">
                    <h4 className="font-bold uppercase tracking-widest text-[#4A443C] dark:text-zinc-400 text-[10px] mb-4 flex items-center gap-2">
                       <Flame size={14} className="text-orange-500" /> Müfredat Kontrol Ünitesi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <button 
                         onClick={() => admin.resetMySubjects()}
                         disabled={admin.actionLoading}
                         className="p-4 bg-orange-600 text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-orange-600/20"
                       >
                         Müfredat İlerlemesini SIFIRLA
                       </button>
                       <div className="p-4 bg-white dark:bg-black border border-app rounded-2xl">
                          <p className="text-[9px] text-zinc-500 leading-tight">Tüm TYT ve AYT konu ilerlemelerini 'not-started' durumuna çeker ve buluta yazar. (Geri dönüşü yoktur!)</p>
                       </div>
                    </div>
                 </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <button 
                       onClick={() => {
                         const data = admin.getCoachMemory();
                         setCoachMemData(data);
                         setShowCoachMemory(true);
                       }}
                       className="p-6 text-left bg-zinc-50 dark:bg-[#121212] border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 transition-colors group"
                     >
                        <h5 className="font-bold uppercase text-[10px] tracking-widest text-[#4A443C] dark:text-zinc-300 mb-2 group-hover:text-blue-500">Coach Belleğini Gör</h5>
                        <p className="text-[10px] text-zinc-500 italic">Core yapay zeka hafızasını ve mesaj sayısını ham JSON olarak incele.</p>
                     </button>
                     <button 
                       onClick={() => { if(confirm("TÜM ADMIN LOGLARINI SİLMEK İSTEDİĞİNE EMİN MİSİN?")) admin.clearAdminLogs(); }}
                       disabled={admin.actionLoading}
                       className="p-6 text-left bg-zinc-50 dark:bg-[#121212] border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl hover:border-red-500/50 transition-colors group"
                     >
                        <h5 className="font-bold uppercase text-[10px] tracking-widest text-[#4A443C] dark:text-zinc-300 mb-2 group-hover:text-red-500">Sistem Loglarını Sıfırla</h5>
                        <p className="text-[10px] text-zinc-500 italic">Tüm bu audit kayıtlarını tamamen temizler. Dikkatli kullanın.</p>
                     </button>
                     <div className="p-6 bg-zinc-50 dark:bg-[#121212] border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl opacity-50 cursor-not-allowed">
                        <h5 className="font-bold uppercase text-[10px] tracking-widest text-[#4A443C] dark:text-zinc-300 mb-2">Veri Tabanı JSON Editör</h5>
                        <p className="text-[10px] text-zinc-500">Kullanıcı verilerini JSON olarak düzenleme. Gelecek fazda aktif edilecek.</p>
                     </div>
                  </div>

                  {/* Coach Memory Modal Inline */}
                  <AnimatePresence>
                    {showCoachMemory && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h6 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Coach Core Debugger</h6>
                          <button onClick={() => setShowCoachMemory(false)} className="text-zinc-500 hover:text-white"><X size={16}/></button>
                        </div>
                        <pre className="text-[10px] font-mono text-zinc-400 overflow-auto max-h-[300px] no-scrollbar whitespace-pre-wrap">
                          {JSON.stringify(coachMemData, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            )}


          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
