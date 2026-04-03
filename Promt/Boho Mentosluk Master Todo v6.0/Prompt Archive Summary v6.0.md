# Prompt Archive Summary v6.0

## Amac

Bu dosya, `Promt` klasorundeki eski prompt, todo ve kod snapshot dosyalarinin neden arsivlendigini ve yeni master todo'ya hangi temalarin tasindigini ozetler.

## Arsivlenen Prompt ve Todo Dosyalari

- `aodiawuda.md`
- `Bohbo.md`
- `Boho mentosluk fix prompt.md`
- `Improve promt.md`
- `promtv2.md`
- `Todo`
- `Todo.md`
- `Yks coach prompt v7 ·`
- `Yks coach qa prompt v1`
- `Boho Mentosluk Master Todo details`
- `Boho Mentosluk Master Todo details v2`

### Neden arsivlendi

- Birbirini tekrar eden sprint ve bug listeleri uretiyorlardi
- Bir kismi eski mimariyi (`userData`, eski koç akislari, patch bazli gecici cozumler) referans aliyordu
- Aktif backlog ile tarihsel notlari ayni yuzeyde tuttuklari icin karar kalitesini dusuruyorlardi

## Arsivlenen Kod Snapshot Dosyalari

- `App.PATCH_NOTES.ts`
- `ai.ts`
- `ExamDetailModal.tsx`
- `MebiWarRoom.tsx`
- `syncQueue.ts`
- `ToastContext.tsx`
- `useOfflineSync.ts`
- `useWarRoom.ts`
- `warRoomService.ts`

### Neden arsivlendi

- Bunlar aktif kaynak kod degil, onceki duzeltme veya kopya calisma dosyalari
- Repo icindeki gercek kaynak dosyalarla drift olusturuyorlardi
- Referans degeri korunacak, ama aktif gelistirme yuzeyinden cikarilacaklar

## Yeni Master Todo'ya Tasinan Ana Temalar

- Firestore source-of-truth ve normalized sync mimarisi
- `users` / `userData` split-brain temizligi
- `targetGoals`, sohbet gecmisi, loglar, denemeler ve mezarlik icin cok cihazli gorunurluk
- `api/sync` placeholder sorunu
- IDB veri kaybi, beforeunload, MorningBlocker ve tarih parse buglari
- War Room mod/state ve canvas borclari
- Koç V2 structured directive, intent ve ortak AI cekirdegi
- Performans: selector migration, code splitting, memoization, IDB singleton
- UX/A11y: mobil klavye, tema FOUC, hata sozlugu, aria-label, focus trap

## Obsolete Sayilan Icerik Tipleri

- Tek seferlik operasyon promptlari
- Eski patch notlari
- Uretim kodunun kopya snapshot'lari
- Ayni backlog'u farkli adlarla tekrar eden todo dosyalari

## Ust Seviyede Korunan Kalici Rehberler

- `Promt/PROJECT_GPT_GUIDE.md`
- `Promt/Master koc.md`
- `Promt/Yokatlas.md`
- `Promt/Boho Mentosluk Master Todo v6.0/Boho Mentosluk Master Todo v6.0.md`

## Beklenen Son Yapi

- `Promt/PROJECT_GPT_GUIDE.md`
- `Promt/Master koc.md`
- `Promt/Yokatlas.md`
- `Promt/Boho Mentosluk Master Todo v6.0/Boho Mentosluk Master Todo v6.0.md`
- `Promt/Boho Mentosluk Master Todo v6.0/Prompt Archive Summary v6.0.md`
- `Promt/Boho Mentosluk Master Todo v6.0/archive/prompts/*`
- `Promt/Boho Mentosluk Master Todo v6.0/archive/code-snapshots/*`

