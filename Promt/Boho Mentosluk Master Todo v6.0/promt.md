Koç Ekranı V2.1 — Production Todo (Extended)

Scope genişletildi: UI + AI + Data + Infra + Reliability

📊 Güncellenmiş Özet
Kategori	Görev Sayısı	Öncelik
Chat Layout & UX	9	Kritik
CoachBriefing	8	Kritik
Sağ Panel	8	Yüksek
AI & Direktif Engine	11	Kritik
Log & Veri Akışı	8	Yüksek
State & Data Layer	7	Kritik
Performans	7	Yüksek
Mobil	6	Yüksek
Observability & Error	6	Kritik
Toplam	70+	—
1. Chat Layout & UX Overhaul (Extended)
 Virtualized chat list (react-virtual) — long history performansı
 Message grouping (same sender → grouped bubbles)
 Sticky date separators (Today / Yesterday)
 Command preview inline ("/plan" yazarken preview card)
 Undo last message (optimistic UI rollback)
 Chat scroll restore (refresh sonrası aynı konuma dön)
 Keyboard-first navigation (↑ ↓ enter tab)
 Accessibility (ARIA roles + screen reader labels)
 RTL desteği (Arapça içerik gözüküyor → kritik)
2. CoachBriefing (Stateful AI Component)

 Strict schema validation (Zod)

DirectiveSchema = {
  id: string
  headline: string
  summary: string
  tasks: Task[]
  priority: "low" | "medium" | "high"
}
 Directive cache (son direktif local persist)
 Partial hydration (ilk headline hızlı render)
 Task dependency system (task B → task A tamamlanmadan açılamaz)
 Task priority color system (semantic colors)
 Expired directive handling (24h sonra degrade)
 Multi-directive merge (çakışma çözümü)
 Offline fallback (last known directive göster)
3. Sağ Panel (Data-Dense Widget System)
 Widget container system (drag & reorder support future-proof)
 Real-time updates (websocket / polling fallback)
 Data stale indicator (örn: "last updated 2h ago")
 Skeleton + shimmer loading
 Error fallback widget (data gelmezse boş kalmasın)
 Widget isolation (crash → sadece o widget ölür)
 Threshold alerts (örn: net düşüş → kırmızı highlight)
 Tooltip system (tüm metrikler açıklamalı)
4. AI & Direktif Engine (Core System)
4.1 Pipeline
 Input normalization (log, chat, metrics unify)
 Context window builder (last logs + stats + directive)
 AI request queue (rate limit control)
 Retry with exponential backoff
 Timeout handling (fallback mesaj)
4.2 Output Processing
 JSON extraction (robust parser, malformed toleransı)
 Confidence score (AI cevabına güven skoru)
 Hallucination guard (invalid veri → discard)
 Safe fallback directive (AI fail durumunda)
4.3 Intelligence Layer
 Pattern detection engine
 Plateau detection (ilerleme durdu)
 Burnout prediction (fatigue + düşük performans)
 Adaptive difficulty engine
 Habit scoring system
4.4 UX Integration
 Directive diff (önceki vs yeni karşılaştırma)
 Explainability toggle ("neden bu öneri?")
 Silent mode (AI otomatik ama chat yazmaz)
 Interrupt handling (user yazarken AI durdur)
5. Log & Veri Giriş Sistemi (Event-Driven)

 Event schema:

StudyLogEvent = {
  userId
  subject
  duration
  questions
  correct
  wrong
  timestamp
}
 Optimistic UI (log gir → anında UI update)
 Background sync retry (offline support)
 Duplicate log detection
 Anomaly detection (çok uç değer → flag)
 Bulk log import (CSV / geçmiş veri)
 Log edit & versioning (audit trail)
 Auto-tagging (AI ile konu tahmini)
 Session stitching (ardışık logları birleştir)
6. State & Data Layer (CRITICAL)
 Zustand store segmentation:
chatStore
directiveStore
metricsStore
uiStore
 Normalized state (no nested deep objects)
 Selector memoization
 Server state → React Query
 Cache invalidation strategy
 Background revalidation
 Local persistence (IndexedDB > localStorage)
 Feature flags integration
7. Performans (Deep Optimization)
 Code splitting (route + component level)
 Bundle analyzer (unused deps remove)
 Memoized chart rendering
 Web worker (heavy AI parsing)
 Debounced AI calls
 Image optimization (lazy + next/image)
 FPS monitoring (dev mode)
8. Mobil Deneyim (Advanced)
 Gesture system (swipe / long press)
 Haptic feedback (task complete)
 Bottom sheet stack manager
 Keyboard avoidance engine
 Offline mode (PWA)
 Push notification support
9. Observability & Error Handling (CRITICAL)
 Global error boundary
 API error standardization
 Logging system:
frontend logs
AI logs
user actions
 Sentry integration
 Performance tracing
 AI response audit log
 User session replay (optional)
10. Security (Production)
 Input sanitization (XSS)
 Rate limiting (AI + API)
 JWT rotation + refresh
 Device fingerprinting
 Abuse detection (spam logs)
 Data encryption (at rest + transit)
11. Feature Flags & Experimentation
 Feature flag service (remote config)
 A/B testing infra
 Gradual rollout (% based)
 Kill switch (AI kapatma)
12. Edge Cases (GENELDE ATLANA KISIM)
 AI boş response
 JSON parse fail
 Network timeout
 Duplicate directive
 User rapid spam input
 Offline → online sync conflict
 Negative metrics (data bug)
 Timezone inconsistencies
🚀 Güncellenmiş Sprint Planı
Sprint 1 — Core Stability
Directive parsing + schema validation
Chat virtualization
State separation (Zustand slices)
Sprint 2 — AI Engine
Pipeline + retry + fallback
Micro feedback system
Directive lifecycle
Sprint 3 — UI Overhaul
Sağ panel redesign
CoachBriefing
Chat UX polish
Sprint 4 — Data & Logs
Log system (event-driven)
Optimistic updates
Metrics aggregation
Sprint 5 — Mobile & Perf
Gesture system
Lazy + memo optimizations
Offline mode
Sprint 6 — Observability
Logging + Sentry
AI audit
Performance tracing
🔧 Kritik Mimari Kararlar
1. AI = Stateless Servis
Backend AI → sadece compute
State frontend/store’da
2. Event-Driven Data
Log → event → process → metrics update
3. UI = Dumb, Store = Smart
Tüm logic store/service katmanında
⚠️ Reality Check (Önemli)

Bu sistem:

Basit bir “chat UI” değil
AI-driven adaptive coaching platform

Eksik bırakılırsa:

AI güvenilmez olur
UI kaotik olur
Kullanıcı retention düşer




# 🎯 Koç Ekranı V2.0 — Production Todo

> Boho Mentosluk · Koç Ekranı Yenileme · Nisan 2026  
> Görevlere tıkla, filtrele, sprint planla.

---

## 📊 Özet

| Kategori | Görev Sayısı | Öncelik |
|---|---|---|
| Chat Layout & UX Overhaul | 7 | Kritik |
| CoachBriefing Bileşeni | 6 | Kritik |
| Sağ Panel Yenileme | 6 | Yüksek |
| AI & Direktif Motoru | 7 | Kritik |
| Log & Veri Giriş Akışı | 5 | Yüksek |
| Performans & Teknik | 5 | Orta |
| Mobil Deneyim | 4 | Yüksek |
| Görselleştirme & Grafikler | 4 | Orta |
| **Toplam** | **44** | — |

---

## 1. Chat Layout & UX Overhaul

> `#ui` `#ux` `#kritik`

