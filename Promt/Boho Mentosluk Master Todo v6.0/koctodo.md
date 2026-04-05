# 🔴 KOÇ EKRANI — TAM YENİDEN TASARIM TODO LİSTESİ

> **Mevcut Durum:** Siyah zemin üstünde ham monospace metin. Kullanıcı balonu tek düz dikdörtgen. Koç cevabı düz terminal çıktısı gibi görünüyor. Hızlı butonlar anlamsız pill kutucukları. Input çok basit. Hiçbir hiyerarşi, derinlik, karakter yok.
>
> **Hedef:** Gerçek bir AI koç deneyimi. Her mesaj bir "briefing" gibi hissettirmeli. Koç konuştuğunda güç hissedilmeli. Kullanıcı yazdığında aksiyon hissi vermeli.

---

## 1. GENEL MİMARİ & LAYOUT

- [ ] **Sayfayı 3 dikey bölgeye ayır:**
  - `ChatArea` — mesajlar (flex-1, scroll)
  - `ContextBar` — sağ panel (masaüstü), öğrenci durumu özeti (ELO, streak, son deneme)
  - `InputZone` — sabit alt bar
- [ ] **ContextBar (Sağ Panel — lg breakpoint):**
  - Anlık ELO skoru
  - Streak sayacı (alev animasyonlu)
  - Son deneme neti (TYT / AYT)
  - Aktif uyarı varsa kırmızı alert badge
  - "Hızlı Analiz" butonu (AI otomatik analiz başlatır)
- [ ] **Responsive:** Mobilde ContextBar gizlenir, bilgiler header'a taşınır
- [ ] **Scroll davranışı:** Yeni mesaj gelince smooth scroll bottom, kullanıcı yukarı scroll edince "⬇ Yeni mesaj" floating butonu çıksın

---

## 2. MESAJ BALONCUKLARI — TAM YENİDEN

### 2a. Kullanıcı Mesajı (sağ taraf)
- [ ] Köşeler: sağ alt köşe `border-radius: 4px`, diğerleri büyük radius — "konuşma balonu" hissi
- [ ] Arka plan: `#C17767` değil, daha sofistike: koyu amber gradient (`#3D1F14` → `#5C2E1A`) veya kullanıcının koç rengiyle uyumlu
- [ ] İsim + saat etiketi: sol üstte küçük, italic, `opacity: 0.5`
- [ ] Animasyon: sağdan slide-in (`translateX(20px)` → `0`, `opacity 0` → `1`)
- [ ] Max genişlik: `%65` desktop, `%85` mobil

### 2b. Koç Mesajı (sol taraf)
- [ ] **Koç Header:** Her koç mesajının tepesinde bir "briefing header" şeridi
  - Sol: `GEAR_HEAD.` küçük monospace etiket + animasyonlu yeşil "online" nokta
  - Sağ: mesaj tipi badge (örn. `📋 ANALİZ`, `⚔️ DİREKTİF`, `📊 LOG RAPORU`, `💡 ANLATIM`)
- [ ] **Mesaj kutusu tasarımı:**
  - Sol kenar: 3px dikey renkli şerit (mesaj tipine göre renk değişir: analiz=mavi, direktif=kırmızı, plan=turuncu)
  - Arka plan: çok hafif `rgba(255,255,255,0.02)` + subtle grid pattern (CSS `background-image`)
  - Üst sağda zaman damgası
- [ ] **Markdown render iyileştirmesi:**
  - `## Başlık` → büyük, bold, renkli, üstünde ince çizgi
  - `**bold**` → `#C17767` renk, italic değil bold
  - `- madde` → sol köşede küçük kırmızı kare nokta, standart bullet değil
  - Kod blokları → `font-mono`, koyu arka plan, kopyala butonu
  - Tablo → tam styled, alternatif satır rengi
  - Sayılar (net, puan) → büyük font, renkli badge içinde göster
- [ ] Animasyon: soldan slide-in + **typing indicator** (3 nokta animasyonu) koç yazmaya başladığında
- [ ] **"Koç yazdı" durumu:** Animasyonlu 3 nokta, yanında `Gear_Head analiz ediyor...` italik yazı

### 2c. Sistem Mesajları
- [ ] LOG kaydı, deneme girişi gibi otomatik mesajlar ayrı stilte: yatay çizgi + merkez metin, baloncuk değil

---

## 3. TYPING INDICATOR & LOADING

- [ ] Mevcut `<Loader2>` spinner'ı kaldır
- [ ] Yeni: Koçun avatarı + üç nokta animasyonu (`●●●` sırayla parlıyor)
- [ ] Loading metni değişkenler arası geçiş yapsın:
  - `"Veriler taranıyor..."`
  - `"Strateji hesaplanıyor..."`  
  - `"Direktif hazırlanıyor..."`
  - (her 1.5 saniyede bir değişir)
- [ ] Minimum 600ms göster (çok hızlı yanıt gelirse bile)

---

