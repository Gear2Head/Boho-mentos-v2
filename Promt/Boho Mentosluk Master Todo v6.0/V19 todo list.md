# Boho Mentosluk V19 Todo List

> Durum: aktif genisletilmis backlog  
> Guncelleme tarihi: 2026-04-05  
> Kaynaklar: `Boho Mentosluk Master Todo v6.0`, repo taramasi, compile kontrolu, mevcut bug kataloglari, AI/Coach/Sync/Atlas kod incelemesi  
> Amac: projeyi stabil, derlenebilir, sync-guvenli ve gercekten fayda ureten bir YKS mentorluk sistemine donusturmek

## 1. Giris

Bu dosya, `Boho Mentosluk Master Todo v6.0` uzerine yazilan daha sertlestirilmis ve daha kapsamli V19 backlog'udur.

Bu versiyonun farki:

- Sadece onceki prompt backlog'unu tasimaz
- Repoda bugun gercekten bulunan compile/runtime/mimari sorunlari ekler
- KOÇ sistemini "chat ekranindan" alip "veri-temelli calisma komut sistemi" haline getirecek urun backlog'unu buyutur
- Split-brain veri modeli, yarim migration, yarim backend, yarim feature gibi tehlikeli ara durumlari acikca hedef alir

Ana hedefler:

- Derlenebilir ve ship edilebilir taban
- Tek source-of-truth veri modeli
- Tek AI/KOÇ cekirdegi
- Cok cihazli tutarli kullanici verisi
- Gercekten yoneten, takip eden ve baski kuran KOÇ sistemi
- War Room, Atlas, admin ve operasyon katmanlarinda yari-aktif alanlari ya tamamlama ya da temizleme

## 2. V19 Repo Gercegi Ozeti

Bugunku repo gercegi:

- Uygulama `React + Vite + Capacitor + Firebase + Vercel API` karmasi
- `src/App.tsx` hala asiri buyuk ve cok sayida sorumluluk tasiyor
- KOÇ tip sistemi ve prompt builder baslamis ama canli akista hala eski model kullaniliyor
- `api/ai.ts` ile `src/services/promptBuilder.ts` ayni sistemin iki farkli beyni gibi calisiyor
- Sync mimarisi birden fazla katmana bolunmus durumda
- Atlas akisi urun seviyesinde var gibi gorunuyor ama backend implementasyonu eksik
- Admin servisleri yeni Firestore modeline tam tasinmamis
- TypeScript build temiz degil

## 3. Kritik Yeni Bulgular

### Derleme seviyesi

- `tsc --noEmit` temiz gecmiyor
- KOÇ istemcisi `CoachIntent` ile uyumsuz action gonderiyor
- Spotify widget `unknown` response uzerinden property okuyor

### KOÇ seviyesi

- Typed directive modeli var ama birincil cevap kontrati degil
- Prompt builder var ama backend onu source of truth olarak kullanmiyor
- Agenda, StrategyHub, TopicExplain, Intervention ve App chat akislari farkli sekillerde AI cagiriyor
- KOÇ context'i merkezi selector yerine ekran bazli string birlestirme ile kuruluyor

### Veri ve sync seviyesi

- Root doc + subcollection + local persist + offline queue + manual sync bir arada
- Bos remote array merge davranisi yerel stale veriyi koruyabiliyor
- Sync queue altyapisi iki farkli yerde yasiyor
- Admin servisleri hala `userData` modeline bagli izler tasiyor

### Atlas seviyesi

- UI gercek arama deneyimi vaat ediyor
- Backend search placeholder
- Program details endpoint istemci tarafinda var ama backend tarafinda yok
- Scraper servisinde hardcoded/mock seviyesinde alanlar duruyor

### Operasyon seviyesi

- README proje gercegini yansitmiyor
- `clean` script'i Windows dostu degil
- Doktor scripti ve runtime scriptleri yardimci ama kalite kapisi yerine gecici tampon gibi duruyor

## 4. Oncelik Sistemi

- `P0`: release blocker, veri kaybi, compile kirigi, guvenlik veya KOÇ cekirdek arizasi
- `P1`: urun etkisi yuksek, mimari borc kapatan, KOÇ'u gercekten kullanisli yapan isler
- `P2`: buyuk urun gelisimi, kalite, UX, gozlemlenebilirlik
- `P3`: platform, mobil, CI, ileri operasyon, uzun vadeli buyume

## 5. P0 - Derleme ve Release Blokerlari

- `BUILD-001` `status: todo` `source: repo scan, typecheck` `repo_status: gemini istemcisi CoachIntent ile uyumsuz action gonderiyor` `files: src/services/gemini.ts, src/types/coach.ts, src/App.tsx` `action: istemci action modelini CoachIntent ile tam hizala; "coach" gibi legacy degerleri kaldir veya map et` `verification: typecheck temiz gecmeli ve action union tek yerden yonetilmeli`
- `BUILD-002` `status: todo` `source: repo scan, typecheck` `repo_status: SpotifyWidget unknown response uzerinden item/is_playing okuyor` `files: src/components/SpotifyWidget.tsx, src/services/spotifyService.ts` `action: Spotify API response tiplerini ekle, widget'i daralt ve feature flag kapaliysa compile-safe hale getir` `verification: tsc hatasi kapanmali`
- `BUILD-003` `status: todo` `source: repo scan` `repo_status: projede kritik akislarda yaygin any kullanimi var` `files: src/App.tsx, src/components/*, api/ai.ts, src/services/*` `action: AI, sync, exam, admin ve war-room yollarinda hedefli any cleanup sprinti yap` `verification: kritik modullerde any sayisi belirgin dusmeli`
- `BUILD-004` `status: todo` `source: repo scan` `repo_status: README ve scripts kurulum gerceginden kopuk` `files: README.md, package.json` `action: local dev, API proxy, Firebase env, Atlas engine ve Vercel davranisini gercek repo akisi ile yeniden yaz` `verification: sifir kurulum yapan biri README ile projeyi kaldirabilmeli`
- `BUILD-005` `status: todo` `source: repo scan` `repo_status: Windows ortaminda clean script kirik` `files: package.json` `action: platform bagimsiz clean komutu kullan` `verification: Windows PowerShell altinda clean komutu calismali`
- `BUILD-006` `status: todo` `source: repo scan` `repo_status: shipping app typecheck kapsami ile prompt/archive gultusu birbirine karisabilir` `files: tsconfig.json, atlas-data-engine/tsconfig.json` `action: app, api ve yan servisler icin net TS kapsam sinirlari belirle` `verification: typecheck hedefi yalniz aktif kodu denetlemeli`
- `BUILD-007` `status: todo` `source: repo scan` `repo_status: pasif veya yari-kullanimda bagimliliklar ana yukte duruyor` `files: package.json` `action: dependency audit yap, kullanilmayanlari temizle, buyuk paketleri devDependency veya lazy boundary arkasina al` `verification: install ve build yukleri azaltilmali`