- [ ] **Sağ panel "Durum Paneli"** — ELO, seri, TYT/AYT net sabit widget olarak redesign `#ui` `#kritik`
- [ ] **"Hızlı Aksiyonlar" paneli** — Analiz, Günlük Plan, Haftalık Rapor butonları → icon + label + shortcut hint ile yeniden tasarım `#ui` `#ux`
- [ ] **Slash command (/) palette** — `/plan`, `/analiz`, `/savaş` vb. komutlar için modal autocomplete dropdown `#ui` `#yeni`
- [ ] **Chat balonu redesign** — GEAR_HEAD.SIGMA mesajları için "direktif badge" yerine inlined yapılandırılmış kart `#ui`
- [ ] **Responsive split-view** — sol chat, sağ panel; tablet/mobilde tab geçişi ile `#ui` `#ux`
- [ ] **Input bar yenileme** — log ekle ikonu, dosya yükle ikonu, ses ikonu (future) + karakter sayacı `#ui`
- [ ] **Scrollable chat** — her mesaj animasyonlu mount (slide-up + fade) `#ui` `#ux`

---

## 2. CoachBriefing Bileşeni Yenileme

> `#ai` `#ui` `#kritik`

- [ ] **CoachBriefing açılış kartı** — bugünün direktifi + 3 görev chip'i, chat yokken gösterilsin `#ai` `#ui`
- [ ] **StatusCard grid redesign** — ikon + label + değer + delta (yeşil/kırmızı) formatı `#ui`
- [ ] **"Aktif direktif yok" empty state** — güzel illüstrasyon + "Günlük Plan Al" CTA `#ux`
- [ ] **Görev tamamlama animasyonu** — checkbox click → yeşil fill + strikethrough + confetti micro `#ux`
- [ ] **Quick command butonlarına tooltip** — hover'da kısa açıklama göster `#ux`
- [ ] **Uyumluluk oranı (compliance rate)** → dairesel progress indicator olarak görselleştir `#ui` `#veri`

---

## 3. Sağ Panel (Durum Paneli) Kapsamlı Yenileme

> `#ui` `#veri` `#yüksek`

- [ ] **ELO kartı** — sparkline (son 7 gün ELO trend) + günlük delta badge `#ui` `#veri`
- [ ] **TYT / AYT net kartları** — hedef vs mevcut progress bar + gap metni `#ui` `#veri`
- [ ] **Seri kartı** — alev animasyonu + streak-freeze uyarısı ("bugün girilmedi") `#ui` `#ux`
- [ ] **Mini heatmap widget** — son 21 günlük çalışma yoğunluğu (GitHub tarzı) `#ui` `#veri`
- [ ] **"Hızlı Aksiyonlar"** — ikonlu butonlar keyboard shortcut ile eşleştirilsin `#ux`
- [ ] **Collapse/expand toggle** — sağ paneli daraltma modu (sadece ikonlar) `#ui`

---

## 4. AI & Direktif Motoru

> `#ai` `#kritik`

- [ ] **Direktif JSON parse** — headline + summary + tasks array → her alan kendi kartında render `#ai` `#kritik`
- [ ] **Görev lifecycle UI** — `pending → in_progress → completed → skipped` akışı görünür olsun `#ai` `#ux`
- [ ] **Mikro analiz (micro_feedback)** — log sonrası otomatik tetiklenen mini kart, chat'e inline değil pop-in olarak `#ai` `#ux`
- [ ] **Typing indicator yenileme** — "Kübra analiz ediyor..." → animasyonlu dot pulse + intent etiketi `#ui` `#ux`
- [ ] **Error state tasarımı** — AI hata verdiğinde retry butonu ile birlikte dostane hata kartı `#ux`
- [ ] **Direktif geçmişi sidebar** — son 5 direktif özeti, tıklanınca detay açılsın `#ai` `#ui`
- [ ] **wantDirective=true akışı** — yapılandırılmış çıktı ayrıştırıldığında chat balonundan "direktif kartı"na otomatik dönüşüm `#ai` `#kritik`

---

## 5. Log & Veri Giriş Akışı

> `#ux` `#ui` `#yüksek`