## 4. INPUT ZONE — TAM YENİDEN

- [ ] **Input alanı:**
  - Yükseklik: auto-resize (tek satır → çok satır, max 5 satır)
  - Focus'ta border `#C17767` + hafif glow efekti
  - Sol icon: koçun küçük avatarı veya `⌘` sembolü
  - Sağ: karakter sayacı (max 500) + gönder butonu
- [ ] **Gönder butonu:**
  - Boşken: `opacity: 0.3`, disabled
  - Yazı varken: `#C17767` renk, scale animasyonu
  - Hover: hafif rotate + scale
  - Gönderilince: küçük "whoosh" animasyonu
- [ ] **Komut ipuçları** (input boşken görünür, üstte):
  - `PLAN` `LOG` `ANALİZ ET` `DENEME` `ANLA` — küçük pill etiketleri
  - Tıklanınca input'a yazılır
- [ ] **Slash commands** (`/` yazınca):
  - Dropdown çıkar: `/plan`, `/log`, `/analiz`, `/deneme`, `/anla`
  - Ok tuşuyla navigate, Enter ile seç

---

## 5. HIZLI BUTONLAR — YENİDEN TASARIM

Mevcut durum: `+ LOG`, `+ ANALİZ ET`, `- DENEME`, `+ ANLA` — anlamsız renkler, sıkışık

- [ ] **Konumlandırma:** Input'un üstünde değil, **input'un solunda** ikona dönüştür
  - Veya: Sağ alt köşede floating action menu (+ butonu → açılır 4 seçenek)
- [ ] **Her buton için farklı karakter:**
  - 📋 **LOG** → yeşil, kalem ikonu
  - 🔍 **ANALİZ** → mavi, grafik ikonu  
  - 📝 **DENEME** → turuncu, test ikonu
  - 💡 **ANLA** → mor, ampul ikonu
- [ ] Hover'da tooltip göster: ne yapacağını açıkla
- [ ] Mobilde: swipe-right ile açılan drawer

---

## 6. KOÇUN KİMLİĞİ — GÖRSELLEŞTİRME

- [ ] **Koç Avatarı:** Her koç mesajının sol üstünde küçük avatar (36x36px)
  - `harsh` → kırmızı arka plan, 💀 emoji veya robot ikonu
  - `motivational` → turuncu, 🔥
  - `analytical` → mavi, 📊
- [ ] **Koç adı dinamik:** Mesaj başlığında koç tipi yansısın
  - `harsh` → `GEAR_HEAD.ALFA`
  - `motivational` → `GEAR_HEAD.PHOENIX`
  - `analytical` → `GEAR_HEAD.SIGMA`
- [ ] **Koç "mood" göstergesi:** Sağ panelde koçun mevcut modu
  - İyi performans → yeşil, "Memnun"
  - Düşen performans → kırmızı, "Sert Mod"

---

## 7. MESAJ GEÇMİŞİ & GRUPLAMA

- [ ] **Tarih separatörleri:** "Bugün", "Dün", "23 Haziran" gibi merkeze hizalı ayraçlar
- [ ] **Ardışık mesaj gruplaması:** Aynı kişiden arka arkaya gelen mesajlar birleşik görünsün (ikinci mesajda avatar tekrar gösterilmesin)
- [ ] **Boş durum (sıfır mesaj):**
  - Mevcut: basit metin
  - Yeni: Koçun büyük avatarı + karşılama ekranı
    - `"Merhaba [isim]. Hazır mısın?"`
    - Altında 3 büyük "başlat" kartı: `📋 Günlük Plan`, `📊 Analiz`, `⚔️ Savaş Modu`
    - Her kart tıklanınca ilgili komutu tetikler
- [ ] **Uzun mesajlarda "Daha fazla göster":** 600px'ten uzun mesajlar kırpılır, tıklanınca açılır

---

## 8. KONTEKSt KARTI — MESAJ ÜSTÜ

- [ ] Koç bir LOG analizi yapıyorsa, mesajın üstünde küçük "bağlam kartı":
  - `📋 LOG: TYT Matematik — Trigonometri — 50 soru`
  - Mesajın bağlamını netleştirir
- [ ] Deneme analizi yapıyorsa:
  - `📊 DENEME: TYT 87.5 net — 15.03.2025`

---

## 9. KOÇ MESAJI TİP SİSTEMİ

Her AI yanıtını otomatik kategorize et ve görsel ipucu ver:

- [ ] **Yanıt türü tespiti** (keyword analizi ile):
  - `plan`, `görev`, `direktif` → `type: "directive"` → sol şerit: kırmızı
  - `analiz`, `inceleme`, `rapor` → `type: "analysis"` → sol şerit: mavi
  - `açıklama`, `konu`, `anlatım` → `type: "explanation"` → sol şerit: mor
  - `tebrik`, `harika`, `başarı` → `type: "praise"` → sol şerit: yeşil
  - diğer → `type: "general"` → sol şerit: gri