## 6. P0 - Veri Tutarliligi ve Sync

- `SYNC-001` `status: partial` `source: v6, repo scan` `repo_status: firestoreSync users tabanli ama admin/moduller arasi eski userData izi suruyor` `files: src/services/firestoreSync.ts, src/services/developerService.ts, src/hooks/useAuth.ts` `action: tek veri modeli belirle; users root + subcollection mimarisini standart yap` `verification: ayni kullanici verisi tum yuzeylerde ayni kaynakta bulunmali`
- `SYNC-002` `status: todo` `source: v6, repo scan` `repo_status: targetGoals sync davranisi profile icine gomulu ve versiyonlanmamis` `files: src/store/appStore.ts, src/services/firestoreSync.ts, src/hooks/useAuth.ts` `action: hedefleri net source-of-truth olarak tanimla; merge ve silme semantigini netlestir` `verification: cihazlar arasi hedef ekleme/silme tutarli olmali`
- `SYNC-003` `status: todo` `source: repo scan` `repo_status: useAuth bos remote array'i stale local ile override ediyor` `files: src/hooks/useAuth.ts` `action: empty array merge mantigini duzelt; cloud'dan gelen bos dizi gecerli state sayilsin` `verification: cloud sifirlama yerelde de gercekten sifirlama yapmali`
- `SYNC-004` `status: todo` `source: repo scan` `repo_status: syncQueue ve indexedDB queue iki farkli tasarimla birlikte yasiyor` `files: src/utils/syncQueue.ts, src/services/indexedDB.ts, src/hooks/useOfflineSync.ts` `action: tek offline queue mekanizmasi sec; fazlalari kaldir` `verification: kuyruk davranisi tek kod yolundan izlenebilmeli`
- `SYNC-005` `status: partial` `source: v6, repo scan` `repo_status: pushSingleEntity var ama tum mutasyonlar write-through degil` `files: src/store/appStore.ts` `action: log, exam, chat, agenda, focus, failed question, target ve subject progress mutasyonlarini incremental cloud write'a bagla` `verification: manual sync olmadan veri cloud'a akmali`
- `SYNC-006` `status: todo` `source: repo scan` `repo_status: beforeunload root snapshot ile veri kaybi riski tam kapanmamis` `files: src/App.tsx` `action: sendBeacon, queued flush ve root metadata sync stratejisini netlestir` `verification: ani sekme kapanisinda kritik root alanlari kaybolmamali`
- `SYNC-007` `status: todo` `source: v6, repo scan` `repo_status: conflict resolution deterministic degil` `files: src/services/firestoreSync.ts, src/hooks/useAuth.ts` `action: updatedAt, deviceId, tombstone ve same-entity merge kurallarini belgeleyip kodla` `verification: iki cihaz ayni entity'yi guncelleyince sonuc tahmin edilebilir olmali`
- `SYNC-008` `status: todo` `source: repo scan` `repo_status: API sync endpoint ile client sync yollarinin rol dagilimi belirsiz` `files: api/sync.ts, src/services/firestoreSync.ts, src/utils/syncQueue.ts` `action: ya API sync'i resmi yol yap ya da dogrudan Firestore sync ile tek yola in` `verification: sistemde ikinci sinif sync yolu kalmamali`
- `SYNC-009` `status: todo` `source: repo scan` `repo_status: chatHistory retention stratejisi yok` `files: src/store/appStore.ts, src/services/firestoreSync.ts, src/App.tsx` `action: local retention, cloud archive ve directive-history retention sinirlari belirle` `verification: buyuk sohbet gecmisi performans ve kota sorunu uretmemeli`
- `SYNC-010` `status: todo` `source: repo scan` `repo_status: root sync payload state'teki UI alanlari elle exclude edilerek kuruluyor` `files: src/App.tsx` `action: explicit sync schema tanimla; full-state iteration modelini kaldir` `verification: yeni UI alanlari yanlislikla cloud'a gitmemeli`
- `SYNC-011` `status: todo` `source: repo scan` `repo_status: hydrate ve realtime listener siralamasi stale overwrite riski tasiyor` `files: src/hooks/useAuth.ts` `action: initial pull, root listener ve subcollection listener baslangic sirasini netlestir` `verification: login aninda veri ziplama veya eski state geri gelme davranisi olmamali`
- `SYNC-012` `status: todo` `source: user request` `repo_status: cihazarasi resmi test matrisi yok` `files: docs/ veya Promt/ test notlari` `action: A/B cihaz senaryolari icin sync test matrisi yaz` `verification: log, exam, chat, agenda, target, trophy, alerts, theme alanlari checklist ile dogrulanmali`

## 7. P0 - KOÇ Cekirdegi Yeniden Tasarim

