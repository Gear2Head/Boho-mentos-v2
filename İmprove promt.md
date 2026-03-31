# WAR ROOM & CANVAS YAZMA — GELİŞMİŞ TODO & PROMPT v1.0

> **Kapsam:** `MebiWarRoom.tsx`, `WarRoomLayout.tsx`, `TopBar.tsx`, `OptionsPanel.tsx`,
> `QuestionPanel.tsx`, `CoachPanel.tsx`, `appStore.ts` (war room state slice),
> yeni `useWarRoom.ts` hook'u, yeni `warRoomService.ts` servisi.
>
> **Hedef:** Mock data'dan gerçek veri akışına geçiş, canvas çizim katmanının
> piksel-mükemmel senkronizasyonu, tüm TypeScript tip hatalarının giderilmesi,
> resim üzerine yazı/işaret ekleme özelliğinin production-ready hale getirilmesi.

---

## 0. MEVCUT SORUNLAR — TAM HASAR TESPİTİ

### 0.1 Store Eksiklikleri (Build Kırıcı)

`appStore.ts` içinde `AppState` interface'inde ve store implementasyonunda
**hiç tanımlanmamış** olan, ancak bileşenler tarafından doğrudan çağrılan alanlar:

```
store.warRoomMode          → TopBar.tsx, ModeSwitcher
store.setWarRoomMode()     → TopBar.tsx, ModeSwitcher
store.selectedAnswer       → OptionsPanel.tsx
store.eliminatedOptions    → OptionsPanel.tsx
store.toggleEliminatedOption() → OptionsPanel.tsx
store.setSelectedAnswer()  → OptionsPanel.tsx
store.drawingMode          → MebiWarRoom.tsx (kısmen var, setter eksik)
```

Sonuç: TypeScript strict modunda proje **compile olmaz.**

### 0.2 Canvas / Çizim Katmanı Senkronizasyon Hatası

`MebiWarRoom.tsx` içindeki `CanvasDraw`:
- `ResizeObserver` ile kapsayıcı boyutu okunuyor ✓
- Ama `containerRef` yalnızca `isStarted` değiştiğinde observe'e bağlanıyor
- Sayfa yeniden boyutlandırılırsa canvas boyutu güncellenmez
- Kalem ucu ve gerçek çizim noktası **kaymaya** başlar (pointer offset bug)

`OptionsPanel.tsx` ve `QuestionPanel.tsx` içindeki `CanvasDraw`:
- `canvasWidth={2000} canvasHeight={3000}` **hardcoded**
- Farklı monitörlerde, mobilde, split-view'da tamamen yanlış

`drawingMode === 'eraser'`:
- `brushColor="transparent"` ile silgi simüle ediliyor
- Bu gerçek silgi değil; şeffaf üzerine şeffaf boya yapıyor
- `CanvasDraw`'ın `eraseAll` veya `undo` API'si kullanılmıyor

### 0.3 Veri Akışı — Mock Data Tıkandı

`MebiWarRoom.tsx`:
```ts
const MOCK_QUESTIONS = [ { id: 'q1', ... } ]; // Tek statik soru
```
- Konu bazlı filtreleme yok
- Zorluk seviyesi yok
- TYT / AYT ayrımı yok
- Soru havuzu bağlantısı yok
- AI ile dinamik soru üretimi yok

### 0.4 War Room Timer — Persist Edilmiyor

`timeLeft` sadece yerel `useState` — sayfa yenilenince sıfırlanır.
Sınav simülasyonunda bu kabul edilemez; 30 dk'lık oturum refresh'te gider.

### 0.5 Sonuç / Skorlama Sistemi Yok

Oturum bittiğinde:
- Doğru/Yanlış/Boş hesabı yapılmıyor
- ELO'ya yansıtılmıyor
- Log'a işlenmiyor
- Koç analizi tetiklenmiyor

### 0.6 Resim Üzerine Yazı — Tam Bozuk

`QuestionPanel.tsx` içindeki `CanvasLayer`:
- `width: 100%; height: 100%` CSS yazılmış ama `CanvasDraw` piksel değeri istiyor
- Uyumsuzluk: CSS boyutları !== canvas intrinsic boyutları
- Sonuç: kalem çizgisi fare pozisyonunun 2–3x uzağına düşüyor
- Resim (question.image) ve canvas katmanı **farklı koordinat sisteminde**

