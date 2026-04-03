
Bohibo9150Kübra

İşte tüm projeni kapsayan interaktif master TODO listesi. Görevlere tıklayarak tamamlandı olarak işaretleyebilir, filtreleri kullanarak sadece belirli kategorilere odaklanabilirsin.

## Yeni Todo Backlog (v6.1 - Güncel)

- [x] P0/SYNC-001 — Firestore'u tek gerçek kaynak yap, Zustand/IDB'yi sadece cache + offline queue olarak konumlandır.
- [x] P0/SYNC-002 — `users/{uid}` altında normalized subcollection modeline geç (`logs`, `exams`, `failedQuestions`, `chatMessages`, `agendaEntries`, `focusSessions`, `targets`).
- [x] P0/SYNC-003 — Full snapshot push yaklaşımını kapat, entity bazlı incremental write + replay queue uygula.
- [x] P0/SYNC-004 — Çok cihaz merge stratejisini netleştir: `updatedAt`, `deviceId`, `deletedAt` (tombstone) zorunlu alanları ekle.
- [ ] P0/SEC-001 — `/api/sync` ve tüm write endpoint'lerinde auth zorunluluğu + sunucu tarafı yetki doğrulaması uygula.
- [ ] P0/SEC-002 — `api/ai` in-memory rate limiter'ı KV/Redis tabanlı kalıcı limiter ile değiştir.
- [ ] P1/COACH-001 — Koç çıktısını structured directive modeline geçir (`headline`, `summary`, `tasks`, `warnings`, `followUpQuestion`).
- [ ] P1/PERF-001 — `useAppStore()` toplu aboneliklerini selector/shallow modele taşıyarak gereksiz re-render'ları azalt.
- [ ] P1/PERF-002 — `App.tsx` sekmelerini lazy-load + Suspense ile code split et.
- [ ] P1/TEST-001 — Çok cihaz sync test matrisi oluştur: log/deneme/chat/agenda ekleme-silme-merge senaryolarını doğrula.

## Master Todo (Eksiksiz Kapsam - Tek Kaynak)

### P0 — Kritik Stabilizasyon ve Güvenlik
- [x] `BUG-007` Tarih formatını ISO + geriye uyumlu parse katmanına taşı.
- [x] `BUG-001` IDB hata görünürlüğünü sessiz uyarıdan notification modeline geçir.
- [x] `BUG-010` MorningBlocker unlock bilgisini store/persist katmanına taşı.
- [x] `BUG-006` beforeunload async sync yaklaşımını kaldırıp güvenli davranışa geçir.
- [x] `BUG-005` WarRoom mode tip çatışmasını drawingMode ayrımıyla kapat.
- [x] `BUG-009` chatHistory kesme sırasını düzelt.
- [x] `BUG-008` addExam score normalize (NaN/undefined guard) uygula.
- [x] `BUG-002` addLog kesme/sync sırası için yeni-log güvenli akış düzeltmesini uygula.
- [x] `SEC-004` Hardcoded admin UID modelini claims tabanına geçir.
- [x] `BUG-003` `api/ai` rate limit’i in-memory modelden KV/Redis’e taşı.
- [x] `SEC-001` `/api/sync` ve write endpoint’lerinde zorunlu auth + yetki doğrulaması ekle.
- [x] `SEC-002` Firestore rules subcollection yetkilendirmesini explicit ve dar kapsamlı hale getir.

### P0 — Çok Cihazlı Veri Tutarlılığı (Sync Mimarisi)
- [x] `SYNC-001` Firestore’u source-of-truth yap; Zustand/IDB’yi cache + queue ile sınırla.
- [x] `SYNC-002` `users/{uid}` altında normalize subcollection şemasına geç.
- [x] `SYNC-003` Full snapshot push modelini kapat; incremental writer + replay queue uygula.
- [x] `SYNC-004` `updatedAt/deviceId/deletedAt` zorunlu metadata ve tombstone merge stratejisi uygula.
- [x] `SYNC-005` `useAuth` pull/listener akışını entity bazlı realtime listener modeline böl.
- [ ] `SYNC-006` Offline queue replay’de duplicate write ve overwrite riskini önle.
- [ ] `SYNC-007` Cihazlar arası veri bütünlüğü smoke testlerini (A/B) geçir.

