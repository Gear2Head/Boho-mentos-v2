# Coach OS Redesign Prompt ve 120 Büyük Güncelleme

## Amaç

Bu doküman iki şeyi tek yerde toplar:

1. Koç ekranını yeniden tasarlamak için kullanılabilecek net ve güçlü bir prompt
2. Coach OS ürününü ciddi biçimde büyütecek 120 adet büyük güncelleme önerisi

---

## Ekran Üzerinden Çıkan Ana Sorunlar

Paylaşılan ekrana göre mevcut beyaz tema ve koç sistemi şu problemleri üretiyor:

- beyaz tema fazla soluk ve kontrastı zayıf
- içerik alanı gereğinden fazla boş, ama yine de düzenli görünmüyor
- sol arşiv paneli gereksiz kalın ve çalışma alanını daraltıyor
- orta alan eski nesil chat uygulaması gibi duruyor
- sağ panel ayrı bir ürün gibi hissettiriyor
- bilgi yoğunluğu var ama hiyerarşi zayıf
- metinler sönük, vurgu yüzeyleri zayıf
- input alanı altta boşlukta yüzüyor gibi duruyor
- hızlı aksiyonlar faydalı ama görsel olarak ucuz kart dizisi gibi çalışıyor
- koç ekranı "kompakt çalışma yüzeyi" yerine "yan yana üç kutu" hissi veriyor

---

## Yeni Tasarım Yönü

### Visual Thesis

Coach OS, klasik chatbot ekranı değil; yoğun çalışan bir öğrencinin gününü yönettiği kompakt, temiz, premium bir komuta masası gibi görünmeli.

### Content Plan

1. Sol taraf: hafif ve dar sohbet/geçmiş navigasyonu
2. Orta alan: gerçek çalışma yüzeyi, mesajlar + görevler + özetler
3. Sağ taraf: inspector değil, sadece gerektiğinde açılan akıllı context panel
4. Alt alan: güçlü ama sade komut/input satırı

### Interaction Thesis

- paneller kart gibi yığılmamalı, yüzeyler arasında sakin seviye farkı olmalı
- gereksiz border yerine spacing ve tipografi ile ayrım yapılmalı
- motion az ama anlamlı olmalı: panel açılışı, komut satırı focus, mesaj gruplama geçişleri

---

## Kullanıma Hazır Prompt

```md
Boho Mentos içindeki Coach OS ekranını yeniden tasarla.

Hedef:
- ekran eski chatbot gibi değil, modern bir çalışma işletim sistemi gibi hissettirmeli
- tasarım kompakt, düzenli, premium ve yüksek kontrastlı olmalı
- özellikle beyaz tema çok güçlü hale getirilmeli

Mevcut sorunlar:
- beyaz tema soluk ve kontrastsız
- orta alan fazla boş ama yine de dağınık
- sol sohbet arşivi gereğinden geniş
- sağ durum paneli çok kartlı ve eski hissettiriyor
- input alanı yüzeyden kopuk duruyor
- ekran klasik “3 kolon dashboard” gibi, ama gerçek ürün hiyerarşisi yok
- hızlı aksiyonlar çok sıradan
- metinler ve bilgi blokları yeterince taranabilir değil

Yeni tasarım prensipleri:
- Linear, Notion Calendar, Arc ve modern productivity app seviyesinde düzenli ve sakin bir arayüz
- fazla card kullanma
- her paneli ayrı kutu gibi göstermek yerine ortak yüzey sistemi kur
- sol panel daraltılmış ve daha utility odaklı olsun
- orta alan ana çalışma yüzeyi olsun
- sağ panel varsayılan olarak daha hafif olsun veya collapsible yapıya dönsün
- beyaz tema premium paper tonları, sıcak nötrler ve net accent kullanmalı
- border yoğunluğunu azalt, spacing ve tipografi ile ayrım kur
- chat ekranını eski mesaj balonlarından çıkar, daha editorial ve blok temelli mesaj sistemi düşün
- koç mesajları: directive, insight, alert, task gibi yapısal bloklara ayrılabilsin
- kullanıcı mesajları daha minimal olsun
- alt input alanı sabit, güçlü, temiz ve komut satırı gibi çalışsın
- slash komutları gerçekten premium komut menüsü deneyimi versin
- mobil uyumu unutma; desktop-first ama mobile-ready tasarla

İstenen tasarım çıktısı:
- daha kompakt layout
- daha iyi beyaz tema
- daha güçlü tipografi hiyerarşisi
- daha düzenli sohbet alanı
- daha modern yan panel yapısı
- daha az kart, daha çok sistematik yüzey
- görevler, planlar, analizler ve koç yönlendirmeleri aynı çalışma yüzeyinde birleşsin

Yapısal öneriler:
- sol: conversation rail + pinned items + recent sessions
- orta: coach workspace
- sağ: collapsible intelligence panel
- alt: command composer

İçerik modülleri:
- daily directive
- current focus
- risk alerts
- progress summary
- suggested next actions
- exam gap summary
- quick mode switch

Tasarım dili:
- sakin ama premium
- yoğun ama okunabilir
- az renk, güçlü vurgu
- beyaz temada editorial paper hissi
- dark mode ile parity korunmalı

Kaçınılacak şeyler:
- rastgele card grid
- kalın border’lı ucuz admin panel görünümü
- aşırı emoji ve renk kullanımı
- bol gölgeli ama zayıf hiyerarşili yüzeyler
- boş ama anlamsız büyük alanlar
- eski tip chat bubble merkezi tasarım

İstediğim çıktı formatı:
1. yeni layout önerisi
2. görsel sistem kuralları
3. beyaz tema palette önerisi
4. coach workspace modül yapısı
5. component seviyesinde redesign önerileri
6. mobil uyarlama prensipleri
7. uygulanabilir UI refactor planı
```