---

## 1. STORE — EKSİK ALAN VE REDUCER'LAR

### 1.1 `appStore.ts`'e Eklenecek Interface Alanları

```typescript
// AppState interface'ine ekle:

// --- WAR ROOM STATE ---
warRoomMode: 'solve' | 'draw' | 'analysis';
setWarRoomMode: (mode: 'solve' | 'draw' | 'analysis') => void;

warRoomSession: WarRoomSession | null;
setWarRoomSession: (session: WarRoomSession | null) => void;
updateWarRoomAnswer: (questionId: string, answer: string) => void;
toggleEliminatedOption: (questionId: string, optionIndex: number) => void;

// Her soru için ayrı answer/eliminate state
warRoomAnswers: Record<string, string>;           // questionId → seçilen harf
warRoomEliminated: Record<string, number[]>;      // questionId → elenen index'ler
setSelectedAnswer: (questionId: string, answer: string) => void;
```

### 1.2 `WarRoomSession` Tipi — `types/index.ts`'e Ekle

```typescript
export interface WarRoomQuestion {
  id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  examType: 'TYT' | 'AYT';
  text: string;
  image?: string;
  options: string[];
  correctAnswer: string;  // 'A' | 'B' | 'C' | 'D' | 'E'
  analysis: string;
  source?: string;        // 'AI' | 'manual' | 'archive'
}

export interface WarRoomResult {
  questionId: string;
  selected: string | null;
  correct: boolean;
  eliminated: number[];
  timeSpent: number;      // saniye
}

export type WarRoomMode = 'solve' | 'draw' | 'analysis';

export interface WarRoomSession {
  id: string;
  startedAt: string;      // ISO string
  durationSeconds: number; // toplam süre limiti
  questions: WarRoomQuestion[];
  results: WarRoomResult[];
  currentIndex: number;
  isFinished: boolean;
  examType: 'TYT' | 'AYT' | 'mixed';
  focusSubject?: string;
}
```

### 1.3 Store Reducer Implementasyonları

```typescript
// useAppStore create() içine ekle:

warRoomMode: 'solve',
warRoomSession: null,
warRoomAnswers: {},
warRoomEliminated: {},

setWarRoomMode: (mode) => set({ warRoomMode: mode }),

setWarRoomSession: (session) => set({
  warRoomSession: session,
  warRoomAnswers: {},
  warRoomEliminated: {},
}),

setSelectedAnswer: (questionId, answer) => set((state) => ({
  warRoomAnswers: { ...state.warRoomAnswers, [questionId]: answer },
})),

toggleEliminatedOption: (questionId, optionIndex) => set((state) => {
  const current = state.warRoomEliminated[questionId] ?? [];
  const next = current.includes(optionIndex)
    ? current.filter((i) => i !== optionIndex)
    : [...current, optionIndex];
  return { warRoomEliminated: { ...state.warRoomEliminated, [questionId]: next } };
}),

updateWarRoomAnswer: (questionId, answer) => set((state) => ({
  warRoomAnswers: { ...state.warRoomAnswers, [questionId]: answer },
})),
```

---

## 2. CANVAS / ÇİZİM KATMANI — TAM YENİDEN YAZIM

### 2.1 Sorun Özeti

`CanvasDraw` kütüphanesi piksel değerleri istiyor.
CSS `width: 100%` vermek intrinsic boyutu değiştirmiyor.
Sonuç: mouse event koordinatları ile canvas draw koordinatları uyuşmuyor.

### 2.2 Çözüm Mimarisi: `useCanvasSync` Hook'u

```typescript
// src/hooks/useCanvasSync.ts

import { useEffect, useRef, useState, useCallback } from 'react';

interface CanvasDimensions {
  width: number;
  height: number;
  pixelRatio: number;
}

export function useCanvasSync(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const [dims, setDims] = useState<CanvasDimensions>({
    width: 800,
    height: 600,
    pixelRatio: window.devicePixelRatio || 1,
  });

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const update = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        setDims({
          width: Math.floor(width),
          height: Math.floor(height),
          pixelRatio: dpr,
        });
      }
    };

    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);

    // İlk ölçüm
    const rect = containerRef.current.getBoundingClientRect();
    setDims({
      width: Math.floor(rect.width),
      height: Math.floor(rect.height),
      pixelRatio: window.devicePixelRatio || 1,
    });

    return () => ro.disconnect();
  }, [enabled]);

  const clearCanvas = useCallback(() => {
    canvasRef.current?.clear();
  }, []);

  const undoCanvas = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const exportCanvas = useCallback((): string | null => {
    try {
      return canvasRef.current?.getDataURL('image/png') ?? null;
    } catch {
      return null;
    }
  }, []);

  return { containerRef, canvasRef, dims, clearCanvas, undoCanvas, exportCanvas };
}
```

