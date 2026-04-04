# Boho Mentosluk V20 Koc Sistem ve Ekran Todo List

> Durum: aktif, coach overhaul backlog  
> Guncelleme tarihi: 2026-04-05  
> Kapsam: KOÇ karar motoru, hafiza, gorev sistemi, analiz zinciri, coach ekrani, dashboard baglantisi, olcumleme  
> Amac: KOÇ'u "cevap veren chat" olmaktan cikarip "ogrenciyi yoneten, takip eden, baski kuran, sonuclari olcen calisma sistemi" haline getirmek

---

## 1. Ana Tespit

Su anki KOÇ neden yeterince ise yaramiyor:

- KOÇ, veri-temelli karar motoru yerine agirlikli olarak mesajlasma arayuzu gibi davraniyor.
- UI tarafinda chat merkezde, eylem ve takip ikincil durumda.
- KOÇ'un onerileri gorev nesnelerine tam donusmuyor; tamamlandi, ertelendi, uygulanmadi bilgisi kayboluyor.
- KOÇ kullaniciyi taniyor gibi gorunuyor ama kalici hafiza, davranis deseni ve karar gerekcesi zayif.
- Q&A modu bir urun akisi degil; sohbet ici gecici senaryo gibi calisiyor.
- Deneme, log, konu, tekrar, hedef farki ve gunluk plan ayni karar motoruna bagli degil.
- "Gunun Direktifi" var ama "neden bunu soyluyorum", "simdi ne yap", "bitince ne olacak" zinciri zayif.
- Coach ekrani operatif panel yerine mesaj penceresi hissi veriyor.

Bu backlog'un hedefi yalnizca prompt'u iyilestirmek degil. Hedef, KOÇ'un urun mantigini bastan dogru kurmak.

---

## 2. Nihai Hedef Tanimi

KOÇ asagidaki davranislari gostermeli:

- Ogrencinin bugunku durumunu ozetlemeli.
- En kritik riski net gostermeli.
- Maksimum 3 gorev vermeli.
- Her gorevin neden secildigini veriye dayali aciklamali.
- Kullanici gorevi tamamlayinca sonraki karari degistirmeli.
- Deneme ve log girdilerinden otomatik aksiyon cikarmali.
- Haftalik ve gunluk rutinleri kendi takip etmeli.
- Hedef universite ve hedef net farkini plana aktif olarak yansitmali.
- Uygulanmayan tavsiyeleri tespit edip tekrar ve sertlik seviyesini ayarlamali.
- Guzel konusmak yerine sonuc ureten bir calisma komut sistemi olmali.

---

## 3. Basari Kriterleri

V20 tamamlandiginda KOÇ icin minimum kabul kriterleri:

- Kullanici coach ekranina girince bos chat degil, durum paneli gorur.
- KOÇ her gun otomatik bir "bugunluk plan" uretir.
- Her log sonrasi mikro analiz cikar.
- Her deneme sonrasi savas raporu cikar.
- Gorevler tamamlandi/ertelendi/olamadi olarak isaretlenebilir.
- KOÇ ayni hatayi tekrar eden kullaniciyi fark eder.
- Haftalik review otomatik cikar.
- Coach ekrani mesaj akisi + gorev paneli + risk paneli + hafiza paneli olarak parcalanir.
- KOÇ kalitesi olculebilir KPI'lara baglanir.

---

## 4. Temel Urun Ilkeleri

- KOÇ once veri, sonra yorum.
- KOÇ once aksiyon, sonra motivasyon.
- KOÇ maksimum 3 gorev verir.
- Her gorev olculebilir olur.
- Her direktifte en fazla 1 ana risk acikca belirtilir.
- Serbest sohbet, esas urun akisinin yerine gecmez.
- Prompt kisiligi ile karar mantigi birbirinden ayrilir.
- Kullaniciya gereksiz uzun cevap degil, uygulanabilir komut verilir.

---

## 5. P0 - KOÇ Cekirdegi Yeniden Kurulum

### 5.1 Tek karar motoru