---

## Ekstra Sert Prompt Versiyonu

```md
Mevcut Coach OS ekranı eski nesil chatbot + dashboard melezi gibi görünüyor. Bunu tamamen düzelt.

Ben kompakt, düzenli, premium, yüksek kontrastlı, sakin ama güçlü bir çalışma arayüzü istiyorum.

Özellikle:
- beyaz tema artık soluk görünmemeli
- sol panel daha dar ve profesyonel olmalı
- orta alan gerçek çalışma yüzeyi gibi hissettirmeli
- sağ panel inspector mantığıyla daha akıllı davranmalı
- chat ekranı klasik balon sisteminden çıkmalı
- mesajlar directive, insight, task, warning, plan gibi yapılara ayrılmalı
- input alanı güçlü bir komut satırı gibi çalışmalı
- slash komutları premium command palette deneyimi vermeli

Hedef ürün hissi:
- study operating system
- productivity cockpit
- AI mentor workspace

Tasarımı minimal yap ama fakirleştirme.
Yoğun yap ama boğma.
Premium yap ama oyunlaştırılmış ucuz uygulama gibi yapma.

UI output’u çok somut ver:
- layout
- spacing
- type scale
- surface hierarchy
- color usage
- panel logic
- coach message system
- action system
- mobile adaptation
```

---

## 120 Büyük Coach OS Güncellemesi

## A. Coach Workspace Redesign

1. Koç ekranını klasik chat görünümünden çıkarıp blok tabanlı workspace yapısına dönüştür.
2. Mesajları `directive`, `analysis`, `warning`, `task`, `summary`, `review` tiplerine ayır.
3. Koç mesajlarında standart balon yerine belge benzeri yüzey kullan.
4. Kullanıcı mesajlarını çok daha minimal ve dar tasarla.
5. Sol sohbet panelini 3 durumlu yap: mini, normal, expanded.
6. Sağ paneli varsayılan kapalı ama çağrılabilir collapsible inspector yap.
7. Tekrarlayan bilgi kartlarını kaldırıp ortak üst özet bandı ekle.
8. Koç ekranına sticky günlük hedef satırı ekle.
9. Mesaj listesini zaman akışı yerine görev akışı olarak da görüntüleyebilme özelliği ekle.
10. Mesajlar içinde görevleri checkbox/claimable block olarak işaretleyebilme sistemi kur.

## B. Beyaz Tema Premiumlaştırma

11. Açık tema için tek beyaz yerine 5 kademeli nötr yüzey sistemi tasarla.
12. Paper-toned arka plan sistemi ekle.
13. Light mode için özel gölge kuralları oluştur.
14. Light mode’da border yoğunluğunu yarıya düşür.
15. Accent rengin açık tema varyantını daha rafine hale getir.
16. Bilgi yoğun yüzeylerde saf beyaz yerine sıcak kırık beyaz kullan.
17. Light mode için metin kontrast seviyelerini yeniden ayarla.
18. Başlık, alt bilgi ve veri tipografisini açık temada ayrı optimize et.
19. Form alanlarında ışıklı değil, premium inset hissi oluştur.
20. Beyaz tema için ayrı chart palette üret.

## C. Kompakt Layout Sistemi

