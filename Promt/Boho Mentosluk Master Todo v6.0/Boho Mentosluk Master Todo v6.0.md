# Boho Mentosluk Master Todo v6.0

> Durum: aktif tek otorite backlog  
> Guncelleme tarihi: 2026-04-05  
> Kapsam: repo gercek durum denetimi + kritik bug analizi + KOÇ sisteminin urunlestirilmesi + sert uygulama backlog'u  
> Hedef dosya rolu: Bu dosya ana backlog'dur. Diger prompt/todo dosyalari referans veya arsivdir.  
> Yazim ilkesi: Yumusak istek dili yok. Her madde net bir teknik emir, kapsami belli degisiklik ve kapanis kriteri icerir.

---

## 1. Yonetici Ozeti

Bu repo calisiyor gibi gorunuyor ama temel katmanlarda ciddi yariklar var:

- Derleme temiz degil. Typecheck kirik.
- Sync mimarisi tek degil. Eski ve yeni yollar ayni anda yasiyor.
- KOÇ sistemi yari urun, yari chat prototipi halinde.
- "Fix edildi" diye yorumlanan bazi alanlar gercekte bozuk.
- Admin/dev araci halen eski veri modeli ve hardcoded yetki mantigina yaslaniyor.
- Yerel reset, cache reset ve offline akislar veri kaybi riski tasiyor.

Bu backlog'un amaci:

- Uygulamayi teknik olarak guvenilir hale getirmek
- KOÇ'u cevap veren model degil, karar verip takip eden urun haline getirmek
- Split-brain veri modelini kapatmak
- Eski gecici patch yorumlarini gercek implementasyonla degistirmek
- Her kritik alan icin kapanis kriteri tanimlamak

---

## 2. Repo Gercek Durum Tespiti

Asagidaki tespitler repo taramasiyla dogrulandi:

- `npm.cmd run lint` temiz gecmiyor.
- `npm.cmd run build` ortamda `vite/esbuild spawn EPERM` ile dusuyor.
- `server.ts` ile `api/ai.ts` arasinda tip uyumsuzlugu var.
- `src/services/promptBuilder.ts` ile `src/types/coach.ts` intent setleri uyusmuyor.
- `src/hooks/useAuth.ts` icindeki "bos array fix" gercekte bos cloud state'i local'e yansitmiyor.
- `src/components/MorningBlocker.tsx` halen `sessionStorage` kullaniyor.
- `src/hooks/useOfflineSync.ts` halen eski sync mantigina gore calisiyor.
- `src/services/developerService.ts` halen `userData` koleksiyonuna yaziyor.
- `src/config/admin.ts` halen `SUPER_ADMIN_UID` kullaniyor.
- `src/components/coach/CoachScreen.tsx` KOÇ ekranini chat-first tutuyor.
- `src/components/CoachBriefing.tsx` gorev tamamlama mantigini yalniz son kayit uzerinden surduruyor.
- `src/services/directiveHistory.ts` gercek performans trendi yerine gorev tamamlanma sayisindan "hafiza" cikariyor.
- `src/main.tsx` local ortamda agresif cache ve storage reset yapiyor.
- Admin panelde en az bir kritik buton yanlis fonksiyona bagli.

Sonuc:

- Repo "demo olarak ilerliyor" ama "guvenilir urun" seviyesinde degil.
- KOÇ sistemini iyilestirmek icin sadece prompt degil, state, sync, gorev ve rituel motoru yeniden kurulmak zorunda.

---

## 3. Uygulama Kurali

Bu backlog uygulanirken su kurallar ihlal edilmeyecek:

- Eski veri modeli ile yeni veri modeli ayni anda yasatilmayacak.
- "Suanlik calissin" patch'leri kalici cozum gibi birakilmayacak.
- KOÇ logic'i UI string concat ile yonetilmeyecek.
- Admin islemleri frontend-only varsayimla guvenli sanilmayacak.
- "Fix" etiketi, repoda gercek teknik karsiligi yoksa kullanilmayacak.

---

## 4. P0 Build ve Derleme Blokorleri

### `BUILD-001`

- Priority: P0
- Status: todo
- Scope: `server.ts`, `api/ai.ts`
- Evidence: `npm.cmd run lint`
- Current Failure: `server.ts` icindeki Express `req` nesnesi, `api/ai.ts` handler imzasina tip olarak uymuyor.
- Required Change:
  - `api/ai.ts` handler imzasini VercelRequest/VercelResponse tabanli ama Express ile de uyumlu bir adapter katmanina ayir.
  - `server.ts` icinde handler'i dogrudan cagirmak yerine adapter kullan.
  - `req.body` parse mantigini cift parse gerektirmeyecek sekilde normalize et.
- Acceptance:
  - `npm.cmd run lint` bu dosyalar yuzunden hata vermeyecek.
  - Local `/api/ai` akisi request body formatina gore kirilmayacak.
