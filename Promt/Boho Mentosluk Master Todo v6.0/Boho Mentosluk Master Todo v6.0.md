# Boho Mentosluk Master Todo v6.0

> Durum: aktif ana kaynak  
> Guncelleme tarihi: 2026-04-03  
> Kapsam: `Promt` klasoru konsolidasyonu + repo taramasi + acik teknik/urun backlog'u  

## 1. Giris

Bu dosya, `Promt` klasorundeki daginik prompt ve todo dosyalarini tek kaynakta birlestirir. Icerik iki kaynaktan uretilmistir:

- Promptlardan gelen talepler: eski sprint promptlari, coach taslaklari, atlas dokumanlari, hata kataloglari
- Repoda dogrulanan durum: `src`, `api`, `scripts`, `firestore.rules`, `android`, `Promt` taramasi

Ana hedef:

- Firestore tabanli veri tutarliligini gercekten calisan hale getirmek
- Koc'u eski chat ekrani olmaktan cikarip yapilandirilmis direktif motoruna donusturmek
- War Room, sync, guvenlik ve performans borclarini tek backlog'da toplamak
- `Promt` klasorunu aktif rehber + tek master todo yapisina indirgemek

## 2. Prompt Klasoru Konsolidasyon Karari

### Korunacak aktif dosyalar

- `Promt/PROJECT_GPT_GUIDE.md`
- `Promt/Master koc.md`
- `Promt/Yokatlas.md`
- `Promt/Boho Mentosluk Master Todo v6.0/Boho Mentosluk Master Todo v6.0.md`
- `Promt/Boho Mentosluk Master Todo v6.0/Prompt Archive Summary v6.0.md`

### Arsive alinacak eski prompt ve todo dosyalari

- `Promt/aodiawuda.md`
- `Promt/Bohbo.md`
- `Promt/Boho mentosluk fix prompt.md`
- `Promt/Improve promt.md`
- `Promt/promtv2.md`
- `Promt/Todo`
- `Promt/Todo.md`
- `Promt/Yks coach prompt v7 ·`
- `Promt/Yks coach qa prompt v1`
- `Promt/Boho Mentosluk Master Todo v6.0/Boho Mentosluk Master Todo details`
- `Promt/Boho Mentosluk Master Todo v6.0/Boho Mentosluk Master Todo details v2`

### Kod snapshot arsivi

- `Promt/files/App.PATCH_NOTES.ts`
- `Promt/files/ai.ts`
- `Promt/files/ExamDetailModal.tsx`
- `Promt/files/MebiWarRoom.tsx`
- `Promt/files/syncQueue.ts`
- `Promt/files/ToastContext.tsx`
- `Promt/files/useOfflineSync.ts`
- `Promt/files/useWarRoom.ts`
- `Promt/files/warRoomService.ts`

Gerekce: bunlar yasayan kodun aktif kaynagi degil; eski patch/snapshot dosyalari. Rehber degeri olsa da ust duzey klasorde durmasi drift ve kafa karisikligi uretir.

## 3. Uygulandi / Kismen Uygulandi / Hala Acik

### Uygulandi

- ISO tarih util katmani mevcut: `src/utils/date.ts`
- Firestore sync subcollection mimarisi mevcut: `src/services/firestoreSync.ts`
- Root + entity realtime listener akisi mevcut: `src/hooks/useAuth.ts`
- `pushSingleEntity` ve `tombstoneEntity` altyapisi mevcut
- `LogEntryWidget` log tarihini ISO yazar
- `ExamEntryModal` skor normalize etme mantigi eklenmis
- `useOfflineSync` auth uid bazli calisiyor
- `syncQueue` module-scope listener sorunu onceki promptlara gore kapanmis
- Admin claims akisi baslamis: `getIdTokenResult()` kullanimlari mevcut

### Kismen uygulandi