### 2.3 `MebiWarRoom.tsx` Canvas Düzeltmesi

```tsx
// MEVCUT (YANLIŞ):
<CanvasDraw
  ref={canvasRef}
  brushColor="#C17767"
  brushRadius={2}
  lazyRadius={0}
  canvasWidth={canvasDim.width}   // ResizeObserver ile alınıyor ✓
  canvasHeight={canvasDim.height} // ama yalnızca isStarted tetikliyor ✗
  hideGrid
  backgroundColor="transparent"
/>

// DOĞRU:
const { containerRef, canvasRef, dims, clearCanvas, undoCanvas } =
  useCanvasSync(isStarted && store.drawingMode === 'pen');

<div ref={containerRef} className="absolute inset-0 z-10 overflow-hidden">
  {store.drawingMode === 'pen' && (
    <CanvasDraw
      ref={canvasRef}
      brushColor={brushColor}
      brushRadius={brushRadius}
      lazyRadius={0}
      canvasWidth={dims.width}
      canvasHeight={dims.height}
      hideGrid
      backgroundColor="transparent"
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  )}
</div>
```

### 2.4 Silgi — Gerçek Silgi Implementasyonu

```tsx
// brushColor="transparent" YANLIŞ — canvas'ı silmiyor, üstüne saydam boya yapıyor.

// ÇÖZÜM 1: CanvasDraw'ın undo() API'sini kullan
// ÇÖZÜM 2: Custom HTML5 Canvas silgi modu

// brushRadius ve brushColor eraser modunda:
const brushColor = store.drawingMode === 'eraser'
  ? '#000000'   // Kullanılmaz; destination-out composite ile silinir
  : penColor;

const brushRadius = store.drawingMode === 'eraser' ? 20 : 3;

// Silgi butonu:
<button onClick={undoCanvas}>
  Son çizgiyi geri al
</button>

// Veya tam silme:
<button onClick={clearCanvas}>
  Tüm çizimleri sil
</button>
```

### 2.5 `OptionsPanel.tsx` — Hardcoded Boyut Kaldırılması

```tsx
// MEVCUT (YANLIŞ):
<CanvasDraw
  canvasWidth={2000}
  canvasHeight={3000}
  ...
/>

// ÇÖZÜM: OptionsPanel'e useCanvasSync inject et

interface OptionsPanelProps {
  options: string[];
  questionId: string;
  canvasRef: React.RefObject<any>;
  canvasDims: { width: number; height: number };
}

export function OptionsPanel({ options, questionId, canvasRef, canvasDims }: OptionsPanelProps) {
  const store = useAppStore();
  const selectedAnswer = store.warRoomAnswers[questionId] ?? null;
  const eliminatedOptions = store.warRoomEliminated[questionId] ?? [];
  // ...
}
```

### 2.6 Resim Üzerine Yazı — Koordinat Sistemi Düzeltmesi

Problem: Soru görseli (`<img>`) ve canvas (`<CanvasDraw>`) farklı boyutlarda render ediliyor.
Canvas koordinatları resim koordinatlarıyla örtüşmüyor.

```tsx
// ÇÖZÜM: Her ikisini de aynı kapsayıcıya yerleştir,
// useCanvasSync ile container'ı ölç,
// image'ı object-contain ile yay, canvas'ı aynı boyuta eşle.

<div
  ref={containerRef}
  style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}
>
  {/* Resim katmanı */}
  <img
    src={question.image}
    alt=""
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  />

  {/* Çizim katmanı — resmin TAM üstünde, aynı piksel boyutunda */}
  {isDrawing && (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
      <CanvasDraw
        ref={canvasRef}
        canvasWidth={dims.width}
        canvasHeight={dims.height}
        brushColor="#C17767"
        brushRadius={3}
        lazyRadius={0}
        hideGrid
        backgroundColor="transparent"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </div>
  )}
</div>
```