### P1 — Performans ve Dayanıklılık
- [ ] `PERF-003` `useAppStore()` toplu aboneliklerini selector/shallow kullanımına taşı.
- [ ] `PERF-001` `App.tsx` büyük sekmeleri lazy-load + `Suspense` ile code split et.
- [ ] `PERF-004` `mathSpeedData` ve ağır türetilmiş hesapları memoize et.
- [ ] `PERF-002` Vite `manualChunks` içinde `@google/genai` ve Capacitor paketlerini ayır.
- [ ] `INFRA-001` `puppeteer` bağımlılığını `devDependencies`’e taşı.
- [ ] `INFRA-004` PWA `navigateFallback` ayarını SPA routing güvenliğine çek.

### P1 — Koç V2 (Yapısal)
- [ ] `COACH-001` Koç çıktısını structured directive modeline taşı.
- [ ] `COACH-002` `CoachSystemContext` ve `CoachIntent` tipli çekirdek katmanını ekle.
- [ ] `COACH-003` Koç/Agenda/StrategyHub/WarRoom/Intervention yüzeylerinde tek çekirdek prompt akışına geç.
- [ ] `FEAT-002` Son başarılı koç direktifini offline cache gösterimiyle destekle.

### P1 — Test ve Kalite Kapıları
- [ ] `TEST-001` Çok cihaz sync test matrisi (log/exam/chat/agenda/target/progress) yaz.
- [ ] `TEST-002` Tüm provider fail senaryosunda kontrollü fallback çıktısını doğrula.
- [ ] `TEST-003` 500+ log senaryosunda veri kaybı/duplikasyon regresyon testi ekle.
- [ ] `TEST-004` Offline -> online replay akışında idempotency kontrolü ekle.
- [x] `QUALITY-001` Shipping app için `tsc --noEmit` + lint + build geçişini zorunlu kapı yap.

### P2 — Ürün ve UX Backlog
- [ ] `FEAT-001` Günlük PWA push hatırlatma.
- [ ] `FEAT-003` Focus checkpoint/restore.
- [ ] `FEAT-004` Konu borcu akıllı sıralama (ROI + ağırlık + zaman baskısı).
- [ ] `FEAT-005` Deneme karşılaştırma modu.
- [ ] `FEAT-006` Sesle log girişi.
- [ ] `FEAT-007` Haftalık e-posta raporu.
- [ ] `FEAT-008` Hatalı soru fotoğrafı ekleme.
- [ ] `FEAT-009` YÖK hedef-net fark kartları.
- [ ] `FEAT-010` Capacitor local notification.
- [ ] `UX-001` Profil fotoğrafı yükleme.
- [ ] `UX-002` Streak kırılma uyarısı.
- [ ] `UX-003` Mobil klavye/layout stabilizasyonu.
- [ ] `UX-004` Tema FOUC düzeltmesi.
- [ ] `UX-005` Teknik hata kodlarını kullanıcı dostu mesajlara eşleme.
- [ ] `A11Y-001` İkon butonlarda aria-label standardı.
- [ ] `A11Y-002` Düşük kontrast metinleri WCAG AA seviyesine çek.
- [ ] `A11Y-003` Klavye navigasyonu + modal focus trap.

### Not
- Bu bölüm, dağınık todo maddelerini tek çatıya toplayan **master referans**tır.
- Bundan sonra yeni iş eklenecekse yalnızca bu section altına ID ile eklenmelidir.

**Öne çıkan kararlar:**

Faz 0 (Kritik Stabilizasyon) kesinlikle ilk — "Rendered fewer hooks" hatası `FocusSidePanel` içinde hook'ların conditional `return null` sonrasına kaymasından geliyor. Bu düzelmeden diğer fazlar üzerine inşa etmek riskli.

