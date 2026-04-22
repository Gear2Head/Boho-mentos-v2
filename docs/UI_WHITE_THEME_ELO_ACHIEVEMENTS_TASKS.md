# UI, Beyaz Tema, ELO, Seviye ve Başarımlar Geliştirme Task Dokümanı

## Hedef

Bu görev setinin amacı uygulamayı görsel olarak daha premium, daha sistematik ve daha bağımlılık yaratan bir ürün haline getirmek.

Odak alanları:

1. UI tasarım kalitesini ciddi biçimde yükseltmek
2. beyaz temayı sıradan açık mod yerine premium bir deneyime dönüştürmek
3. ELO sistemini basit puan göstergesinden gerçek bir progression engine haline getirmek
4. seviye sistemini detaylandırmak
5. başarımları koleksiyon, ilerleme ve prestij katmanına çevirmek

---

## Mevcut Durumdan Çıkan Sorunlar

### UI

- tasarım dili güçlü ama ekranlar arasında standardizasyon eksik
- kart, panel, header ve spacing sistemi tutarlı değil
- birçok ekran ayrı ürün gibi hissettiriyor

### Beyaz Tema

- açık tema teknik olarak var ama karakteri zayıf
- koyu temanın dramatik havası varken beyaz tema düz kalıyor
- açık tema için ayrı yüzey derinliği, kontrast ve vurgu mantığı eksik

### ELO Sistemi

- mevcut ELO kartı temel bir rank + progress bar gösteriyor
- lig mantığı var ama yeterince derin değil
- günlük kazanım/kayıp, sezon, görev etkisi, combo, decay gibi sistemler yok

Referans dosya:

- [`src/components/EloRankCard.tsx`](C:\Projects\Boho mentos v2\src\components\EloRankCard.tsx)

### Başarımlar

- başarımlar listeleniyor ama ürünle etkileşimi sınırlı
- rarity, progression, secret achievements, category mastery, chain rewards yok
- unlock anı güçlü değil

Referans dosya:

- [`src/components/AchievementsPanel.tsx`](C:\Projects\Boho mentos v2\src\components\AchievementsPanel.tsx)

### Store / veri modeli

- `eloScore`, `streakDays`, `trophies`, `dailyEloDelta` gibi alanlar var
- ama bunlar daha geniş progression sistemine dönüşmemiş

Referans:

- [`src/store/slices/profileSlice.ts`](C:\Projects\Boho mentos v2\src\store\slices\profileSlice.ts)

---

## Ana Ürün Kararı

Uygulamada progression katmanı artık yan özellik değil, çekirdek motivasyon sistemi olacak.

Bu nedenle yeni yaklaşım:

**UI + açık tema + progression sistemi birlikte ele alınacak**

Yani:

- sadece ekran güzelleştirme yapılmayacak
- kullanıcıya "ilerliyorum" hissi veren sistemler de güçlendirilecek

---

## Bölüm 1: UI Tasarımını Daha İyi Hale Getirme Taskları

## Task 1.1: Tasarım Sistemi Katmanı Oluştur

### Amaç

Ekranları tek tek rötuşlamak yerine ortak tasarım sistemi kurmak.

### Yapılacaklar

- `index.css` içinde açık/koyu tema için genişletilmiş token seti tanımla
- spacing scale oluştur
- radius scale oluştur
- shadow/elevation scale oluştur
- state renkleri oluştur:
  - success
  - warning
  - danger
  - info
  - achievement
  - elo
- ortak surface türleri oluştur:
  - primary surface
  - elevated card
  - muted panel
  - glass panel
  - inset panel

### Çıktı

- daha düzenli görsel hiyerarşi
- ekranlar arası görsel bütünlük

---

## Task 1.2: Ortak UI Primitive Bileşenleri Tasarla

### Amaç

Uygulama genelinde aynı bileşen dili kullanılmalı.

### Yapılacaklar

- `PageHeader`
- `SectionHeader`
- `StatCard`
- `InsightCard`
- `ProgressCard`
- `ActionTile`
- `EmptyState`
- `InfoPill`
- `StatusBadge`
- `PremiumPanel`

### Kural

- beyaz ve koyu tema bu primitive’ler üzerinden yönetilecek
- ham class tekrarları azaltılacak

---

## Task 1.3: Dashboard UI Yeniden Tasarım

### Amaç

Dashboard sadece veri yığını olmamalı; karar merkezi gibi hissettirmeli.

### Yapılacaklar

- mevcut bento yapısını daha temiz ve premium hale getir
- kart yoğunluğunu azalt
- bilgi hiyerarşisini netleştir
- hero alanı sadeleştir
- "bugün ne yapmalıyım" alanını en üste al
- ELO, streak, achievements ve risk sinyallerini tek progression alanında topla

### Öncelikli dosya

- [`src/components/dashboard/BentoDashboard.tsx`](C:\Projects\Boho mentos v2\src\components\dashboard\BentoDashboard.tsx)

---