---

## 3. VERİ AKIŞI — MOCK'TAN GERÇEĞE

### 3.1 `warRoomService.ts` — Yeni Servis Dosyası

```typescript
// src/services/warRoomService.ts

import { getCoachResponse } from './gemini';
import type { WarRoomQuestion, StudentProfile } from '../types';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';

export interface GenerateQuestionsOptions {
  examType: 'TYT' | 'AYT';
  subject?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'elite';
  count?: number;
  weakTopics?: string[];       // Log analizinden gelen zayıf konular
  coachPersonality?: string;
}

export async function generateWarRoomQuestions(
  opts: GenerateQuestionsOptions
): Promise<WarRoomQuestion[]> {
  const {
    examType,
    subject,
    topic,
    difficulty = 'medium',
    count = 5,
    weakTopics = [],
    coachPersonality,
  } = opts;

  const topicCtx = topic
    ? `Konu: ${topic}`
    : weakTopics.length > 0
    ? `Öğrencinin zayıf konuları: ${weakTopics.slice(0, 3).join(', ')}`
    : `${examType} genel karma`;

  const diffMap = {
    easy: 'temel, doğrudan uygulama',
    medium: 'orta düzey, 1-2 adımlı akıl yürütme',
    hard: 'zor, tuzaklı YKS tarzı',
    elite: 'en yüksek zorluk, ÖSYM görünümlü',
  };

  const prompt = `
Sen YKS soru yazarısın. Aşağıdaki kriterlere göre ${count} adet çoktan seçmeli soru üret.

KRİTERLER:
- Sınav: ${examType}
- ${topicCtx}
- Zorluk: ${diffMap[difficulty]}
- Her sorunun 5 şıkkı olsun (A, B, C, D, E)
- Türkçe olsun
- Gerçek YKS formatında olsun

ZORUNLU ÇIKTI FORMATI (SADECE JSON DİZİSİ):
[
  {
    "id": "q1",
    "subject": "TYT Matematik",
    "topic": "Problemler",
    "difficulty": "medium",
    "examType": "TYT",
    "text": "Soru metni burada",
    "options": ["Şık A", "Şık B", "Şık C", "Şık D", "Şık E"],
    "correctAnswer": "B",
    "analysis": "Çözüm açıklaması burada"
  }
]

UYARI: Başka hiçbir metin yazma. Sadece geçerli JSON döndür.
`.trim();

  const raw = await getCoachResponse(
    prompt,
    `${examType} soru üretimi`,
    [],
    { forceJson: true, maxTokens: 2000, coachPersonality }
  );

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Soru formatı geçersiz');

  const questions: WarRoomQuestion[] = JSON.parse(match[0]).map(
    (q: Partial<WarRoomQuestion>, i: number) => ({
      id: q.id ?? `q${i + 1}_${Date.now()}`,
      subject: q.subject ?? `${examType} ${subject ?? 'Karma'}`,
      topic: q.topic ?? topic ?? 'Genel',
      difficulty: q.difficulty ?? difficulty,
      examType: q.examType ?? examType,
      text: q.text ?? '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer ?? 'A',
      analysis: q.analysis ?? '',
      source: 'AI',
    })
  );

  return questions;
}

export function scoreWarRoomSession(
  questions: WarRoomQuestion[],
  answers: Record<string, string>
) {
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (!ans) {
      empty++;
    } else if (ans === q.correctAnswer) {
      correct++;
    } else {
      wrong++;
    }
  });

  const net = correct - wrong * 0.25;
  const accuracy = questions.length > 0
    ? Math.round((correct / questions.length) * 100)
    : 0;

  return { correct, wrong, empty, net, accuracy };
}
```

### 3.2 `useWarRoom.ts` — Sınav Mantığı Hook'u