- `beforeunload` veri kaybi riski not edilmis ama tam cozum yok
- War Room soru validation ve `timeSpent` mantigi parcali duzeltilmis
- `confirmDialog` gecisi bircok yerde var ama tam yaygin degil
- Firestore normalized model var ama butun store aksiyonlari write-through degil
- Koc promptu kuvvetli ama structured directive cikisi henuz yok

### Hala acik kalan kritik bosluklar

- `targetGoals` / YOK hedefleri tam sync garantisine bagli degil
- `useAuth` icinde bos-array merge bug'i var
- `/api/sync` hala placeholder/no-op
- `useAppStore()` tam-store subscribe desenleri duruyor
- `App.tsx` code splitting yok
- Koc V2 structured directive, intent ve offline cache tamamlanmadi

## 4. Kaynak Matrisi

- `aodiawuda.md`: guvenlik, bug, performans ve yeni ozellik backlog'u
- `Bohbo.md`: runtime/TS temizligi ve sprint operasyonlari
- `Boho mentosluk fix prompt.md`: `api/ai`, mobil, auth ve cihazlar arasi kirilimlar
- `promtv2.md`: admin panel, developer service, `userData` tabanli eski yonetim modeli
- `Todo` ve `Todo.md`: eski hata kataloglari ve sonradan eklenen sync backlog'u
- `Yks coach prompt v7 ·` ve `Yks coach qa prompt v1`: Koc davranisi ve veri toplama kurgusu
- `Master koc.md`: yasayan coach persona ve davranis referansi
- `Yokatlas.md`: Atlas veri pipeline ve UI backlog'u
- `repo scan`: kodda gercekten bulunan durumlar ve kalan borclar

## 5. ULTRA Detayli Master Todo

### P0 - Veri Tutarliligi ve Sync