- `COACH-001` `status: partial` `source: v6, repo scan` `repo_status: typed directive modeli var ama primary response contract degil` `files: src/types/coach.ts, src/services/promptBuilder.ts, src/App.tsx, api/ai.ts` `action: structured directive formatini KOÇ'un varsayilan cevabi yap` `verification: KOÇ cevabi headline/summary/tasks/warnings/followUpQuestion olarak tutarli render edilmeli`
- `COACH-002` `status: todo` `source: repo scan` `repo_status: promptBuilder ile api/ai iki ayri beyin gibi calisiyor` `files: src/services/promptBuilder.ts, api/ai.ts` `action: tek sistem prompt kaynagi kullan; backend bu builder mantigini resmi source-of-truth kabul etsin` `verification: ayni intent ve context her provider'da ayni system instruction ile calismali`
- `COACH-003` `status: todo` `source: repo scan` `repo_status: legacy free-text action modeli halen canli` `files: src/services/gemini.ts, src/App.tsx, api/ai.ts` `action: "coach" legacy action'ini kaldir; intent bazli request modeliyle degistir` `verification: istemci ve sunucu tek intent sozlesmesi kullanmali`
- `COACH-004` `status: todo` `source: repo scan` `repo_status: KOÇ context ekran bazli string concat ile kuruluyor` `files: src/App.tsx, src/components/AgendaPage.tsx, src/components/StrategyHub.tsx, src/components/TopicExplain.tsx, src/components/CoachInterventionModal.tsx` `action: merkezi buildCoachContext selector/helper katmani yaz` `verification: tum AI yuzeyleri ayni context composer uzerinden veri gondermeli`
- `COACH-005` `status: todo` `source: repo scan` `repo_status: App coach chat parse ettikten sonra free_chat diye fallback ediyor, intent semantigi kayboluyor` `files: src/App.tsx` `action: parseStructuredDirective sonucu gercek intent ile kaydedilsin; QA/free_chat ayrimi korunmali` `verification: directive history icinde intent dogru gorunmeli`
- `COACH-006` `status: partial` `source: v6, repo scan` `repo_status: lastCoachDirective var ama gercek history yok` `files: src/store/appStore.ts, src/App.tsx` `action: directive history modeli ekle; surface, intent, createdAt, context hash ve completion status tut` `verification: son plan, son analiz, son intervention ayrisabilmeli`
- `COACH-007` `status: todo` `source: repo scan` `repo_status: KOÇ cevaplari "guzel metin" odakli ama gorev nesneleri zayif` `files: src/types/coach.ts, src/App.tsx` `action: task schema'ya completion, dueWindow, originSurface ve rationale alanlari ekle` `verification: gorevler UI'da isaretlenebilir ve takip edilebilir olmali`
- `COACH-008` `status: todo` `source: repo scan` `repo_status: Q&A modu gercek state machine degil; mesaj hilesi ile yuruyor` `files: src/App.tsx, src/types/coach.ts` `action: soru oturumlarini kod tarafinda state machine olarak tanimla` `verification: senaryo, beklenen cevap, tamamlanma, ozet uretimi deterministic olmali`
- `COACH-009` `status: todo` `source: v6, repo scan` `repo_status: WarRoom, Agenda, StrategyHub, TopicExplain, Intervention farkli AI cevap protokolleri kullaniyor` `files: ilgili bilesenler, src/services/gemini.ts` `action: tum AI yuzeylerini tek request/response katmanina tasi` `verification: tum yuzeyler ayni hata, retry ve directive parse davranisini gostermeli`
- `COACH-010` `status: todo` `source: repo scan` `repo_status: KOÇ'un veri guveni dusuk; target, streak, progress ve alert alanlari bazen ozet bazen raw gidiyor` `files: src/App.tsx, src/services/gemini.ts, api/ai.ts` `action: CoachSystemContext alanlarini zorunlu/opsiyonel seviyede sabitle` `verification: KOÇ girdisi sema bazli normalize edilmeli`
- `COACH-011` `status: todo` `source: repo scan` `repo_status: provider fallback var ama response kalite kontrolu zayif` `files: api/ai.ts` `action: malformed JSON, bos cevap, fazla metin ve hallucinated fields icin stricter validator ekle` `verification: structured modda gecersiz cevaba kontrollu fallback donmeli`
- `COACH-012` `status: todo` `source: repo scan` `repo_status: parseVoiceLog sadece endpoint seviyesinde var; KOÇ veri toplama zincirine bagli degil` `files: api/ai.ts, src/services/gemini.ts, src/components/forms/LogEntryWidget.tsx` `action: sesli log akisini KOÇ veri toplama pipeline'ina bagla` `verification: sesli girdiden log + coach analiz akisi tamamlanmali`

## 8. P0 - KOÇ Urunlesme ve Gercek Fayda Backlog'u

- `COACH-PRODUCT-001` `status: todo` `source: user request, repo scan` `repo_status: KOÇ hala agirlikli chat ekranı gibi` `files: src/App.tsx, coach UI bilesenleri` `action: KOÇ acilisini "Gunluk Durum Brifingi" ekranina cevir` `verification: yeni kullanici bos sohbet degil durum + direktif karti gormeli`
- `COACH-PRODUCT-002` `status: todo` `source: user request` `repo_status: KOÇ gorevleri tamamlanabilir nesnelere donusmuyor` `files: src/types/coach.ts, src/App.tsx, src/store/appStore.ts` `action: task completion, skip, postpone ve fail reason akisi ekle` `verification: KOÇ bir sonraki cevapta onceki gorev durumunu dikkate almali`
- `COACH-PRODUCT-003` `status: todo` `source: user request` `repo_status: KOÇ otomatik gun sonu veya gun basi ritueli yok` `files: notifications, coach surface, agenda` `action: sabah planlama ve aksam otopsi akisini urunlestir` `verification: gun basi/gun sonu iki ayri zorunlu rutin cikabilmeli`
- `COACH-PRODUCT-004` `status: todo` `source: user request` `repo_status: deneme sonrasi otomatik savas raporu yok` `files: src/store/appStore.ts, src/App.tsx, coach pipeline` `action: yeni deneme kaydi sonrasi exam_analysis otomatik tetiklensin` `verification: deneme eklenince 48 saatlik telafi planı uretilmeli`
- `COACH-PRODUCT-005` `status: todo` `source: user request` `repo_status: log sonrasi anlik mikro analiz sistematik degil` `files: log widget, coach pipeline` `action: her log sonrasi 1 kisa ozet + 1 risk + 1 sonraki adim uret` `verification: log ekleme sonrasi kullanici otomatik geri bildirim almali`
- `COACH-PRODUCT-006` `status: todo` `source: user request` `repo_status: intervention modali sadece tek alert'i aciyor ama ilerleme takip etmiyor` `files: src/components/CoachInterventionModal.tsx, src/store/appStore.ts` `action: intervention gorevlerinin sonucunu takip et ve resolve state ekle` `verification: uyarilar dismiss edilince sebepsiz kaybolmamak yerine resolve kaydi olusmali`
- `COACH-PRODUCT-007` `status: todo` `source: user request` `repo_status: KOÇ'un neden boyle karar verdigi acik degil` `files: directive schema, coach UI` `action: her direktifte "neden" alanini veri temelli 1 satir halinde ekle` `verification: her kritik direktif veriye dayali gerekce gostermeli`
- `COACH-PRODUCT-008` `status: todo` `source: user request` `repo_status: KOÇ hafizasi chat history ile karisik` `files: src/store/appStore.ts, coach selectors` `action: kalici koç hafizasi modeli yaz; hedefler, tekrar eden zaaflar, son trendler ayri tutulsun` `verification: chat temizlense bile koç ogrenciyi tanimaya devam etmeli`
- `COACH-PRODUCT-009` `status: todo` `source: user request` `repo_status: KOÇ kisiligi ile icerik standardi birbirine karisabiliyor` `files: promptBuilder, api/ai.ts` `action: kisilik katmanini sadece ton degistiren bagimsiz layer yap` `verification: harsh/motivational/analytical secimleri icerik kalitesini degistirmemeli`
- `COACH-PRODUCT-010` `status: todo` `source: user request` `repo_status: KOÇ basari metriği tanimli degil` `files: analytics/backlog, store` `action: task completion rate, next-day compliance, net delta ve streak recovery KPI seti ekle` `verification: KOÇ kalitesi izlenebilir hale gelmeli`
- `COACH-PRODUCT-011` `status: todo` `source: user request` `repo_status: KOÇ hedef universite kovalamacasini direkt goreve cevirmez` `files: target goals, strategy, coach context` `action: Atlas hedef farkini otomatik planlama girdisine dahil et` `verification: hedef seciliyse planlar hedef farka gore sekillenmeli`
- `COACH-PRODUCT-012` `status: todo` `source: user request` `repo_status: haftalik review akisi yok` `files: coach surface, agenda, exams, logs` `action: haftalik "ne oldu / neden oldu / ne degisecek" incelemesi tasarla` `verification: kullanici haftalik retrospektif alabilmeli`