```typescript
// src/hooks/useWarRoom.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { generateWarRoomQuestions, scoreWarRoomSession } from '../services/warRoomService';
import type { GenerateQuestionsOptions, WarRoomSession } from '../types';

export function useWarRoom() {
  const store = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer yönetimi
  useEffect(() => {
    if (!store.warRoomSession?.isFinished && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, store.warRoomSession?.isFinished]);

  const startSession = useCallback(async (opts: GenerateQuestionsOptions & { durationMinutes?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const weakTopics = store.logs
        .slice(-30)
        .filter((l) => l.correct / (l.questions || 1) < 0.6)
        .map((l) => l.topic)
        .slice(0, 5);

      const questions = await generateWarRoomQuestions({
        ...opts,
        weakTopics,
        coachPersonality: store.profile?.coachPersonality,
      });

      const session: WarRoomSession = {
        id: `wr_${Date.now()}`,
        startedAt: new Date().toISOString(),
        durationSeconds: (opts.durationMinutes ?? 30) * 60,
        questions,
        results: [],
        currentIndex: 0,
        isFinished: false,
        examType: opts.examType,
        focusSubject: opts.subject,
      };

      store.setWarRoomSession(session);
      setTimeLeft(session.durationSeconds);
    } catch (err) {
      setError('Sorular üretilirken hata oluştu. Tekrar dene.');
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const finishSession = useCallback(() => {
    if (!store.warRoomSession) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const { correct, wrong, empty, net, accuracy } =
      scoreWarRoomSession(store.warRoomSession.questions, store.warRoomAnswers);

    // ELO güncelle
    const eloDelta = Math.round(net * 4);
    store.addElo(eloDelta);

    // Log olarak kaydet
    const subject = store.warRoomSession.focusSubject ?? store.warRoomSession.examType;
    store.addLog({
      date: new Date().toISOString(),
      subject: `${store.warRoomSession.examType} War Room`,
      topic: subject,
      questions: store.warRoomSession.questions.length,
      correct,
      wrong,
      empty,
      avgTime: Math.round(
        (store.warRoomSession.durationSeconds - timeLeft) / 60
      ),
      fatigue: 5,
      tags: accuracy < 60 ? ['#WARROOM', '#DÜŞÜK_BAŞARI'] : ['#WARROOM'],
    });

    store.setWarRoomSession({
      ...store.warRoomSession,
      isFinished: true,
    });
  }, [store, timeLeft]);

  const goToQuestion = useCallback((index: number) => {
    if (!store.warRoomSession) return;
    store.setWarRoomSession({
      ...store.warRoomSession,
      currentIndex: index,
    });
  }, [store]);

  const currentQuestion =
    store.warRoomSession?.questions[store.warRoomSession.currentIndex] ?? null;

  return {
    session: store.warRoomSession,
    currentQuestion,
    isLoading,
    error,
    timeLeft,
    startSession,
    finishSession,
    goToQuestion,
  };
}
```

---

## 4. BILEŞEN YENİDEN YAZIMLARI

### 4.1 `MebiWarRoom.tsx` — Tam Yeniden Yazım Planı

```
MEVCUT SORUNLAR:
✗ MOCK_QUESTIONS statik dizi
✗ canvasRef tek nesne, tüm içerik için paylaşılıyor
✗ useWarRoom hook'u yok; tüm mantık bileşen içinde
✗ Bitiş ekranı yok (sadece "BİTİR" butonu, tıklayınca hiçbir şey olmaz)
✗ Soru gezinme (navigation) yok
✗ Önceki/Sonraki buton mantığı yok

HEDEF MİMARİ:
MebiWarRoom
├── WarRoomSetupScreen       (henüz başlamadıysa: konu/süre/zorluk seç)
├── WarRoomActiveScreen      (sınav ekranı)
│   ├── TopBar               (timer, mevcut soru, çıkış)
│   ├── QuestionPanel        (soru metni + görsel)
│   │   └── CanvasLayer      (useCanvasSync ile piksel-mükemmel)
│   ├── OptionsPanel         (store'dan selectedAnswer/eliminated oku)
│   └── QuestionNav          (soru numaraları, işaretleme)
└── WarRoomResultScreen      (bittiyse: skor, analiz, ELO değişimi)
```

### 4.2 `WarRoomSetupScreen` — Yeni Bileşen

```tsx
// src/components/warroom/WarRoomSetupScreen.tsx

interface SetupScreenProps {
  onStart: (opts: GenerateQuestionsOptions & { durationMinutes: number }) => void;
  isLoading: boolean;
  error: string | null;
  weakTopicsFromLogs: string[];
}

// Bileşen içeriği:
// - TYT / AYT seçimi
// - Konu seçimi (TYT_SUBJECTS / AYT_SUBJECTS'den)
// - Zorluk: Kolay / Orta / Zor / Elite
// - Süre: 15 / 30 / 45 / 60 dk
// - Soru sayısı: 5 / 10 / 20 / 40
// - "Zayıf Konulara Odaklan" toggle (log analizinden gelir)
// - Başlat butonu → isLoading spinner
```