- Risk if Skipped: Local AI testleri yalanci sonuc uretmeye devam eder.

### `BUILD-002`

- Priority: P0
- Status: todo
- Scope: `src/components/forms/LogEntryWidget.tsx`, `package.json`
- Evidence: `Cannot find module 'canvas-confetti'`
- Current Failure: Log giris bileşeni import ettigi paketi dependency olarak tanimlamiyor.
- Required Change:
  - `canvas-confetti` dependency'sini ekle veya kutlamayi kaldir.
  - SSR ya da no-window ortaminda guvenli import yap.
- Acceptance:
  - Typecheck temiz gecmeli.
  - Log widget render'i eksik paket nedeniyle kirilmamali.
- Risk if Skipped: Build hattı yalniz bu sebeple bile kirik kalir.

### `BUILD-003`

- Priority: P0
- Status: todo
- Scope: `src/services/promptBuilder.ts`, `src/types/coach.ts`
- Evidence: `Record<CoachIntent, string>` eksik intentler
- Current Failure: Prompt builder, guncel `CoachIntent` union'ini kapsamiyor.
- Required Change:
  - `exam_debrief`, `war_room_analysis`, `weekly_review`, `micro_feedback` intentlerini eksiksiz ekle.
  - Tanimli her intent icin zorunlu sistem gorevi ve davranis siniri yaz.
- Acceptance:
  - Typecheck temiz olmali.
  - Hicbir intent fallback olarak yanlis surface davranisina dusmemeli.
- Risk if Skipped: KOÇ sistemi intent bazli degilmis gibi calismaya devam eder.

### `BUILD-004`

- Priority: P0
- Status: todo
- Scope: `src/services/syncSchema.ts`
- Evidence: `DirectiveRecord[]` cast hatasi
- Current Failure: Sync schema tipleri app state ile guvenli baglanmiyor.
- Required Change:
  - `entities` payload'i icin guvenli generic tip yaz.
  - Root alanlar ve entity alanlarini acikca ayir.
  - `DirectiveRecord`, `CoachMemory`, `ChatMessage`, `ExamResult` gibi tipleri cast ile degil explicit map ile cevir.
- Acceptance:
  - Typecheck temiz gecmeli.
  - Sync payload build sirasinda tip zorlamasi kalmamali.
- Risk if Skipped: Sync katmaninda sessiz veri bozulmasi riski surer.

### `BUILD-005`

- Priority: P0
- Status: todo
- Scope: `vite.config.ts`, build araci zinciri
- Evidence: `vite build` -> `spawn EPERM`
- Current Failure: Build ortam mi, config mi, esbuild spawn mu net degil.
- Required Change:
  - Sorunu "uygulama hatasi" ve "makine/policy hatasi" olarak ayir.
  - Ayrı smoke komutlari ile config load, esbuild spawn ve bundle asamalarini izole et.
  - Build script'i local Windows policy kisitinda bile tanilanabilir hata versin.
- Acceptance:
  - Build blokoru rapor seviyesinden cikarilip net siniflandirilmis olmali.
- Risk if Skipped: Her yeni derleme sorunu "belirsiz build bozuklugu" olarak kalir.

---

## 5. P0 Sync ve Veri Butunlugu

### `SYNC-001`

- Priority: P0
- Status: todo
- Scope: `src/hooks/useAuth.ts`
- Evidence: `incoming.tytSubjects.length > 0 ? incoming.tytSubjects : current.tytSubjects`
- Current Failure: Cloud bos array gonderirse local veri silinmiyor.
- Required Change:
  - Bos array'i gecerli cloud gercegi olarak kabul et.
  - `undefined` ile `[]` ayrimini tum root merge mantiginda uygula.
- Acceptance:
  - Cloud'da sifirlanan `tytSubjects`, `aytSubjects`, `trophies`, `activeAlerts` local'de de sifirlanmali.
- Risk if Skipped: Cihazlar arasi drift kalici hale gelir.

### `SYNC-002`

- Priority: P0
- Status: todo
- Scope: `src/services/syncSchema.ts`, `api/sync.ts`
- Evidence: Root whitelist ile API `ALLOWED_ROOT_KEYS` uyusmuyor
- Current Failure: Client baska, API baska root schema kullaniyor.
- Required Change:
  - Root sync contract'ini tek ortak kaynaga indir.
  - `lastCoachDirective`, `directiveHistory`, `coachMemory`, `dailyEloDelta`, `morningUnlockedDate` gibi alanlar tek listede tanimlansin.
- Acceptance:
  - Client ve API ayni root alan setini kullanmali.
- Risk if Skipped: Sync edilen ve edilmeyen alanlar rasgele davranir.

### `SYNC-003`