## 9. P0 - Kritik Buglar ve Mimari Cokmeler

- `BUG-001` `status: todo` `source: v6` `repo_status: IDB hata durumlari tam urun davranisina bagli degil` `files: src/store/appStore.ts` `action: depolama arizalarini state flag + notification + fallback policy ile yonet` `verification: private mode veya quota dolumu halinde kullanici uyarilmali`
- `BUG-002` `status: todo` `source: repo scan` `repo_status: addLog/addExam pruning ve write-through sirasinda veri kaybi riski var` `files: src/store/appStore.ts` `action: prune once cloud write, sonra retention uygula` `verification: buyuk veri setinde eski ama senkronize olmamis kayit silinmemeli`
- `BUG-003` `status: partial` `source: repo scan` `repo_status: api/ai rate limiter cold-start ile asiliyor` `files: api/ai.ts` `action: Upstash Redis limiter'i resmi zorunlu yol yap` `verification: serverless cold start bypass kalkmali`
- `BUG-004` `status: todo` `source: repo scan` `repo_status: App level sync payload exclude list ile kuruluyor; yeni alan eklenince sessiz bug riski var` `files: src/App.tsx` `action: whitelist tabanli payload builder yaz` `verification: sync semasi explicit olmali`
- `BUG-005` `status: todo` `source: repo scan` `repo_status: coach acilis mesaji useRef guard ile tek seferlik ama hydrate/sync edge-case'lerde belirsiz` `files: src/App.tsx` `action: greeting behavior'ini source-aware hale getir; sadece yeni sohbetlerde tetikle` `verification: ghost greeting veya kayip acilis mesaji olmamali`
- `BUG-006` `status: todo` `source: repo scan` `repo_status: raw response parse edilip sonra tekrar text'e dusuluyor; structured JSON metni chat'e sizabilir` `files: src/App.tsx, src/services/promptBuilder.ts` `action: chat render ve directive render akisini ayir` `verification: kullaniciya temiz metin, UI'ya temiz directive gitmeli`
- `BUG-007` `status: todo` `source: repo scan` `repo_status: admin servisleri users yerine userData'dan okudugu icin panel stale veya bozuk olabilir` `files: src/services/developerService.ts` `action: admin read/write metodlarini yeni schema'ya migrate et` `verification: admin panel islevleri gercek veriyi manipule etmeli`
- `BUG-008` `status: todo` `source: repo scan` `repo_status: Atlas service olmayan program details endpoint'ini cagiriyor` `files: src/services/atlasService.ts, atlas-data-engine/src/server.ts` `action: backend endpoint'i ekle veya frontend metodu kaldir` `verification: 404/yanlis endpoint kullanimi kalmamali`
- `BUG-009` `status: todo` `source: repo scan` `repo_status: Atlas arama backend'i placeholder, UI ise gercek servis gibi davranıyor` `files: atlas-data-engine/src/server.ts, atlas-data-engine/src/services/scraper.ts, src/components/AtlasExplorer.tsx` `action: urun metnini gercekle hizala veya backend'i tamamla` `verification: UI vaadi ile backend davranisi tutarli olmali`
- `BUG-010` `status: todo` `source: repo scan` `repo_status: system stats sadece toplam user + son log gibi cok zayif` `files: src/services/systemService.ts, admin panel` `action: admin panel hata tespiti yapabilecek seviye istatistikler uretsin` `verification: sync, AI, aktif kullanici ve son ariza sinyalleri gorunmeli`
- `BUG-011` `status: todo` `source: repo scan` `repo_status: Main error boundary nuke reset ile tum local storage'yi siliyor; kurtarma stratejisi yok` `files: src/main.tsx` `action: kontrollu recovery, export snapshot ve nuke oncesi uyari seviyeleri ekle` `verification: tek component crash'i tum kullanici verisini gereksizce silmemeli`
- `BUG-012` `status: todo` `source: repo scan` `repo_status: docs bug katalogu ile gercek kod durumu drift uretmis` `files: docs/ERROR_CATALOG.md, docs/BUG_LOG.json` `action: bug katalogunu gercek status ile guncelle veya otomatik uretim modeline tası` `verification: belge ve kod durumu birbiriyle celismemeli`
- `BUG-013` `status: todo` `source: repo scan` `repo_status: doctor scripti npm install ve env dogrulama yapiyor ama gercek kalite kapilarini kontrol etmiyor` `files: scripts/doctor.cjs` `action: typecheck, dead endpoint ve schema drift kontrollerini ekle` `verification: doktor scripti release blocker'lari fail etmeli`
- `BUG-014` `status: todo` `source: repo scan` `repo_status: build/runtime tarafinda metin encoding bozulmalari gorunuyor` `files: README.md, vite.config.ts, docs/*, bircok kaynak` `action: karakter encoding temizlik turu yap` `verification: bozuk Turkce karakterler kritik belgelerden kalkmali`