### 4.3 `WarRoomResultScreen` — Yeni Bileşen

```tsx
// src/components/warroom/WarRoomResultScreen.tsx

// Gösterilecekler:
// - Toplam net (büyük font, ELO tarzı gösterim)
// - D / Y / B dağılımı
// - Her soru için: doğru/yanlış badge + doğru cevap + kısa analiz
// - ELO delta (+/- X puan)
// - "Tekrar Yap" butonu
// - "Koçla Analiz Et" butonu → chat'e gönderir
```

### 4.4 `QuestionNav` — Soru Gezinme Bileşeni

```tsx
// src/components/warroom/QuestionNav.tsx

// Her soru için küçük badge:
// - Gri: cevaplanmamış
// - Mavi: cevaplanmış
// - Sarı: işaretli (tereddütlü)
// - Kırmızı: tüm şıkları elenmiş ama boş bırakılmış

// Önceki / Sonraki butonları
// Tüm soruları cevapladıysa "Bitir" aktif olur
```

---

## 5. SORU BANKASI MİMARİSİ

### 5.1 Kısa Vadeli: AI Üretimi (warRoomService.ts) ✓

Yukarıda tanımlandı. Her oturum başında AI'dan taze sorular gelir.

### 5.2 Orta Vadeli: Yerel Soru Havuzu

```typescript
// src/data/questionBank.ts

export interface QuestionBankEntry extends WarRoomQuestion {
  tags: string[];
  usedCount: number;
  lastUsedAt?: string;
}

// constants.ts'deki TYT_SUBJECTS / AYT_SUBJECTS yapısına paralel
// Başlangıçta boş, her AI üretiminden sonra store'a kaydedilir
// Böylece kullanılan sorular tekrar gelmez
```

### 5.3 Uzun Vadeli: Supabase Entegrasyonu

```typescript
// Soru bankası Supabase'de saklanır
// Admin panelinden soru eklenebilir
// Kullanım istatistikleri tutulur
// Zorluk kalibrasyonu yapılır
```

---

## 6. TİMER — SESSION STORAGE İLE PERSIST

```typescript
// useWarRoom.ts içinde

// Sayfa yenilenince timer kaybolmasın diye:

const TIMER_KEY = 'war_room_timer_state';

// Session başlatırken:
sessionStorage.setItem(TIMER_KEY, JSON.stringify({
  sessionId: session.id,
  startedAt: Date.now(),
  durationSeconds: session.durationSeconds,
}));

// useEffect ile recovery:
useEffect(() => {
  const saved = sessionStorage.getItem(TIMER_KEY);
  if (!saved || !store.warRoomSession) return;

  const { sessionId, startedAt, durationSeconds } = JSON.parse(saved);
  if (sessionId !== store.warRoomSession.id) return;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const remaining = durationSeconds - elapsed;

  if (remaining > 0) {
    setTimeLeft(remaining);
  } else {
    finishSession();
  }
}, [store.warRoomSession?.id]);
```

---

## 7. UYGULAMA SIRASI (PRİORİTY QUEUE)