- `SYNC-001` `status: partial` `source: Todo.md, promtv2, repo scan` `repo_status: firestoreSync users tabanli ama developerService bazi yerlerde userData yaziyor` `files: src/services/firestoreSync.ts, src/services/developerService.ts, src/hooks/useAuth.ts` `action: users/userData split-brain'i kapat, tek veri modeli belirle, admin akislarini users yapisina tasi` `verification: ayni kullanici verisi admin paneli ve app tarafinda tek kaynaktan okunmali`
- `SYNC-002` `status: todo` `source: Master Todo details v2, repo scan` `repo_status: targetGoals cloud sozlesmesinde acik ve tam garanti degil` `files: src/store/appStore.ts, src/services/firestoreSync.ts, src/hooks/useAuth.ts` `action: YOK hedeflerini profile'dan ayri, versioned ve sync edilen bir alan haline getir` `verification: cihaz A'da hedef ekleme/silme cihaz B'de gorunmeli`
- `SYNC-003` `status: partial` `source: repo scan` `repo_status: useAuth merge mantiginda bos remote array local'i temizleyemiyor` `files: src/hooks/useAuth.ts` `action: empty-array merge bug'ini kapat; bos dizi de gecerli cloud gercegi sayilmali` `verification: cloud'da sifirlanan subjects/trophies local'de de sifirlanmali`
- `SYNC-004` `status: partial` `source: Todo.md, repo scan` `repo_status: subjectViewMode benzeri tercihler yarim kapsanmis` `files: src/services/firestoreSync.ts, src/hooks/useAuth.ts, src/store/appStore.ts` `action: tum user preference alanlari icin sync matrisi cikar ve eksikleri kapat` `verification: tema ve gorunum tercihleri cihazlar arasinda drift uretmemeli`
- `SYNC-005` `status: partial` `source: Todo.md, repo scan` `repo_status: updatedAt/deviceId alanlari var ama conflict resolution tam degil` `files: src/services/firestoreSync.ts, src/hooks/useAuth.ts` `action: last-write ve same-device replay kurallarini acik hale getir, merge'i deterministic yap` `verification: iki cihaz eszamanli guncellemede sonuc tahmin edilebilir olmali`
- `SYNC-006` `status: partial` `source: Todo.md, repo scan` `repo_status: offline queue var ama duplicate replay/idempotency garantisi tam degil` `files: src/utils/syncQueue.ts, src/hooks/useOfflineSync.ts, src/services/firestoreSync.ts` `action: entity opId veya revision tabanli idempotency ekle` `verification: offline -> online geciste duplicate log/chat/exam olusmamali`
- `SYNC-007` `status: partial` `source: Master Todo details, repo scan` `repo_status: realtime listener var ama entity bazli merge guvenligi sinirli` `files: src/hooks/useAuth.ts, src/services/firestoreSync.ts` `action: root doc ile subcollection olaylarini ayri merge stratejileriyle isle` `verification: local draft state snapshot ile ezilmemeli`
- `SYNC-008` `status: todo` `source: Master Todo details v2, repo scan` `repo_status: api/sync sadece payload logluyor` `files: api/sync.ts, api/_lib/firebaseAdmin.ts` `action: endpoint'i ya tamamen kaldir ya da auth dogrulamali gercek yazma endpoint'ine cevir` `verification: API smoke test'i gercek DB yazmali veya 410/501 ile acikca reddetmeli`
- `SYNC-009` `status: partial` `source: Todo.md, repo scan` `repo_status: pushSingleEntity var ama butun store action'larinda kullanilmiyor` `files: src/store/appStore.ts, src/services/firestoreSync.ts` `action: addLog, addExam, addChatMessage, failedQuestion, agenda, focus, progress ve target mutasyonlarini incremental write'a bagla` `verification: manual sync butonu olmadan yeni veriler cloud'a akmali`
- `SYNC-010` `status: todo` `source: user request, Todo.md` `repo_status: cihaz A/B test matrisi yok` `files: docs yok, test altyapisi yok` `action: log, deneme, sohbet, agenda, focus, mezarlik, target, subject progress icin cihazarasi test matrisi yaz` `verification: matrix checklist'i doldurulmus olmali`
- `SYNC-011` `status: partial` `source: user request, repo scan` `repo_status: chatMessages collection modeli var ama UI ve pruning stratejisi net degil` `files: src/services/firestoreSync.ts, src/store/appStore.ts, src/App.tsx` `action: chatHistory'yi collection source of truth yap, local limit ve cloud archive stratejisi tanimla` `verification: koç sohbeti diger cihazda yuklenmeli ve 1MB limite yaklasmamali`
- `SYNC-012` `status: todo` `source: user request, Master Todo details v2` `repo_status: tum varliklar icin eksiksiz gorunurluk garanti edilmemis` `files: src/store/appStore.ts, src/services/firestoreSync.ts, src/hooks/useAuth.ts` `action: loglar, mufredat, YOK hedefleri, sohbet gecmisi, denemeler, mezarlik, agenda, focus ve alert alanlarini eksiksiz sync kapsaminda belgeleyip uygula` `verification: yeni cihazda login sonrasi ayni kullanici durumu gorunmeli`

### P0 - Kritik Buglar