- `COACH-CORE-001` `status: todo` `files: src/services/gemini.ts, src/services/promptBuilder.ts, api/ai.ts, src/types/coach.ts` `action: tum coach yuzeyleri icin tek request/response contract kullan; free_chat, qa_mode, daily_plan, log_analysis, exam_analysis, intervention, weekly_review gibi intentleri gercek karar motoruna bagla`
- `COACH-CORE-002` `status: todo` `files: src/App.tsx, src/components/AgendaPage.tsx, src/components/StrategyHub.tsx, src/components/TopicExplain.tsx, src/components/CoachInterventionModal.tsx` `action: ayri ayri string concat ile context kurma modelini kaldir; tek buildCoachContext katmani yaz`
- `COACH-CORE-003` `status: todo` `files: src/types/coach.ts` `action: CoachDirective modeline rationale, expectedOutcome, dueWindow, successCriteria, sourceSurface, confidence alanlari ekle`
- `COACH-CORE-004` `status: todo` `files: src/services/promptBuilder.ts, api/ai.ts` `action: structured JSON cevabi zorunlu yap; free-text fallback'i yalnizca kontrollu hata modu olarak kullan`
- `COACH-CORE-005` `status: todo` `files: src/App.tsx, src/store/appStore.ts` `action: lastCoachDirective yerine directiveHistory modeli ekle; intent, createdAt, source, completionState, rawResponse, parsedState tutulmali`

### 5.2 Kalici coach hafizasi

- `COACH-MEM-001` `status: todo` `files: src/store/appStore.ts, src/types/coach.ts, src/services/firestoreSync.ts` `action: coachMemory modeli ekle`
  - hedefler
  - tekrar eden zayif dersler
  - tekrar eden kacma davranislari
  - son 14 gun trendleri
  - tamamlanmayan gorev tipleri
  - fayda saglayan mudahale tipleri
- `COACH-MEM-002` `status: todo` `files: coach selectors` `action: sohbet history'si ile kalici hafizayi ayir`
- `COACH-MEM-003` `status: todo` `files: src/hooks/useAuth.ts, src/services/firestoreSync.ts` `action: coach hafizasini senkronize edilebilir ama UI state'ten ayrik schema ile sakla`
- `COACH-MEM-004` `status: todo` `files: coach engine` `action: KOÇ yeni cevap uretirken son 3 mesaji degil, ozetlenmis hafiza kartini kullansin`

### 5.3 Q&A state machine

- `COACH-QA-001` `status: todo` `files: src/App.tsx, src/store/appStore.ts, src/types/coach.ts` `action: Q&A modunu state machine yap`
  - senaryo tipi
  - beklenen alanlar
  - ilerleme yuzdesi
  - eksik alanlar
  - bitis kosulu
  - sonuc uretim kosulu
- `COACH-QA-002` `status: todo` `files: coach engine` `action: PLAN, LOG, DENEME, ANLA, HEDEF gibi hizli akislari ayri senaryolara cevir`
- `COACH-QA-003` `status: todo` `files: UI` `action: kullaniciya kac soru kaldigini ve neden soruldugunu gosteren ilerleme cubugu ekle`
- `COACH-QA-004` `status: todo` `files: parser + store` `action: yarim kalan Q&A oturumlari geri donulebilir olsun`

---

## 6. P0 - KOÇ Gorev Sistemi

### 6.1 Gorev nesnesi

- `COACH-TASK-001` `status: todo` `files: src/types/coach.ts` `action: CoachTask alanlarini genislet`
  - id
  - title
  - action
  - subject
  - topic
  - targetMinutes
  - targetQuestions
  - dueDate
  - urgency
  - rationale
  - successCriteria
  - linkedLogIds
  - linkedExamIds
  - status
  - completedAt
  - skippedReason
- `COACH-TASK-002` `status: todo` `files: store + sync` `action: coach tasks'i ayri koleksiyon veya ayri state dilimi olarak sakla`
- `COACH-TASK-003` `status: todo` `files: UI` `action: gorevler tamamlandi / ertelendi / yapilamadi / iptal olarak isaretlenebilsin`

### 6.2 Gorev geri besleme dongusu

