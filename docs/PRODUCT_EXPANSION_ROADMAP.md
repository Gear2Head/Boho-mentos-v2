# Boho Mentos V2 Genişleme Yol Haritası

## Amaç

Uygulama şu an yalnızca bir "koçluk app" gibi algılanıyor; oysa kod tabanı zaten daha büyük bir yapıya işaret ediyor:

- dashboard
- coach/chat
- war room
- agenda
- subject map
- strategy
- profile
- admin

Buradaki sorun kapsam eksikliği değil, ürün kimliğinin dağınık olması. Bu nedenle hedef:

1. Uygulamayı "sınav koçu"ndan "öğrenme işletim sistemi"ne dönüştürmek
2. UI kalitesini premium seviyeye taşımak
3. Mobil deneyimi masaüstünden bağımsız tasarlamak
4. Bug fix yerine ürün büyümesi odaklı yeni özellikler eklemek

---

## Mevcut Durumdan Çıkan Kritik Tespitler

### 1. Ürün mantığı tek bir dosyada fazla yoğun

- [`src/App.tsx`](C:\Projects\Boho mentos v2\src\App.tsx) yaklaşık `72 KB`
- Bu dosya layout, navigation, modal orchestration, screen switching ve bazı alt bileşenleri aynı yerde yönetiyor
- Sonuç:
  - yeni özellik eklemek zorlaşıyor
  - mobil regresyon riski artıyor
  - UI bütünlüğü korunamıyor

### 2. Mobil çözüm katmanı zayıf

- [`src/components/MobileGuard.tsx`](C:\Projects\Boho mentos v2\src\components\MobileGuard.tsx) şu an pratikte yalnızca `px-2` veren hafif bir wrapper
- Mobil sorunlar layout seviyesinde çözülmesi gerekirken çoğu yerde component bazlı yamalanmış
- `fixed`, `bottom`, `overflow`, `grid`, `h-[100dvh]`, `pb-16` gibi desenler birçok ekranda bağımsız kullanılıyor

### 3. Mobil bilgi mimarisi zayıf

- [`src/config/navItems.tsx`](C:\Projects\Boho mentos v2\src\config\navItems.tsx) içinde mobilde yalnızca sınırlı sayıda sekme görünür
- Daha fazla içerik için ayrı mobil menü açılması gerekiyor
- Bu yaklaşım keşfedilebilirliği düşürüyor

### 4. Tasarım dili tekil ama sistematik değil

- Renk dili güçlü ama çok fazla sayfada elle yazılmış class yapıları var
- Tipografi karışık: `font-display` adı var ama bazen serif, bazen monospace, bazen italik başlıklar aynı hiyerarşide kullanılıyor
- Birçok ekran "ayrı ürün gibi" hissettiriyor

### 5. Asıl değerli parçalar birbirine bağlı değil

Kodda güçlü çekirdekler var:

- ajanda
- deneme analizi
- görev/direktif sistemi
- habit alert
- forgetting curve
- focus
- war room
- atlas / hedef öneri

Ama bunlar tek bir kullanıcı akışında birleşmiyor.

---

## Yeni Ürün Konumu

### Önerilen Konumlandırma

Boho Mentos artık yalnızca "koç sohbeti" değil:

**AI destekli öğrenci çalışma işletim sistemi**

### Yeni ana ürün kolonları

1. Planla
   - günlük plan
   - haftalık sprint
   - sınav geri sayımına göre tempo

2. Çalış
   - focus modu
   - görev akışı
   - deep work oturumları

3. Ölç
   - deneme analizi
   - konu bazlı performans
   - kaynak ROI
   - istikrar skorları

4. Geliş
   - AI koç
   - zayıf konu anlatımı
   - tekrar sistemi
   - hata mezarlığı

5. Karar Ver
   - hedef üniversite uygunluğu
   - net projeksiyonu
   - risk alarmı
   - strateji simülasyonu

---

## UI Fix Öncelikleri

### 1. Uygulama Shell refactor

İlk yapılması gereken, tek dosyalı ekran kontrolünden çıkmak.

Öneri:

- `AppShell`
- `DesktopSidebar`
- `MobileTabBar`
- `MobileDrawer`
- `TopHeader`
- `ScreenContainer`
- `GlobalOverlays`