## Task 1.4: Mobil UI Tutarlılığı

### Yapılacaklar

- tüm ana kartlar mobilde tek kolon standardına oturtulacak
- padding ve spacing mobil için yeniden ayarlanacak
- sabit alt nav ile çakışan floating widget alanları normalize edilecek
- typography scale mobilde yeniden dengelenecek

---

## Bölüm 2: Beyaz Tema Premium Hale Getirme Taskları

## Task 2.1: Açık Tema Paletini Baştan Tanımla

### Sorun

Şu an beyaz tema fazla düz:

- arka plan açık
- kart beyaz
- border açık gri

Bu yapı premium değil.

### Yapılacaklar

- arka planı tek ton beyaz yerine sıcak kırık beyaz katmanlarına ayır
- yüzey seviyeleri oluştur:
  - app background
  - page background
  - card background
  - elevated background
  - muted background
- accent rengini açık temada daha rafine kullan
- border kontrastlarını yeniden düzenle
- light mode gölgelerini daha görünür ama yumuşak yap

### Hedef his

- editorial
- premium
- sıcak
- sade ama pahalı görünen

### Referans dosya

- [`src/index.css`](C:\Projects\Boho mentos v2\src\index.css)

---

## Task 2.2: Açık Tema İçin Ayrı Bileşen Stil Kuralları

### Yapılacaklar

- light mode’da cam efekti yerine daha fazla paper/elevated surface kullan
- dark mode’da çalışan bazı transparan yüzeyleri light mode için yeniden tasarla
- light mode’da metin kontrastlarını WCAG seviyesinde iyileştir
- açık temada başarı, uyarı ve danger renklerini daha sofistike hale getir

---

## Task 2.3: Beyaz Tema İçin Görsel İmza Alanları

### Yapılacaklar

- dashboard hero için açık tema varyantı üret
- ELO kartının light theme premium versiyonunu tasarla
- başarımlar paneline koleksiyon hissi veren açık tema yüzeyleri ekle
- progress bar ve badges light mode için yeniden çizilsin

---

## Bölüm 3: ELO Sistemini Aşırı Detaylı Hale Getirme Taskları

## Task 3.1: ELO Sistemini Çok Katmanlı Progression Engine’e Çevir

### Şu an

- tek skor
- rank title
- basit ilerleme barı

### Yeni sistem

- total ELO
- weekly ELO
- season ELO
- protected ELO
- decay risk
- peak ELO
- category ELO

### Category ELO alanları

- disiplin ELO
- deneme performans ELO
- tekrar ELO
- odak ELO
- görev tamamlama ELO

### Sonuç

- kullanıcı sadece toplam puanı değil, hangi alanda iyi/kötü olduğunu görür

---

## Task 3.2: Lig + Division + Tier Sistemi Derinleştir

### Yapılacaklar

Mevcut:

- Bronz
- Gümüş
- Altın
- Platin
- Elmas
- Usta
- Şampiyon

Yeni detay:

- her ligte 4 division
- division içi segment progress
- promotion series
- relegation warning
- protection shield
- tier history

### Ek bilgiler

- son terfi tarihi
- en yüksek ulaşılan rank
- bu rankta geçirilen gün
- bir üst lige kalan tahmini görev sayısı

---

## Task 3.3: ELO Kazanım/Kayıp Kurallarını Genişlet

### ELO kazandıran aksiyonlar

- görev tamamlama
- planlanan süreye uyum
- günlük streak
- güçlü deneme sonucu
- zayıf konuyu düzeltme
- tekrar görevini zamanında yapma
- war room performansı

### ELO kaybettiren aksiyonlar

- görev kaçırma
- tekrar görevini sürekli erteleme
- art arda plansız günler
- düşük disiplin zinciri
- belirgin performans çöküşü

### Kurallar

- ceza sistemi sert ama açıklanabilir olmalı
- kullanıcı neden puan kazandı/kaybetti net görmeli

---

## Task 3.4: ELO Geçmişi ve Analitik Ekranı

### Yapılacaklar

- günlük ELO grafiği
- haftalık trend
- son 30 gün değişim
- hangi aksiyonlar en çok puan kazandırıyor
- hangi davranışlar puan düşürüyor
- peak vs current karşılaştırması

### Yeni ekran / panel

- `Progression Hub`

---

## Bölüm 4: Seviye Sistemini Detaylandırma Taskları

## Task 4.1: ELO’dan Ayrı Seviye Sistemi Kur

ELO rekabet göstergesi olsun, seviye ise toplam gelişim göstergesi olsun.

### Yeni yapı

- XP sistemi
- kullanıcı seviyesi
- alt seviye progress bar
- mastery milestones
- seasonal prestige

### XP kaynakları

- günlük giriş
- görev tamamlama
- odak seansı
- tekrar tamamlama
- deneme analizi işleme
- achievement unlock

### Fark

- ELO aşağı/yukarı oynar
- seviye daha kalıcı ilerleme hissi verir

---