21. Coach ekranı için `compact`, `comfortable`, `focus` olmak üzere üç density modu ekle.
22. Mesaj satır aralıklarını yoğun bilgi için optimize et.
23. Büyük boşlukları azaltıp anlamlı negatif alan kullan.
24. Input alanını tek satırlı komut yüzeyi + genişleyen composer haline getir.
25. Sol panelde gereksiz sabit genişliği kaldır.
26. Sağ panelde bilgi yoğunluğu artınca kart yerine listeli inspector yap.
27. Hızlı aksiyonları yanal kartlardan çıkarıp command row içine al.
28. Orta alanda max-width kontrolünü daha akıllı hale getir.
29. Uzun koç çıktılarında otomatik bölümleme uygula.
30. Mobilde tek kolon, tablette 2 panel, desktop’ta 2.5 panel mantığı kur.

## D. Komut Sistemi

31. Slash command altyapısını gerçek command palette deneyimine dönüştür.
32. Aranabilir aksiyon komut menüsü ekle.
33. Koç intent’lerini kullanıcıya görünen şekilde grupla.
34. Son kullanılan komutları sabitle.
35. Komutları kategoriye ayır: plan, analiz, tekrar, deneme, strateji.
36. Komut sonuçlarını mesaj değil structured output olarak gösterebil.
37. Klavye kısayolu ile komut menüsü aç.
38. Komut menüsünde önerilen aksiyonları bağlama göre sırala.
39. Kullanıcının durumuna göre “bugün için önerilen 3 komut” göster.
40. Komutları doğal dil ile slash intent arasında eşleştiren akıllı parser güçlendir.

## E. Günlük Planlama Motoru

41. Günlük planı tek mesaj yerine yapılandırılmış görev tablosu olarak üret.
42. Plan görevlerini süre, zorluk ve enerji seviyesine göre sırala.
43. Plan içinden görev başlatınca otomatik focus session başlat.
44. Yarım kalan görevleri yeniden planlayan recovery motoru ekle.
45. Gün içi plan drift analizi yap.
46. Planın gerçekçi olup olmadığını oluşturmadan önce denetle.
47. Planları sabah, öğlen, akşam bloklarına ayır.
48. Günlük planı “hafif gün / standart gün / savaş günü” şablonlarıyla üret.
49. Ders ağırlığına göre otomatik dengeleme yap.
50. Plan bittiğinde koç otomatik gün sonu değerlendirme açsın.

## F. Haftalık Sprint Sistemi

51. 7 günlük sprint planlama ekranı ekle.
52. Haftalık ana hedefler ve ikincil hedefler ayrımı yap.
53. Haftalık kapasite hesaplayıcısı ekle.
54. Sprint başarım yüzdesi hesapla.
55. Eksik kalan işlerin haftalık devri için recovery algoritması oluştur.
56. Her sprint sonunda koç retrospective sunsun.
57. Sprint bazlı ELO/XP etkisi tanımla.
58. Haftalık “en kritik açıklar” raporu üret.
59. Sprinti konu tamamlama ve net artış hedefleriyle bağla.
60. Sprint içinde mini checkpoint günleri tanımla.

## G. Görev İşletim Sistemi

61. Görev tiplerini çoğalt: ders, deneme, tekrar, okuma, analiz, hata çözümü, koç görevi.
62. Görevlere durum modeli ekle: pending, active, blocked, deferred, done.
63. Bloklanan görevlere sebep etiketi ekle.
64. Görev sonrası kısa refleksiyon girişi ekle.
65. Görevleri kaynak, konu ve hedef net ile ilişkilendir.
66. Görevlerde beklenen çıktı alanı tanımla.
67. Görev tamamlama kalitesini puanla.
68. Görev bazlı ELO ve XP hesabı ekle.
69. Görevleri drag-and-drop ile yeniden sırala.
70. Koçun ürettiği görevlerin kullanıcı tarafından refine edilmesini destekle.

## H. Tekrar Motoru

71. Bugün tekrar edilmesi gereken konular paneli ekle.
72. Tekrarları önem ve unutma riski puanına göre sırala.
73. Hatalı sorulardan otomatik tekrar kuyruğu üret.
74. Tekrar görevleri gecikince decay warning ver.
75. Tekrar tamamlama zinciri sistemi kur.
76. Mikro tekrar modülü ekle: 10 dakikalık hızlı revizyon.
77. Tekrarların uzun vadeli retention etkisini ölç.
78. Tekrar önerilerini deneme sonuçlarıyla birleştir.
79. “Bu hafta unutma riski yüksek 5 konu” özetini ekle.
80. Tekrar görevlerini plan motoruna otomatik bağla.

## I. Hata Merkezi

