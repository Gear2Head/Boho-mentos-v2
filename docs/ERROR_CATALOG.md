# BOHO MENTOSLUK V5 — HATA KATALOĞU

> Oluşturma: 2026-03-31 | Versiyon: 1.0 | Durum: AKTİF

---

### ERR-001 | AI HATASI: 404

```
Kod        : ERR_AI_404
Şiddet     : KRİTİK
Ekran      : Koç sekmesi
Belirti    : "AI HATASI: 404" mesajı, konsol: Failed to load /api/ai:1
```

**Kök Neden:**
Vite dev sunucusu `/api/ai` rotasını tanımıyor. `api/ai.ts` Vercel Serverless Function olarak yazılmış ama local'de proxy tanımlanmamış.

**Çözüm:**
Bu hata, Localhost ortamında Express Server (`server.ts`) çalıştırılarak ve Vite Proxy ayarları `/api` yolunu `http://localhost:3001` adresine yönelecek şekilde ayarlanarak çözülmüştür.

---

### ERR-002 | KOÇ EKRANI BOŞ

```
Kod        : ERR_COACH_BLANK
Şiddet     : KRİTİK
Ekran      : Koç sekmesi
Belirti    : Sayfa tamamen siyah, mesaj yok, widget yok
```

**Kök Neden:**
`chatHistory` boş array ile başlıyor. İlk yüklemede başlangıç mesajı olmadığı için ve `isTyping` kontrolü ile loading verilmediği için sayfa boş gözüküyor.

**Çözüm:**
`App.tsx` içine `useEffect` eklenerek aktif sekme değiştiğinde ve tarihçe boş olduğunda otomatik bir başlangıç (greeting) mesajı yerleştirildi.

---

### ERR-003 | CHAT SCROLL HATASI

```
Kod        : ERR_CHAT_SCROLL
Şiddet     : KRİTİK
Ekran      : Koç sekmesi
Belirti    : Yeni mesajlar en üstte görünüyor, en alta gitmiyor
```

**Kök Neden:**
Mesaj componenti render edildiğinde Scroll olayı tetikleniyordu ama DOM henüz re-render aşamasını tamamlamamıştı, bu yüzden görünüm her zaman bir mesaj öncesinin boyutunu görüyordu.

**Çözüm:**
`requestAnimationFrame` ile DOM render süreci tamamlanana kadar beklenip `scrollIntoView({ behavior: 'smooth', block: 'end' })` tetikleyici ile çözüldü.

---

### ERR-004 | CANVAS POINTER ENGEL

```
Kod        : ERR_CANVAS_POINTER
Şiddet     : KRİTİK
Ekran      : War Room / Soru Ekranı
Belirti    : Şıklara tıklanamıyor, canvas tüm ekranı bloke ediyor
```

**Kök Neden:**
`CanvasDraw` elementi tüm alanın üzerine z-index ve pointer-events açık halde biniyor. Bu yüzden alt kısımdaki divlere tıklama gitmiyordu.

**Çözüm:**
Store üzerinden `drawingMode` (pen veya pointer) durum yönetimi eklendi. İşaretleme veya Çizim seçeneğine göre Canvas katmanının CSS ayarları (`pointerEvents: none` veya `auto`) değiştirilerek çözüldü.

---

### ERR-005 | SİLGİ ÇALIŞMIYOR

```
Kod        : ERR_ERASER_BROKEN
Şiddet     : KRİTİK
Ekran      : War Room
Belirti    : Silgi butonuna basılıyor ama çizimler gitmiyor
```

**Kök Neden:**
Hatalı veya kopuk React Ref bağlanması. `canvasRef.current` silgi ikonuna tıklandığında Canvas'ın kendi iç metodunu çalıştıramıyordu.

**Çözüm:**
`canvasRef.current?.clear()` ile ve Whiteout fırça boyutu taktiği kullanılarak çözüldü.

---

### ERR-006 | SORU EKRANI TAŞMASI

```
Kod        : ERR_QUESTION_OVERFLOW
Şiddet     : YÜKSEK
Ekran      : War Room / Sorular
Belirti    : Soru metni ve şıklar ekrana sığmıyor, yatay scroll çıkıyor
```

**Kök Neden:**
Soru konteyneri sabit piksel genişlikte ve KaTeX render'ı block-level eleman yapısı sunuyor bu yüzden container genişliğini taşıyor.

**Çözüm:**
Container div yapısına `max-w-full`, `overflow-hidden` ile CSS bazlı kilitler yerleştirildi.

---

### ERR-007 | LIGHT MODE ÇALIŞMIYOR

```
Kod        : ERR_THEME_STUCK
Şiddet     : YÜKSEK
Ekran      : Tüm uygulama
Belirti    : Ayarlardan "LIGHT" seçilse de tema değişmiyor
```

**Kök Neden:**
Tailwind in reaktif state ile `.dark` ve `.light` sınıflarını sadece initial pass sırasında hesaplaması ve DOM sınıf listelerinin React lifecycle iplerinden kopuk olması.

**Çözüm:**
App.tsx üzerinde anlık çalışan bir force classList sync operasyonu kondu. `document.documentElement.classList.toggle('light', store.theme === 'light');`

---

### ERR-008 | RECHARTS WIDTH -1 HATASI

```
Kod        : ERR_CHART_SIZE
Şiddet     : YÜKSEK
Ekran      : Dashboard, Analiz
Belirti    : Konsol: "width(-1) and height(-1) of chart should be greater than 0"
             Grafikler render olmıyor
```

**Kök Neden:**
Parent elementi `<ResponsiveContainer>` ın henüz görünür (display block) olmadığı durumlarda boyut hesabı -1 dönüyor.

**Çözüm:**
ResponsiveContainer elementinin etrafına sabit min height min width olan parent wrapper konularak boyutta render gecikmesi kurtarılmıştır.
