/**
 * App.tsx — Sprint 2 Patch Notları
 * ─────────────────────────────────────────────────────────────────────────────
 * Bu dosya App.tsx içinde yapılacak değişiklikleri str_replace formatında listeler.
 * Her blok "ARAMA" (eski kod) ve "DEĞİŞTİR" (yeni kod) şeklinde gösterir.
 *
 * Değişiklikler:
 *   1. [BUG-003] initOfflineSync import + useEffect
 *   2. [BUG-006] Ghost coach message — useRef guard
 *   3. [UX-001]  ToastProvider wrap + toast/confirmDialog import
 *   4. [UX-001]  alert() → toast, window.confirm() → confirmDialog
 *   5. [BUG-001] 2. AdminPanelModal instance silme
 *   6. MebiWarRoom quitSession confirmDialog geçişi
 */

// ════════════════════════════════════════════════════════════════════════════
// PATCH 1 — Import blokları (dosyanın en üstüne ekle)
// ════════════════════════════════════════════════════════════════════════════

/*
EKLE (mevcut import'ların ardına):

import { ToastProvider, toast, confirmDialog } from './contexts/ToastContext';
import { initOfflineSync } from './utils/syncQueue';
*/

// ════════════════════════════════════════════════════════════════════════════
// PATCH 2 — [BUG-006] Ghost coach message useRef guard
// ════════════════════════════════════════════════════════════════════════════

/*
ARAMA:
  // ERR-002: İlk açılış mesajı
  useEffect(() => {
    if (activeTab === 'coach' && store.chatHistory.length === 0) {
      store.addChatMessage({
        role: 'coach',
        content: '📋 **Sistem Hazır.**\n\nGüne başlamak için...',
        timestamp: new Date().toISOString()
      });
    }
  }, [activeTab, store.chatHistory.length]);

DEĞİŞTİR:
  // [BUG-006 FIX]: useRef guard — chatHistory.length dependency kaldırıldı,
  // çift tetiklenme engellendi
  const chatInitRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'coach' && !chatInitRef.current && store.chatHistory.length === 0) {
      chatInitRef.current = true;
      store.addChatMessage({
        role: 'coach',
        content: '📋 **Sistem Hazır.**\n\nGüne başlamak için **PLAN** yazabilir, bir çalışma seansını kaydetmek için **LOG** komutunu kullanabilirsin. Senin için buradayım.',
        timestamp: new Date().toISOString()
      });
    }
  }, [activeTab]); // chatHistory.length dependency'den kaldırıldı
*/

// ════════════════════════════════════════════════════════════════════════════
// PATCH 3 — [BUG-003] initOfflineSync useEffect
// ════════════════════════════════════════════════════════════════════════════

/*
EKLE (diğer useEffect'lerin yanına, bağımsız bir effect olarak):

  // [BUG-003 FIX]: Offline sync listener'ı module scope'dan useEffect'e taşındı
  useEffect(() => {
    const cleanup = initOfflineSync();
    return cleanup;
  }, []);
*/

// ════════════════════════════════════════════════════════════════════════════
// PATCH 4 — [BUG-001] Duplicate AdminPanelModal kaldır
// ════════════════════════════════════════════════════════════════════════════

/*
ARAMA (main içindeki duplicate):
  {activeTab === 'subjects' && (
    ...
  )}
  ...
  <ExamEntryModal ... />
  <ExamDetailModal ... />
  <FocusSidePanel />
  <CoachInterventionModal />
  <AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />   ← BU SATIRI SİL (main içindeki)
  <MobileMenuModal .../>

DEĞİŞTİR:
  main içindeki AdminPanelModal satırını tamamen sil.
  Return'ün altındaki tek instance kalsın.
*/

// ════════════════════════════════════════════════════════════════════════════
// PATCH 5 — [UX-001] alert() → toast, window.confirm() → confirmDialog
// ════════════════════════════════════════════════════════════════════════════

/*
App.tsx içindeki tüm değişiklikler:

─── handleLogSubmit ────────────────────────────────────────────────────────
ARAMA:   (zaten alert yok, ama toast ekle başarı için)
EKLE:    store.addChatMessage sonrası:
         toast.success(`${log.subject} logu kaydedildi.`);

─── ExamEntryModal onSave ──────────────────────────────────────────────────
EKLE:    onSave callback içine:
         toast.success('Deneme kaydedildi!');

─── handleDelete (ExamDetailModal içinde) ──────────────────────────────────
ARAMA:   if (window.confirm('Bu denemeyi kalıcı olarak silmek istediğinize emin misiniz?')) {
DEĞİŞTİR: Bu App.tsx'de değil ExamDetailModal.tsx'de — aşağıda ayrı patch var.

─── Settings: resetStore ───────────────────────────────────────────────────
ARAMA:   onClick={() => { if (window.confirm('Verilerin SİLİNECEK! ...')) {
DEĞİŞTİR:
         onClick={async () => {
           const ok = await confirmDialog({
             title: 'Sistemi Sıfırla',
             message: 'Tüm loglar, denemeler ve başarımlar kalıcı olarak silinecek. Bu işlem geri alınamaz.',
             confirmLabel: 'Sıfırla',
             cancelLabel: 'İptal',
             variant: 'danger',
           });
           if (ok) {
             store.resetStore();
             window.location.reload();
           }
         }}

─── War Room quitSession ───────────────────────────────────────────────────
ARAMA:   const { quitSession } = useWarRoom();
         ...
         <button onClick={quitSession} ...>

DEĞİŞTİR:
         const { quitSession } = useWarRoom();
         const { confirm } = useToast();

         // MebiWarRoom içindeki çağrı:
         <button onClick={() => quitSession(confirm)} ...>

─── MobileMenuModal: onSignOut ─────────────────────────────────────────────
ARAMA:   onClick={() => { if(window.confirm('Çıkış yapmak istediğine emin misin?')) onSignOut(); }}
DEĞİŞTİR:
         onClick={async () => {
           const ok = await confirmDialog({
             title: 'Çıkış Yap',
             message: 'Oturumunu kapatmak istediğine emin misin?',
             confirmLabel: 'Çıkış Yap',
             cancelLabel: 'İptal',
           });
           if (ok) onSignOut();
         }}

─── Nav: Çıkış Yap butonu ──────────────────────────────────────────────────
ARAMA:   onClick={() => { if(window.confirm('...')) signOut(); }}
DEĞİŞTİR:
         onClick={async () => {
           const ok = await confirmDialog({
             title: 'Çıkış Yap',
             message: 'Oturumunu kapatmak istediğine emin misin?',
             confirmLabel: 'Çıkış Yap',
             variant: 'default',
           });
           if (ok) signOut();
         }}
*/

// ════════════════════════════════════════════════════════════════════════════
// PATCH 6 — [UX-001] Return'ü ToastProvider ile sar
// ════════════════════════════════════════════════════════════════════════════

/*
ARAMA:
  return (
    <MobileGuard className="h-[100dvh]">
      <div className="flex flex-col md:flex-row h-[100dvh] ...">
        ...
      </div>
    </MobileGuard>
  );

DEĞİŞTİR:
  return (
    <ToastProvider>
      <MobileGuard className="h-[100dvh]">
        <div className="flex flex-col md:flex-row h-[100dvh] ...">
          ...
        </div>
      </MobileGuard>
    </ToastProvider>
  );
*/

export {}; // Bu dosya sadece dökümantasyon amaçlı, import edilmez.