81. Mezarlık yapısını gerçek Hata Merkezi’ne dönüştür.
82. Hataları tür bazlı sınıflandır: dikkat, kavram, işlem, hız, strateji.
83. Hata kümeleri oluştur.
84. Aynı hatanın kaç kez tekrarlandığını göster.
85. Kronik hataları koçun gündem maddesine dönüştür.
86. Hatalara çözüm protokolü bağla.
87. Görsel hata inceleme alanı ekle.
88. “En pahalı 10 hata” listesi üret.
89. Hata çözümünden sonra doğrulama görevi ekle.
90. Hata Merkezi’ni ELO kaybı ve recovery ile bağla.

## J. Deneme ve Performans Analizi

91. Deneme sonrası otomatik güçlü/zayıf alan haritası üret.
92. TYT ve AYT için ayrı momentum grafikleri ekle.
93. Net artışının istikrarını ölç.
94. Düşüş trendinde kök neden analizi yap.
95. Performans varyans skoru ekle.
96. Kaynak bazlı verimlilik analizi geliştir.
97. Hedefe göre ETA tahmini göster.
98. “Mevcut tempoyla nereye varırsın?” modeli ekle.
99. Deneme sonuçlarını görev önerilerine dönüştür.
100. Deneme sonrası koçun kısa değil, yapılandırılmış post-mortem vermesini sağla.

## K. Müfredat ve Mastery

101. Konular için mastery score üret.
102. Konu tamamlama yüzdesi yerine güven puanı ekle.
103. Konu bazlı tekrar ihtiyacı göster.
104. Konu ağırlığı ile net katkısını birleştir.
105. Müfredat görünümüne “strategic priority” skoru ekle.
106. Konular için last touched timestamp göster.
107. Mastered görünen ama zayıflayan konuları işaretle.
108. Alan bazlı heatmap geliştir.
109. Öğrenme sırası optimizasyonu ekle.
110. Müfredat motorunu sprint ve görev sistemiyle bağla.

## L. Koç Zekası ve Hafıza

111. Koç belleğini daha uzun vadeli hedefler etrafında güçlendir.
112. Kullanıcının çalışma karakterini çıkaran profil modeli ekle.
113. Riskli davranış kalıplarını erken tespit et.
114. Koç tonunu bağlama göre değiştir.
115. Aşırı sert veya aşırı yumuşak koç davranışını dengele.
116. Koçun geçmiş tavsiyelerinin işe yarayıp yaramadığını ölç.
117. Başarısız olan tavsiyeleri tekrar önermeme sistemi kur.
118. Koç cevaplarında bağlam özetini sessizce kullan ama kullanıcıyı boğma.
119. Gün sonu, hafta sonu, deneme sonrası için farklı koç modları üret.
120. Koçu sadece konuşan değil, planlayan, denetleyen ve uyarlayan bir işletim sistemi katmanına dönüştür.

---

## En Kritik İlk 10 Uygulama

İlk etapta uygulanması en mantıklı güncellemeler:

1. Beyaz tema yüzey sisteminin yeniden kurulması
2. Coach ekranının kompakt layout’a geçirilmesi
3. Sol panelin daraltılması ve utility rail mantığına çevrilmesi
4. Sağ panelin collapsible inspector haline getirilmesi
5. Mesajların yapılandırılmış bloklara ayrılması
6. Command palette seviyesinde slash command sistemi
7. Günlük planın structured task board haline getirilmesi
8. Tekrar motorunun plan sistemine bağlanması
9. Hata Merkezi’nin derinleştirilmesi
10. Deneme sonrası structured post-mortem akışı

---

## Repo İçin Doğrudan İlgili Dosyalar

- [`src/components/coach/CoachScreen.tsx`](C:\Projects\Boho mentos v2\src\components\coach\CoachScreen.tsx)
- [`src/components/coach/ConversationSidebar.tsx`](C:\Projects\Boho mentos v2\src\components\coach\ConversationSidebar.tsx)
- [`src/components/coach/ContextBar.tsx`](C:\Projects\Boho mentos v2\src\components\coach\ContextBar.tsx)
- [`src/components/coach/InputZone.tsx`](C:\Projects\Boho mentos v2\src\components\coach\InputZone.tsx)
- [`src/components/coach/ChatMessage.tsx`](C:\Projects\Boho mentos v2\src\components\coach\ChatMessage.tsx)
- [`src/index.css`](C:\Projects\Boho mentos v2\src\index.css)

---

## Sonuç

Koç sistemi için doğru yön klasik sohbet uygulamasını cilalamak değil, onu gerçek bir `Coach OS workspace` haline getirmek.

Bu yüzden:

- beyaz tema daha güçlü olmalı
- layout daha kompakt olmalı
- paneller daha akıllı davranmalı
- mesajlar yapılandırılmış hale gelmeli
- koç sadece konuşmamalı, işletim sistemi gibi çalışmalı