- Priority: P0
- Status: todo
- Scope: `src/services/firestoreSync.ts`
- Evidence: `FirestoreUserData` store state'in tamamini temsil etmiyor
- Current Failure: KOÇ state, morning blocker state ve bazi profil turevleri sync tipinin disinda.
- Required Change:
  - `FirestoreUserData` ile `AppState` arasinda acik projection tanimla.
  - Root, entity, local-only, UI-only state kategorilerini tek belge ve tek kod yolu ile kilitle.
- Acceptance:
  - Sync'e giren her alan icin kodda tek kaynak listesi olmali.
- Risk if Skipped: Yeni alanlar cloud'a sessizce gitmez veya yanlis yere gider.

### `SYNC-004`

- Priority: P0
- Status: todo
- Scope: `src/services/firestoreSync.ts`, `src/store/appStore.ts`, `src/hooks/useAuth.ts`
- Evidence: `chatHistory` entity, `directiveHistory` root, `coachMemory` root
- Current Failure: KOÇ verileri tek domain gibi degil, parcali saklaniyor.
- Required Change:
  - Chat, directive, memory, tasks icin tek veri modeli kur.
  - Task state root'ta daginik degil, ayri schema ile yasasin.
  - Chat retention ile directive retention'i ayri ama iliskili tasarla.
- Acceptance:
  - KOÇ verisi yeni cihazda tutarli, eksiksiz ve sirali yuklenmeli.
- Risk if Skipped: KOÇ kullaniciyi taniyor gibi yapip gercekte unutmaya devam eder.

### `SYNC-005`

- Priority: P0
- Status: todo
- Scope: `src/store/appStore.ts`
- Evidence: `updateAgendaEntry`, `updateExam`, task lifecycle write-through degil
- Current Failure: Bazi mutasyonlar cloud'a incremental gitmiyor.
- Required Change:
  - Her create, update, delete action icin write-through matrisi cikar.
  - `tombstoneEntity` ve `pushSingleEntity` sadece ekleme degil update path'lerinde de kullanilsin.
- Acceptance:
  - Agenda, exam, focus, failed question, chat, coach task ve directive completion degisiklikleri buluta otomatik gitmeli.
- Risk if Skipped: Sync manuel butona bagimli kalir.

### `SYNC-006`

- Priority: P0
- Status: todo
- Scope: `src/hooks/useAuth.ts`, `src/hooks/useSyncManager.ts`
- Evidence: sign-in/sign-out sirasinda tam snapshot push + realtime merge
- Current Failure: Full snapshot push ile listener merge akislarinin cakisabilecegi bir pencere var.
- Required Change:
  - Auth gecislerinde deterministic sync sirasi tanimla.
  - Realtime listener acilmadan once ilk full pull/push state machine yaz.
- Acceptance:
  - Login/logout aninda veri iki kez merge edilip bozulmamali.
- Risk if Skipped: Nadiren gorunen ama yikici veri yarislari devam eder.

### `SYNC-007`

- Priority: P0
- Status: todo
- Scope: `src/hooks/useOfflineSync.ts`
- Evidence: eski `indexedDB.ts` queue + dogrudan `setDoc(doc(db, item.collection, item.id), item.data)`
- Current Failure: Mevcut sync modeliyle uyumsuz ikinci offline mekanizma calisiyor.
- Required Change:
  - Bu hook'u ya tamamen kaldir ya da yeni sync queue mimarisine tasi.
  - `users/{uid}/...` seklindeki guncel path modeline gec.
- Acceptance:
  - Tek bir offline replay sistemi kalmali.
- Risk if Skipped: Offline'da veri yanlis koleksiyona yazilabilir.

### `SYNC-008`

- Priority: P0
- Status: todo
- Scope: `src/utils/syncQueue.ts`, `api/sync.ts`
- Evidence: queue request'leri auth header tasimiyor
- Current Failure: Auth zorunlu endpoint ile auth'suz replay sistemi cakisiyor.
- Required Change:
  - Queue payload'i auth baglamiyla gonder.
  - Bearer token refresh ve retry mantigi ekle.
- Acceptance:
  - Offline -> online replay auth nedeni ile sessizce fail olmamali.
- Risk if Skipped: Cevrimdisi kayitlar kaybolur.

### `SYNC-009`

- Priority: P0
- Status: todo
- Scope: `src/services/indexedDB.ts`, `src/utils/syncQueue.ts`
- Evidence: iki farkli queue sistemi var
- Current Failure: Offline veri iki ayri mekanizma ile ele alinmaya calisiliyor.
- Required Change:
  - Tek queue sistemi sec.
  - Digerini kaldir.
  - Queue item schema, status kodu ve retry nedeni standardize et.
- Acceptance:
  - Repo icinde tek bir offline queue implementation kalmali.
- Risk if Skipped: Hata ayiklamak imkansizlasir.

### `SYNC-010`

- Priority: P0
- Status: todo
- Scope: `StudentProfile.targetGoals`, atlas hedef akisi
- Evidence: hedef programlar profil icinde tutuluyor
- Current Failure: Hedefler ayri versioned sync nesnesi degil.
- Required Change:
  - `targetGoals` icin ayri schema kur.
  - Cloud merge stratejisini profile merge'den ayir.
