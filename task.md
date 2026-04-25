# 🧠 ULTRA MASTER TODO — BohoMentos V2 "Operation Titan"
> **Sürüm**: 3.0 (Phoenix -> Titan Evolution)
> **Statü**: EMERGENCY / REFACTOR
> **Felsefe**: Maksimum Detay, Sıfır Eksik, Üst Düzey Mimari.

---

## 🔴 [0] KRITIK BUG KATMANI (ACIL IMHA)
*Sistemin bel kemiğini kıran, kullanıcıyı boğan hatalar.*

- [ ] **BUG-001: FlapClock Hydration Mismatch**
  - Dosya: `src/components/FlapClock.tsx`
  - Sorun: SSR ve Client arasındaki zaman farkı `isMounted` guard'ı olmadığı için UI'da atlama ve tutarsızlık yaratıyor.
  - Fix: `useState(false)` + `useEffect` mounted check. `Math.ceil` yerine `Math.floor` kullanımıyla sayaçları eşitle.
  - Ref: [PROMPT-003](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L75)

- [ ] **BUG-002: ProfileSettings Net Hedefleri NaN**
  - Dosya: `src/components/forms/ProfileSettings.tsx`
  - Sorun: Inputlardan gelen değerler string olarak store'a gidiyor, matematiksel işlemlerde `NaN` patlatıyor.
  - Fix: `handleNumberChange` helper ile `Number()` cast ve range validation (0-120/200).
  - Ref: [PROMPT-006](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L184)

- [ ] **BUG-003: Spotify Persistent Disconnect**
  - Dosya: `src/services/spotifyService.ts` & `src/App.tsx`
  - Sorun: Refresh token döngüsü kırık, 1 saat içinde bağlantı kopuyor.
  - Fix: 45 dakikalık periyotlarla çalışan `Background Refresh Worker` (Interval) kurulumu.
  - Ref: [PROMPT-004](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L105)

- [ ] **BUG-004: WarRoom Canvas & Pointer Collision**
  - Dosya: `src/components/warroom/CanvasLayer.tsx`
  - Sorun: Çizim modu açıkken şıkların üstündeki overlay tıklamaları engelliyor.
  - Fix: `drawingMode === 'pen' ? 'pointer-events-auto' : 'pointer-events-none'` z-index yönetimi.
  - Ref: [PROMPT-005](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L151)

- [ ] **BUG-005: WarRoom Silgi (Clearing) Arızası**
  - Dosya: `src/components/warroom/TopBar.tsx`
  - Sorun: Silgi butonu canvas context'ine erişemiyor.
  - Fix: `canvasRef` üzerinden `clearRect(0,0,w,h)` tetiklemesi.
  - Ref: [PROMPT-005](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L151)

- [ ] **BUG-006: WarRoom KaTeX White Screen (Fatal)**
  - Dosya: `src/components/warroom/QuizEngine.tsx`
  - Sorun: Bozuk LaTeX formülleri tüm React tree'yi çökertiyor.
  - Fix: Formül bazlı `KaTeXBoundary` ErrorBoundary sarmalı.
  - Ref: [PROMPT-012](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L405)

- [ ] **BUG-007: Morning Directive AI Hallucination**
  - Dosya: `src/components/MorningBlocker.tsx`
  - Sorun: Branche ve ELO'ya bakmadan "Nasılsın?" seviyesinde genel sorular soruyor.
  - Fix: `userTrack` ve `weakestSubject` değişkenlerini prompt'a enjekte ederek "Tek Soru" kuralını uygulama.
  - Ref: [PROMPT-002](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L45)

- [ ] **BUG-008: Admin Dashboard UI Freeze**
  - Dosya: `src/components/admin/AdminDashboard.tsx`
  - Fix: `Skeleton Loading` katmanı ve async veri yükleme sırasında `animate-pulse` listeleri.
  - Ref: [PROMPT-010](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L337)

---

## 🧠 [1] AI KOÇ KÜBRA — BEYIN AMELIYATI
*Kübra'yı bir oyuncaktan, Türkiye'nin en zeki YKS mentörüne dönüştürme.*

- [ ] **AI-001: Strict JSON Mode**
  - `api/ai.ts` -> `responseMimeType: "application/json"`.
  - Gemini/Groq çıktılarını Zod ile valide etme.
  - Ref: [PROMPT-001](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L7)

- [ ] **AI-002: Analitik Persona & Küfürsüz Sert Mentörlük**
  - Boş motivasyon yasak. Veri odaklı analiz zorunlu.
  - `COACH_PERSONA_BASE` tamamen veri-bazlı (Data-Driven) bir dille yenilenecek.

- [ ] **AI-003: Smart Context Pipeline**
  - `src/services/coachContext.ts`: AI'a 1000 satır veri değil, `computeAnalytics(state)` sonucunda çıkan "Özet Analiz" gönderilecek.

- [ ] **AI-004: NLP Log Extractor**
  - Chat içindeki "2 saat kimya çalıştım, 50 soru çözdüm" ifadesini otomatik yakalayıp `academicStore`'a gömen sistem.
  - Ref: [PROMPT-007](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L218)