- `COACH-TASK-004` `status: todo` `files: coach engine` `action: KOÇ yeni karar verirken son gorevlerin akibetini okuyup karar agirligini degistirsin`
- `COACH-TASK-005` `status: todo` `files: dashboard + coach UI` `action: bugunun acik gorevleri her zaman gorunur olsun`
- `COACH-TASK-006` `status: todo` `files: agenda integration` `action: coach task -> agenda item donusumu ekle`
- `COACH-TASK-007` `status: todo` `files: focus integration` `action: coach task -> odak seansi baslatma aksiyonu ekle`
- `COACH-TASK-008` `status: todo` `files: notifications` `action: bitmeyen coach gorevleri icin hatirlatma sistemi ekle`

---

## 7. P0 - Otomatik Analiz Zinciri

### 7.1 Log sonrasi

- `COACH-AUTO-LOG-001` `status: todo` `files: LogEntryWidget, store, coach engine` `action: her log kaydindan sonra otomatik mikro analiz uret`
- `COACH-AUTO-LOG-002` `status: todo` `files: coach engine` `action: analiz formatini standartlastir`
  - ne iyi gitti
  - ne kotu gitti
  - en kritik risk
  - bir sonraki adim
- `COACH-AUTO-LOG-003` `status: todo` `files: UI` `action: log kaydi sonrasi modal/inline feedback karti goster`
- `COACH-AUTO-LOG-004` `status: todo` `files: analytics` `action: ayni konu veya derste tekrar eden dusuk performansi coach memory'ye yaz`

### 7.2 Deneme sonrasi

- `COACH-AUTO-EXAM-001` `status: todo` `files: ExamEntryModal, exam pipeline, coach engine` `action: deneme kaydi sonrasi otomatik exam_analysis uret`
- `COACH-AUTO-EXAM-002` `status: todo` `files: directive schema` `action: deneme raporunda zorunlu alanlar olsun`
  - hedefe fark
  - en riskli 2 ders
  - korunmasi gereken 1 ders
  - 48 saatlik telafi plani
  - tekrar edilmesi gereken konu listesi
- `COACH-AUTO-EXAM-003` `status: todo` `files: coach tasks` `action: deneme raporundaki aksiyonlar goreve donussun`
- `COACH-AUTO-EXAM-004` `status: todo` `files: compare analytics` `action: onceki denemeye gore delta tablosu ekle`

### 7.3 Alarm ve mudahale

- `COACH-AUTO-ALERT-001` `status: todo` `files: statistics utils, coach engine` `action: mudahale esik sistemi kur`
  - 3 gun ders yok
  - hiz dusuyor
  - dogruluk dusuyor
  - sadece guvenli derse kacis
  - streak kirilmasi
- `COACH-AUTO-ALERT-002` `status: todo` `files: CoachInterventionModal, store` `action: mudahaleleri gorev ve sonuc kaydi ile bagla`
- `COACH-AUTO-ALERT-003` `status: todo` `files: dashboard + coach` `action: kritik mudahale backlog'u goster`

---

## 8. P0 - Coach Ekrani Yeniden Tasarim

### 8.1 Mevcut sorunlar

- Mesaj listesi merkezde, karar paneli yan urun gibi kaliyor.
- Hemen kullanilabilir bugunluk plan ekrani yok.
- Hangi komutun ne ise yaradigi belirgin degil.
- QA modu ile normal sohbet ayni akis icinde eriyor.
- Son direktif dashboard'ta gorunuyor ama coach ekraninda daha iyi bir operasyon paneli yok.
- Input alani serbest metin agirlikli; secilebilir modlar ve hizli aksiyonlar yetersiz.

### 8.2 Yeni ekran mimarisi

- `COACH-UI-001` `status: todo` `files: src/App.tsx veya yeni CoachPage.tsx` `action: coach ekranini 4 ana bolume ayir`
  - Bugunku Brifing
  - Acik Gorevler
  - Mesaj / Q&A Akisi
  - Hafiza ve Risk Paneli
- `COACH-UI-002` `status: todo` `files: new coach components` `action: coach sayfasini ayri component yap`
  - `CoachHeader`
  - `CoachBriefingCard`
  - `CoachTaskBoard`
  - `CoachRiskPanel`
  - `CoachConversationPanel`
  - `CoachQuickActions`
  - `CoachMemoryPanel`
