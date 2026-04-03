# YKS Mentörlük Sistemi — Kapsamlı TODO & Geliştirme Planı

> **Son Güncelleme:** 2 Nisan 2026  
> **Versiyon:** v5.6  
> **Durum:** Aktif Geliştirme

---

## İçindekiler

- [🔴 KRİTİK GÜVENLİK AÇIKLARI](#-kritik-güvenlik-açıkları)
- [🟠 ACİL BUGLAR](#-acil-buglar)
- [🟡 ORTA ÖNCELİKLİ BUGLAR](#-orta-öncelikli-buglar)
- [🟢 PERFORMANS İYİLEŞTİRMELERİ](#-performans-iyileştirmeleri)
- [🔵 YENİ ÖZELLİKLER](#-yeni-özellikler)
- [🟣 UX / ARAYÜZ GELİŞTİRMELERİ](#-ux--arayüz-geliştirmeleri)
- [⚪ TEKNİK BORÇ](#-teknik-borç)
- [📅 SPRINT ÖNERİSİ](#-sprint-önerisi)

---

## 🔴 KRİTİK GÜVENLİK AÇIKLARI

> Bu maddeler **canlıya çıkmadan veya hemen** kapatılmalı.

---

### SEC-001 · Hardcoded Supabase API Key

**Dosya:** `src/services/supabaseClient.ts`  
**Risk:** YÜKSEK — Credential leak, git geçmişinde kalıcı  

```ts
// ❌ MEVCUT DURUM — kaynak kodda açık key
const supabaseUrl = 'https://vixfopnlglccfefnaupm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qmkn2oOTM3pCuaOedrq9XQ_8WFkJJXG';

// ✅ OLMASI GEREKEN
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Yapılacaklar:**
- [ ] `.env.local` dosyasına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` ekle
- [ ] `vite-env.d.ts` içindeki `ImportMetaEnv` interface'ine bu değişkenleri ekle (zaten kısmen var)
- [ ] `git filter-branch` veya `BFG Repo Cleaner` ile git geçmişinden key'i temizle
- [ ] Supabase dashboard'dan mevcut key'i revoke et, yenisini üret
- [ ] `src/services/supabaseClient.ts` dosyası zaten kullanılmıyor gibi görünüyor — gerekli mi kontrol et, değilse sil

---

### SEC-002 · Firestore Rules: Cross-User Data Leak

**Dosya:** `firestore.rules`  
**Risk:** YÜKSEK — Herhangi bir auth'lu kullanıcı diğerinin profilini okuyabilir  

```js
// ❌ MEVCUT DURUM
match /users/{userId} {
  allow read: if request.auth != null; // TÜM auth'lu kullanıcılar okuyabilir!
}

// ✅ OLMASI GEREKEN
match /users/{userId} {
  allow read: if request.auth != null && (
    request.auth.uid == userId ||
    request.auth.uid == "9z9OAxBXsFU3oPT8AqIxnDSfzNy2"
  );
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

**Yapılacaklar:**
- [ ] `firestore.rules` dosyasını yukarıdaki pattern ile güncelle
- [ ] `firebase deploy --only firestore:rules` ile deploy et
- [ ] Firebase Emulator üzerinde rule test yaz (`firestore.rules.test.js`)
- [ ] Admin arama feature'ı (`developerService.ts`) için ayrı admin claim bazlı kural ekle

---

### SEC-003 · Spotify Token localStorage'da

**Dosya:** `src/services/spotifyService.ts`  
**Risk:** ORTA — XSS saldırısında token çalınabilir; Implicit Flow zaten deprecate  

```ts
// ❌ MEVCUT
localStorage.setItem('spotify_token', token);

// ✅ ÇÖZÜM SEÇENEKLERİ
// Option A: sessionStorage (kısa vadeli fix)
sessionStorage.setItem('spotify_token', token);

// Option B: PKCE flow ile token backend'de tut (uzun vadeli)
// spotify OAuth PKCE → /api/spotify-callback → httpOnly cookie
```

**Yapılacaklar:**
- [ ] Kısa vadeli: `localStorage` → `sessionStorage` geçişi
- [ ] Uzun vadeli: PKCE flow implemente et (`/api/spotify` serverless endpoint)
- [ ] Token refresh mantığı ekle (1 saatlik implicit token expire olunca UI kırılıyor)

---

### SEC-004 · Admin Panel: Frontend-Only Authorization

**Dosya:** `src/components/admin/AdminPanelModal.tsx`, `src/hooks/useAdminPanel.ts`  
**Risk:** ORTA — `isSuperAdmin` client-side check. Firestore rules backend'i koruyor ama UI bypass edilebilir  

**Yapılacaklar:**
- [ ] Admin actionları için Firebase Functions veya Vercel API route ekle
- [ ] `developerService.ts` fonksiyonlarını doğrudan çağırmak yerine `/api/admin/*` üzerinden yönlendir
- [ ] Her admin aksiyonunu `adminLogs` koleksiyonuna yaz (zaten var, devam ettir)

---

## 🟠 ACİL BUGLAR

> Prod'u etkileyen, kullanıcıya görünen veya veri kaybına yol açan hatalar.

---

### BUG-001 · AdminPanelModal Çift Render

**Dosya:** `src/App.tsx`  
**Durum:** 🔴 Kritik  

`App.tsx` return bloğunda `AdminPanelModal` iki kez mount ediliyor:

```tsx
// satır ~1198: main içinde
<AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />

// satır ~1215: return'ün altında (tekrar!)
<AdminPanelModal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
```

**Yapılacaklar:**
- [ ] `main` içindeki ilk instance'ı sil, sadece return'ün altındaki kalsın
- [ ] React DevTools ile tekrar render olmadığını doğrula

---

### BUG-002 · useOfflineSync Hook'u Hiç Çalışmıyor

**Dosya:** `src/hooks/useOfflineSync.ts`  
**Durum:** 🔴 Kritik — Offline sync tamamen kırık  

```ts
// ❌ StudentProfile tipinde "id" alanı yok!
const userId = profile?.id; // → her zaman undefined

// ✅ OLMASI GEREKEN
const { authUser } = useAppStore();
const userId = authUser?.uid;
```

**Yapılacaklar:**
- [ ] `useOfflineSync.ts` içindeki `profile?.id` → `authUser?.uid` ile değiştir
- [ ] Hook'u `App.tsx`'de aktif edildiğini doğrula (import var mı?)
- [ ] `getSyncQueue` / `clearSyncQueue` fonksiyonlarının çalıştığını test et

---

### BUG-003 · syncQueue.ts: Module-Level window Event Listener

**Dosya:** `src/utils/syncQueue.ts`  
**Durum:** 🟠 Acil  

```ts
// ❌ Dosyanın en altında — modül import edilir edilmez çalışır
window.addEventListener('online', processSyncQueue);
```

Bu pattern SSR / test ortamında `ReferenceError: window is not defined` hatası verir. Ayrıca modül birden fazla kez import edilirse listener birikir.

**Yapılacaklar:**
- [ ] `window.addEventListener` çağrısını `initOfflineSync()` adlı bir fonksiyona taşı
- [ ] Bu fonksiyonu `App.tsx`'de `useEffect` içinden çağır
- [ ] Cleanup için `removeEventListener` return et

---

### BUG-004 · chatHistory / logs / exams Dizileri Sınırsız Büyüyor

**Dosya:** `src/store/appStore.ts`  
**Durum:** 🟠 Acil — Uzun vadede IndexedDB dolar, uygulama yavaşlar  

Firestore'un 1MB doküman limiti var. Chat geçmişi hızla büyür.

```ts
// ✅ addChatMessage'a limit ekle
addChatMessage: (message) => set((state) => ({
  chatHistory: [...state.chatHistory, message].slice(-100) // son 100
})),

// ✅ addLog'a limit ekle  
addLog: (log) => set((state) => {
  const newLogs = [...state.logs, log].slice(-500); // son 500
  // ...
}),
```

**Yapılacaklar:**
- [ ] `addChatMessage`: son 100 mesaj tut
- [ ] `addLog`: son 500 log tut (eski logları `IndexedDB archive`'a yaz)
- [ ] `addExam`: sınırlama gerek yok, muhtemelen max 200 deneme
- [ ] `firestoreSync.ts`'de `chatHistory` push edilirken sadece son 30'u gönder

---

### BUG-005 · War Room JSON Schema Validation Yok

**Dosya:** `src/services/warRoomService.ts`  
**Durum:** 🟠 Acil — AI hatalı format döndürünce crash  

```ts
// ❌ Sadece Array.isArray kontrolü var
const parsedData = JSON.parse(match[0]);
if (!Array.isArray(parsedData)) throw new Error('JSON formatı hatalı');

// ✅ Her field'ı validate et
const questions = parsedData.map((q: any, i: number) => {
  if (!q.text || typeof q.text !== 'string') {
    throw new Error(`Soru ${i}: text eksik`);
  }
  if (!Array.isArray(q.options) || q.options.length < 4) {
    throw new Error(`Soru ${i}: options eksik veya yetersiz`);
  }
  if (!q.correctAnswer || !['A','B','C','D','E'].includes(q.correctAnswer)) {
    throw new Error(`Soru ${i}: correctAnswer geçersiz`);
  }
  // ...
});
```

**Yapılacaklar:**
- [ ] `zod` paketi ekle ve `WarRoomQuestionSchema` tanımla
- [ ] Ya da manuel validation helper yaz: `validateWarRoomQuestion(q: unknown): WarRoomQuestion`
- [ ] Validation hatası durumunda fallback mock soruya düşme mekanizmasını iyileştir

---

### BUG-006 · Coach Chat Init: useEffect Çift Tetiklenme Riski

**Dosya:** `src/App.tsx`  
**Durum:** 🟡 Orta  

```tsx
// ❌ chatHistory.length dependency'de — chatHistory her değişince re-evaluate
useEffect(() => {
  if (activeTab === 'coach' && store.chatHistory.length === 0) {
    store.addChatMessage({ ... });
  }
}, [activeTab, store.chatHistory.length]); // ← problem burada
```

```tsx
// ✅ useRef ile bir kez çalıştır
const chatInitializedRef = useRef(false);
useEffect(() => {
  if (activeTab === 'coach' && !chatInitializedRef.current && store.chatHistory.length === 0) {
    chatInitializedRef.current = true;
    store.addChatMessage({ ... });
  }
}, [activeTab]);
```

**Yapılacaklar:**
- [ ] `useRef` flag ekle
- [ ] `dependency array`'den `store.chatHistory.length` çıkar

---

### BUG-007 · api/ai.ts In-Memory Rate Limiter Vercel'de Etkisiz

**Dosya:** `api/ai.ts`  
**Durum:** 🟡 Orta — Serverless cold start'ta sıfırlanıyor  

```ts
// ❌ Her cold start'ta sıfırlanan Map
const rateLimitBucket = new Map<string, {...}>();
```

**Yapılacaklar:**
- [ ] Kısa vadeli: Vercel'de `duration` limiti yüksek tut (rate limit yetersiz de olsa overflow engellenir)
- [ ] Uzun vadeli: Upstash Redis ile gerçek rate limiting
  ```ts
  import { Ratelimit } from "@upstash/ratelimit";
  import { Redis } from "@upstash/redis";
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "30 s"),
  });
  ```
- [ ] `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` env ekle

---

## 🟡 ORTA ÖNCELİKLİ BUGLAR

---

### BUG-008 · MorningBlocker: Soru ve Cevap Hardcoded

**Dosya:** `src/components/MorningBlocker.tsx`  
**Durum:** 🟡 Orta — Her gün aynı soru çıkıyor, cevap kaynak kodda açık  

```ts
// ❌ Hardcoded
const correctAnswer = "0.5";
```

**Yapılacaklar:**
- [ ] `getCoachResponse` ile öğrencinin zayıf konularından dinamik soru üret
- [ ] Soruyu `sessionStorage`'a cache'le (günde bir kez üretilsin)
- [ ] `correctAnswer` yerine AI'ın doğrulama yapmasına izin ver
- [ ] Fallback olarak hardcoded soru bankası tut (offline durumu için)

---

### BUG-009 · gemini.ts: Store Servis İçinde Import Ediliyor

**Dosya:** `src/services/gemini.ts`  
**Durum:** 🟡 Orta — Tight coupling, test edilemez  

```ts
// ❌ Servis içinde store import
import { useAppStore } from '../store/appStore';
const store = useAppStore.getState();
```

```ts
// ✅ userState'i parametre olarak al (zaten options.userState var)
export async function getCoachResponse(
  userMessage: string,
  context: string,
  chatHistory: ChatMessage[],
  options?: { userState?: any; ... }
): Promise<string> {
  // options.userState'i kullan, store'u import etme
}
```

**Yapılacaklar:**
- [ ] `useAppStore.getState()` çağrısını kaldır
- [ ] `options.userState` fallback'ini `undefined` yap, caller'ları güncelle
- [ ] `App.tsx`'de `getCoachResponse` çağrılarında `userState` parametresini geç

---

### BUG-010 · ExamEntryModal Score Key'leri Tutarsız

**Dosya:** `src/components/forms/ExamEntryModal.tsx` & `src/components/ExamDetailModal.tsx`  
**Durum:** 🟡 Orta  

`ExamEntryModal` section adlarını key olarak kullanıyor (`sec.name`). Eğer section ismi değişirse eski veriler okunamamaz hale gelir. Ayrıca `ExamDetailModal` bu key'lere göre render yapıyor — uyumsuzluk olunca boş görünüm.

**Yapılacaklar:**
- [ ] Section'lar için sabit `id` kullan (`sec.id`) yerine `sec.name`
- [ ] Migration: mevcut store'daki exam verilerini normalize et
- [ ] `ExamDetailModal.tsx` render'ını `scores[subject]` yerine type-safe accessor'la güncelle

---

### BUG-011 · appStore signOut Stub

**Dosya:** `src/store/appStore.ts`  
**Durum:** 🟡 Düşük  

```ts
// Boş stub — çağrılırsa hiçbir şey yapmıyor
signOut: async () => {},
```

**Yapılacaklar:**
- [ ] `store.signOut()` çağrısı varsa `useAuth`'un `signOut`'una yönlendir
- [ ] Ya stub'ı kaldır ya da `console.warn("store.signOut deprecated, use useAuth.signOut")` ekle

---

### BUG-012 · WarRoomResultScreen: timeSpentSeconds Her Zaman 0

**Dosya:** `src/hooks/useWarRoom.ts`  
**Durum:** 🟡 Orta  

```ts
// finishSession içinde
result: { correct, wrong, empty, net, accuracy, timeSpentSeconds: 0 } // ← hardcoded 0!
```

**Yapılacaklar:**
- [ ] Session başlangıcından `finishSession`'a kadar geçen süreyi hesapla
- [ ] `warRoomSession.startTime` (zaten var) kullan: `Math.round((Date.now() - session.startTime) / 1000)`

---

### BUG-013 · FlapClock: Animasyon Sadece Görsel, Değer Yanlış

**Dosya:** `src/components/FlapClock.tsx`  
**Durum:** 🟡 Düşük  

`AnimatePresence` / `motion.div` ile yapılan flip animasyonu `rotateX: -180` animate ediyor ama her saniye yeni `key` geldiğinde `initial: 0 → animate: -180` yeniden başlıyor. Görsel olarak doğru görünüyor ama `backface-hidden` CSS class'ı Tailwind'de yok.

**Yapılacaklar:**
- [ ] `backface-hidden` için `style={{ backfaceVisibility: 'hidden' }}` ekle
- [ ] Ya da CSS'e `.backface-hidden { backface-visibility: hidden; }` ekle

---

## 🟢 PERFORMANS İYİLEŞTİRMELERİ

---

### PERF-001 · LogHistory: Virtual Scroll Yok

**Dosya:** `src/App.tsx` → `LogHistory` component  

Yüzlerce log entry'sinde tüm DOM aynı anda render ediliyor. 500+ log'da belirgin yavaşlama.

**Yapılacaklar:**
- [ ] `react-window` veya `@tanstack/react-virtual` ekle
- [ ] `FixedSizeList` ile sadece görünür alandaki logları render et
- [ ] Alternatif: sayfa başına 20 kayıt göster, "Daha Fazla Yükle" butonu ekle

---

### PERF-002 · SubjectMap: Her Render'da Tüm Konuları İşliyor

**Dosya:** `src/App.tsx` → `SubjectMap` component  

`SubjectMap` her parent render'da `subjects.reduce(...)` çalıştırıyor.

**Yapılacaklar:**
- [ ] `useMemo` ile `grouped` objesini cache'le
- [ ] `SubjectMap`'i `React.memo` ile sar

---

### PERF-003 · debouncedPush: Her Store Değişikliğinde Firestore Push

**Dosya:** `src/App.tsx` → `useAppStore.subscribe`  

Store'a her yazma (mouse hareketi dahil state değişiklikleri) Firestore push tetikliyor.

**Yapılacaklar:**
- [ ] Sadece kritik state değişikliklerini (log, exam, profile, trophies) subscribe et
- [ ] `useAppStore.subscribe` yerine spesifik selector'larla `shallow` compare kullan
- [ ] Debounce süresini 2s'den 5s'ye çıkar

---

### PERF-004 · StrategyHub: Tüm Hesaplamalar Her Render'da

**Dosya:** `src/components/StrategyHub.tsx`  

`calcSourceROI`, `predictTYTAndAYT`, `calculatePredictedNet` her render'da çağrılıyor. `useMemo` var ama `store.logs`/`store.exams` dependency'leri çok broad.

**Yapılacaklar:**
- [ ] Hesaplama sonuçlarını store'da cache'le veya `useMemo` dependency'lerini daralt
- [ ] `yokAtlasChase` hesaplaması için `useMemo` ekle (şu an yok)

---

### PERF-005 · Bundle Size: Gereksiz Import'lar

**Dosya:** `package.json`, genel  

```json
"puppeteer": "^24.40.0" // sadece atlas-data-engine'de kullanılmalı, ana pakette gereksiz
"axios": "^1.14.0"      // hiçbir yerde kullanılmıyor, native fetch var
```

**Yapılacaklar:**
- [ ] `puppeteer`'ı ana `package.json`'dan kaldır, sadece `atlas-data-engine/package.json`'da tut
- [ ] `axios`'u kaldır (hiçbir yerde kullanılmıyor)
- [ ] `vite-bundle-visualizer` ile bundle analizi yap
- [ ] `recharts` tree-shaking'ini kontrol et

---

## 🔵 YENİ ÖZELLİKLER

---

### FEAT-001 · AI Streaming (SSE) Entegrasyonu

**Öncelik:** Yüksek  
**Etki:** Coaching deneyimini dramatik iyileştiriyor  

Gemini 2.0 Flash streaming destekliyor. Şu an tam yanıt bekleniyor (~3-5s blank).

**Yapılacaklar:**
- [ ] `api/ai.ts`'i Vercel Edge Function'a dönüştür
- [ ] `generateContentStream` ile SSE response yaz
- [ ] `src/services/gemini.ts`'de `ReadableStream` ile token-by-token render
- [ ] Coach chat'te "typing" animasyonu yerine gerçek streaming göster
- [ ] Hata durumunda graceful fallback: streaming durursa buffer'ı göster

---

### FEAT-002 · Sesli Log (Web Speech API)

**Öncelik:** Orta  
**Dosya:** `src/components/forms/LogEntryWidget.tsx` → `handleVoiceLog`  

Şu an `alert("çok yakında")` yazıyor.

**Yapılacaklar:**
- [ ] `SpeechRecognition` API ile browser-native transkript al (ücretsiz)
- [ ] Transkripti `parseVoiceLog` serverless function'a gönder (zaten var)
- [ ] Parsed sonucu form alanlarına otomatik doldur
- [ ] Fallback: `SpeechRecognition` yoksa OpenAI Whisper `/api/whisper` endpoint'i
- [ ] Mikrofon izin akışını handle et (denied durumu)

---

### FEAT-003 · Veri Export (CSV / JSON)

**Öncelik:** Orta  

**Yapılacaklar:**
- [ ] `src/utils/exportData.ts` oluştur
  ```ts
  export function exportLogsAsCSV(logs: DailyLog[]): void
  export function exportExamsAsCSV(exams: ExamResult[]): void
  export function exportFullBackup(): string // JSON
  ```
- [ ] Ayarlar sayfasına "Verilerini İndir" butonu ekle
- [ ] `Blob` + `URL.createObjectURL` ile tarayıcıda indirme tetikle
- [ ] Import feature: JSON backup'tan geri yükleme

---

### FEAT-004 · ELO Geçmiş Grafiği

**Öncelik:** Orta  
**Dosya:** `src/components/ProfileShowcase.tsx`, `src/store/appStore.ts`  

Şu an sadece mevcut ELO gösteriliyor, trend yok.

**Yapılacaklar:**
- [ ] Store'a `eloHistory: { date: string; score: number }[]` ekle
- [ ] `addLog` ve `addExam` action'larında `eloHistory`'ye snapshot push et
- [ ] `ProfileShowcase.tsx`'de `LineChart` ile ELO trend grafiği göster
- [ ] Son 30 günlük ELO değişimini göster

---

### FEAT-005 · Trophy Unlock Animasyonu

**Öncelik:** Düşük-Orta  

**Yapılacaklar:**
- [ ] `canvas-confetti` paketi ekle (2kB gzip)
- [ ] `unlockTrophy` action'ı bir event emit etsin (Zustand persist dışında)
- [ ] `App.tsx`'de bu event'i dinle, trophy adını içeren toast + konfeti tetikle
- [ ] Toast component: trophy ikonu, isim, açıklama; 4 saniye sonra kapan

---

### FEAT-006 · MorningBlocker: Gemini'den Dinamik Soru

**Öncelik:** Orta  
**Dosya:** `src/components/MorningBlocker.tsx`  

**Yapılacaklar:**
- [ ] Sabahları `getCoachResponse` çağrısı yap, `forceJson: true` ile soru üret
- [ ] Schema: `{ topic, questionText, options: string[], correctAnswer, hints: string[] }`
- [ ] Soruyu `sessionStorage`'a cache'le: `morning_question_${today}`
- [ ] Yüklenirken skeleton göster
- [ ] Fallback soru bankası (en az 20 soru, offline için)
- [ ] Sadece zayıf konulardan (`store.profile.weakSubjects`) soru gelsin

---

### FEAT-007 · PWA: Offline Indicator + Install Prompt

**Öncelik:** Düşük  

**Yapılacaklar:**
- [ ] `src/components/OfflineBanner.tsx` oluştur
  ```tsx
  // navigator.onLine + online/offline event listener
  // Offline'da kırmızı banner: "Çevrimdışı — değişiklikler yerel kaydedildi"
  ```
- [ ] `BeforeInstallPromptEvent` ile PWA install button (header'da veya settings'te)
- [ ] Service worker update prompt: "Yeni versiyon hazır — Yenile"

---

### FEAT-008 · War Room: Mobil Bottom Sheet (Coach Panel)

**Öncelik:** Orta  
**Dosya:** `src/components/warroom/WarRoomLayout.tsx`  

`<!-- İleride buraya BottomSheet eklenecek -->` notu var.

**Yapılacaklar:**
- [ ] Motion ile swipe-up bottom sheet component yaz
- [ ] Trigger: ekranın altındaki küçük tutamaç (handle)
- [ ] İçerik: `CoachPanel` içeriğini mobilde bottom sheet'e taşı
- [ ] `useViewport` hook'u ile `isMobile` true'ysa bottom sheet, değilse sidebar

---

### FEAT-009 · OCR ile Test Okuma

**Öncelik:** Düşük  
**Dosya:** `src/components/forms/LogEntryWidget.tsx` → `handleOcrLog`  

Şu an `alert("çok yakında")`.

**Yapılacaklar:**
- [ ] `Tesseract.js` browser-side OCR veya Google Vision API
- [ ] Fotoğraf yükle → D/Y/B sayılarını parse et → form alanlarına doldur
- [ ] Çoktan seçmeli soru kağıdı tanıma için özel prompt mühendisliği

---

### FEAT-010 · Konu Heatmap (SubjectsPage)

**Öncelik:** Düşük  
**Dosya:** `src/App.tsx` → `SubjectMap`  

**Yapılacaklar:**
- [ ] Her konu için log bazlı "çalışma yoğunluğu" hesapla
- [ ] `SubjectMap` kart renklerini durum yerine yoğunluğa göre shade et
- [ ] Tooltip: konu üzerine hover'da "X saat, %Y doğruluk, son: Z"

---

### FEAT-011 · Deneme Karşılaştırma Görünümü

**Öncelik:** Düşük  
**Dosya:** `src/components/ExamDetailModal.tsx` veya yeni component  

**Yapılacaklar:**
- [ ] İki deneme seçip yan yana karşılaştır
- [ ] Her ders için delta (artış/azalış) göster
- [ ] Radar chart ile görsel karşılaştırma

---

## 🟣 UX / ARAYÜZ GELİŞTİRMELERİ

---

### UX-001 · alert() / window.confirm() → Toast & Dialog Sistemi

**Öncelik:** YÜKSEK  
**Dosya:** `src/App.tsx` ve birçok component  

15+ yerde `alert()` ve `window.confirm()` çağrısı var. Browser native dialog tema ile uyumsuz, async işlemleri blokluyor.

**Yapılacaklar:**
- [ ] Zustand'a `notifications: Toast[]` state ekle
  ```ts
  interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }
  ```
- [ ] `src/components/ToastContainer.tsx` yaz (Motion AnimatePresence ile)
- [ ] `src/components/ConfirmModal.tsx` yaz (Promise-based)
  ```ts
  const confirmed = await confirmDialog("Silmek istiyor musun?");
  ```
- [ ] Tüm `alert()` → `toast.success/error()`
- [ ] Tüm `window.confirm()` → `confirmDialog()`

---

### UX-002 · Koç Chat: Komut Önerileri (Slash Commands)

**Öncelik:** Orta  
**Dosya:** `src/App.tsx` → coach section  

**Yapılacaklar:**
- [ ] Input'a `/` yazınca komut listesi popup'ı göster
- [ ] Komutlar: `/plan`, `/log`, `/deneme`, `/anla`, `/analiz`
- [ ] Keyboard navigation: ok tuşları + Enter ile seç
- [ ] Her komutun kısa açıklamasını tooltip'te göster

---

### UX-003 · Dark/Light Mode: Sistem Tercihi Senkronizasyonu

**Dosya:** `src/components/ThemeToggle.tsx`, `src/store/appStore.ts`  

Şu an sistem teması değişince uygulama güncellemiyor.

**Yapılacaklar:**
- [ ] `window.matchMedia('(prefers-color-scheme: dark)').addEventListener` ekle
- [ ] Kullanıcı manuel değiştirmediyse sistem tercihini takip et
- [ ] 3. seçenek: "Sistem" modu ekle (Auto / Light / Dark)

---

### UX-004 · Profil Sayfası: Progress Animasyonları

**Dosya:** `src/components/ProfileShowcase.tsx`  

**Yapılacaklar:**
- [ ] Progress bar'lar mount'ta 0'dan animate-in
- [ ] ELO değer sayacı (CountUp animation)
- [ ] Pasta grafik enter animation

---

### UX-005 · War Room: Soru Geçişi Keyboard Shortcut

**Dosya:** `src/components/warroom/QuestionNav.tsx`  

**Yapılacaklar:**
- [ ] `←` / `→` tuşları: önceki/sonraki soru
- [ ] `A-E` tuşları: şık seçme
- [ ] `P` tuşu: kalem/imleç toggle
- [ ] Shortcut overlay: `?` tuşu ile göster/gizle

---

### UX-006 · Log Girişi: Soru Sayısı Otomatik Hesaplama

**Dosya:** `src/components/forms/LogEntryWidget.tsx`  

**Yapılacaklar:**
- [ ] D + Y + B toplamını anlık göster
- [ ] Net oranını form içinde anlık hesapla ve göster
- [ ] Hız: süre/soru otomatik hesapla ve göster

---

## ⚪ TEKNİK BORÇ

---

### DEBT-001 · `any` Kullanımları TypeScript'te

**Durum:** Yaygın  

Birçok component ve hook'ta `any` kullanılıyor.

**Yapılacaklar:**
- [ ] `ExamDetailModal.tsx`'de `(s: any)` → `SubjectScore` tipi tanımla
- [ ] `CoachPanel.tsx`'de `(msg: any)` → `ChatMessage` tipi kullan
- [ ] `QuizEngine.tsx`'de `QuizQuestion` interface'ini genişlet
- [ ] `tsconfig.json`'da `"noImplicitAny": true` ekle ve hataları gider

---

### DEBT-002 · `console.log` / `console.warn` Production'da Temizlenmeli

**Yapılacaklar:**
- [ ] `vite.config.ts`'e `build.minify` ile `drop_console: true` ekle
- [ ] Ya da `eslint-plugin-no-console` kuralı

---

### DEBT-003 · Atlas Data Engine Entegrasyonu Eksik

**Dosya:** `atlas-data-engine/`, `src/services/atlasService.ts`  

Atlas servisi tanımlanmış ama gerçek YÖK Atlas scraping yok. `AtlasExplorer.tsx` her zaman boş array döndürüyor.

**Yapılacaklar:**
- [ ] Playwright scraper'ı tamamla (`atlas-data-engine/src/services/scraper.ts`)
- [ ] Redis cache katmanını ekle
- [ ] `atlasService.search()` mock yerine gerçek endpoint'e bağla
- [ ] Rate limiting: YÖK Atlas'ı aşırı yüklememek için throttle

---

### DEBT-004 · `src/services/supabaseClient.ts` Kullanılmıyor

**Yapılacaklar:**
- [ ] Supabase entegrasyonu kullanılıyorsa gerçek implementasyonu ekle
- [ ] Kullanılmıyorsa dosyayı sil ve paketi kaldır (`@supabase/supabase-js`)

---

### DEBT-005 · Test Coverage: Sıfır

**Yapılacaklar:**
- [ ] `vitest` + `@testing-library/react` kur
- [ ] `statistics.ts` fonksiyonları için unit test yaz (en kolay başlangıç)
- [ ] `appStore.ts` action'ları için test yaz
- [ ] `api/ai.ts` için mock ile integration test
- [ ] CI'da test çalıştır (`.github/workflows/test.yml`)

---

### DEBT-006 · `vite.config.ts`: CEREBRAS_API_KEY Eksik

**Dosya:** `vite.config.ts`  

Memory notlarında belirtilmiş: Cerebras key define bloğuna eklenmeli.

```ts
// vite.config.ts define bloğu (eğer client-side kullanılıyorsa)
define: {
  'import.meta.env.VITE_CEREBRAS_API_KEY': JSON.stringify(process.env.CEREBRAS_API_KEY),
}
```

**Yapılacaklar:**
- [ ] `api/ai.ts` serverless'ta `process.env.CEREBRAS_API_KEY` kullanıyor → frontend define'a gerek yok
- [ ] Vercel dashboard'da `CEREBRAS_API_KEY` environment variable'ın eklendiğini doğrula

---

### DEBT-007 · `axios` Paketi Kullanılmıyor

**Dosya:** `package.json`  

`axios` dependencies'de var ama hiçbir yerde import edilmiyor.

**Yapılacaklar:**
- [ ] `npm uninstall axios`

---

### DEBT-008 · `puppeteer` Ana package.json'da

**Dosya:** `package.json`  

Puppeteer sadece `atlas-data-engine`'de kullanılmalı. Ana pakette olması bundle size'ı şişiriyor (Playwright zaten var).

**Yapılacaklar:**
- [ ] `npm uninstall puppeteer` (ana paketten)
- [ ] `atlas-data-engine/package.json`'a playwright zaten ekli, puppeteer'a gerek yok

---

## 📅 SPRINT ÖNERİSİ

### Sprint 1 — Güvenlik & Kritik Buglar (1-2 gün)
```
SEC-001  Supabase key → env
SEC-002  Firestore rules düzelt
BUG-001  AdminPanelModal çift render
BUG-004  Array pruning (chatHistory, logs)
BUG-007  Rate limiter (geçici fix)
```

### Sprint 2 — Stabilizasyon (2-3 gün)
```
BUG-002  useOfflineSync hook fix
BUG-003  syncQueue module-level listener
BUG-005  WarRoom JSON validation
BUG-006  Coach init useEffect
BUG-012  timeSpentSeconds hesaplama
UX-001   alert() → Toast sistemi (blocker)
```

### Sprint 3 — Performans (2-3 gün)
```
PERF-001 Virtual scroll (LogHistory)
PERF-003 Firestore push optimizasyonu
PERF-005 Bundle cleanup (axios, puppeteer)
DEBT-007 axios kaldır
DEBT-008 puppeteer kaldır
```

### Sprint 4 — Yeni Özellikler A (3-4 gün)
```
FEAT-001 AI Streaming
FEAT-002 Sesli log
FEAT-006 Dinamik MorningBlocker sorusu
FEAT-004 ELO geçmiş grafiği
```

### Sprint 5 — Yeni Özellikler B (3-4 gün)
```
FEAT-003 Veri export
FEAT-005 Trophy animasyonu
FEAT-007 PWA offline indicator
FEAT-008 War Room mobil bottom sheet
UX-002   Slash commands
```

### Backlog (Zaman buldukça)
```
FEAT-009 OCR
FEAT-010 Konu heatmap
FEAT-011 Deneme karşılaştırma
UX-003   Sistem teması senkronizasyonu
UX-005   War Room keyboard shortcuts
DEBT-001 TypeScript any cleanup
DEBT-003 Atlas Data Engine gerçek scraping
DEBT-005 Test coverage
```

---

## Notlar

- **`api/ai.ts` provider sırası:** Cerebras → Gemini → Groq → OpenRouter. Herhangi birinin anahtarının Vercel dashboard'a eklendiğinden emin ol.
- **IndexedDB storage key:** `yks-store` — local geliştirmede temizlemek için DevTools > Application > IndexedDB
- **Firestore deploy:** `firebase deploy --only firestore:rules,firestore:indexes`
- **Vercel env variables:** `GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` — hepsinin production environment'ında tanımlı olduğunu kontrol et

---

*Bu dosya her sprint başında güncellenmeli. Tamamlanan maddeler `~~strikethrough~~` ile işaretlenip arşive taşınabilir.*