- Acceptance:
  - Cihaz A/B hedef ekleme, silme ve guncelleme deterministic olmali.
- Risk if Skipped: Hedef universite planlama katmani guvenilmez kalir.

---

## 6. P0 KOÇ Sisteminin Yeniden Kurulumu

## 6.1 Tek Karar Motoru

### `COACH-CORE-001`

- Priority: P0
- Status: todo
- Scope: `api/ai.ts`, `src/services/promptBuilder.ts`, `src/services/gemini.ts`, `src/types/coach.ts`
- Current Failure: Intent mantigi iki yerde yasiyor, JSON schema iki yerde farkli.
- Required Change:
  - Tek request contract, tek response contract, tek intent map kur.
  - Prompt builder backend ve frontend tarafinda ayni davranis sozlesmesini tuketsin.
- Acceptance:
  - Hicbir intent icin ayrik string concat veya gizli fallback kalmamalı.

### `COACH-CORE-002`

- Priority: P0
- Status: todo
- Scope: `src/types/coach.ts`
- Current Failure: Directive task modeli gorev icrasi icin yetersiz.
- Required Change:
  - `CoachTask` alanlarini genislet:
  - `id`
  - `title`
  - `action`
  - `subject`
  - `topic`
  - `targetMinutes`
  - `targetQuestions`
  - `dueDate`
  - `dueWindow`
  - `priority`
  - `status`
  - `rationale`
  - `successCriteria`
  - `expectedOutcome`
  - `linkedLogIds`
  - `linkedExamIds`
  - `sourceEvidence`
  - `failureReason`
  - `createdAt`
  - `updatedAt`
- Acceptance:
  - Gorev nesnesi artik sadece chatte gorunen madde degil, yurutulebilir urun nesnesi olmali.

### `COACH-CORE-003`

- Priority: P0
- Status: todo
- Scope: `src/services/promptBuilder.ts`, `api/ai.ts`
- Current Failure: JSON zorunlulugu var ama fallback davranisi hala gevsek.
- Required Change:
  - Free-text cevabi normal akistan cikar.
  - Sadece kontrollu hata modu olarak izin ver.
  - Parse error, fallback reason ve raw payload telemetry yaz.
- Acceptance:
  - Structured response parse basarisi olculmeli.

### `COACH-CORE-004`

- Priority: P0
- Status: todo
- Scope: `src/services/coachContext.ts`
- Current Failure: Context builder iyi niyetli ama hafiza, task sonucu ve rituel state'i eksik.
- Required Change:
  - Context'e su alanlari ekle:
  - aktif gorevler
  - son 7 gun compliance
  - son 14 gun weak pattern
  - bugunluk plan durumu
  - hedef gap
  - tekrar backlog
  - mudahale gecmisi
- Acceptance:
  - KOÇ son 3 mesaja degil, ozetlenmis ogrenci durumuna gore karar vermeli.

## 6.2 Kalici Hafiza

### `COACH-MEM-001`

- Priority: P0
- Status: todo
- Scope: `src/services/directiveHistory.ts`, `src/types/coach.ts`
- Current Failure: Hafiza gorev tamamlama sayisindan trend cikariyor.
- Required Change:
  - Hafizayi exam, log, task ve alert verisinden turet.
  - Ayrik sinyalleri tut:
  - recurringWeakTopics
  - recurringAvoidedSubjects
  - staleAdvicePatterns
  - interventionEffectiveness
  - missedTaskReasons
  - strongSubjects
- Acceptance:
  - Hafiza ciktisi dogrudan gorev statulerinden degil, gercek performans ve davranis verisinden beslenmeli.

### `COACH-MEM-002`

- Priority: P0
- Status: todo
- Scope: `store`, `sync`, `selectors`
- Current Failure: Chat history ile hafiza kavrami hala ayni aile icinde.
- Required Change:
  - Chat gecmisi, directive gecmisi, gorev gecmisi ve kalici hafizayi kesin cizgilerle ayir.
- Acceptance:
  - Chat silinse bile KOÇ ogrenciyi tanimaya devam etmeli.

## 6.3 Gorev Sistemi

### `COACH-TASK-001`

- Priority: P0
- Status: todo
- Scope: yeni `coachTasks` state ve schema
- Current Failure: Gorevler last directive icinde gecici liste gibi yasiyor.
- Required Change:
  - Gorevleri ayri state dilimi ve ayri sync varligi yap.
  - Direktif gorev dogurur; gorev state'i direktiften bagimsiz yasamaya devam eder.
- Acceptance:
  - Bir direktif kapansa bile gorevlerin durum takibi surmeli.

### `COACH-TASK-002`