- `BUG-001` `status: todo` `source: Master Todo details v2` `repo_status: IDB catch bloklari sessiz ve kullaniciya yansimiyor` `files: src/store/appStore.ts` `action: IDB hata flag + toast/notification ekle` `verification: private mode veya hata simulasyonunda kullanici gorunur uyari almali`
- `BUG-002` `status: todo` `source: Master Todo details v2` `repo_status: addLog prune + sync sirasi riskli` `files: src/store/appStore.ts` `action: pruning oncesi incremental cloud write veya write-behind stratejisi kur` `verification: 500+ log senaryosunda veri kaybi olmamali`
- `BUG-003` `status: todo` `source: Master Todo details v2` `repo_status: api/ai rate limiter in-memory` `files: api/ai.ts` `action: KV/Redis tabanli kalici limiter ekle` `verification: cold start bypass kalkmali`
- `BUG-004` `status: partial` `source: promtv2, Master Todo details v2` `repo_status: claims kullanimi basladi ama hardcoded admin izleri promptlarda ve olasi configlerde duruyor` `files: firestore.rules, src/config/admin.ts, src/hooks/useAuth.ts` `action: plaintext UID bagimliligini tamamen kaldir` `verification: admin yetkisi yalniz token claim ile belirlenmeli`
- `BUG-005` `status: todo` `source: Improve promt, repo scan` `repo_status: War Room modlari ile drawingMode ayirimi tam kapanmadi` `files: src/components/warroom/TopBar.tsx, src/components/warroom/QuestionPanel.tsx, src/store/appStore.ts` `action: warRoomMode'yu setup/solve/result ile sinirla` `verification: draw ve analysis stale degerleri koddan kalkmali`
- `BUG-006` `status: todo` `source: Master Todo details v2` `repo_status: beforeunload icinde guvensiz sync mantigi var/not edilmis` `files: src/App.tsx` `action: sendBeacon veya offline persistence temelli cikis stratejisi uygula` `verification: sekme kapanisinda veri kaybi testi gecmeli`
- `BUG-007` `status: partial` `source: Master Todo details v2` `repo_status: tarih util katmani var ama kalan legacy kullanimlar olabilir` `files: src/utils/date.ts, src/App.tsx, src/store/appStore.ts` `action: tum locale-date yazim/parsing noktalarini tek util'e indir` `verification: grafikler ve log filtreleri dogru veri gostermeli`
- `BUG-008` `status: partial` `source: Master Todo details v2, repo scan` `repo_status: exam giriste normalize var ama tum downstream yollar garanti degil` `files: src/components/forms/ExamEntryModal.tsx, src/store/appStore.ts, src/components/ExamDetailModal.tsx` `action: exam update/detail path'lerinde de safe scores uygula` `verification: NaN/undefined skor UI veya ELO'ya sizmamali`
- `BUG-009` `status: todo` `source: Master Todo details v2` `repo_status: chatHistory slice mantigi eski sekilde` `files: src/store/appStore.ts` `action: slice sirasini duzelt` `verification: 101. mesajdan sonra local history 100 elemanla kalmali`
- `BUG-010` `status: todo` `source: Master Todo details v2, repo scan` `repo_status: MorningBlocker sessionStorage ve locale date'e bagli` `files: src/components/MorningBlocker.tsx, src/App.tsx, src/store/appStore.ts` `action: unlock tarihini persist edilen store alanina tasi` `verification: ayni gun refresh sonrasi blocker tekrar acilmamali`
- `BUG-011` `status: todo` `source: repo scan` `repo_status: store.signOut benzeri eski akislar net degil` `files: src/store/appStore.ts, src/hooks/useAuth.ts` `action: deprecated logout/reset yolunu temizle veya acikca obsolete yap` `verification: tek sign-out akisi kalmali`
- `BUG-012` `status: partial` `source: Improve promt, repo scan` `repo_status: focus ve war room sure olcumu parcali duzelmis` `files: src/hooks/useFocusTimer.ts, src/components/MebiWarRoom.tsx` `action: elapsed hesaplarini sistematik test ve edge-case ile sertlestir` `verification: tab background/restore durumlarinda sure sapmamali`
- `BUG-013` `status: todo` `source: repo scan` `repo_status: flap clock ve benzeri gostergelerde gorsel/deger tutarsizligi icin kesin test yok` `files: src/components/FlapClock.tsx` `action: animasyon state'i ile gercek veri state'ini ayir` `verification: gecisler yanlis zaman gostermemeli`
- `BUG-014` `status: todo` `source: promtv2, repo scan` `repo_status: developerService userData bagimliligi suruyor` `files: src/services/developerService.ts` `action: tum admin okuma/yazmalarini users modeliyle uyumlu hale getir` `verification: admin panel yeni sync modeliyle ayni veriyi gormeli`
- `BUG-015` `status: todo` `source: user request, repo scan` `repo_status: api/sync authsuz ve no-op` `files: api/sync.ts` `action: endpoint'i guvenli sekilde tamamla veya kaldir` `verification: sahte istekler veri yazamamalı`
- `BUG-016` `status: todo` `source: user request, repo scan` `repo_status: useAuth bos-array merge davranisi bozuk` `files: src/hooks/useAuth.ts` `action: merge yardimcilari yaz` `verification: remote bosalma local state'i temizlemeli`
- `BUG-017` `status: partial` `source: Todo.md, repo scan` `repo_status: App.tsx ve bazi ekranlar tam-store subscribe ediyor` `files: src/App.tsx, cok sayida component` `action: selector/shallow migration turu ac` `verification: React profiler'da gereksiz rerender sayisi dusmeli`
- `BUG-018` `status: todo` `source: Master Todo details, repo scan` `repo_status: coach isim/metin sizintilari ve tutarsiz etiketler var` `files: src/App.tsx` `action: tek COACH_NAME ve COACH_SYSTEM_NAME sabiti kullan` `verification: UI'da tek isim ve temiz mesaj etiketi gorunmeli`