```
FAZ 1 — BUILD KIRAN HATALARI (Önce Bunlar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ appStore.ts'e warRoomMode, setWarRoomMode ekle
□ appStore.ts'e warRoomAnswers, warRoomEliminated ekle
□ appStore.ts'e setSelectedAnswer, toggleEliminatedOption ekle
□ appStore.ts'e warRoomSession, setWarRoomSession ekle
□ types/index.ts'e WarRoomQuestion, WarRoomSession, WarRoomResult ekle
□ OptionsPanel.tsx'i yeni store alanlarına bağla
□ TopBar.tsx ModeSwitcher'ı yeni store'a bağla
□ activeTab union type'ına 'war_room' ekle

FAZI TAMAMLAMA KRİTERİ: `tsc --noEmit` sıfır hata.

FAZI 2 — CANVAS SENKRONİZASYON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ useCanvasSync.ts hook'unu yaz
□ MebiWarRoom.tsx canvas'ını useCanvasSync'e bağla
□ OptionsPanel.tsx hardcoded boyutları kaldır
□ QuestionPanel.tsx CanvasLayer'ı düzelt
□ Gerçek silgi implementasyonu (undo bazlı)
□ Kalem / silgi / pointer geçiş animasyonu

FAZI TAMAMLAMA KRİTERİ: Farklı monitör boyutlarında kalem çizgisi
fare pozisyonuyla örtüşüyor.

FAZI 3 — VERİ AKIŞI
━━━━━━━━━━━━━━━━━━━
□ warRoomService.ts yaz
□ useWarRoom.ts hook'unu yaz
□ WarRoomSetupScreen bileşenini yaz
□ WarRoomResultScreen bileşenini yaz
□ QuestionNav bileşenini yaz
□ MebiWarRoom.tsx'i yeni hook'a bağla
□ Timer'ı sessionStorage ile persist et

FAZI TAMAMLAMA KRİTERİ: Gerçek YKS soruları üretiliyor,
cevaplar kaydediliyor, bitişte ELO güncelleniyor.

FAZI 4 — POLISH & EDGE CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ AI soru üretimi başarısız olursa fallback (offline sorular)
□ Oturum ortasında sekme kapanırsa recovery
□ Mobil dokunmatik çizim desteği (touch events)
□ Çizim export/kaydetme (PNG olarak indirme)
□ Koç analizi: bitişte otomatik chat mesajı
```

---

## 8. DOĞRULAMA KRİTERLERİ

Her fazı teslim almadan önce kontrol listesi:

```
FAZI 1:
[ ] npx tsc --noEmit → 0 hata
[ ] War Room'a giriş yapılabiliyor
[ ] Şık seçimi store'a yazılıyor

FAZI 2:
[ ] 1920x1080 monitörde kalem tam konumda çiziyor
[ ] 375x812 (iPhone) simülatöründe kalem tam konumda çiziyor
[ ] Pencere yeniden boyutlandırılınca canvas güncelleniyor
[ ] "Sil" butonu tüm çizimleri temizliyor

FAZI 3:
[ ] "Başlat" sonrası 5+ gerçek soru geliyor
[ ] Her soruya cevap seçilebiliyor
[ ] Şık eleme sağ tık ile çalışıyor
[ ] Süre dolduğunda otomatik bitiyor
[ ] Sonuç ekranı doğru net gösteriyor
[ ] ELO store'da güncelleniyor
[ ] Log geçmişine War Room seansı ekleniyor

FAZI 4:
[ ] Sayfa yenilenince timer kaldığı yerden devam ediyor
[ ] AI cevap vermezse "Tekrar dene" mesajı görünüyor
[ ] Mobilde parmakla çizim çalışıyor
```

---

## 9. DOSYA DEĞİŞİKLİK MATRİSİ

| Dosya | İşlem | Not |
|---|---|---|
| `src/types/index.ts` | MODIFY | WarRoomQuestion, WarRoomSession, WarRoomResult ekle |
| `src/store/appStore.ts` | MODIFY | War room state slice ekle (Bölüm 1) |
| `src/hooks/useCanvasSync.ts` | CREATE | ResizeObserver tabanlı canvas boyut yönetimi |
| `src/hooks/useWarRoom.ts` | CREATE | Sınav mantığı, timer, skor hesabı |
| `src/services/warRoomService.ts` | CREATE | AI soru üretimi, skorlama |
| `src/components/MebiWarRoom.tsx` | REWRITE | Hook'lara bağla, mock'u kaldır |
| `src/components/warroom/TopBar.tsx` | MODIFY | store.warRoomMode düzelt |
| `src/components/warroom/OptionsPanel.tsx` | MODIFY | store alanlarını düzelt, hardcoded boyut kaldır |
| `src/components/warroom/QuestionPanel.tsx` | MODIFY | CanvasLayer koordinat fix |
| `src/components/warroom/WarRoomSetupScreen.tsx` | CREATE | Konu/süre/zorluk seçimi |
| `src/components/warroom/WarRoomResultScreen.tsx` | CREATE | Skor, analiz, ELO |
| `src/components/warroom/QuestionNav.tsx` | CREATE | Soru navigasyonu |
| `src/App.tsx` | MODIFY | activeTab union'a 'war_room' ekle |

---

*Son güncelleme: v1.0 — War Room tam mimari, Canvas senkronizasyon,
AI soru üretimi, Timer persist, Skorlama sistemi*