# Boho Mentos v2 Gelistirme ve Sertlestirme Task Plani

## Durum Ozeti

Bu plan uygulamayi kirilgan prototip durumundan daha guvenilir, olculebilir ve Vercel uzerinde derlenebilir bir uretim uygulamasina tasimak icin hazirlandi.

Bugun ele alinan kritik basliklar:

- [x] Vercel build'i kiran `src/config/owner` import zinciri guvenli, env tabanli ve takip edilebilir hale getirildi.
- [x] Profil sayfasindaki Zustand selector'u `useShallow` ile stabilize edildi.
- [x] Profil grafiklerinde Recharts animasyon/olcum dongusu kapatildi.
- [x] Sosyal sayfadaki object-render crash'i giderildi.
- [x] `React.lazy` sosyal rota icin `Suspense` altina alindi.
- [x] `framer-motion` paketine ait hatali import, projedeki `motion/react` standardina cekildi.
- [x] ELO basarimlari odul ELO'suna gore degil, aktivite/deneme/mufredat kaynakli rekabetci taban ELO'ya gore hesaplanacak sekilde ayrildi.

## P0 - Stabilite ve Crash Dayanikliligi

- [x] `ProfileShowcase` store snapshot dongusu duzeltilecek.
- [x] Recharts profil grafiklerinde `ResponsiveContainer` kaynakli `width(-1) height(-1)` ve `JavascriptAnimate` riskleri azaltilacak.
- [x] `SocialPage` profil modalinda `getLevelFromElo()` object'i dogrudan React child olarak basilmayacak.
- [x] Lazy route'lar `Suspense` ile sarilacak.
- [ ] Tum `useAppStore()` tam-store abonelikleri taranacak; sadece gereken primitive/array selector'larina bolunecek.
- [ ] Dashboard grafiklerinde guvenli chart wrapper kullanilacak: minimum boyut, animation off, empty-state fallback.
- [ ] ErrorBoundary sadece "sert sifirla" gostermek yerine modul, route, son action ve recovery aksiyonlarini raporlayacak.
- [ ] IndexedDB/local persisted state icin schema version + migration katmani eklenecek.

## P1 - ELO v2 ve Basarim Motoru

- [x] Rekabetci taban ELO hesaplayici ayrildi.
- [x] ELO baraj basarimlari taban ELO'ya baglandi; odul ELO'su ile kendi kendini acma engellendi.
- [x] Full recompute, gecersiz ELO basarimlarini filtreleyip toplam ELO'yu yeniden yazacak hale getirildi.
- [ ] ELO modeli iki alana ayrilacak: `baseElo` ve `bonusElo`; UI `totalElo` gosterecek.
- [ ] Log, deneme, mufredat, odak ve basarim odulleri icin tek kaynakli `eloLedger` tutulacak.
- [ ] Her ELO degisimi icin idempotent event key yazilacak; ayni log iki kez ELO basmayacak.
- [ ] Admin paneline "ELO yeniden hesapla ve farki goster" araci eklenecek.
- [ ] Basarim motoru icin unit test: threshold, duplicate unlock, false cascade, recompute rollback.

## P1 - AI Koc Sistemi

- [ ] Koc direktifleri icin structured output schema zorunlu olacak.
- [ ] Koc hafizasi `majorMistakes`, `commitments`, `weakSubjects`, `lastStrategyPlanId` alanlariyla versiyonlanacak.
- [ ] Gunluk plan uretimi hedef net, son 5 deneme, son 14 gun log ve yanlis soru mezarligi ile beslenecek.
- [ ] Koc cevaplari icin safety layer: bos veri, dusuk guven, celiskili veri ve asiri agresif ton fallback'i.
- [ ] "Gorev tamamla" akisi log, agenda, ELO ve achievement event'lerini tek transaction-like akista isleyecek.
- [ ] Prompt Lab admin panelinde canli test, token maliyeti, provider fallback ve yanit kalite notu gosterilecek.