## Task 4.2: Uzmanlık Seviyeleri Tanımla

Sadece genel level değil, alan bazlı mastery katmanı da olsun.

### Örnek alanlar

- Focus Mastery
- Exam Mastery
- Consistency Mastery
- Recovery Mastery
- Revision Mastery
- Strategy Mastery

### Kullanım

- profil ekranında rozet olarak görünür
- achievements ile bağlanır

---

## Bölüm 5: Başarımları Aşırı Detaylı Hale Getirme Taskları

## Task 5.1: Başarım Kategorilerini Genişlet

### Mevcut kategoriler

- streak
- performance
- milestone
- special

### Yeni kategoriler

- discipline
- exam
- revision
- focus
- consistency
- recovery
- strategic
- social
- secret
- legendary

---

## Task 5.2: Rarity Sistemi Ekle

### Rarity türleri

- Common
- Rare
- Epic
- Legendary
- Mythic

### Görsel farklar

- badge rengi
- aura/glow
- unlock animasyonu
- özel ikon çerçevesi

---

## Task 5.3: Achievement Progress Tracking

### Yapılacaklar

Kilitli achievement’larda ilerleme yüzdesi göster:

- 3/7 günlük seri
- 12/50 görev
- 4/10 tekrar
- 2/5 güçlü deneme

### Sonuç

- başarımlar sadece geçmiş ödül değil, aktif hedef haline gelir

---

## Task 5.4: Secret ve Chain Achievements

### Secret achievements

- kullanıcı koşulu bilmez
- açılınca sürpriz etkisi yaratır

### Chain achievements

- aynı serinin devamı olur
- örnek:
  - 3 gün seri
  - 7 gün seri
  - 14 gün seri
  - 30 gün seri
  - 60 gün seri

---

## Task 5.5: Achievement Unlock Deneyimini Güçlendir

### Yapılacaklar

- unlock toast yerine premium modal
- rarity’ye göre animasyon
- kazanılan ödül metni
- XP ve ELO etkisi
- "bir sonraki hedef" önerisi

### Ek

- achievement history ekranı
- en yeni açılanlar alanı

---

## Bölüm 6: Yeni Ekranlar ve Modüller

## Task 6.1: Progression Hub

### İçerik

- toplam ELO
- level / XP
- current league
- category breakdown
- son kazanımlar
- achievement showcase
- streak durumu
- ilerleme analitiği

---

## Task 6.2: Achievement Gallery

### İçerik

- kategori filtresi
- rarity filtresi
- unlocked / locked görünümü
- progress gösterimi
- secret achievement placeholders
- favori başarımlar alanı

---

## Task 6.3: Profile Prestige Section

### İçerik

- kullanıcının ana rank kartı
- seviye rozeti
- en değerli başarımlar
- en yüksek seri
- en yüksek ELO
- uzmanlık rozetleri

---

## Bölüm 7: Teknik Tasklar

## Task 7.1: Veri Modeli Genişletme

### Store’a eklenecek alanlar

- xp
- level
- seasonElo
- weeklyElo
- peakElo
- eloHistory
- achievementProgress
- unlockedAchievementIds
- masteryTracks
- promotionState
- relegationState

---

## Task 7.2: Progression Hesaplama Katmanı

### Yapılacaklar

- ELO hesaplama utility
- XP hesaplama utility
- achievement progress evaluator
- rarity config
- rank tier rules
- level thresholds

### Not

Bu hesaplar UI içinde dağınık olmamalı; utility/service katmanında merkezi olmalı.

---

## Task 7.3: Tema Katmanı Temizliği

### Yapılacaklar

- hardcoded açık/koyu renkleri azalt
- semantic token kullanımını artır
- light mode varyantlarını düzgün ayır
- tekrar eden sınıf desenlerini primitive bileşenlere taşı

---

## Sprint Bazlı Uygulama Planı

## Sprint 1

- beyaz tema palette redesign
- tasarım token genişletme
- ortak UI primitive bileşenleri
- dashboard yüzey ve spacing cleanup

## Sprint 2

- ELO kartı redesign
- lig/division sistemi genişletme
- XP ve level sistemi ekleme
- progression veri modeli oluşturma

## Sprint 3

- başarımlar rarity sistemi
- achievement progress
- unlock modal deneyimi
- achievement gallery

## Sprint 4

- progression hub
- profile prestige bölümü
- light/dark parity polish
- mobil fine-tuning

---

## Öncelik Sırası

En doğru uygulama sırası:

1. Beyaz tema ve tasarım sistemi
2. ELO + seviye altyapısı
3. başarımlar sisteminin derinleştirilmesi
4. progression hub ve profil prestij katmanı

---

## Beklenen Sonuç

Bu tasklar tamamlandığında ürün:

- daha premium görünür
- beyaz temada ciddi kalite hissi verir
- kullanıcıya güçlü bir gelişim hissi verir
- yalnızca çalışma aracı değil, ilerleme oyunu gibi çalışır
- retention açısından daha güçlü hale gelir