### P0 - Guvenlik

- `SEC-001` `status: partial` `source: Master Todo details v2, repo scan` `repo_status: claims akisi var ama tum admin kontrolleri tam kapanmadi` `files: firestore.rules, src/hooks/useAuth.ts, src/config/admin.ts` `action: custom claims'i tek kaynak yap` `verification: hardcoded UID kalmamali`
- `SEC-002` `status: todo` `source: user request, repo scan` `repo_status: sync/admin endpoint auth kapsami eksik` `files: api/sync.ts, api/_lib/firebaseAdmin.ts` `action: tum write endpoint'lerine bearer verify zorunlulugu ekle` `verification: auth'suz POST'lar 401/403 donmeli`
- `SEC-003` `status: todo` `source: Master Todo details v2, repo scan` `repo_status: spotifyService implicit flow kullaniyor` `files: src/services/spotifyService.ts` `action: backend-assisted PKCE'ye gec veya ozelligi kapat` `verification: secret/token hash akisi frontend'de kalmamali`
- `SEC-004` `status: todo` `source: Master Todo details v2` `repo_status: OGM scraper hukuki ve teknik riskli` `files: scripts/ogmScraper.cjs` `action: dev-only flag ve TOS notu ekle; production kullanimi kapat` `verification: varsayilan build/deploy bu scraper'i tetiklememeli`
- `SEC-005` `status: partial` `source: repo scan` `repo_status: firebaseAdmin helper var ama tum server write noktalarinda zorunlu degil` `files: api/_lib/firebaseAdmin.ts, api/*.ts` `action: ortak verify helper'i tum yazma endpoint'lerine yay` `verification: sunucu tarafi write noktasi authsuz kalmamali`
- `SEC-006` `status: todo` `source: promtv2, repo scan` `repo_status: frontend-only admin izleri kalmis olabilir` `files: src/services/developerService.ts, src/components/AdminPanelModal.tsx` `action: client tarafinda role elevation varsayimlarini temizle` `verification: UI sadece server-confirmed role ile admin ozellik gostermeli`

### P1 - Koc V2

