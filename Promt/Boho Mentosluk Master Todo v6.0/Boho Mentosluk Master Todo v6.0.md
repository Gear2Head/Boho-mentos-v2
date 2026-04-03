## Boho Mentosluk Master Todo v6.0

### Özet
- Öncelik artık üç eksenli: `kritik buglar + güvenlik + çok cihazlı veri tutarlılığı`.
- Eklenen en büyük başlık, mevcut kırık sync yapısını bırakıp Firestore’u gerçek kaynak haline getirmek: kullanıcı `loglar`, `müfredat`, `YÖK hedefleri`, `koç sohbet geçmişi`, `denemeler`, `mezarlık`, `ajanda`, `focus seansları` ve ilgili metrikleri cihazlar arasında eksiksiz görmeli.
- Mevcut kodda bunun önündeki temel engeller doğrulandı:
  - `api/sync.ts` bugün gerçek DB yazmıyor, sadece payload logluyor.
  - Uygulama içi değişikliklerin çoğu düzenli cloud write akışına bağlı değil; `pushToFirestore` ağırlıkla manuel sync ve auth geçişlerinde kullanılıyor.
  - Tüm kullanıcı verisini tek `users/{uid}` dokümanına gömmek ölçek ve 1MB limit açısından riskli.

### P0 — Kritik Buglar
- [ ] `BUG-007` log tarih formatını ISO 8601’e taşı ve tüm parse noktalarını tek util üstünden çalıştır.
- [ ] `BUG-001` IDB hata yönetimini sessiz uyarıdan görünür hata/notification modeline çevir.
- [ ] `BUG-006` `beforeunload` içindeki async sync yaklaşımını kaldır; `sendBeacon` veya gerçek Firestore offline persistence kullan.
- [ ] `BUG-010` MorningBlocker unlock bilgisini store + persist katmanına taşı; aynı gün tekrar çıkmasın.
- [ ] `BUG-005` War Room `warRoomMode` tip çatışmasını kapat; `draw/analysis` davranışını yalnız `drawingMode` yönetsin.
- [ ] `BUG-009` `chatHistory` kesme mantığını `[..., message].slice(-100)` olarak düzelt.
- [ ] `BUG-008` `addExam` içinde tüm alt skorları normalize et; `NaN/undefined` sızmasını kapat.
- [ ] `BUG-002` log kesme ile cloud write sırasını ayır; yeni log önce incremental olarak işlenmeli.
- [ ] `BUG-003` in-memory rate limit geçici çözümünü kaldır; kalıcı KV/Redis tabanlı rate limit ekle.

### P0 — Çok Cihazlı Veri Eşitleme
- [ ] Sync mimarisini tekleştir; `firestoreSync.ts`, `useOfflineSync.ts`, `utils/syncQueue.ts`, `api/sync.ts` içindeki paralel/çakışan yaklaşımları bırak.
- [ ] Firestore’u source of truth yap; local Zustand/IDB yalnız cache ve offline queue olarak kalsın.
- [ ] Veri modelini tek dev doküman yerine ayrıştır:
  - `users/{uid}`: profil, tema, rol, özet sayaçlar, son sync meta.
  - `users/{uid}/logs`
  - `users/{uid}/exams`
  - `users/{uid}/failedQuestions`
  - `users/{uid}/chatMessages`
  - `users/{uid}/agendaEntries`
  - `users/{uid}/focusSessions`
  - `users/{uid}/targets` veya profil altı `targetGoals`
  - `users/{uid}/system/progress` benzeri tek doküman: `tytSubjects`, `aytSubjects`, `eloScore`, `streakDays`, `activeAlerts`, `isPassiveMode`
- [ ] Her kayda `id`, `updatedAt`, `createdAt`, `deviceId`, `deletedAt?` alanları ekle.
- [ ] Full snapshot push yerine entity-bazlı incremental sync uygula.
- [ ] `useAuth` içindeki ilk pull + realtime `onSnapshot` akışını subcollection listener’lara böl.
- [ ] Uygulama içindeki mutasyonları sync-aware action’lara taşı:
  - `addLog`, `addExam`, `addChatMessage`, `addFailedQuestion`, `removeFailedQuestion`, `updateAgendaEntry`, `setProfile`, konu ilerleme güncellemeleri, hedef program ekleme/silme.
- [ ] Manual “buluta eşitle” butonu kalsın ama acil kurtarma aracı olsun; normal akış otomatik sync olsun.
- [ ] Offline queue yalnız gerçek yazma operasyonlarını saklasın; online olunca aynı Firestore writer üzerinden replay etsin.
- [ ] Diğer cihazdaki değişiklikler local state’i kısmi overwrite ile bozmasın; entity bazlı merge uygula.
- [ ] Silme işlemleri için hard delete yerine önce tombstone kullan; diğer cihazlar silineni de görsün.
- [ ] Koç sohbet geçmişini de collection’a taşı; tek array alanında tutma.
- [ ] YÖK hedef verilerini `targetGoals` ile kalıcı sync et; dashboard bu veriyi cloud’dan da okuyabilsin.
- [ ] Veri bütünlüğü testi ekle: cihaz A’da log/deneme/mezarlık/koç mesajı eklenince cihaz B’de görünmeli.

### P0 — Güvenlik
- [ ] Firestore rules içindeki plaintext super admin UID modelini custom claims’e taşı.
- [ ] `config/admin.ts` içindeki sabit UID bağımlılığını azalt; rolü cloud claims veya güvenli admin metadata üzerinden çöz.
- [ ] `firestore.rules` koleksiyon bazında yeniden yaz; `users`, `userData`, admin logları ve sistem ayarlarını açık ve dar yetkilerle ayır.
- [ ] `api/sync.ts` gerçek endpoint olacaksa auth doğrulaması olmadan hiçbir yazma kabul etme.
- [ ] `spotifyService.ts` auth akışını backend-first modele taşı; client-side secret riski bırakma.
- [ ] `ogmScraper.cjs` kullanımını lisans/toS netleşene kadar dev-only veya kapalı hale getir.

