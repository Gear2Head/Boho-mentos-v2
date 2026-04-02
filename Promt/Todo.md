
Bohibo9150Kübra

İşte tüm projeni kapsayan interaktif master TODO listesi. Görevlere tıklayarak tamamlandı olarak işaretleyebilir, filtreleri kullanarak sadece belirli kategorilere odaklanabilirsin.

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