- `COACH-001` `status: todo` `source: Master koc.md, Yks coach prompt v7` `repo_status: koç cikisi halen agirlikli serbest metin` `files: api/ai.ts, src/services/gemini.ts, src/App.tsx` `action: structured directive modeli ekle` `verification: headline/summary/tasks/warnings/followUpQuestion alanlari render edilmeli`
- `COACH-002` `status: todo` `source: Master koc.md, repo scan` `repo_status: userState/context tipi gevsek` `files: src/services/gemini.ts, src/store/appStore.ts` `action: tipli CoachSystemContext tanimla` `verification: any tabanli coach state kalmamali`
- `COACH-003` `status: todo` `source: Yks coach qa prompt v1` `repo_status: intent modeli acik ve merkezi degil` `files: api/ai.ts, src/services/gemini.ts` `action: CoachIntent enum/union ekle` `verification: daily_plan, log_analysis, exam_analysis vb. ayrimi request seviyesinde gorunmeli`
- `COACH-004` `status: todo` `source: Master koc.md, repo scan` `repo_status: prompt mantigi daginik` `files: api/ai.ts, Promt/Master koc.md` `action: prompt builder'i merkezi modul yap` `verification: coach yuzeyleri ayni cekirdek promptu kullanmali`
- `COACH-005` `status: todo` `source: Yks coach prompt v7, Yks coach qa prompt v1` `repo_status: gunluk plan, log, deneme, intervention akislarinda net ayristirma yok` `files: api/ai.ts, src/App.tsx` `action: yuzey ve intent bazli cevap sablonlari tanimla` `verification: ayni veriyle farkli intent farkli cikti vermeli`
- `COACH-006` `status: todo` `source: user request` `repo_status: offline son direktif cache yok` `files: src/store/appStore.ts, src/App.tsx` `action: son basarili directive'i local cache'le` `verification: offline modda son directive badge ile gorunmeli`
- `COACH-007` `status: todo` `source: Master Todo details, repo scan` `repo_status: WarRoom, Agenda, StrategyHub, TopicExplain ayri AI yollarina sahip` `files: ilgili componentler + ai servisleri` `action: tek AI client ve tek response shaping katmani kur` `verification: tum AI yuzeyleri ayni response contract'i tuketmeli`
- `COACH-008` `status: todo` `source: Master koc.md` `repo_status: rehber prompt living system prompt'a donusmedi` `files: Promt/Master koc.md, api/ai.ts` `action: Master koc rehberini kodda versiyonlu prompt kaynagi haline getir` `verification: prompt revizyonu kodda tek yerden yonetilmeli`

### P1 - Performans ve Kod Kalitesi

- `PERF-001` `status: todo` `source: Master Todo details v2, repo scan` `repo_status: App.tsx sekmeleri eager loaded` `files: src/App.tsx` `action: lazy load + Suspense uygula` `verification: ilk bundle parcasi kuculmeli`
- `PERF-002` `status: todo` `source: Master Todo details v2` `repo_status: manualChunks kapsami eksik` `files: vite.config.ts` `action: markdown, motion, genai, capacitor ve agir paketleri ayir` `verification: bundle analyzer'da ana chunk kuculmeli`
- `PERF-003` `status: partial` `source: Todo.md, repo scan` `repo_status: selector migration eksik` `files: src/App.tsx, store kullanan componentler` `action: selector/shallow desenine gec` `verification: store degisimi tum app'i tetiklememeli`
- `PERF-004` `status: todo` `source: Master Todo details v2` `repo_status: agir turetilmis hesaplar body icinde` `files: src/App.tsx ve dashboard grafikleri` `action: memoization turu yap` `verification: agir grafik hesaplari yalniz veri degisince calismali`
- `PERF-005` `status: todo` `source: Master Todo details v2` `repo_status: IDB baglanti cache ihtiyaci suruyor` `files: src/store/appStore.ts, src/services/indexedDB.ts` `action: singleton DB promise kullan` `verification: her islemde yeniden openDB acilmamali`
- `PERF-006` `status: todo` `source: user request, repo scan` `repo_status: bundle ve dependency temizlik isi acik` `files: package.json, src/services/spotifyService.ts` `action: puppeteer'i devDependencies'e tasi, pasif servisleri gozden gecir` `verification: install/build suresi duzelmeli`
- `CLEAN-001` `status: done` `source: user request` `repo_status: prompt snapshotlari aktif yuzeyden arsivlenecek` `files: Promt/files/*` `action: arsiv disinda ust klasorde snapshot birakma` `verification: Promt ust seviyesi sade kalmali`
- `CLEAN-002` `status: partial` `source: Master Todo details v2, repo scan` `repo_status: date util var ama tam standardizasyon bitmedi` `files: src/utils/date.ts, store ve UI tarih kullanimlari` `action: tek tarih util seti kullan` `verification: locale/ISO karisimi kalkmali`
- `CLEAN-003` `status: todo` `source: user request, repo scan` `repo_status: any kullanimi yuksek` `files: src/components/ExamDetailModal.tsx ve diger TSX dosyalari` `action: hedefli any cleanup sprinti ac` `verification: kritik AI/sync/war-room yollarinda any kalmamali`
- `CLEAN-004` `status: todo` `source: Master Todo details v2` `repo_status: spotifyService aktif olmayan riskli bir dosya gibi duruyor` `files: src/services/spotifyService.ts` `action: ya feature flag ile pasiflestir ya tamamen kaldir` `verification: repo'da belirsiz pasif entegrasyon kalmamali`
- `CLEAN-005` `status: todo` `source: user request, repo scan` `repo_status: App.tsx monolitik` `files: src/App.tsx` `action: coach, dashboard, shell, blockers ve modal orchestration'i parcala` `verification: App.tsx sorumlulugu belirgin sekilde azalmalı`