Beklenen sonuç:

- nav ve ekran yaşam döngüsü sadeleşir
- mobil/desktop ayrımı netleşir
- ekran bazlı performans optimizasyonu kolaylaşır

### 2. Ortak tasarım token sistemi

Şu an [`src/index.css`](C:\Projects\Boho mentos v2\src\index.css) iyi bir başlangıç veriyor ama yeterli değil.

Eklenmesi gereken tasarım katmanı:

- spacing scale
- radius scale
- elevation/shadow scale
- component state renkleri
- mobile touch target standardı
- page width presets

Öneri:

- `--space-1` ... `--space-8`
- `--radius-card`, `--radius-panel`, `--radius-pill`
- `--shadow-soft`, `--shadow-float`, `--shadow-overlay`
- `--header-height`, `--bottom-nav-height`

### 3. Tipografi sistemi düzeltmesi

Mevcut problem:

- başlıklar bazen romantik/serif
- bazen monospace
- bazen italik
- bu durum premium değil, dağınık his veriyor

Öneri:

- ürün başlıkları: güçlü ama tek aile
- veri ve sayaçlar: mono
- içerik metni: sade sans

Pratik karar:

- hero / büyük başlık: serif veya display, ama sadece landing seviyesinde
- uygulama içi başlıklar: sans
- veri kartları: mono destekli sans

### 4. Sayfa iskeletlerini normalize et

Birçok sayfa kendi padding ve grid mantığını taşıyor.

Ortak layout primitive önerisi:

- `PageHeader`
- `PageSection`
- `MetricCard`
- `ActionCard`
- `InsightCard`
- `EmptyState`
- `StickyActionBar`

Bu, özellikle aşağıdaki ekranlarda ciddi fark yaratır:

- [`src/components/dashboard/BentoDashboard.tsx`](C:\Projects\Boho mentos v2\src\components\dashboard\BentoDashboard.tsx)
- [`src/components/AgendaPage.tsx`](C:\Projects\Boho mentos v2\src\components\AgendaPage.tsx)
- [`src/components/StrategyHub.tsx`](C:\Projects\Boho mentos v2\src\components\StrategyHub.tsx)
- [`src/components/SubjectMapAdvanced.tsx`](C:\Projects\Boho mentos v2\src\components\SubjectMapAdvanced.tsx)
- [`src/components/coach/CoachScreen.tsx`](C:\Projects\Boho mentos v2\src\components\coach\CoachScreen.tsx)

---

## Mobil Fix Öncelikleri

### 1. Mobile-first yeniden tasarım

Şu an yaklaşım çoğunlukla:

- desktop layout yaz
- `md:` ile mobil uyarlamaya çalış

Bu tersine çevrilmeli:

- önce mobil akış
- sonra tablet
- sonra desktop genişleme

### 2. Sabit alt navigasyon yeniden tasarlanmalı

Mevcut mobil nav yoğun ama görev odaklı değil.

Önerilen mobil ana sekmeler:

1. Ana Sayfa
2. Plan
3. Çalış
4. Analiz
5. Koç

Diğer bölümler drawer veya command palette içine alınmalı:

- profil
- ayarlar
- strategy
- archive
- admin

### 3. Mobilde tek kolon zorunluluğu

Özellikle aşağıdaki alanlarda masaüstü grid mantığı mobilde gereksiz baskı yaratıyor:

- dashboard kartları
- agenda görev kutuları
- strategy analiz blokları
- profile özet alanları

Kural:

- mobilde varsayılan tek kolon
- yatay scroll sadece veri tablosu ve chart için
- her kartta min dokunma alanı `44px+`

### 4. Klavye ve viewport yönetimi

`useVisualViewportHeight()` mevcut ama bu tüm input-heavy ekranlarda sistematik kullanılmalı.

Öncelik verilecek alanlar:

- coach input
- agenda textarea
- log entry form
- exam modal

### 5. Overlay standardizasyonu

Farklı modal/sheet bileşenlerinde farklı yükseklik ve davranış var.

Mobil standart:

- bottom sheet
- drag handle
- max height `%85`
- body scroll lock
- safe-area padding
- tek kapanış davranışı

---

## Bug Fix Yerine Ürün Değeri Yaratacak Özellikler