- Priority: P0
- Status: todo
- Scope: task lifecycle
- Current Failure: Tamamla/atla sadece briefing kartinda ve sadece latest record icin var.
- Required Change:
  - Gorev durumlari:
  - `pending`
  - `in_progress`
  - `completed`
  - `deferred`
  - `failed`
  - `cancelled`
  - `blocked`
  - Basarisizlik nedeni secimi zorunlu olsun.
- Acceptance:
  - KOÇ bir gorevin neden bitmedigini okuyup sonraki karari degistirebilmeli.

### `COACH-TASK-003`

- Priority: P0
- Status: todo
- Scope: dashboard, coach page, agenda, focus
- Current Failure: Gorevler urunun geri kalanina bagli degil.
- Required Change:
  - `task -> agenda`
  - `task -> focus session`
  - `task -> reminder`
  - `task -> review outcome`
  - akislarini ekle.
- Acceptance:
  - KOÇ gorevi soyleyip unutmayacak.

## 6.4 Otomatik Karar Zinciri

### `COACH-AUTO-001`

- Priority: P0
- Status: todo
- Scope: log sonrasi mikro analiz
- Current Failure: Trigger var ama operatif degil.
- Required Change:
  - Her log kaydindan sonra:
  - risk
  - sonraki adim
  - task
  - memory update
  - telemetry
  - zinciri tamamlansin.
- Acceptance:
  - Log girildikten sonra KOÇ karari goreve ve hafizaya yazilmali.

### `COACH-AUTO-002`

- Priority: P0
- Status: todo
- Scope: exam sonrasi debrief
- Current Failure: Debrief niyet var ama urun etkisi eksik.
- Required Change:
  - Deneme raporunda zorunlu alanlar:
  - hedefe fark
  - en riskli 2 ders
  - korunacak 1 alan
  - 48 saatlik telafi plani
  - tekrar backlog
  - task listesi
- Acceptance:
  - Exam debrief sonucu goreve donusmeli.

### `COACH-AUTO-003`

- Priority: P0
- Status: todo
- Scope: alert/intervention motoru
- Current Failure: Alert var ama gercek mudahale backlog'u yok.
- Required Change:
  - Esik sistemi kur:
  - 3 gun ders yok
  - subject avoidance
  - same mistake repeat
  - low accuracy streak
  - easy subject escape
  - burnout risk
- Acceptance:
  - Kritik durumlarda KOÇ otomatik mudahale uretmeli.

## 6.5 Rituel Sistemi

### `COACH-RITUAL-001`

- Priority: P0
- Status: todo
- Scope: sabah briefing
- Current Failure: "Gunluk plan al" butonu var, ritual yok.
- Required Change:
  - Sabah otomatik briefing state'i uret.
  - Bugunun 3 ana gorevini sabitle.
  - Ilk risk ve ilk komutu net ver.
- Acceptance:
  - Coach ekrani mesaj yerine briefing ile acilmali.

### `COACH-RITUAL-002`

- Priority: P0
- Status: todo
- Scope: gun ici revizyon
- Current Failure: Gorevler gercek zamanli revize edilmiyor.
- Required Change:
  - Gun ortasi checkpoint ve plan revizyon akisi ekle.
- Acceptance:
  - Tamamlanmayan gorevler gun icinde yeniden agirliklandirilmali.

### `COACH-RITUAL-003`

- Priority: P0
- Status: todo
- Scope: aksam otopsisi ve haftalik review
- Current Failure: Weekly review intent var ama urun rituali yok.
- Required Change:
  - Aksam "bugun ne oldu / neden oldu / yarin ne degisecek" raporu.
  - Haftalik "iyi giden / bozuk giden / degisecek 3 sey" raporu.
- Acceptance:
  - Haftalik review manual prompt degil, urun akisi olmali.

---

## 7. P0 KOÇ Ekrani ve Dashboard Baglantisi

### `COACH-UI-001`

- Priority: P0
- Status: todo
- Scope: `src/components/coach/CoachScreen.tsx`
- Current Failure: Ekran chat-first.
- Required Change:
  - Coach ekranini 4 bolume ayir:
  - Bugunku Brifing
  - Acik Gorevler
  - Mesaj / QA
  - Hafiza ve Risk
- Acceptance:
  - Kullanici coach sekmesine girince operasyon paneli gormeli.

### `COACH-UI-002`

- Priority: P0
- Status: todo
- Scope: `src/components/CoachBriefing.tsx`
- Current Failure: Briefing sadece bos durumda cagriliyor.
- Required Change:
  - Briefing her zaman coach ekraninin ust katmani olsun.
  - Chat alt katman olsun.
- Acceptance:
  - Chat paneli KOÇ ekraninin ana omurgasi olmaktan cikmali.

### `COACH-UI-003`

- Priority: P0
- Status: todo
- Scope: dashboard + coach state
- Current Failure: Dashboard'daki gunun direktifi ile coach ekranindaki veri tekrara dusuyor.
- Required Change:
  - Tek state, iki presentation modeli kullan.
  - Dashboard ozet gorunum olsun.
  - Coach ekranı operatif detay gorunumu olsun.