### P2 - Urun, UX, A11y, Test

- `FEAT-001` `status: todo` `source: Master Todo details v2` `repo_status: voice log UI yok` `files: src/components/forms/LogEntryWidget.tsx` `action: parseVoiceLog'u mikrofon akisi ile bagla` `verification: sesli girdiden form dolmali`
- `FEAT-002` `status: todo` `source: Master Todo details v2` `repo_status: OCR/kamera tabanli failed question akisi eksik` `files: src/components/ArchiveWidget.tsx, Firebase storage yolu` `action: resim yukleme ve saklama ekle` `verification: mobilde kamera ile soru eklenebilmeli`
- `FEAT-003` `status: todo` `source: user request` `repo_status: deneme compare modu yok` `files: Exam detail modal/compare modal` `action: iki denemeyi konu bazli karsilastiran modal ekle` `verification: delta renkli gorunmeli`
- `FEAT-004` `status: todo` `source: user request` `repo_status: YOK hedef gap kartlari eksik` `files: dashboard, atlas servisleri, targetGoals` `action: hedef programa kalan net/puan farkini goster` `verification: hedef secildiginde fark karti cikmali`
- `FEAT-005` `status: todo` `source: Master Todo details v2` `repo_status: focus checkpoint restore yok` `files: src/hooks/useFocusTimer.ts, shell UI` `action: sessionStorage checkpoint ve restore dialog ekle` `verification: yari kalan seans geri yuklenebilmeli`
- `FEAT-006` `status: todo` `source: user request` `repo_status: push/local notifications eksik` `files: service worker, Capacitor plugin entegrasyonu` `action: PWA push ve Android local notifications backlog'unu ayir` `verification: hatirlatma ve pomodoro bildirimleri gelmeli`
- `UX-001` `status: todo` `source: Master Todo details v2` `repo_status: avatar upload yok` `files: profile settings` `action: avatar upload/fallback akisi ekle` `verification: kullanici foto yukleyebilmeli`
- `UX-002` `status: todo` `source: Master Todo details v2` `repo_status: streak kirilma uyarisı yok` `files: dashboard/notifications` `action: gun sonu warning ekle` `verification: streak tehlikesi olan gunlerde uyarı cikmali`
- `UX-003` `status: todo` `source: Master Todo details v2` `repo_status: mobil klavye acilinca coach layout bozulabiliyor` `files: src/App.tsx, coach panel layout` `action: VisualViewport tabanli vh korumasi ekle` `verification: mobil klavyede input kaybolmamali`
- `UX-004` `status: todo` `source: Master Todo details v2` `repo_status: tema FOUC devam ediyor` `files: index.html, theme bootstrap` `action: initial theme inline script ekle` `verification: ilk render flash'i kaybolmali`
- `UX-005` `status: todo` `source: Master Todo details v2` `repo_status: teknik hata kodlari son kullanıcıya sızıyor` `files: ai UI, toast/notification` `action: Turkce hata sozlugu ekle` `verification: kullanıcı raw server kodu gormemeli`
- `A11Y-001` `status: todo` `source: Master Todo details v2` `repo_status: ikon butonlarda aria-label eksikleri var` `files: bircok component` `action: ikon-only button audit'i yap` `verification: screen reader butonlari anlali bir sekilde okuyabilmeli`
- `A11Y-002` `status: todo` `source: Master Todo details v2` `repo_status: kucuk gri metinlerde kontrast riskleri var` `files: global UI` `action: kontrast audit ve token duzeltmeleri yap` `verification: WCAG AA hedefi karsilanmali`
- `A11Y-003` `status: todo` `source: Master Todo details v2` `repo_status: keyboard nav ve modal focus trap eksik` `files: modal ve war room bilesenleri` `action: fokus yonetimi ekle` `verification: fare olmadan ana akışlar kullanilabilmeli`
- `TEST-001` `status: todo` `source: user request` `repo_status: sync test matrisi yok` `files: docs/test notes` `action: cihazarasi veri testlerini yaz ve uygula` `verification: matrix tamamlanmali`
- `TEST-002` `status: todo` `source: Master Todo details v2` `repo_status: AI provider fail smoke test eksik` `files: api/ai.ts, UI fallback` `action: tum provider fail senaryosunu test et` `verification: kontrollu fallback mesaji gorunmeli`
- `TEST-003` `status: todo` `source: user request` `repo_status: 500+ log regression testi yok` `files: store ve sync` `action: pruning/sync regresyon testi ekle` `verification: log kaybi olmamali`
- `TEST-004` `status: todo` `source: user request` `repo_status: offline -> online replay regression yok` `files: sync queue` `action: duplicate ve stale merge senaryolari test edilmeli` `verification: replay sonrasi veri tekil ve tutarli kalmali`