## 10. P0 - Guvenlik ve Yetki

- `SEC-001` `status: partial` `source: v6, repo scan` `repo_status: claims akisi var ama tum admin mantigi burada bitmiyor` `files: src/config/admin.ts, src/hooks/useAuth.ts, firestore.rules` `action: admin kararlarini client helper yerine server/claims merkezli yap` `verification: hardcoded UID mantigi kalmamali`
- `SEC-002` `status: todo` `source: repo scan` `repo_status: api/sync auth'li ama rol ve payload semasi daha net olmali` `files: api/sync.ts, api/_lib/firebaseAdmin.ts` `action: write endpoint'leri icin ortak authz/payload validator yaz` `verification: auth'suz ve hatali payload'lar reddedilmeli`
- `SEC-003` `status: partial` `source: repo scan` `repo_status: Spotify frontend token akisi kapatilmis ama UI/service drift'i var` `files: src/services/spotifyService.ts, src/components/SpotifyWidget.tsx` `action: PKCE backend tamamlanana kadar feature'i tam controlled-disabled yap` `verification: yarim calisan auth akisi kalmamali`
- `SEC-004` `status: todo` `source: repo scan` `repo_status: admin servisleri client tarafinda tehlikeli mutation surface aciyor` `files: src/services/developerService.ts` `action: kritik admin aksiyonlari server function arkasina al` `verification: istemci tek basina rol veya veri manipule edememeli`
- `SEC-005` `status: todo` `source: repo scan` `repo_status: AI endpoint birden fazla provider key rotasyonu kullaniyor ama provider bazli telemetry zayif` `files: api/ai.ts` `action: key rotation, provider health ve error sanitization guvenlik/operasyon acisindan sertlestir` `verification: raw provider error'lari client'a sizmamalı`
- `SEC-006` `status: todo` `source: repo scan` `repo_status: local express server vercel handler'i emulate ediyor ama request validation zayif` `files: server.ts, api/ai.ts` `action: local ve production request parse davranisini uyumlu hale getir` `verification: malformed body senaryolari iki ortamda da ayni sekilde ele alinmali`

## 11. P1 - Mimari Temizlik ve Kod Organizasyonu

- `ARCH-001` `status: todo` `source: repo scan` `repo_status: src/App.tsx 1600+ satir ve shell, dashboard, coach, sync, modal orkestrasyonunu tek dosyada tasiyor` `files: src/App.tsx` `action: AppShell, DashboardPage, CoachPage, SyncController, ModalHost, Navigation layout olarak parcala` `verification: App.tsx ince orchestration katmanina inmeli`
- `ARCH-002` `status: todo` `source: repo scan` `repo_status: tekrar eden markdown render map'leri farkli dosyalarda kopya` `files: src/App.tsx, src/components/AgendaPage.tsx, src/components/StrategyHub.tsx, src/components/TopicExplain.tsx` `action: ortak MarkdownRenderer/theme-safe component cikar` `verification: tip ve stil tekrarları azaltilmali`
- `ARCH-003` `status: todo` `source: repo scan` `repo_status: analiz/context stringleri ekran iclerine dagilmis` `files: App ve coach-related components` `action: coach selectors ve formatter util katmani ekle` `verification: string concat isleri UI katmanindan cikmali`
- `ARCH-004` `status: todo` `source: repo scan` `repo_status: Firestore schema bilgisi birden cok dosyada implicit` `files: src/services/firestoreSync.ts, src/hooks/useAuth.ts, src/store/appStore.ts, api/sync.ts` `action: schema constants ve entity registry olustur` `verification: koleksiyon isimleri ve key map tek yerden yonetilmeli`
- `ARCH-005` `status: todo` `source: repo scan` `repo_status: feature flag stratejisi duzensiz` `files: spotify, atlas, ai, admin surfaces` `action: experimental features icin merkezi feature flags katmani ekle` `verification: yari-tamam ozellikler kontrollu acilabilmeli`
- `ARCH-006` `status: todo` `source: repo scan` `repo_status: reusable domain modules eksik` `files: subjects, exams, coach, atlas, alerts` `action: domain odakli module yapisi kur` `verification: UI ve service katmani ayni domain primitive'lerini kullanmali`

## 12. P1 - Performans

- `PERF-001` `status: partial` `source: v6, repo scan` `repo_status: bazi agir bilesenler lazy ama ana orchestration hala agir` `files: src/App.tsx` `action: route/tab level lazy split'i genislet` `verification: ilk acilis bundle'i kuculmeli`
- `PERF-002` `status: partial` `source: repo scan` `repo_status: manualChunks var ama app davranisina gore optimize edilmemis` `files: vite.config.ts` `action: AI, markdown, charts, firebase, capacitor ve admin path'lerini veriyle ayir` `verification: ana chunk warning ve ilk load sureleri duzelmeli`
- `PERF-003` `status: todo` `source: repo scan` `repo_status: App ve bilesenlerde tam-store subscribe desenleri suruyor` `files: src/App.tsx, store tuketen componentler` `action: selector + shallow subscribe migrasyonu yap` `verification: React profiler'da gereksiz rerender'lar azalmalı`
- `PERF-004` `status: todo` `source: repo scan` `repo_status: subject grouping, chart data, summaries ve projections her render'da tekrar hesaplanıyor` `files: src/App.tsx, src/components/StrategyHub.tsx, src/components/ExamDetailModal.tsx` `action: hesaplamalari memoize et ve saf util'lere tasi` `verification: agir ekranlarda input latency dusmeli`
- `PERF-005` `status: todo` `source: repo scan` `repo_status: local persistence ve offline queue iki ayri IndexedDB kullanimi olusturuyor` `files: src/store/appStore.ts, src/utils/syncQueue.ts, src/services/indexedDB.ts` `action: DB acilis ve transaction sayisini azaltan tek storage stratejisi kur` `verification: gereksiz IndexedDB acilis sayisi dusmeli`
- `PERF-006` `status: todo` `source: repo scan` `repo_status: chat ve directive render buyuk markdown cevaplarda agirlasabilir` `files: coach UI` `action: response truncation, collapse ve render sanitization ekle` `verification: buyuk cevaplarda scroll ve typing akisi bozulmamali`
- `PERF-007` `status: todo` `source: repo scan` `repo_status: service worker reset mantigi dev ortaminda agresif` `files: src/main.tsx` `action: dev cache reset davranisini daha kontrollu hale getir` `verification: gereksiz refresh loop veya cache churn olmamali`

