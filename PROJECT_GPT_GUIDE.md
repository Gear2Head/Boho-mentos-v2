# BOHO MENTOSLUK V5 — AI Geliştirici Rehberi (GPT-Ready)

Bu döküman, projenin mimarisini, teknoloji yığınını ve geliştirme standartlarını başka bir AI modelinin (GPT-4 vb.) saniyeler içinde anlayıp katkı sunabilmesi için hazırlanmıştır.

---

## 1. PROJE ÖZETİ
**Amaç:** YKS (Türkiye Üniversite Sınavı) hazırlık sürecini oyunlaştıran, liyakat (ELO) tabanlı bir mentorluk ve aktif soru çözüm platformu.
**Felsefe:** "Gear_Head" mimarisi — Otonom, güvenli, estetik ve modüler.
**Marka:** Boho Mentosluk (Bohemian + Mentorship).

---

## 2. TEKNOLOJİ YIĞINI (TECH-STACK)
- **Frontend:** Vite + React 19 (Strict Mode)
- **Styling:** Tailwind CSS v4 (CSS-first architecture)
- **State Management:** Zustand (appStore.ts)
- **Animasyon:** Framer Motion (veya 'motion' paketi)
- **Backend (Local Proxy):** Express.ts + tsx (server.ts)
- **AI Models:** Gemini 1.5 Flash/Pro, Groq (Llama 3), Cerebras, OpenRouter.
- **Veritabanı:** Supabase (Yolda) / Local JSON (Geçici)

---

## 3. MİMARİ YAPI VE DOSYA SİSTEMİ

### 3.1 Kök Dosyalar
- `src/main.tsx`: Kernel katmanı. Error Boundary ve sistem resetleme (Cache/SW) burada yapılır.
- `package.json`: `dev` scripti `concurrently` ile hem Vite'i (3000) hem de API Proxy'sini (3001) ayağa kaldırır. `doctor.cjs` ile sağlık kontrolü yapar.
- `.npmrc`: `legacy-peer-deps=true` ile React 19 uyumsuzluklarını yönetir.

### 3.2 Önemli Klasörler
- `src/store`: Merkezi durum yönetimi (`appStore.ts`). Kullanıcı profili, denemeler ve çizim modları burada tutulur.
- `src/components`: UI bileşenleri. 
    - `MebiWarRoom.tsx`: Aktif soru çözüm ve canvas katmanı.
    - `StrategyHub.tsx`: Analitik veriler ve AI projeksiyonları.
- `api/`: Vercel Serverless Function standartlarında yazılmış API endpoint'leri. `ai.ts` tüm AI trafiğini yönetir.
- `scripts/`: Geliştirici araçları. `doctor.cjs` port temizliği ve bağımlılık kontrolü yapar.

---

## 4. KRİTİK ALGORİTMALAR VE PATTERN'LER

### 4.1 AI Proxy (Failover Logic)
`api/ai.ts` içerisindeki `getCoachResponseServer`:
1.  Önce Cerebras (en hızlı) dener.
2.  Hata alırsa Gemini (en stabil) dener.
3.  Hata alırsa Groq dener.
Sistemin hiçbir zaman "meşgul" dönmemesini sağlar.

### 4.2 War Room Canvas (Pointer-Events)
Canvas katmanı, soru metni ve şıkların üzerinde yer alır.
- `drawingMode === 'pointer'`: Canvas `pointer-events: none`. Şıklara tıklanabilir.
- `drawingMode === 'pen'`: Canvas `pointer-events: auto`. Çizim yapılabilir.

### 4.3 Grafik Stabilizasyonu (ERR-008)
Recharts bileşenleri `ResponsiveContainer` hatası (width -1) vermemesi için her zaman sabit `min-height` içeren bir `div` içine hapsedilmelidir.

---

## 5. GELİŞTİRME KURALLARI (GPT İÇİN)
1. **Estetik:** Boho renk paleti (`#C17767`, `#1A1A1A`, `#E09F3E`) ve Antik/Modern tipografi (Serif italic) kullan.
2. **Güvenlik:** Asla istemci kodunda (client-side) `process.env` kullanma. Tüm AI çağrılarını `/api/ai` proxy'sine yönlendir.
3. **Modülerlik:** Her bileşen tek bir işi yapmalı. 500 satırı geçen dosyaları böl.
4. **Hata Yönetimi:** KÜBRA protokolüne uy. Hata gelirse özür dileme, analiz et ve çözümü "Master Fix" (kök neden) olarak sun.

---

## 6. MEVCUT DURUM VE TODO
- [x] Beyaz ekran ve port çakışmaları çözüldü.
- [/] War Room özellikleri geliştiriliyor (OCR bekliyor).
- [ ] Supabase Auth ve DB entegrasyonu gelecek.
- [ ] Mobil responsive dokunuşlar gerekiyor.

---
*Bu döküman Boho-Mentosluk v5.1 mimarisini temsil eder.*