### P3 - Atlas, Android, CI, Operasyon

- `OPS-001` `status: partial` `source: Yokatlas.md, repo scan` `repo_status: Atlas UI ve servisler var ama veri pipeline production-grade degil` `files: src/components/AtlasExplorer.tsx, src/services/atlasService.ts, scripts/*` `action: Atlas veri kaynagini netlestir, cache ve update politikasini belgeleyip uygula` `verification: hedef program aramasi tutarli ve guncel veri donmeli`
- `OPS-002` `status: todo` `source: Master Todo details v2` `repo_status: Android bildirim ve plugin backlog'u acik` `files: capacitor config, android proje dosyalari` `action: local notifications ve Gradle uyumluluk checklist'i ekle` `verification: Android build ve notification smoke test gecmeli`
- `OPS-003` `status: todo` `source: Master Todo details v2` `repo_status: CI/CD temel hattı eksik veya yetersiz` `files: .github/workflows/*` `action: lint + build + typecheck pipeline kur` `verification: PR acilinca otomatik kontrol calismali`
- `OPS-004` `status: todo` `source: repo scan` `repo_status: root TS kapsamı hala Promt gibi yan alanlardan etkilenebilir` `files: tsconfig*` `action: shipping app typecheck hedefini ayir` `verification: app typecheck gürültüsüz calismali`

## 6. Sprint Sirasi

1. Sync source-of-truth ve split-brain temizligi
2. IDB veri kaybi, beforeunload ve MorningBlocker hatalari
3. useAuth merge duzeltmeleri ve full entity write-through
4. Koc structured directive ve tek AI cekirdegi
5. Selector migration, code splitting ve App.tsx parcalama
6. UX/A11y ve cihazlar arasi test matrisi

## 7. Kabul Kosullari

- Bu dosya `Promt` klasorundeki tek aktif master todo kaynagi olacak
- Arsive giden hicbir dosyada benzersiz acik backlog maddesi kaybolmayacak
- Her acik maddede `status`, `source`, `repo_status`, `action`, `verification` bulunacak
- "done" veya "partial" isaretleri repoda gercek karsilik tasiyacak