- [ ] Badge ve renk otomatik uygulanır
- [ ] İkon da değişir (mesaj header'ında)

---

## 10. MİKRO-ANİMASYONLAR & EFEKTLER

- [ ] **Mesaj giriş animasyonu:** `framer-motion` ile `initial: { opacity: 0, y: 12 }` → `animate: { opacity: 1, y: 0 }`
- [ ] **Stagger:** Birden fazla mesaj yüklenirken sırayla gecikmeyle görünsün
- [ ] **Gönderme animasyonu:** Input → uçan mesaj efekti (scale down + fly to chat)
- [ ] **Scroll indicator:** Sağ kenarda ince progress bar (kaç mesaj göründüğü)
- [ ] **Yeni mesaj badge:** Yukarı scroll edilmişken yeni mesaj gelince altta `"1 yeni mesaj ↓"` floating badge
- [ ] **Koç yazıyor göstergesi:** Gerçekçi, koçun kişiliğine göre: `harsh` → `"Direktif hazırlanıyor..."`, `analytical` → `"Veri işleniyor..."`

---

## 11. MOBİL OPTİMİZASYON

- [ ] **Bottom sheet hızlı menü:** Mobilde hızlı butonlar alt sheet olarak açılsın
- [ ] **Swipe to reply:** Mesaja sola swipe yapınca alıntıla
- [ ] **Keyboard handling:** Klavye açıldığında input zone doğru konumlanmalı (`env(safe-area-inset-bottom)`)
- [ ] **Haptic feedback:** (Capacitor) mesaj gönderilince hafif titreşim
- [ ] **Mesaj uzun basma:** Context menu → Kopyala, Alıntıla, Paylaş

---

## 12. ERİŞİLEBİLİRLİK

- [ ] Tüm butonlara `aria-label`
- [ ] Enter ile gönder, Shift+Enter ile yeni satır
- [ ] Escape ile input temizle
- [ ] Klavye navigasyonu: Tab ile hızlı butonlar arası geçiş
- [ ] `role="log"` ve `aria-live="polite"` mesaj alanına

---

## 13. PERFORMANS

- [ ] Mesaj listesi `React.memo` ile optimize et
- [ ] Çok uzun geçmişte `react-window` ile virtual scroll
- [ ] Resim varsa lazy load
- [ ] Chat geçmişi 100+ mesajı aştığında eski mesajları grupla/kırp

---

## 14. YENİ ÖZELLİKLER (BONUS)

- [ ] **Mesaj arama:** `Ctrl+F` ile chat içi arama, eşleşen mesajlar highlight
- [ ] **Mesajı pinle:** Önemli direktifleri pinle, sidebar'da göster
- [ ] **Sesli girdi:** Mikrofon butonuna bas-konuş (Whisper API hazır altyapısı var)
- [ ] **Koç sesi:** TTS ile koçun yanıtını seslendir (isteğe bağlı toggle)
- [ ] **Emoji reaksiyon:** Mesaja emoji ekle (internal motivasyon için)
- [ ] **Bağlam menüsü:** Mesaja sağ tık → "Bu konuyu detaylandır", "Log olarak kaydet"

---

## 15. DOSYA DEĞİŞİKLİKLERİ

| Dosya | İşlem |
|---|---|
| `src/App.tsx` → `coach` sekmesi | Büyük refactor — ChatArea, InputZone, ContextBar ayrı component |
| `src/components/coach/ChatMessage.tsx` | **Yeni** — mesaj baloonu component |
| `src/components/coach/CoachHeader.tsx` | **Yeni** — koç kimlik header |
| `src/components/coach/InputZone.tsx` | **Yeni** — input + hızlı butonlar |
| `src/components/coach/ContextBar.tsx` | **Yeni** — sağ panel öğrenci özeti |
| `src/components/coach/EmptyState.tsx` | **Yeni** — boş mesaj ekranı |
| `src/components/coach/TypingIndicator.tsx` | **Yeni** — animasyonlu yazıyor göstergesi |
| `src/utils/classifyMessage.ts` | **Yeni** — mesaj tipi tespit utility |
| `src/hooks/useChat.ts` | **Yeni** — chat state yönetimi hook |

---

## ÖNCELİK SIRASI

```
P0 (Kritik — hemen):
  → ChatMessage component yeniden yaz
  → TypingIndicator yeniden yaz  
  → InputZone yeniden yaz
  → Boş durum ekranı

P1 (Önemli — bu hafta):
  → ContextBar (sağ panel)
  → Mesaj tip sistemi + sol şerit
  → Hızlı butonlar yeniden tasarım
  → Animasyonlar

P2 (İyileştirme — sonra):
  → Slash commands
  → Mesaj arama
  → Mobil optimizasyon derinlemesine
  → Sesli girdi
```

---

> **Not:** Mevcut `App.tsx` içindeki coach tab kodu ~200 satır inline yazılmış. Tüm bu kod `src/components/coach/` altına taşınmalı. Hem okunabilirlik hem performans açısından kritik.