## 13. P1 - Atlas Sistemi

- `ATLAS-001` `status: todo` `source: repo scan` `repo_status: Atlas search backend placeholder` `files: atlas-data-engine/src/server.ts, atlas-data-engine/src/services/scraper.ts` `action: gercek arama implementasyonu yap veya fallback/mocked state'i UI'da acikla` `verification: kullanici girdigi query ile anlamli sonuc alabilmeli`
- `ATLAS-002` `status: todo` `source: repo scan` `repo_status: scraper syncProgram parcali mock veri donduruyor` `files: atlas-data-engine/src/services/scraper.ts` `action: scoreType, years, baseScore, rank ve kota alanlarini gercek parsing ile doldur` `verification: mock sabitler koddan kalkmali`
- `ATLAS-003` `status: todo` `source: repo scan` `repo_status: frontend getProgramDetails metodu backend karsiligi olmadan duruyor` `files: src/services/atlasService.ts, atlas-data-engine/src/server.ts` `action: program details endpoint'i tanimla` `verification: detay istemi 404 yerine veri veya kontrollu hata donmeli`
- `ATLAS-004` `status: todo` `source: repo scan` `repo_status: queue ve scraper var ama cache-first mimari yok` `files: atlas-data-engine/src/server.ts` `action: Redis cache + stale-while-revalidate stratejisi kur` `verification: sik aramalar hizli donmeli`
- `ATLAS-005` `status: todo` `source: user request` `repo_status: Atlas verisi KOÇ planlamasina zayif bagli` `files: atlas service, coach context` `action: hedef program net/ranking farklarini coach context'e resmi alanlar olarak ekle` `verification: hedef secildiginde planlar hedefe gore sertlesmeli`
- `ATLAS-006` `status: todo` `source: user request` `repo_status: hedef ekleme UI'si var ama "neden bu hedefe gore geridesin" urun kartlari zayif` `files: dashboard, strategy hub, coach` `action: hedef gap dashboard kartlari, march reference ve pace hesaplari ekle` `verification: secili hedefler kullaniciya net farki gostermeli`

## 14. P1 - War Room

- `WAR-001` `status: partial` `source: repo scan` `repo_status: soru validation ekli ama QA kalitesi ve soru guvenirligi garantilenmiyor` `files: src/services/warRoomService.ts` `action: question schema validator'i sertlestir; subject/topic/examType guvenligini artir` `verification: malformed AI soru sayisi ciddi azalmalı`
- `WAR-002` `status: todo` `source: repo scan` `repo_status: offline fallback soru asiri basit ve urun degerini dusuruyor` `files: src/services/warRoomService.ts` `action: gercek fallback soru havuzu veya lokal bank ekle` `verification: AI yokken de kullanilabilir soru kalitesi korunmali`
- `WAR-003` `status: todo` `source: repo scan` `repo_status: War Room sonucu log'a yaziliyor ama KOÇ exam/log analiz zincirine baglanmiyor` `files: src/hooks/useWarRoom.ts, coach pipeline` `action: session finish sonrasi otomatik war_room_analysis uret` `verification: savas odasi bitince ozel geri bildirim cikmali`
- `WAR-004` `status: todo` `source: repo scan` `repo_status: war room state persist ve restore semantigi sinirli` `files: src/store/appStore.ts, useWarRoom` `action: active session resume veya controlled abandon kurallari ekle` `verification: refresh veya tab switch senaryolari tutarli olmali`
- `WAR-005` `status: todo` `source: repo scan` `repo_status: canvas/drawing API window uzerine asiliyor` `files: src/components/warroom/CanvasLayer.tsx` `action: global side effect'i kaldir ve controlled ref API kullan` `verification: window kirliligi ve stale api riski bitmeli`
- `WAR-006` `status: todo` `source: user request` `repo_status: War Room koç paneli sadece son mesajlari gosteriyor, strateji surekliligi zayif` `files: warroom coach panel` `action: soru oncesi strateji, soru sirasinda taktik, soru sonrasi otopsi akisini tasarla` `verification: War Room KOÇ'un entegre bir parcasi gibi hissettirmeli`

## 15. P1 - Admin ve Sistem Yonetimi

- `ADMIN-001` `status: todo` `source: repo scan` `repo_status: developerService yeni veri modeline uyumsuz` `files: src/services/developerService.ts` `action: tum admin mutasyonlarini users root + subcollections ile uyumlu hale getir` `verification: admin paneldeki islemler gercek schema'yi bozmayacak`
- `ADMIN-002` `status: todo` `source: repo scan` `repo_status: system stats cok zayif` `files: src/services/systemService.ts, src/hooks/useAdminPanel.ts, src/components/admin/AdminPanelModal.tsx` `action: active users, last sync, AI errors, provider health, queue size, recent alerts, typecheck/build status gibi metrikler ekle` `verification: admin panel bir operasyon merkezi gibi kullanilabilmeli`
- `ADMIN-003` `status: todo` `source: repo scan` `repo_status: audit log zenginligi dusuk` `files: src/services/developerService.ts` `action: admin aksiyonlarina correlation id, before/after snapshot ve outcome ekle` `verification: kritik degisiklikler sonradan izlenebilir olmali`
- `ADMIN-004` `status: todo` `source: repo scan` `repo_status: maintenance mode var ama user-facing messaging zayif` `files: system service, blocker UI` `action: bakim modu neden/sure/return info alanlari ekle` `verification: kullanici sadece blok ekrani degil acik durum bilgisi gormeli`

## 16. P2 - Urun Gelisimi