- [ ] **LogEntryWidget** — chat içine embed yerine bottom-sheet modal olarak aç (mobile first) `#ux` `#ui`
- [ ] **Hızlı log** — sadece ders + soru sayısı + D/Y ile 2 adımda log; "tam log" opsiyonel `#ux`
- [ ] **Log kaydedilince celebration** — konfeti + ELO delta animasyonu + micro_feedback otomatik tetikle `#ux`
- [ ] **Önceki log şablonu** — "dünkü Matematik logunu tekrarla" one-click `#ux` `#yeni`
- [ ] **Fatigue slider** → emoji skala (😊😐😫) ile değiştir, sayıyı gizle `#ux`

---

## 6. Performans & Teknik

> `#perf` `#orta`

- [ ] **Chat mesaj listesi** — `React.memo` + `useMemo` ile gereksiz re-render engelleme `#perf` `#kritik`
- [ ] **chatHistory slice(-50)** — store'da 100 mesaj tutulsa da UI sadece son 50 render etsin `#perf`
- [ ] **CoachBriefing selector'ları** — `profile` + `exams` + `lastCoachDirective` ayrı selector, tek büyük selector değil `#perf`
- [ ] **Sağ panel widget'ları lazy render** — ilk görünürlükte mount `#perf`
- [ ] **AI istek deduplication** — aynı `userMessage` 2 saniye içinde tekrar gönderilirse iptal et `#perf` `#ux`

---

## 7. Mobil Deneyim

> `#ux` `#ui` `#yüksek`

- [ ] **Sağ panel mobilde "Durum" tab'ı** — alt bar içine taşı `#ux` `#ui`
- [ ] **Slash command palette** — klavye açıldığında scroll sıfırlansın `#ux`
- [ ] **Chat input area** — mobilde `safe-area-inset-bottom`'a göre padding ayarla `#ux`
- [ ] **Direktif görevleri** — mobilde swipe-to-complete jesti (left = skip, right = done) `#ux` `#yeni`

---

## 8. Görselleştirme & Grafikler

> `#veri` `#ui` `#orta`

- [ ] **Mini sparkline** — sağ panele son 7 gün ELO değişimi (Recharts LineChart, 60px yükseklik) `#veri` `#ui`
- [ ] **Uyumluluk oranı gauge** — dairesel `RadialBarChart` `#veri` `#ui`
- [ ] **Konu heatmap mini widget** — hangi dersler en çok/az çalışıldı; 7x3 grid, renk yoğunluğu `#veri` `#ui` `#yeni`
- [ ] **Net gap görsel** — hedef vs mevcut; yatay bullet chart (iki katmanlı bar) `#veri`

---

## 🚀 Önerilen Sprint Sırası

### Sprint 1 — Temel Yapı (1-2 gün)
1. Slash command palette
2. Chat mesaj listesi performans fix (`React.memo`)
3. Direktif JSON → kart dönüşümü (`wantDirective=true`)

### Sprint 2 — Görsel Yenileme (2-3 gün)
4. CoachBriefing açılış kartı
5. StatusCard grid redesign
6. Sağ panel ELO + net kartları

### Sprint 3 — Micro UX (1-2 gün)
7. Görev tamamlama animasyonu
8. Log bottom-sheet modal
9. Typing indicator yenileme

### Sprint 4 — Mobil & Grafikler (2 gün)
10. Mobil sağ panel tab
11. Mini sparkline + heatmap widget
12. Swipe-to-complete

---

## 🏷️ Tag Referansı

| Tag | Açıklama |
|---|---|
| `#kritik` | Hemen yapılmalı, kullanıcı deneyimini doğrudan etkiler |
| `#ui` | Görsel/arayüz değişikliği |
| `#ux` | Kullanıcı deneyimi iyileştirmesi |
| `#ai` | AI/direktif sistemi ile ilgili |
| `#veri` | Grafik/veri görselleştirme |
| `#perf` | Performans optimizasyonu |
| `#yeni` | Tamamen yeni özellik |

---

*Boho Mentosluk · Koç Ekranı V2.0 · Nisan 2026*