## Özellik Paketi 1: Günlük Komuta Merkezi

Amaç: kullanıcı uygulamayı açtığında "ne yapacağım?" sorusuna tek ekranda cevap vermek.

İçerik:

- bugünün 3 ana görevi
- bugün çözülmesi gereken zayıf konu
- tekrar alarmı
- hedefe uzaklık
- odak oturumu başlat
- son denemeye göre kritik risk

Neden önemli:

- dashboard gerçek işe yarayan karar ekranına dönüşür

## Özellik Paketi 2: Sprint Planner

Koçluk hissinden çıkıp operasyon hissine geçmek için gerekli.

İçerik:

- 7 günlük çalışma sprinti
- konu dağılım planı
- günlük yük dengesi
- eksik kalan görevlerin otomatik yeniden planlanması
- sprint completion score

Ek fayda:

- ajanda, coach ve directive history birleşir

## Özellik Paketi 3: Akıllı Tekrar Motoru

Kod tabanında forgetting curve mantığı var; bunu gerçek ürüne çevirmek lazım.

İçerik:

- konu bazlı tekrar kuyruğu
- "bugün tekrar etmen gerekenler"
- yanlış soru geçmişinden otomatik tekrar kartları
- low-retention alert
- tekrar yapılmadığında risk puanı

Bu özellik şu modülleri birleştirir:

- logs
- failedQuestions
- agenda
- forgetting curve utility

## Özellik Paketi 4: Study OS Görev Sistemi

Ajanda şu an not + AI parse mantığında. Bunu görev işletim sistemine çevirmek gerekir.

İçerik:

- görev tipi: ders, deneme, tekrar, okuma, koç görevi
- öncelik
- süre
- enerji seviyesi
- tamamlandı / ertelendi / bloklandı
- görev sonrası mini değerlendirme

Ek özellik:

- koç tarafından görev üret
- kullanıcı elle düzenlesin
- sonuçlar ELO ve health score'a işlensin

## Özellik Paketi 5: Hata Merkezi

`Mezarlık` iyi bir fikir ama isim ve UX daha sistemli hale getirilmeli.

Yeni ürün adı:

**Hata Merkezi**

İçerik:

- hata türü sınıflandırma
- tekrar sıklığı
- konu kümeleri
- "aynı hatayı kaç kez yaptın?"
- çözüldü / kronik / kritik etiketleri
- hata çözüm önerileri

Bu, kullanıcıya sadece arşiv değil karar desteği verir.

## Özellik Paketi 6: Hedef ve Kariyer Katmanı

Sadece sınav neti değil, hedef kararı da ürünün parçası olmalı.

İçerik:

- hedef üniversite uygunluğu
- bölüm karşılaştırması
- şehir / kampüs / burs filtresi
- gerçekçi hedef seviyesi
- A planı / B planı / güvenli hedef listesi

Bu sayede ürün yalnızca "çalıştıran koç" değil, "karar veren danışman" olur.

## Özellik Paketi 7: Sosyal / Rekabet Katmanı

Kod tabanında ELO ve ghost rival zaten buna uygun.

İçerik:

- arkadaş ekleme
- haftalık lig
- ortak sprint
- ghost rival gelişim takibi
- çalışma serisi karşılaştırması

Not:

İlk sürümde gerçek sosyal feed gerekmiyor. Yalnızca küçük rekabet modülü yeterli.

## Özellik Paketi 8: Veli / Mentor Özet Modu

Çok güçlü bir büyüme alanı.

İçerik:

- haftalık ilerleme özeti
- riskli alanlar
- deneme trendi
- çalışma düzeni
- basit paylaşım linki veya PDF export

Bu, uygulamayı tek kullanıcı app'inden ekosistem ürününe taşır.

---

## Önerilen Yeni Bilgi Mimarisi

### Alt navbar

1. Ana Sayfa
2. Plan
3. Çalış
4. Analiz
5. Koç

### Drawer / secondary navigation

- Müfredat
- Hata Merkezi
- Hedefler
- Profil
- Ayarlar
- Yönetim

### Ekran eşlemesi

- `Ana Sayfa` -> dashboard + bugün
- `Plan` -> agenda + sprint + görevler
- `Çalış` -> focus + war room + quiz
- `Analiz` -> exams + strategy + source ROI + habit alerts
- `Koç` -> chat + koç briefing + hızlı komutlar