- `COACH-UI-003` `status: todo` `files: UI` `action: acilis ekraninda asagidaki kartlar zorunlu olsun`
  - bugunluk skor
  - bugunun en kritik acigi
  - su an yapman gereken ilk is
  - dunden kalan gorevler
  - son deneme ozeti
- `COACH-UI-004` `status: todo` `files: UI` `action: input ustunde mod seciciler ekle`
  - Planla
  - Log Analiz
  - Deneme Analiz
  - Konu Anlat
  - Mudahale
  - Serbest Sor
- `COACH-UI-005` `status: todo` `files: UI` `action: slash command veya command palette ekle`
- `COACH-UI-006` `status: todo` `files: UI` `action: QA oturumlarinda sohbet yerine wizard layout kullan`
- `COACH-UI-007` `status: todo` `files: UI` `action: gorev kartlarina tek tikla aksiyonlar ekle`
  - baslat
  - ajandaya ekle
  - tamamladim
  - ertele
  - neden yapamadim
- `COACH-UI-008` `status: todo` `files: UI` `action: warning panelini tek satir uyaridan cikar; risk skoru, tetikleyici veri ve onerilen mudahale goster`
- `COACH-UI-009` `status: todo` `files: UI` `action: mesaj balonlarini zenginlestir`
  - intent badge
  - karar gerekcesi
  - goreve donustur butonu
  - ilgili log/deneme linkleri
- `COACH-UI-010` `status: todo` `files: mobile layout` `action: mobilde coach ekranini mesaj listesi degil kart akisi mantigiyla yeniden organize et`

---

## 9. P0 - Dashboard ve KOÇ Baglantisi

- `COACH-DASH-001` `status: todo` `files: dashboard` `action: Gunun Direktifi kartini gelistir`
  - neden bu direktif
  - hedeflenen sonuc
  - tamamlanma durumu
  - direkt coach ekranina git
- `COACH-DASH-002` `status: todo` `files: dashboard` `action: dashboard'da "bugun senden ne bekleniyor" bolumu ekle`
- `COACH-DASH-003` `status: todo` `files: dashboard + coach state` `action: dashboard ve coach ayni bugunluk state'i paylassin`
- `COACH-DASH-004` `status: todo` `files: dashboard` `action: son 24 saat KOÇ aksiyonlari ozet kutusu ekle`

---

## 10. P1 - Hedefe Gore Planlama

- `COACH-GOAL-001` `status: todo` `files: target goals, atlas, coach selectors` `action: coach context'e hedef program farki ekle`
- `COACH-GOAL-002` `status: todo` `files: plan engine` `action: hedef net farkina gore gunluk ve haftalik tempo hesabi yap`
- `COACH-GOAL-003` `status: todo` `files: dashboard + coach` `action: "bu tempoyla hedefe yetisiyor musun" karti ekle`
- `COACH-GOAL-004` `status: todo` `files: coach tasks` `action: hedefe gore kritik ders agirligini dinamik guncelle`
- `COACH-GOAL-005` `status: todo` `files: strategy hub` `action: hedef universite seciliyse strateji ekraninda coach tavsiyesi ayni veriyi kullansin`

---

## 11. P1 - Haftalik ve Gunluk Rutinler

### 11.1 Sabah

- `COACH-RITUAL-001` `status: todo` `files: coach page, notifications` `action: sabah brifingi otomatik uret`
- `COACH-RITUAL-002` `status: todo` `files: coach tasks` `action: bugunun 3 ana gorevini sabah sabitle`
- `COACH-RITUAL-003` `status: todo` `files: UI` `action: sabah ekraninda tahmini toplam sure, soru hedefi, risk dersi goster`

### 11.2 Gun ici

- `COACH-RITUAL-004` `status: todo` `files: reminders` `action: gun ortasi kontrol noktasi ekle`
- `COACH-RITUAL-005` `status: todo` `files: coach state` `action: gun icinde tamamlanmayan gorevler icin plan revizyonu yap`

### 11.3 Aksam