- `FEAT-001` `status: todo` `source: v6` `repo_status: voice log UI eksik` `files: LogEntryWidget, api/ai.ts` `action: mikrofon tabanli sesli log girisi ekle` `verification: kullanici sesle log girip parse sonucunu duzeltip kaydedebilmeli`
- `FEAT-002` `status: todo` `source: v6` `repo_status: OCR/kamera tabanli failed question akisi eksik` `files: archive/failed question UI, storage` `action: kamera ile soru ekleme ve image attachment sistemi kur` `verification: mobilde hizli mezarlik ekleme mumkun olmali`
- `FEAT-003` `status: todo` `source: user request` `repo_status: deneme compare modu eksik` `files: ExamDetailModal, analytics` `action: iki denemeyi ders ve net delta bazinda karsilastirma yuzeyi ekle` `verification: subject-level delta gorunmeli`
- `FEAT-004` `status: todo` `source: user request` `repo_status: haftalik otomatik plan bugun sadece istege bagli` `files: strategy hub, coach` `action: haftalik plani planlama motoru ve ajanda ile bagla` `verification: plan uretildiginde ajandaya gorevler akabilmeli`
- `FEAT-005` `status: todo` `source: user request` `repo_status: KOÇ gorevleri agenda/focus ile bagli degil` `files: coach tasks, agenda entries, focus timer` `action: direktif task'larini agenda ve odak seansina donusturecek aksiyonlar ekle` `verification: "bu gorevi baslat" akisi calismali`
- `FEAT-006` `status: todo` `source: repo scan` `repo_status: Notification center var ama sistem olayi cogu yerde notification uretmiyor` `files: store actions, sync, coach, admin` `action: event->notification haritasi cikart` `verification: onemli olaylar tutarli sekilde bildirim uretmeli`
- `FEAT-007` `status: todo` `source: user request` `repo_status: KOÇ slash command/hizli komut urunlesmesi eksik` `files: coach input UI` `action: PLAN, LOG, DENEME, ANLA, TEKRAR, HEDEF gibi hizli komutlar icin palette ekle` `verification: kullanici komutlari ezberlemeden gorebilmeli`
- `FEAT-008` `status: todo` `source: user request` `repo_status: kaynak ROI verisi plan ve koç aksiyonlarina bagli degil` `files: StrategyHub, coach selectors` `action: dusuk ROI kaynaklari otomatik uyar ve task sistemine bagla` `verification: planlar kaynak secimini de etkileyebilmeli`
- `FEAT-009` `status: todo` `source: user request` `repo_status: konu tekrar sistemi eksik` `files: logs, subjects, coach, agenda` `action: spaced repetition benzeri tekrar backlog'u tasarla` `verification: ihmal edilen konular tekrar olarak geri dusmeli`

## 17. P2 - UX, Tasarim ve A11y

- `UX-001` `status: todo` `source: v6` `repo_status: avatar upload/fallback eksik` `files: profile settings` `action: avatar yukleme ve gosterim iyilestirmesi yap` `verification: profil deneyimi tamamlanmali`
- `UX-002` `status: todo` `source: v6` `repo_status: streak danger ve gun sonu warning eksik` `files: notifications, dashboard, coach` `action: streak tehlike uyarilari ve kurtarma aksiyonlari ekle` `verification: streak kirilmadan once kullanici uyarilmali`
- `UX-003` `status: partial` `source: v6, repo scan` `repo_status: mobil klavye/viewport problemleri coach yuzeyinde suruyor olabilir` `files: src/App.tsx, useViewport hooks` `action: mobile keyboard-safe layout sertlestir` `verification: coach input mobilde kaybolmamali`
- `UX-004` `status: partial` `source: v6` `repo_status: tema bootstrap ve FOUC tamamen kapanmis degil` `files: index.html, main.tsx, store theme` `action: inline theme bootstrap + hydration uyumu sagla` `verification: flash ve tema ziplamasi olmamali`
- `UX-005` `status: partial` `source: repo scan` `repo_status: teknik hata mesajlari hala farkli yerlerde farkli kaliteyle gosteriliyor` `files: error messages, AI UI, toasts` `action: domain bazli Turkce hata sozlugu olustur` `verification: son kullanici raw HTTP/provider kodu gormemeli`
- `UX-006` `status: todo` `source: user request` `repo_status: KOÇ ekraninda directive-first layout yari-yolda` `files: coach UI` `action: ustte durum ozeti, ortada direktif, altta chat/command lane olacak sekilde yeniden tasarla` `verification: KOÇ ekrani sadece mesaj listesi gibi gorunmemeli`
- `UX-007` `status: todo` `source: repo scan` `repo_status: Atlas Explorer "gercek veriler" diyor ama fallback/mock davranis gizli` `files: AtlasExplorer` `action: data freshness/source badge ekle` `verification: kullanici mock/fallback ile canli veriyi ayirt edebilmeli`
- `A11Y-001` `status: todo` `source: v6` `repo_status: ikon buton audit'i eksik` `files: cok sayida component` `action: tum icon-only controls icin aria-label ve title audit yap` `verification: screen reader kullanimi iyilesmeli`
- `A11Y-002` `status: todo` `source: v6` `repo_status: kucuk acik gri metinler kontrast riski tasiyor` `files: global UI` `action: kontrast turu ve token duzeltmesi yap` `verification: WCAG AA hedefleri daha yakinlanmali`
- `A11Y-003` `status: todo` `source: v6` `repo_status: modal focus trap ve klavye nav eksik` `files: modal host, admin modal, atlas explorer, intervention modal` `action: klavye erisilebilirligi sertlestir` `verification: fare olmadan temel akislar kullanilabilmeli`

## 18. P2 - Gozlemlenebilirlik, Telemetry ve Kalite Kapilari