- Acceptance:
  - Ayni direktif iki farkli mantikla render edilmeyecek.

### `COACH-UI-004`

- Priority: P0
- Status: todo
- Scope: mobile layout
- Current Failure: Mobilde gorev tabanli akis yerine yine mesaj davranisi baskin.
- Required Change:
  - Mobilde kart akisi:
  - bugunluk brifing
  - acik gorevler
  - hizli aksiyonlar
  - sohbet
- Acceptance:
  - Mobilde ilk gorunen sey chat input olmamali.

---

## 8. P0 "Fix Edildi" Sanilan Ama Bozuk Olan Isler

### `FALSEFIX-001`

- Priority: P0
- Status: todo
- Scope: `src/components/MorningBlocker.tsx`
- Evidence: `sessionStorage.getItem('boho_morning_solved')`
- Current Failure: Kod yorumlari persist store fix'i ima ediyor ama component halen `sessionStorage` kullaniyor.
- Required Change:
  - Morning blocker kilidini store alanina tasi.
  - Component icindeki local storage/session storage bagimliligini kaldir.
- Acceptance:
  - Refresh sonrasi ayni gun blocker tekrar acilmamali.

### `FALSEFIX-002`

- Priority: P0
- Status: todo
- Scope: `src/components/MorningBlocker.tsx`
- Current Failure: "Soruyu Gec (Admin)" butonu gercek role check yapmadan `onUnlock()` cagiriyor.
- Required Change:
  - Bu aksiyonu claims kontrollu yap veya tamamen kaldir.
- Acceptance:
  - Yetkisiz kullanici blocker'i bypass edememeli.

### `FALSEFIX-003`

- Priority: P0
- Status: todo
- Scope: `src/hooks/useOfflineSync.ts`
- Current Failure: Eski queue sistemi yeni mimariyle ayni repo icinde yasiyor.
- Required Change:
  - Hook'u emekli et veya yeni queue sistemine tasarla.
- Acceptance:
  - Tek offline replay implementation kalmali.

### `FALSEFIX-004`

- Priority: P0
- Status: todo
- Scope: `src/services/developerService.ts`
- Current Failure: Admin servisleri `userData` koleksiyonuna yaziyor.
- Required Change:
  - Tum admin operasyonlarini guncel `users` modeliyle hizala.
- Acceptance:
  - `userData` bagimliligi repo genelinden silinmeli.

### `FALSEFIX-005`

- Priority: P0
- Status: todo
- Scope: `src/config/admin.ts`
- Current Failure: Repo claims tabanli olmak istiyor ama fiilen hardcoded `SUPER_ADMIN_UID` kullaniyor.
- Required Change:
  - Hardcoded super admin UID mantigini kaldir.
  - Firebase custom claims tek kaynak olsun.
- Acceptance:
  - Yetki hesaplamasi uid sabitine degil claims'e dayanacak.

### `FALSEFIX-006`

- Priority: P0
- Status: todo
- Scope: `src/hooks/useAdminPanel.ts`
- Current Failure: Hook icinde tekrar `useAuth()` cagriliyor.
- Required Change:
  - Admin hook auth state'i prop/store uzerinden alsin.
  - Hook icinde yeni auth aboneligi acma.
- Acceptance:
  - Ikinci auth listener riski kalkmali.

### `FALSEFIX-007`

- Priority: P0
- Status: todo
- Scope: `src/components/admin/AdminPanelModal.tsx`
- Current Failure: "Sistem Loglarini Sifirla" butonu yanlislikla `repairProfile` cagiriyor.
- Required Change:
  - Butonu dogru isleme bagla veya kaldir.
- Acceptance:
  - UI etiketi ile arka plan aksiyon birebir uyusmali.

### `FALSEFIX-008`

- Priority: P0
- Status: todo
- Scope: admin audit log render
- Current Failure: `log.timestamp?.seconds` varsayimi var.
- Required Change:
  - Firestore `Timestamp`, ISO string ve eksik deger icin guvenli formatter yaz.
- Acceptance:
  - Audit log listesi timestamp yuzunden patlamamali.

---

## 9. P1 Admin, Guvenlik ve Sistem Yonetimi

### `ADMIN-001`

- Priority: P1
- Status: todo
- Scope: `developerService`, `systemService`, admin UI
- Current Failure: Admin isleri client-side agirlikli ve domain model tutarsiz.
- Required Change:
  - Admin operasyonlari icin server-backed action katmani tanimla.
- Acceptance:
  - Kritik admin yazmalari client'tan direkt Firestore update ile yapilmayacak.

### `ADMIN-002`

- Priority: P1
- Status: todo
- Scope: Firestore roles + claims
- Current Failure: `role` field ile claims mantigi ayni anda yasiyor.
- Required Change:
  - Role authority zincirini netlestir.
  - UI role gosterebilir ama karar claims'ten gelsin.