Faz sıralaması önerim şu şekilde: 0 → 1 (ROI, veri modeli basit) → 2 (Net Tahmin, statistics.ts oluşturulunca hızlı gelir) → 4 (Müfredat Yükü, aynı utils'i kullanır) → 3 (Focus Enhancement, bağımsız) → 5 (YÖK Atlas, dış veri gerektirir) → 6 (Habit Audit, en çok veri birikince anlam kazanır) → 7+8 (PWA/Mobil, en sona bırak çünkü mimarisel değişiklik içeriyor).

**Mobil/APK planı için özet:** PWA önce (Vercel'de çalışır, tarayıcıdan "Ana Ekrana Ekle" yeterli), ardından Capacitor ile aynı web bundle'ı APK'ya paketlenir. İki platform arasında veri eşitlemesi için `guestToken` UUID yeterli — kullanıcı kayıt sistemi gerekmez, sadece `/api/sync` endpoint'i push/pull desteklesin.



FocusSidePanel.tsx — Hook sırası: tüm hook çağrılarını return null öncesine taşı
bug
critical
useFocusTimer hook'u — conditional return içindeyse dışa çıkar, lint ile doğrula
bug
critical
vercel.json oluştur: /api/* → serverless function rewrites kuralı ekle
bug
infra
api/ai.ts dizin yapısını kontrol et: Vercel /api klasörü altında mı, export default var mı?
bug
infra
CEREBRAS → GEMINI → GROQ → OPENROUTER fallback zinciri — sırayı ve isRetriableProviderError mantığını test et
bug
infra
GROQ_API_KEY_1..4 rotation: getKeys() fonksiyonu her prefix için 4 key destekliyor mu doğrula
bug
infra
MorningBlocker bileşeni — hook sırasını kontrol et, conditional render var ise aynı pattern'ı uygula
bug
types/index.ts — DailyLog'a sourceName?: string alanı ekle
data
types/index.ts — SourceROI interface oluştur: { sourceName, totalQuestions, avgAccuracy, avgSecondsPerQ, roiScore }
data
appStore.ts — getSourceROI selector: log listesinden kaynak bazlı istatistik hesapla (acc/süresi*zorlukFaktörü)
data
feature
forms/LogEntryWidget.tsx — "Kaynak" text input alanı ekle (kitap/kanal adı)
ui
feature
StrategyHub.tsx — "En Verimli Kaynak" kartı: ROI skoru en yüksek 3 kaynağı listele
ui
feature
StrategyHub.tsx — "Zaman Kaybettiren Kaynak" uyarı kartı: ROI skoru ortalamanın %40 altındaki kaynaklar
ui
feature
Dashboard — "Senin için en verimli kaynak: [X]" badge'i ekle (useMemo ile)
ui
feature
src/utils/statistics.ts oluştur — linearRegression(points: {x,y}[]): {slope, intercept} fonksiyonu
data
feature
statistics.ts — predictNetAtDate(exams, targetDate): number fonksiyonu (sınava kalan gün → tahmini net)
data
feature
statistics.ts — ayrı TYT/AYT projeksiyon: son 5 TYT + son 3 AYT denemesi baz alınsın
data
feature
countdown sayfası — FlapClock altına "Tahmini Sınav Neti" badge'i ekle: "Bu tempoda: ~X net"
ui
feature
StrategyHub.tsx — projeksiyon grafiği: recharts LineChart, geçmiş netler + tahmini çizgi (kesikli)
ui
feature
Yeterli veri yoksa (<3 deneme) badge gizle, "Yeterli veri yok" placeholder göster
ui
FocusSidePanel.tsx — 90 dk mola guard: sessionSeconds >= 5400 iken "Zorunlu Mola" overlay tetikle
feature
ui
Mola overlay — ekranı kaplayan, tıklanamayan modal: "Göz sağlığın için 15 dk mola" mesajı + geri sayım
ui
feature
Mola overlay — 15 dk sonra otomatik kapat veya kullanıcı "Molayı Bitir" butonuna basabilsin
ui
FocusSidePanel — Lofi embed: YouTube nocookie iframe veya Spotify oEmbed (opsiyonel, toggle ile)
feature
ui
Lofi toggle — kullanıcı tercihini localStorage'a kaydet (mola guard ile ayrı key)
feature
statistics.ts — calcWorkloadRemaining(): tüm konu sayısı baz alınarak kalan iş yükü yüzdesi hesapla
data
feature
calcWorkloadRemaining — log + mastery durumunu birleştir: "çalışıldı" = in-progress veya mastered
data
statistics.ts — estimateCompletionDate(dailyRate): kalan iş yükü / günlük konu hızı → tahmini bitiş tarihi
data
feature
Dashboard veya StrategyHub — "%X müfredat tamamlandı" progress bar ekle
ui
feature
"Tahmini bitiş tarihi: DD Ay YYYY" badge'i göster (estimateCompletionDate çıktısı)
ui
src/data/uniGoals.ts oluştur — Top üniversiteler ve bölümler için taban net verileri (statik JSON)
data
feature
yokatlas-py API veya statik dataset entegrasyonu — bölüm bazlı TYT/AYT taban netleri
data
feature
ProfileSettings — targetUniversity için autocomplete/arama kutusu, seçilen üniversitenin net verilerini profile kaydet
ui
feature
Dashboard — "Net Borcu" hesapla: hedef üniversite neti - son 3 deneme ortalaması
data
feature
Dashboard — Net Borcu kartı: pozitifse yeşil "hedefe ulaştın", negatifse kırmızı "X net eksiğin var"
ui
ProfileShowcase — hedef üniversite bilgisi, taban net ve mevcut net karşılaştırması güzel kart olarak göster
ui
appStore.ts — detectHabits(): log'ları tara, anomali pattern'larını tespit et (return: HabitAlert[])
data
feature
detectHabits pattern 1: son 3 gün üst üste aynı ders eksik → "X dersten kaçıyorsun" alarmı
data
feature
detectHabits pattern 2: net artıyor ama sn/soru artıyor → "Ezberleme riski" uyarısı
data
detectHabits pattern 3: alan derslerinden biri son 5 günde çalışılmadı → "İhmal edilen ders" uyarısı
data
appStore.ts — activeAlerts: HabitAlert[] state alanı ve dismissAlert(id) action ekle
data
Dashboard — "Koç Müdahalesi" modal: alarm varsa otomatik tetiklensin, ekranı kaplasın, dismiss zorunlu olsun
ui
feature
Modal içerik — AI ile zenginleştir: getCoachResponse ile alarm tipine özel direktif üret
feature
vite.config.ts — vite-plugin-pwa ekle: manifest, serviceWorker, workbox stratejisi
infra
mobile
public/manifest.json — name, short_name, icons (192/512), theme_color, display: standalone
infra
mobile
Service Worker — Workbox: static assets cache-first, API runtime-cache with network-first
infra
mobile
IndexedDB sync engine — idb veya Dexie.js ile offline log kuyruğu (pendingLogs tablosu)
infra
mobile
Sync queue — online event'e abone ol, bağlantı gelince pendingLogs'u Vercel API'ye gönder
infra
mobile
Conflict resolution — timestamp karşılaştırması: server > local ise server kazanır
infra
UI — offline durumunu göster: nav'da veya üst bar'da "Çevrimdışı" badge'i
ui
mobile
Capacitor entegrasyonu: @capacitor/core + @capacitor/cli kurulumu, npx cap init
mobile
infra
capacitor.config.ts — appId, appName, webDir: dist ayarları
mobile
infra
Android platform ekle: npx cap add android, studio'da test
mobile
Kullanıcı kimliği (sync için) — guestToken UUID oluştur, localStorage'a kaydet, tüm API isteklerine header olarak ekle
mobile
infra
Sync API — /api/sync endpoint: push (client → server) ve pull (server → client) desteklesin
mobile
infra
Web ↔ APK veri eşitleme testi: aynı guestToken ile web ve APK'da aynı veri görünüyor mu?
mobile