- `OBS-001` `status: todo` `source: repo scan` `repo_status: AI cagrilarinda latency/provider/success metric yok` `files: api/ai.ts` `action: structured server logs ve metric alanlari ekle` `verification: hangi provider neden fail etti izlenebilmeli`
- `OBS-002` `status: todo` `source: repo scan` `repo_status: sync islemlerinde queue depth, retry ve last success metric yok` `files: sync katmani` `action: sync telemetry alanlari ekle` `verification: sync arizalari admin panel veya loglarda okunabilmeli`
- `OBS-003` `status: todo` `source: repo scan` `repo_status: KOÇ parse failure oranı izlenmiyor` `files: promptBuilder, api/ai.ts` `action: structured parse success/fallback oranini olc` `verification: directive sisteminin kalitesi sayisal izlenmeli`
- `OBS-004` `status: todo` `source: repo scan` `repo_status: sistem crash sonrası sadece console log var` `files: src/main.tsx` `action: user-safe crash report ve recoverability sinyali ekle` `verification: kritik hata tekrarlarinda kok neden analiz edilebilir olmali`
- `QA-001` `status: todo` `source: user request` `repo_status: resmi release checklist yok` `files: docs/ veya Promt/ release notes` `action: build, login, sync, AI, Atlas, WarRoom, mobile ve admin smoke checklist yaz` `verification: release oncesi checklist uygulanabilir olmali`
- `QA-002` `status: todo` `source: repo scan` `repo_status: unit/regression test altyapisi zayif veya yok` `files: test setup yok` `action: Vitest veya uygun test altyapisini kur` `verification: coach parser, context builder, sync merge, stats util testleri yazilabilmeli`
- `QA-003` `status: todo` `source: user request` `repo_status: provider fail smoke test eksik` `files: api/ai.ts` `action: tum provider failure durumlari icin kontrollu fallback testi yaz` `verification: user-facing mesaj tutarli donmeli`
- `QA-004` `status: todo` `source: user request` `repo_status: offline-online replay regression testi yok` `files: sync katmani` `action: duplicate replay ve stale overwrite senaryolarina test ekle` `verification: kuyruk tekrarlarinda veri tekilligi korunmali`
- `QA-005` `status: todo` `source: user request` `repo_status: compile gate sadece elle calisiyor` `files: package.json, CI` `action: lint/typecheck/build komutlarini resmi kalite kapisi yap` `verification: PR/CI kirmadan merge olmamali`

## 19. P3 - Mobil, Android ve Platform

- `MOBILE-001` `status: todo` `source: repo scan` `repo_status: Capacitor tabani var ama mobil davranis backlog'u daginik` `files: capacitor config, android, mobile hooks` `action: mobil davranis matrisi cikar` `verification: back button, viewport, splash, status bar ve offline davranisi belgelenmeli`
- `MOBILE-002` `status: todo` `source: v6` `repo_status: local notifications backlog acik` `files: Capacitor plugins, focus timer, reminders` `action: pomodoro, streak, plan gorevleri icin local notifications ekle` `verification: Android cihazda bildirimler gelmeli`
- `MOBILE-003` `status: todo` `source: user request` `repo_status: kamera/OCR ve sesli log mobil deger yaratacak ama akislari yok` `files: archive, log widget, native permissions` `action: mobil-native veri giris kanallarini ac` `verification: telefon kullanan ogrenci daha hizli veri girebilmeli`
- `MOBILE-004` `status: todo` `source: repo scan` `repo_status: Android build health checklist yok` `files: android/*` `action: gradle, firebase config, splash, signing ve network security checklist'i olustur` `verification: yeni cihazda build alma sureci tahmin edilebilir olmali`

## 20. P3 - CI/CD, Dokumantasyon ve Operasyon

- `OPS-001` `status: todo` `source: repo scan` `repo_status: CI kalite hatti eksik` `files: .github/workflows/*` `action: typecheck + build + basic tests + optional doctor check pipeline'i kur` `verification: PR acildiginda otomatik kontrol calismali`
- `OPS-002` `status: todo` `source: repo scan` `repo_status: env dokumani yetersiz` `files: .env.example, README.md` `action: Firebase, AI providers, Upstash, Atlas, Spotify ve mobile env tablosu yaz` `verification: eksik env kolayca tespit edilebilmeli`
- `OPS-003` `status: todo` `source: repo scan` `repo_status: Vercel function davranislari ve local express emulasyonu dokumante degil` `files: README.md, vercel.json, server.ts` `action: local/prod farklarini dokumante et` `verification: geliştirici hangi endpoint'in nasil calistigini anlayabilmeli`
- `OPS-004` `status: todo` `source: repo scan` `repo_status: docs/ERROR_CATALOG ve BUG_LOG stale` `files: docs/*` `action: ya otomatik guncellenen issue/backlog modeline gec ya da duzenli revizyon plani ekle` `verification: stale belgeler product kararini zehirlememeli`
- `OPS-005` `status: todo` `source: repo scan` `repo_status: prompt ve backlog evrimi icin surum kurali yok` `files: Promt/*` `action: prompt/todo surumleme kural seti belirle` `verification: aktif prompt, arsiv prompt ve aktif backlog yuzeyleri karismamali`

## 21. KOÇ Ozel Ust Duzey Yol Haritasi

### Faz 1 - Stabilizasyon

- Compile temizligi
- Tek intent modeli
- Tek prompt builder
- Tek directive parse hattı
- Central coach context

### Faz 2 - Product Core

- Gunluk Durum Brifingi
- Gorev nesneleri
- Log sonrasi mikro analiz
- Deneme sonrasi savas raporu
- Intervention lifecycle

### Faz 3 - Hafiza ve Takip

- Persistent coach memory
- Task completion feedback loop
- Haftalik review
- Hedef universite kovalamacasi
- Risk skorlamasi

### Faz 4 - Olcum ve Optimizasyon

- Coach KPI seti
- Parse success rate
- Task completion rate
- Next-day compliance
- Net delta etkisi

## 22. Onerilen Sprint Sirasi

1. `BUILD-001..007` ve kritik compile temizlikleri
2. `SYNC-001..012` ile tek veri modeli ve queue sadeleştirmesi
3. `COACH-001..012` ile tek AI/KOÇ cekirdegi
4. `COACH-PRODUCT-001..012` ile KOÇ urunlesmesi
5. `BUG-007`, `ATLAS-001..006`, `ADMIN-001..004`
6. `ARCH-001..006`, `PERF-001..007`
7. `OBS`, `QA`, `MOBILE`, `OPS` backlog'u

## 23. V19 Tamamlanmis Sayilma Kosullari

- `tsc --noEmit` temiz
- App taban akislari tek source-of-truth sync modeliyle calisiyor
- KOÇ tek request/response kontrati kullanıyor
- Yeni veri gelince KOÇ otomatik anlamli aksiyon uretiyor
- Admin servisleri yeni Firestore semasi ile uyumlu
- Atlas ya gercek backend ile calisiyor ya da acikca fallback oldugu gosteriliyor
- README ve env belgeleri repo gercegini yansitiyor
- Release checklist, smoke test ve temel telemetry mevcut

## 24. Not

Bu dosya, `Boho Mentosluk Master Todo v6.0.md` dosyasinin yerine gecmek zorunda degil; ancak V19 backlog'u bundan sonra uygulama gercegine daha yakin, daha sert ve daha uygulanabilir ana plan olarak kullanilmalidir.