- Acceptance:
  - Kullanici rolu server gerceginden turemeli.

### `ADMIN-003`

- Priority: P1
- Status: todo
- Scope: admin audit
- Current Failure: Admin araclari guvenilir denetim yuzeyi degil.
- Required Change:
  - Her admin aksiyonunda actor, target, onceki durum, sonraki durum, sonuc ve hata kaydini zorunlu kil.
- Acceptance:
  - Audit loglar olay izleme icin gercekten kullanilabilir olmali.

---

## 10. P1 Veri Kaybi ve Operasyon Riskleri

### `OPS-001`

- Priority: P1
- Status: todo
- Scope: `src/main.tsx`
- Current Failure: Localhost ortaminda otomatik cache temizleme ve reload davranisi var.
- Required Change:
  - Bu davranisi acik developer flag altina al.
  - Sessiz otomatik reseti kaldir.
- Acceptance:
  - Gelistirici ortami test verisini habersizce silmeyecek.

### `OPS-002`

- Priority: P1
- Status: todo
- Scope: `hardReset`
- Current Failure: Tum localStorage, sessionStorage ve IndexedDB topyekun siliniyor.
- Required Change:
  - Scoped reset tipleri tanimla:
  - cache reset
  - auth reset
  - local app reset
  - full nuke
- Acceptance:
  - Kullaniciya neyin silinecegi net gosterilmeli.

### `OPS-003`

- Priority: P1
- Status: todo
- Scope: error boundary ve crash recovery
- Current Failure: Sert reset tek kurtulus yolu gibi konumlanmis.
- Required Change:
  - Crash source kategorize et.
  - Geri kazanilabilir senaryolarda full nuke dayatma.
- Acceptance:
  - Kullanici ilk hatada butun verisini silmek zorunda kalmayacak.

---

## 11. P1 Tip Guvenligi ve Kod Kalitesi

### `TYPE-001`

- Priority: P1
- Status: todo
- Scope: `src/App.tsx`, `src/components/ExamDetailModal.tsx`, `src/components/StrategyHub.tsx`, `src/components/TopicExplain.tsx`, `src/services/developerService.ts`, `src/services/systemService.ts`, `src/hooks/useAdminPanel.ts`
- Current Failure: Kritik yollarda yogun `any` kullanimı var.
- Required Change:
  - Any temizligi sprinti ac.
  - Once sync, coach, admin ve exam detay yollarini temizle.
- Acceptance:
  - Kritik domain alanlarinda `any` kalmamalı.

### `TYPE-002`

- Priority: P1
- Status: todo
- Scope: markdown renderers, war room, canvas refs
- Current Failure: Bilesen sinirlari gevsek tiplenmis.
- Required Change:
  - Explicit prop interfaces yaz.
  - `window._canvasAPI` gibi global kacis noktalarini tipli adapter ile degistir.
- Acceptance:
  - Global any yuzeyleri azaltilmali.

### `TYPE-003`

- Priority: P1
- Status: todo
- Scope: coach-related types
- Current Failure: `ChatMessage.directive`, `DirectiveRecord`, `CoachTask`, `CoachMemory` ayni domaini farkli derinlikte temsil ediyor.
- Required Change:
  - Tip hiyerarsisini yeniden kur.
- Acceptance:
  - KOÇ domain tipleri birbirini tamamlamali, override etmemeli.

---

## 12. P1 KOÇ Kalite KPI'lari

### `METRIC-001`

- Priority: P1
- Status: todo
- Scope: coach telemetry
- Required Change:
  - Her coach response icin logla:
  - intent
  - provider
  - latency
  - parseSuccess
  - fallbackReason
  - taskCount
  - warningCount
  - sourceSurface
- Acceptance:
  - KOÇ kalitesi olculebilir olmali.

### `METRIC-002`

- Priority: P1
- Status: todo
- Scope: coach product analytics
- Required Change:
  - KPI seti:
  - task completion rate
  - next-day compliance
  - intervention recovery rate
  - stale advice rate
  - exam delta after plan
  - repeated failure by subject
- Acceptance:
  - KOÇ gelisimi his ile degil veriyle yonetilecek.

---

## 13. P1 UX ve Davranissal Uretkenlik Borclari

### `UX-001`

- Priority: P1
- Status: todo
- Scope: `src/hooks/useFocusTimer.ts`, `src/components/FocusSidePanel.tsx`
- Current Failure: Focus state localStorage tabanli ama kurtarma/restore ve cloud iliskisi zayif.
- Required Change:
  - Session checkpoint ve restore akisi yaz.
  - Focus seansi bittiginde task ile iliski kur.
- Acceptance:
  - Yari kalan seanslar kaybolmamalı.

### `UX-002`