### P1 — Koç V2
- [ ] Koçu veri-temelli çalışma koçu olarak yeniden kur.
- [ ] Tipli `CoachSystemContext` tanımla: profil, son loglar, denemeler, müfredat, hedefler, alertler, streak, elo.
- [ ] Ortak `CoachIntent` kümesi ekle: `daily_plan`, `log_analysis`, `exam_analysis`, `topic_explain`, `warroom_analysis`, `intervention`, `general_chat`.
- [ ] `/api/ai` çıktısını structured `directive` modeline geçir:
  - `headline`, `summary`, `tasks[]`, `warnings[]`, `followUpQuestion`, `surface`
- [ ] Görev üretiminde ders, konu, kaynak, kapsam, süre ve neden zorunlu olsun.
- [ ] `Master koç` promptundaki disiplinli şablonları merkezileştir; kopya promptları yüzeylerden temizle.
- [ ] `Koç`, `Agenda`, `StrategyHub`, `War Room`, `CoachInterventionModal` aynı çekirdeği kullansın.
- [ ] `FEAT-002` son başarılı koç direktifini offline cache’le; bağlantı yoksa göster.

### P1 — Performans ve Dayanıklılık
- [ ] `PERF-005` IDB bağlantısını cache’le; her işlemde `openDB` açma.
- [ ] `PERF-003` `useAppStore()` toplu aboneliklerini selector/shallow kullanıma çevir.
- [ ] `PERF-004` `mathSpeedData` ve benzeri türetilmiş hesapları memoize et.
- [ ] `PERF-001` `App.tsx` içindeki büyük sekmeleri lazy load et.
- [ ] `PERF-002` `manualChunks` içine `@google/genai` ve Capacitor paketlerini ekle.
- [ ] `INFRA-001` `puppeteer` bağımlılığını `devDependencies`’e taşı.
- [ ] `INFRA-004` PWA `navigateFallback` ayarını SPA routing güvenli hale getir.

### P1 — Temizlik ve Kod Kalitesi
- [ ] `CLEAN-002` `Kübra` / `Gear_Head.` isim sızıntılarını tek sabit üzerinden düzelt.
- [ ] `CLEAN-003` tarih util katmanı oluştur; locale ve ISO kullanımını standardize et.
- [ ] `CLEAN-005` `analyzeUserData()` string builder’ı typed context builder’a çevir.
- [ ] `CLEAN-004` `SubjectList` index hesaplamasını `originalIndex` üstünden düzelt.
- [ ] `CLEAN-001` `spotifyService.ts` için ya kaldırma ya da açık “planned/inactive” durumu belirle.
- [ ] Root TypeScript kapsamını shipping app’i doğrulayacak şekilde daralt.

### P2 — Yeni Özellikler
- [ ] `FEAT-001` günlük PWA push hatırlatmaları.
- [ ] `FEAT-003` yarım kalan focus seansı checkpoint/restore akışı.
- [ ] `FEAT-004` ROI + sınav ağırlığı + zaman baskısı tabanlı konu borcu sıralaması.
- [ ] `FEAT-005` deneme karşılaştırma modu.
- [ ] `FEAT-006` ses ile log girişi.
- [ ] `FEAT-007` haftalık e-posta raporu.
- [ ] `FEAT-008` hatalı soru fotoğrafı ekleme.
- [ ] `FEAT-009` YÖK Atlas hedef-net fark kartları.
- [ ] `FEAT-010` Capacitor local notifications.

### P2 — UX / A11y
- [ ] `UX-003` mobilde klavye açılınca koç ekranı layout bozulmasını `VisualViewport` ile düzelt.
- [ ] `UX-004` tema FOUC sorununu `index.html` inline theme bootstrap ile çöz.
- [ ] `UX-005` teknik hata kodlarını kullanıcı dostu Türkçe mesajlara eşle.
- [ ] `UX-002` streak kırılma uyarısı ekle.
- [ ] `UX-001` profil fotoğrafı upload akışı ekle.
- [ ] `A11Y-001` ikon butonlara `aria-label` ekle.
- [ ] `A11Y-002` düşük kontrastlı küçük metinleri WCAG AA seviyesine çek.
- [ ] `A11Y-003` klavye navigasyonu ve modal focus trap ekle.

### Test Planı
- [ ] IDB write fail senaryosu kullanıcıya görünür hata üretmeli.
- [ ] Tüm AI provider’ları fail olunca kontrollü fallback görünmeli.
- [ ] 500+ log sonrasında cloud veri kaybı olmamalı.
- [ ] Offline -> online geçişte duplicate write olmamalı.
- [ ] Cihaz A’da eklenen `log`, `exam`, `failedQuestion`, `chatMessage`, `agenda`, `targetGoal`, `subject progress` cihaz B’de görünmeli.
- [ ] Kullanıcı sign-out/sign-in yaptığında local/cloud state birbirini ezmemeli.
- [ ] Root `lint` shipping app için temiz geçmeli.
- [ ] Local build tekrar doğrulanmalı.

### Varsayımlar
- Veritabanı katmanı Firestore olarak kalacak.
- Çok cihazlı tutarlılık için normalized subcollection yapısı, tek büyük kullanıcı dokümanına tercih edilecek.
- Offline-first destek devam edecek ama queue yalnız tek merkez sync writer üzerinden işleyecek.
- `atlas-data-engine` bu sprintte sync kapsamına dahil edilmeyecek.