- `COACH-RITUAL-006` `status: todo` `files: coach engine, logs, agenda` `action: aksam otopsisi uret`
- `COACH-RITUAL-007` `status: todo` `files: UI` `action: "bugun ne oldu / neden oldu / yarin ne degisecek" formatini standart yap`
- `COACH-RITUAL-008` `status: todo` `files: analytics` `action: gunluk compliance score hesapla`

### 11.4 Haftalik

- `COACH-RITUAL-009` `status: todo` `files: strategy, coach, exams, logs` `action: haftalik review intent ekle`
- `COACH-RITUAL-010` `status: todo` `files: weekly report UI` `action: haftalik raporda su alanlar zorunlu olsun`
  - bu hafta ne iyi gitti
  - ne kotu gitti
  - hangi ders kacildi
  - hangi kaynak ise yaradi
  - gelecek hafta degisecek 3 sey

---

## 12. P1 - Konu Tekrar ve Calisma Optimizasyonu

- `COACH-STUDY-001` `status: todo` `files: logs, subjects, coach memory` `action: tekrar backlog sistemi ekle`
- `COACH-STUDY-002` `status: todo` `files: subject status + logs` `action: sadece "mastered" etiketi yetmez; konu saglamlik skoru ekle`
- `COACH-STUDY-003` `status: todo` `files: ROI analytics` `action: dusuk ROI kaynaklari coach planinda isaretle`
- `COACH-STUDY-004` `status: todo` `files: topic explain + coach tasks` `action: konu anlat modunu gorev ve tekrarla bagla`
- `COACH-STUDY-005` `status: todo` `files: planner` `action: ayni gun icinde yeni konu / tekrar / deneme / analiz dagilimini dengele`

---

## 13. P1 - Davranissal KOÇ ve Fayda Mekanigi

- `COACH-BEHAV-001` `status: todo` `files: coach memory` `action: ders kacma paterni algila`
- `COACH-BEHAV-002` `status: todo` `files: analytics` `action: kolay derse siginma paternini algila`
- `COACH-BEHAV-003` `status: todo` `files: interventions` `action: ayni uyarinin tekrarinda sertlik seviyesini artir`
- `COACH-BEHAV-004` `status: todo` `files: directive schema` `action: her sert mudahalede veri kaniti goster`
- `COACH-BEHAV-005` `status: todo` `files: UI` `action: kullanici neden yapamadigini secsin`
  - yorgundum
  - sure yetmedi
  - motivasyon dustu
  - konu anlamadim
  - dis etken oldu
- `COACH-BEHAV-006` `status: todo` `files: coach engine` `action: bu nedenleri sonraki tavsiyeye dahil et`

---

## 14. P1 - Olcumleme ve Kalite KPI'lari

- `COACH-METRIC-001` `status: todo` `files: analytics layer` `action: coach KPI modeli tanimla`
  - task completion rate
  - next-day compliance
  - intervention recovery rate
  - weekly plan adoption
  - exam delta after coach plan
  - streak recovery after alert
- `COACH-METRIC-002` `status: todo` `files: admin/system stats` `action: coach quality dashboard ekle`
- `COACH-METRIC-003` `status: todo` `files: logging` `action: her coach response icin telemetry yaz`
  - intent
  - provider
  - latency
  - parse success
  - fallback reason
  - task count
  - warning count
- `COACH-METRIC-004` `status: todo` `files: product analytics` `action: kullanicinin hangi coach ciktisini gercekten kullandigini olc`

---

## 15. P1 - Guven ve Aciklanabilirlik

- `COACH-TRUST-001` `status: todo` `files: directive schema + UI` `action: her direktifte "neden bu oneriyi verdim" satiri ekle`
- `COACH-TRUST-002` `status: todo` `files: UI` `action: veri kaynagi rozeti goster`
  - log
  - deneme
  - hedef farki
  - tekrar borcu
  - streak
- `COACH-TRUST-003` `status: todo` `files: UI` `action: kullanici bir tavsiyeye "bu isime yaramadi" geri bildirimi verebilsin`
- `COACH-TRUST-004` `status: todo` `files: engine` `action: ise yaramayan tavsiyeleri tekrar verme oranini dusur`