- Priority: P1
- Status: todo
- Scope: confirm davranislari
- Current Failure: Repo genelinde `confirmDialog` standardi varken admin panelde hala native `confirm` var.
- Required Change:
  - Tum confirm akislari tek sistem altina alinacak.
- Acceptance:
  - Native `confirm` cagri yolu repo genelinde kapanacak.

### `UX-003`

- Priority: P1
- Status: todo
- Scope: blocker, notifications, rituals
- Current Failure: Kullaniciyi yoneten sistem hissi var ama davranissal geri besleme daginik.
- Required Change:
  - Gorev basarisizligi neden secimi, sabah/aksam ritueli, risk escalation paneli ortak davranis diline cekilecek.
- Acceptance:
  - KOÇ urunu daginik moduller toplami degil, tek davranis sistemi gibi hissedilmeli.

---

## 14. Test ve Kabul Matrisi

Asagidaki testler yazilacak veya manuel matrix olarak uygulanacak:

- `TEST-001` Typecheck temiz
- `TEST-002` Build smoke
- `TEST-003` Login -> pull -> realtime -> manual sync -> logout akisi
- `TEST-004` Cihaz A/B sync matrix:
- logs
- exams
- chat
- directiveHistory
- coachMemory
- targetGoals
- morningUnlockedDate
- agenda
- focus
- `TEST-005` Log entry -> micro feedback -> task generation
- `TEST-006` Exam entry -> debrief -> recovery tasks
- `TEST-007` Task complete -> next coach decision change
- `TEST-008` Task fail -> failureReason -> next coach intervention
- `TEST-009` Weekly review generation
- `TEST-010` MorningBlocker refresh persistence
- `TEST-011` Admin audit timestamp rendering
- `TEST-012` Offline queue replay auth path

Kabul kosulu:

- KOÇ sistemini etkileyen hicbir kritik P0 madde acik kalmayacak.
- Typecheck temiz olmadan backlog kapanmis sayilmayacak.
- Sync matrix tamamlanmadan "multi-device destekli" denmeyecek.

---

## 15. Sprint Sirasi

### Sprint 1

- Build blokorleri
- Sync schema birlestirme
- False fix temizligi
- Morning blocker gercek fix

### Sprint 2

- KOÇ tek karar motoru
- Directive schema genisletme
- Task state ayirma
- Hafiza modeli yeniden kurulum

### Sprint 3

- Log/exam/alert otomasyonlari
- Ritual sistemi
- Dashboard/coach ortak state
- Mobil coach operasyon paneli

### Sprint 4

- Admin ve guvenlik temizligi
- userData kalintilarini silme
- claims tabanli yetki
- audit sertlestirme

### Sprint 5

- KPI ve telemetry
- type cleanup
- regression testleri
- operasyonel reset ve recovery akislari

---

## 16. En Kritik 20 Is

- `TOP-001` Typecheck kirmayan build omurgasi kur
- `TOP-002` Sync root/entity kontratini tek kaynaga indir
- `TOP-003` Empty-array merge bug'ini gercekten kapat
- `TOP-004` Offline queue ikiligini kaldir
- `TOP-005` MorningBlocker sessionStorage bagimliligini sil
- `TOP-006` Hardcoded super admin mantigini kaldir
- `TOP-007` developerService `userData` bagimliligini bitir
- `TOP-008` KOÇ intent kaynagini tekle
- `TOP-009` Directive schema'yi gorev-odakli hale getir
- `TOP-010` Gorevleri last directive icinden cikar
- `TOP-011` Hafizayi gercek performans verisinden turet
- `TOP-012` Log sonrasi mikro analiz zincirini tamamla
- `TOP-013` Deneme sonrasi debrief zincirini tamamla
- `TOP-014` Alert -> intervention backlog kur
- `TOP-015` Sabah briefing ritualini urun akisi yap
- `TOP-016` Coach ekranini chat-first olmaktan cikar
- `TOP-017` Dashboard ve coach state duplication'u bitir
- `TOP-018` Admin panel yanlis buton baglantilarini temizle
- `TOP-019` Telemetry ve KPI katmanini ekle
- `TOP-020` Cihazlar arasi sync matrix'i tamamla

---

## 17. Kapanis Hukumleri

Bu backlog uygulandiginda su durumlar artik kabul edilmeyecek:

- "Calisiyor gibi" ama typecheck kirik kod
- "Fix edildi" yorumu olan ama bozuk kalan feature
- Sync olan ve olmayan state'in gelişi guzel karismasi
- KOÇ'un chat gibi davranip gorev gibi davranamaması
- Hardcoded admin mantigi
- Cevrimdisi verinin sans eseri kurtulmasi

Bu backlog'un ana mesaji su:

Boho Mentosluk su an fikir olarak guclu ama sistem olarak daginik.
KOÇ'u ise yarar hale getirmek icin prompt degil, cekirdek urun mantigi, veri modeli ve gorev motoru duzeltilmek zorunda.

Bu dosya, o duzeltmenin zorunlu is listesidir.