## P1 - Admin Paneli ve Operasyon

- [ ] Admin yetkisi sadece Firebase custom claims veya server-side verified role ile kabul edilecek.
- [ ] Client-side sifre sadece ek kilit olarak kalacak; tek basina admin yetkisi vermeyecek.
- [ ] Kullanici listesi, detay, ban, rol, veri duzeltme, ELO recompute ve audit log ekranlari ayrik moduller olacak.
- [ ] Admin aksiyonlari reason zorunlu, actor UID, target UID, diff ve timestamp ile audit'e yazilacak.
- [ ] Sistem panelinde kill switch, provider status, rate-limit durumu ve PWA/cache temizleme olacak.
- [ ] Veri onarim paneli: bozuk profil, eksik array, hatali tarih, NaN net, duplicate log ve orphan subcollection tespiti.

## P1 - Guvenlik Sertlestirme

- [ ] Firestore rules yeniden tasarlanacak: public leaderboard icin minimal public profile dokumani, ozel user verisi icin owner/admin.
- [ ] `users` koleksiyonunda tam `list` yetkisi kaldirilacak; sosyal arama icin public index koleksiyonu kullanilacak.
- [ ] Admin write islemleri client SDK yerine server/API katmanindan custom claim dogrulamayla yapilacak.
- [ ] API route'larinda Zod validation, rate limit, request size limit ve structured error response olacak.
- [ ] Gizli anahtarlar client bundle'a girmeyecek; `VITE_` sadece public config icin kullanilacak.
- [ ] Storage rules dosya boyutu, content-type ve path ownership kontrolleriyle test edilecek.
- [ ] CSP, trusted image domains ve PWA cache stratejisi production icin sertlestirilecek.

## P2 - Vercel ve CI/CD

- [ ] `npm run lint` ve `npm run build` CI'da zorunlu olacak.
- [ ] Vercel preview deploy oncesi typecheck, build ve smoke test calisacak.
- [ ] PWA plugin build loglari izlenecek; precache glob warning'leri temizlenecek.
- [ ] `.env.example` Vercel icin gereken public/private env ayrimini dokumante edecek.
- [ ] Bundle analiz raporu: Recharts, motion, markdown ve Firebase chunk'lari takip edilecek.

## P2 - Urun ve UX Gelistirmeleri

- [ ] Dashboard kartlari icin dense ama stabil grid; hicbir kart hover/animation ile layout kaydirmayacak.
- [ ] Mobil alt nav ve desktop sidebar ayni route kaynagindan beslenecek.
- [ ] Basarim kartlari progress, kategori, kilit durumu ve odul bilgisini tek tasarim sistemiyle gosterecek.
- [ ] Profil sayfasi: hedefler, ELO, basarimlar, mufredat ve sosyal gorunum modullere ayrilacak.
- [ ] Sosyal sayfa public profile privacy ayarlariyla calisacak.

## Test Plani

- [x] TypeScript `tsc --noEmit` temiz calisti.
- [ ] Vercel/Linux build dogrulanacak.
- [ ] Profil sayfasi: acilis, recompute, hedef silme, atlas modal acma.
- [ ] Sosyal sayfa: liste, modal acma, mesaj paneli, bos liste fallback.
- [ ] ELO: yeni log, yeni deneme, mufredat degisimi, recompute, achievement unlock.
- [ ] Admin: yetkisiz kullanici, standart admin, super admin, audit log.

## Kabul Kriterleri

- Uygulama profil veya sosyal sayfa tiklamasinda crash vermeyecek.
- Vercel build eksik import nedeniyle dusmeyecek.
- ELO basarimlari odul kaynakli ELO sisirmesiyle acilmayacak.
- Admin paneli UI kilidi ile backend yetkisi ayrilacak.
- Kritik veri degisiklikleri geri hesaplanabilir ve audit edilebilir olacak.