---

## Uygulama İçin En Doğru 3 Yeni Özellik Kombinasyonu

### Kombinasyon A: En hızlı değer

- Günlük Komuta Merkezi
- Sprint Planner
- Akıllı Tekrar Motoru

Neden:

- mevcut veri yapılarıyla hızlı bağlanır
- kullanıcı değerini hemen artırır
- koç app algısını kırar

### Kombinasyon B: En güçlü ürün kimliği

- Study OS Görev Sistemi
- Hata Merkezi
- Hedef ve Kariyer Katmanı

Neden:

- ürünü eğitim işletim sistemine dönüştürür
- rakiplerden ayrışır

### Kombinasyon C: Viral büyüme odaklı

- Sosyal / Rekabet Katmanı
- Veli / Mentor Özet Modu
- Sprint Planner

Neden:

- retention ve paylaşılabilirlik artar

---

## Teknik Refactor Önerisi

### Faz 1

- `App.tsx` ekran orkestrasyonunu parçalara ayır
- shell layout bileşenleri oluştur
- mobil nav ve desktop nav ayrıştır
- ortak page primitives ekle

### Faz 2

- dashboard, agenda ve coach ekranlarını ortak tasarım sistemiyle yenile
- bottom sheet standardı getir
- form ve modal davranışlarını normalize et

### Faz 3

- task engine
- sprint engine
- review/repetition engine

### Faz 4

- hedef/kariyer modülü
- paylaşım/mentor özeti
- sosyal/lig sistemi

---

## Önceliklendirilmiş Yol Haritası

### Sprint 1

- App shell refactor
- mobil nav redesign
- dashboard redesign
- agenda mobil fix
- coach mobil input fix

### Sprint 2

- Günlük Komuta Merkezi
- Study OS görev modeli
- görev kartları ve durum akışları

### Sprint 3

- Akıllı Tekrar Motoru
- Hata Merkezi
- zayıf konu yeniden çalışma akışı

### Sprint 4

- Hedef/Kariyer modülü
- veli/mentor özeti
- paylaşılabilir haftalık rapor

---

## Net Önerim

Bu proje koçluk uygulamasından çıkmalı, ama "her şeyi yapan süper app"e de dönüşmemeli.

En doğru yeni çerçeve:

**Boho Mentos = AI destekli Study OS**

İlk uygulanması gereken kombinasyon:

1. App shell + UI system refactor
2. Günlük Komuta Merkezi
3. Sprint Planner
4. Akıllı Tekrar Motoru

Bu dörtlü tamamlandığında:

- ürün daha premium görünür
- mobil kullanılabilir olur
- koçluk uygulaması algısı kırılır
- kullanıcı her gün geri dönmek için sebep bulur

---

## Repo Bazlı En Kritik Hedef Dosyalar

- [`src/App.tsx`](C:\Projects\Boho mentos v2\src\App.tsx)
- [`src/index.css`](C:\Projects\Boho mentos v2\src\index.css)
- [`src/config/navItems.tsx`](C:\Projects\Boho mentos v2\src\config\navItems.tsx)
- [`src/components/dashboard/BentoDashboard.tsx`](C:\Projects\Boho mentos v2\src\components\dashboard\BentoDashboard.tsx)
- [`src/components/AgendaPage.tsx`](C:\Projects\Boho mentos v2\src\components\AgendaPage.tsx)
- [`src/components/coach/CoachScreen.tsx`](C:\Projects\Boho mentos v2\src\components\coach\CoachScreen.tsx)
- [`src/components/MobileGuard.tsx`](C:\Projects\Boho mentos v2\src\components\MobileGuard.tsx)

---

## Sonuç

Problem sadece "UI kötü" değil.

Asıl problem:

- ürün kapsamı net değil
- mobil akış ürün seviyesinde düşünülmemiş
- güçlü modüller tek deneyimde birleşmiyor

Bu yüzden yalnızca bug fix yapmak yeterli olmayacak.

Doğru yön:

- önce ürün iskeletini düzelt
- sonra mobil deneyimi yeniden kur
- ardından görev, tekrar ve strateji motorlarını ana ürüne bağla