- [ ] **AI-005: Context Summarizer**
  - 10 mesajda bir eski tarihi özetleyip token tasarrufu sağlayan hafıza yönetimi.

---

## 🎨 [2] BOHO-PREMIUM UI/UX DESIGN SYSTEM
*Apple-Grade kullanıcı deneyimi ve Boho-Chic estetiği.*

- [ ] **UI-001: Design System Core**
  - `index.css`: Terracotta, Sage, Sand renk paleti.
  - Fonts: `Playfair Display` (Headings) & `Montserrat` (Body).
  - Ref: [PROMPT-008](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L264)

- [ ] **UI-002: Glassmorphism & Premium Cards**
  - Tüm widgetlar `GlassCard` (frosted glass) bileşenine geçirilecek.
  - `BohoButton`: Haptic feedback simülasyonu (scale-95) ve premium hover effectleri.

- [ ] **UI-003: Mobile-First Evolution**
  - `src/components/layout/BottomNav.tsx`: iOS tarzı akıllı mobil navigasyon.
  - `App.tsx`: Sidebar'ın mobilde tamamen gizlenip "App Experience"'a dönmesi.
  - Ref: [PROMPT-009](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L312)

- [ ] **UI-004: Micro-interactions**
  - Framer Motion: `fadeInUp`, `slideUp`, `popIn` presetlerinin tüm uygulamaya yayılması.
  - Ref: [PROMPT-015](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L495)

---

## ⚡ [3] MEGA ÖZELLIKLER (TITAN UPDATE)
*Sistemi otonom hale getiren dev sistemler.*

- [ ] **FEAT-001: Ebbinghaus Unutma Eğrisi (Spaced Repetition)**
  - SM-2 algoritması ile öğrencinin neyi ne zaman unutacağını hesaplayan "Tekrar Planlayıcı".
  - Ref: [PROMPT-011](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L362)

- [ ] **FEAT-002: Gölge Rakip (Ghost Rival)**
  - Kullanıcının %5 üstünde performans sergileyen sanal bir "Ezeli Rakip" dashboardu.
  - Ref: [PROMPT-013](file:///c:/Projects/Boho%20mentos%20v2/Prompt/Prompt.md#L442)

- [ ] **FEAT-003: Burnout & Anomali Dedektörü**
  - Çalışma grafiği aniden sarkan öğrencilere Kübra'dan "Kritik Müdahale" tetiklemesi.

- [ ] **FEAT-004: Gemini Vision OCR**
  - Deneme sonuç belgesinin fotosundan otomatik net ve konu yanlışlarını çıkarma.

---

## 🚀 20+ EK TODO (ENGINEERING EXCELLENCE)
1. [ ] **AI Voice Coaching**: Web Speech API ile Kübra ile sesli diyalog.
2. [ ] **Multiplayer Warroom (MVP)**: Arkadaşlarınla eşzamanlı deneme çözme odaları.
3. [ ] **Global Cmd+K Palette**: Tüm sisteme kısayolla erişim (cmdk).
4. [ ] **Offline-first PWA**: İnternet yokken log girme, gelince senkronizasyon.
5. [ ] **Smart PDF Download**: Haftalık analiz raporunu şık bir PDF olarak basma.
6. [ ] **Dynamic Theme Engine**: Mood/Sezon bazlı renk geçişleri.
7. [ ] **ELO Decay System**: 2 gün çalışılmadığında düşen ELO puanı.
8. [ ] **Focus Mode (Browser Guard)**: Sekme değiştirince "Odağın Dağıldı" uyarısı.
9. [ ] **Curriculum Map SVG**: Tüm YKS konularını birbirine bağlı bir evren gibi gösteren interaktif harita.
10. [ ] **Daily Recap Email**: Dünün özetini mail olarak gönderme.
11. [ ] **Social Study Guilds**: Hedefi aynı olan öğrencilerin (Örn: İTÜ Bilgisayar) kapalı grupları.
12. [ ] **Pomodoro AI integration**: Kübra'nın yönettiği, öğrenci yorgunluğuna göre değişen mola süreleri.
13. [ ] **Question Error Graveyard**: Yanlış yapılan soruların "Mezarlık"ta toplanıp AI tarafından tekrar sorulması.
14. [ ] **Parental Portal**: Velilere sadece izleme yetkisi veren dashboard.
15. [ ] **Deep Link Spotify**: Çalışılan konunun zorluğuna göre (Kolay/Zor) Lo-Fi veya Rock playlist seçimi.
16. [ ] **API Rate Limiter**: Server tarafında 429 Error yönetimi (Cost Control).
17. [ ] **Exam Predictor**: Mevcut verilerle "Gerçek sınavda beklenen sıralama" simülasyonu.
18. [ ] **Confetti Master**: Milestone'larda (Örn: 100 ELO artışı) `canvas-confetti` patlamaları.
19. [ ] **GDPR Data Export**: Tüm kullanıcı verilerini JSON olarak indirme butonu.
20. [ ] **Network Health Banner**: Bağlantı durumunu gösteren premium banner.
21. [ ] **Typing Indicators**: Kübra yazarken "Logların inceleniyor..." gibi dinamik durum mesajları.
22. [ ] **Haptic Feedback Framework**: Mobil cihazlarda buton basışlarında hafif titreşim.