---

## 16. P2 - Teknik Refactor ve Bilesenlesme

- `COACH-REF-001` `status: todo` `files: src/App.tsx` `action: coach tab'ini ayri CoachPage componentine tasi`
- `COACH-REF-002` `status: todo` `files: new components` `action: coach UI component kutuphanesi kur`
- `COACH-REF-003` `status: todo` `files: store` `action: coach state'i ayri slice'a ayir`
- `COACH-REF-004` `status: todo` `files: services` `action: coachEngine, coachSelectors, coachFormatters, coachTelemetry, coachTasks servislerini ayir`
- `COACH-REF-005` `status: todo` `files: tests` `action: prompttan bagimsiz karar mantigi unit test ile dogrulansin`

---

## 17. P2 - Test Plan

- `COACH-TEST-001` `status: todo` `action: buildCoachContext unit test`
- `COACH-TEST-002` `status: todo` `action: directive parser unit test`
- `COACH-TEST-003` `status: todo` `action: task completion -> next decision regression test`
- `COACH-TEST-004` `status: todo` `action: Q&A state machine happy path ve edge case testleri`
- `COACH-TEST-005` `status: todo` `action: log entry -> auto analysis -> task generation zinciri test`
- `COACH-TEST-006` `status: todo` `action: exam entry -> report -> recovery plan zinciri test`
- `COACH-TEST-007` `status: todo` `action: mobile coach screen visual regression test`

---

## 18. Sprint Sirasi

### Sprint 1 - KOÇ iskeleti

- tek request/response contract
- buildCoachContext
- directive schema genisletme
- task modeli
- coach page component ayirma

### Sprint 2 - Gercek fayda

- log sonrasi mikro analiz
- deneme sonrasi savas raporu
- sabah brifingi
- gorev tamamlama akisi

### Sprint 3 - Coach ekrani

- briefing panel
- task board
- risk panel
- memory panel
- command palette

### Sprint 4 - Hafiza ve davranis

- coach memory
- davranis paternleri
- mudahale skorlama
- haftalik review

### Sprint 5 - KPI ve kalite

- telemetry
- coach quality dashboard
- regression tests
- feedback loop

---

## 19. Kullaniciya Danisilmasi Gereken Kararlar

Bu dosya tahmini urun yonunu cizer. Kodlamaya baslamadan once netlestirilmesi faydali olacak kararlar:

- KOÇ tonu ne kadar sert olmali: sert / dengeli / secilebilir
- KOÇ gorevleri gunde maksimum kac adet olmali
- Sabah ve aksam ritueli zorunlu mu, opsiyonel mi olmali
- Coach ekraninda mesaj akisi mi daha baskin olmali, gorev paneli mi
- Hedef universite farkini ne kadar agresif gostermek istiyorsun
- Haftalik review otomatik acilsin mi, manuel mi tetiklensin

---

## 20. En Kritik 15 Is

- `TOP-001` Tek coach engine ve tek intent contract
- `TOP-002` buildCoachContext merkezi selector
- `TOP-003` directive schema'ya rationale + successCriteria ekleme
- `TOP-004` coach tasks ayri state ve sync modeli
- `TOP-005` task completion geri besleme dongusu
- `TOP-006` log sonrasi otomatik mikro analiz
- `TOP-007` deneme sonrasi otomatik savas raporu
- `TOP-008` sabah brifingi
- `TOP-009` coach page redesign
- `TOP-010` command palette + mode switcher
- `TOP-011` coach memory modeli
- `TOP-012` davranis patern algilama
- `TOP-013` haftalik review
- `TOP-014` coach telemetry ve KPI'lar
- `TOP-015` coach ekrani mobil optimizasyonu

---

## 21. Kapanis

V20'nin ana mesaji su:

KOÇ'u daha "zeki cevap veren model" yapmaya calismak tek basina yetmez.
KOÇ'u daha "iyi urunlenmis karar ve takip sistemi" yapmak gerekir.

Bu backlog, prompt iyilestirmesi, ekran redesign'i, gorev motoru, hafiza, davranis analizi ve sonuc olcumunu tek bir urun catisinda toplar.
