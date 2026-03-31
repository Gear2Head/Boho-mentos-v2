# 🛠️ BOHO MENTOSLUK — GELİŞTİRME SPRINT PROMPTU v3.0
## Kodename: OPERATION FULL CLEAN + FEATURE PUSH
### Önceki sprintlerde yapılanlar dışındaki tüm açık sorunlar ve yeni özellikler

---

## 🔴 BÖLÜM A — KRİTİK: MEVCUT TypeScript / Runtime Hataları

### A1 — `src/components/warroom/QuestionNav.tsx` — `motion` Import Hatası

**Sorun:** `motion` Framer-motion'dan import ediliyor ama `motion/react` paketi kullanılıyor. `motion.div` ile `layoutId` prop'u TypeScript'te tip uyuşmazlığı var.

**Dosya:** `src/components/warroom/QuestionNav.tsx`

**Yapılacak:**
```typescript
// MEVCUT (hatalı):
import { motion } from 'framer-motion'; // veya tanımsız motion kullanımı

// YENİ — motion/react'ten al:
import { motion } from 'motion/react';

// layoutId kullanımında tip cast ekle:
<motion.div layoutId="selRing" className="absolute -inset-1 rounded-[1.4rem] border-2 border-[#C17767]/30" />
// Bu satırı ayrı bir conditional içine al:
{isSelected && (
  <motion.div 
    layoutId="selRing" 
    className="absolute -inset-1 rounded-[1.4rem] border-2 border-[#C17767]/30"
    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
  />
)}
```

---

### A2 — `src/components/warroom/WarRoomResultScreen.tsx` — `Zap` Import Eksik

**Sorun:** `<Zap size={24} />` kullanılıyor ama `Zap` import satırında yok.

**Dosya:** `src/components/warroom/WarRoomResultScreen.tsx`

**Yapılacak:**
```typescript
// MEVCUT:
import { Target, CheckCircle2, XCircle, Clock, Home, ArrowRight } from 'lucide-react';

// YENİ — Zap ekle:
import { Target, CheckCircle2, XCircle, Clock, Home, ArrowRight, Zap } from 'lucide-react';
```

---

### A3 — `src/main.tsx` — `store` Referansı `MobileMenuModal` İçinde Tanımsız

**Sorun:** `App.tsx` içindeki `MobileMenuModal` bileşeninde `store.signOut()` çağrısı var ama `store` bu bileşenin scope'unda tanımsız. `useAppStore` hook'u çağrılmamış.

**Dosya:** `src/App.tsx` → `MobileMenuModal` bileşeni

**Yapılacak:**
```typescript
// MobileMenuModal içine ekle:
const MobileMenuModal = ({ isOpen, onClose, activeTab, onNavigate }: any) => {
  const store = useAppStore(); // ← BU SATIR EKSİK — ekle
  
  // ... geri kalan kod aynı kalır
};
```

---

### A4 — `src/services/firebase.ts` — Env Variable Typing

**Sorun:** `import.meta.env.VITE_FIREBASE_*` değişkenleri TypeScript'te `string | undefined` tipinde ama Firebase `initializeApp` `string` istiyor. Build'de hata verebilir.

**Dosya:** `src/services/firebase.ts`

**Yapılacak:**
```typescript
// MEVCUT:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...
};

// YENİ — null coalescing ile güvenli hale getir:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

// Tip tanımı için vite-env.d.ts dosyasını da güncelle:
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly GEMINI_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

### A5 — `src/store/appStore.ts` — `signOut` Metodu Eksik

**Sorun:** `App.tsx` içinde `store.signOut()` çağrısı var ama `AppState` interface'inde ve store implementasyonunda `signOut` metodu tanımlı değil.

**Dosya:** `src/store/appStore.ts`

**Yapılacak:**
```typescript
// AppState interface'ine ekle:
interface AppState {
  // ... mevcut alanlar
  signOut: () => void; // ← YENİ
}

// Store implementation'a ekle:
signOut: () => {
  // Firebase signOut useAuth hook üzerinden yapılıyor
  // Bu sadece local state'i temizler
  set(INITIAL_STATE);
},
```

---

### A6 — `src/types/index.ts` — `FailedQuestion` `status` Tip Uyuşmazlığı

**Sorun:** `addFailedQuestion` içinde `status: 'active'` set ediliyor ama `FailedQuestion` tipinde `status` alanı `'active' | 'solved'` olarak tanımlanmamış. Ayrıca `solveCount` ve `difficulty` zorunlu alan ama input'ta eksik.

**Dosya:** `src/types/index.ts`

**Yapılacak:**
```typescript
// MEVCUT — eksik tipler:
export interface FailedQuestion {
  id: string;
  date: string;
  subject: string;
  topic: string;
  book: string;
  page: string;
  questionNumber: string;
  reason: string;
  // status, solveCount, difficulty eksik!
}

// YENİ — tam tip:
export interface FailedQuestion {
  id: string;
  date: string;
  subject: string;
  topic: string;
  book: string;
  page: string;
  questionNumber: string;
  reason: string;
  status: 'active' | 'solved';           // ← EKLE
  solveCount: number;                      // ← EKLE
  difficulty: 'easy' | 'medium' | 'hard'; // ← EKLE
  imageUrl?: string;
}
```

---

### A7 — `src/components/warroom/OptionsPanel.tsx` — Store Method Eksiklikleri

**Sorun:** `selectedAnswer`, `eliminatedOptions`, `toggleEliminatedOption`, `setSelectedAnswer` store'da bu isimlerle yok. Store'da farklı isimler kullanılıyor (`warRoomAnswers`, `warRoomEliminated`, `updateWarRoomAnswer`, `toggleEliminatedOption`).

**Dosya:** `src/components/warroom/OptionsPanel.tsx`

**Yapılacak:**
```typescript
// MEVCUT (hatalı — bu metodlar store'da yok):
const { selectedAnswer, eliminatedOptions, toggleEliminatedOption, setSelectedAnswer } = store;

// YENİ — doğru store metodları:
// Bu bileşen bir currentQuestionId prop'u almalı
interface OptionsPanelProps {
  options: string[];
  currentQuestionId: string;
}

export function OptionsPanel({ options, currentQuestionId }: OptionsPanelProps) {
  const store = useAppStore();
  const selectedAnswer = store.warRoomAnswers[currentQuestionId] ?? '';
  const eliminatedOptions = store.warRoomEliminated[currentQuestionId] ?? [];
  
  const handleSelect = (letter: string) => {
    store.updateWarRoomAnswer(currentQuestionId, 
      selectedAnswer === letter ? '' : letter
    );
  };
  
  const handleEliminate = (idx: number) => {
    store.toggleEliminatedOption(currentQuestionId, idx);
  };
  
  // ... geri kalan render mantığı aynı
}
```

---

### A8 — `src/hooks/useWarRoom.ts` — `addLog` Parametre Tipi

**Sorun:** `useWarRoom.ts` içinde `store.addLog(...)` çağrısında `DailyLog` tipine uymayan eksik alanlar var (örneğin `tags` zorunlu ama verilmiyor).

**Dosya:** `src/hooks/useWarRoom.ts`

**Yapılacak:**
```typescript
// MEVCUT (eksik alanlar):
store.addLog({
  date: new Date().toLocaleDateString('tr-TR'),
  subject: warRoomSession.examType + ' Savaş Odası',
  topic: warRoomSession.questions[0]?.topic || 'Karma',
  questions: warRoomSession.questions.length,
  correct,
  wrong,
  empty,
  fatigue: 0,
  avgTime: 1,
  notes: 'War Room simülasyonu.'
});

// YENİ — tüm zorunlu alanlar tam:
store.addLog({
  id: `warroom_${Date.now()}`,
  date: new Date().toISOString(),
  subject: warRoomSession.examType + ' Savaş Odası',
  topic: warRoomSession.questions[0]?.topic ?? 'Karma',
  questions: warRoomSession.questions.length,
  correct,
  wrong,
  empty,
  fatigue: 0,
  avgTime: 1,
  tags: ['#SAVAŞ_ODASI'],    // ← zorunlu alan
  notes: 'War Room simülasyonu.',
  sourceName: 'War Room AI',
});
```

---

## 🟠 BÖLÜM B — UX / UI SORUNLARI

### B1 — Sayfa Geçişlerinde Scroll Pozisyonu Sıfırlanmıyor

**Sorun:** Tab değiştirildiğinde scroll pozisyonu üstte değil, önceki pozisyonda kalıyor. Özellikle mobilde rahatsız edici.

**Dosya:** `src/App.tsx`

**Yapılacak:**
```typescript
// activeTab değiştiğinde scroll'u sıfırla:
useEffect(() => {
  // main container'ı bul ve scroll'u sıfırla
  const mainEl = document.querySelector('main');
  if (mainEl) {
    mainEl.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}, [activeTab]);
```

---

### B2 — Mobil Alt Nav'da Aktif Tab Göstergesi Çalışmıyor

**Sorun:** Bazı tab'lar `mobileVisible: false` olduğu için mobil alt nav'da görünmüyor, ama "Daha Fazla" menüsünden seçildiğinde alt nav'daki aktif tab göstergesi güncellenmiyor.

**Dosya:** `src/components/NavItem.tsx` ve `src/App.tsx`

**Yapılacak:**
```typescript
// MobileMenuModal'da seçim yapıldığında activeTab güncellendiğini doğrula.
// NavItem bileşenindeki active prop karşılaştırması zaten var ama
// mobileVisible:false olan item'lar render edilmediği için görünmüyor.
// Çözüm: Aktif tab mobil nav dışında ise bir "breadcrumb" göster.

// App.tsx header'ına ekle:
{!NAV_ITEMS.find(i => i.id === activeTab)?.mobileVisible && (
  <div className="md:hidden flex items-center gap-2 px-4 py-1 bg-[#C17767]/10 border-b border-[#C17767]/20">
    <span className="text-[10px] uppercase tracking-widest font-bold text-[#C17767]">
      {NAV_ITEMS.find(i => i.id === activeTab)?.label ?? activeTab}
    </span>
  </div>
)}
```

---

### B3 — Dark Mode Flash (FOUC) index.html'de Düzeltilmeli

**Sorun:** `index.html` içindeki inline script dark mode ekliyor ama store'dan okumuyor. İlk yüklemede ışık hızında bir beyaz flash oluyor.

**Dosya:** `index.html`

**Yapılacak:**
```html
<!-- MEVCUT: -->
<script>
  (function() {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#0A0A0A';
  })();
</script>

<!-- YENİ — localStorage'dan oku, yoksa dark varsayılan: -->
<script>
  (function() {
    try {
      // Zustand IDB storage'dan okumak async, bu sync script
      // localStorage'da tema bilgisi tutulabilir (ayrıca):
      var storedTheme = localStorage.getItem('boho_theme') || 'dark';
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = '#0A0A0A';
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.style.backgroundColor = '#F9F8F6';
        document.documentElement.style.colorScheme = 'light';
      }
    } catch(e) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

`src/store/appStore.ts` `setTheme` metoduna da ekle:
```typescript
setTheme: (theme) => {
  set({ theme });
  localStorage.setItem('boho_theme', theme); // ← Flash önleme için sync yaz
  // ... mevcut DOM manipülasyonu kodu
},
```

---

### B4 — `ExamDetailModal` Dark Mode Renkleri Hardcoded

**Sorun:** `ExamDetailModal.tsx` içinde tüm renkler `#1A1A1A`, `#2A2A2A` gibi hardcode dark renkler. Light mode'a geçildiğinde modal tamamen siyah görünüyor.

**Dosya:** `src/components/ExamDetailModal.tsx`

**Yapılacak:**
```typescript
// Tüm hardcode dark renkleri semantic class'larla değiştir:
// #1A1A1A → bg-surface dark:bg-[#1A1A1A]  veya bg-[#FFFFFF] dark:bg-zinc-900
// #2A2A2A → border-[#EAE6DF] dark:border-zinc-800
// text-zinc-200 → text-[#4A443C] dark:text-zinc-200
// bg-[#121212] → bg-[#F5F2EB] dark:bg-zinc-950

// Modal container:
<div className="bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#EAE6DF] dark:border-[#2A2A2A] ...">
```

---

### B5 — `ProfileSettings.tsx` Form Submit Sonrası Feedback Yok

**Sorun:** Profil kaydedildiğinde sessizce geçiyor. Kullanıcıya "kaydedildi" onayı gelmiyor.

**Dosya:** `src/components/forms/ProfileSettings.tsx`

**Yapılacak:**
```typescript
// State ekle:
const [saved, setSaved] = useState(false);

// handleSubmit'e ekle:
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSubmit({ /* ... */ });
  setSaved(true);
  setTimeout(() => setSaved(false), 3000);
};

// Butonun yanına toast/badge ekle:
<button type="submit" className="...">
  {saved ? (
    <><CheckCircle2 size={18} className="text-green-400" /> Kaydedildi!</>
  ) : (
    <><Save size={18} /> {isEditMode ? 'DEĞİŞİKLİKLERİ KAYDET' : 'HEDEFİ KİLİTLE VE BAŞLA'}</>
  )}
</button>
```

---

### B6 — War Room'da Soru Metni Seçilebilir (Sınav Deneyimi Bozuluyor)

**Sorun:** `MebiWarRoom.tsx` içinde soru metni `select-none` class'ı var ama bazı container'larda eksik. Kullanıcı metni yanlışlıkla seçip sürükleyebiliyor.

**Dosya:** `src/components/MebiWarRoom.tsx`

**Yapılacak:**
```typescript
// Soru container'ına ekle:
<div className="absolute inset-x-0 top-0 bottom-24 p-6 md:p-12 overflow-y-auto 
  pointer-events-none custom-scrollbar select-none user-select-none">
  
// Ve CSS'e ekle (index.css):
.war-room-content {
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
```

---

### B7 — `AgendaPage` Tarih Formatı Tutarsızlığı

**Sorun:** `new Date(e.date).toLocaleString('tr-TR')` bazen `"Invalid Date"` döndürüyor çünkü `e.date` ISO string değil, locale string olarak kaydedilmiş olabilir.

**Dosya:** `src/components/AgendaPage.tsx`

**Yapılacak:**
```typescript
// Güvenli tarih formatlama helper ekle:
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Parse edilemezse ham string döndür
    return date.toLocaleString('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

// Kullanım:
<div className="text-[10px] uppercase tracking-widest opacity-50 ...">
  {formatDate(e.date)}
</div>
```

---

## 🟡 BÖLÜM C — PERFORMANS VE GÜVENİLİRLİK

### C1 — `useFocusTimer` LocalStorage'a Çok Sık Yazıyor

**Sorun:** `useFocusTimer.ts` içinde `sessionSeconds` her saniye değiştiğinde `localStorage.setItem` çağrılıyor. Bu hem performans hem de storage throttle sorunu.

**Dosya:** `src/hooks/useFocusTimer.ts`

**Yapılacak:**
```typescript
// Debounce ile sadece 5 saniyede bir yaz:
const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => {
    localStorage.setItem('yks_focus_timer', JSON.stringify({ sessionSeconds, laps, mode }));
  }, 5000); // 5 saniyede bir yaz
  
  return () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  };
}, [sessionSeconds, laps, mode]);
```

---

### C2 — `appStore.ts` Persist Her Değişimde Büyük JSON Yazıyor

**Sorun:** `chatHistory`, `logs`, `exams`, `tytSubjects` hepsi aynı persist key altında. Her küçük değişimde (örn. her saniye timer tick) tüm store IDB'ye yazılıyor.

**Dosya:** `src/store/appStore.ts`

**Yapılacak:**
```typescript
// Persist partials — sadece kalıcı olması gereken alanları persist et:
persist(
  (set, get) => ({ ... }),
  {
    name: 'yks_coach_storage',
    storage: createJSONStorage(() => idbStorage),
    // Sadece bu alanları persist et, runtime state'leri hariç tut:
    partialize: (state) => ({
      profile: state.profile,
      tytSubjects: state.tytSubjects,
      aytSubjects: state.aytSubjects,
      logs: state.logs,
      exams: state.exams,
      failedQuestions: state.failedQuestions,
      trophies: state.trophies,
      eloScore: state.eloScore,
      streakDays: state.streakDays,
      agendaEntries: state.agendaEntries,
      theme: state.theme,
      subjectViewMode: state.subjectViewMode,
      // chatHistory hariç — çok büyüyor
      // focusSessions hariç — timer hook kendi yönetiyor
      // warRoomSession hariç — session geçici
    }),
  }
)
```

---

### C3 — `getCoachResponse` Her Çağrıda Tüm Store'u Gönderme

**Sorun:** `src/services/gemini.ts` içinde `userState` olarak tüm store (logs, exams, subjects...) API'ye gönderiliyor. Bu hem büyük payload hem de gizlilik riski.

**Dosya:** `src/services/gemini.ts`

**Yapılacak:**
```typescript
// Store'un sadece gerekli özetini gönder:
userState: options?.userState || {
  profile: {
    name: store.profile?.name,
    track: store.profile?.track,
    tytTarget: store.profile?.tytTarget,
    aytTarget: store.profile?.aytTarget,
    targetUniversity: store.profile?.targetUniversity,
    coachPersonality: store.profile?.coachPersonality,
  },
  eloScore: store.eloScore,
  streakDays: store.streakDays,
  // Sadece son 5 log — tüm geçmiş değil
  logs: store.logs.slice(-5).map(l => ({
    subject: l.subject, topic: l.topic,
    correct: l.correct, wrong: l.wrong,
    questions: l.questions, fatigue: l.fatigue,
    date: l.date
  })),
  // Sadece son 3 sınav
  exams: store.exams.slice(-3),
  // Sadece aktif olmayan konular (kısa özet)
  pendingTopics: [
    ...store.tytSubjects.filter(s => s.status === 'not-started').slice(0, 10).map(s => s.name),
    ...store.aytSubjects.filter(s => s.status === 'not-started').slice(0, 5).map(s => s.name),
  ],
  activeAlerts: store.activeAlerts.slice(0, 3),
}
```

---

### C4 — `MorningBlocker` Her Gün Aynı Soruyu Gösteriyor

**Sorun:** `MorningBlocker.tsx` içinde soru hardcode. `mathQuestion` değişmiyor. `localStorage.getItem('yks_solved_morning')` mantığı da bugünün tarihini karşılaştırıyor ama zaman dilimi farkı sorun çıkarabilir.

**Dosya:** `src/components/MorningBlocker.tsx`

**Yapılacak:**
```typescript
// Soru havuzu ekle — her gün farklı soru:
const MORNING_QUESTIONS = [
  {
    topic: 'Trigonometri',
    expression: "|AB|^2 = (\\cos x - \\cos y)^2 + (\\sin x - \\sin y)^2",
    questionStr: "Buna göre x değerinin sinüsü nedir?",
    correctAnswer: "0.5",
    hints: ["1. İpucu: Tam kare açılımı yap.", "2. İpucu: sin²x + cos²x = 1", "3. İpucu: sin2x = 0.75"]
  },
  {
    topic: 'Olasılık',
    expression: "P(A \\cup B) = P(A) + P(B) - P(A \\cap B)",
    questionStr: "P(A)=0.4, P(B)=0.3, P(A∩B)=0.1 ise P(A∪B) nedir?",
    correctAnswer: "0.6",
    hints: ["Formülü doğrudan uygula.", "0.4 + 0.3 - 0.1", "Sonuç tam sayı değil ondalık."]
  },
  // Daha fazla soru eklenebilir...
];

// Günün sorusunu seç (tarih hash ile):
const getDayQuestion = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MORNING_QUESTIONS[dayOfYear % MORNING_QUESTIONS.length];
};
```

---

### C5 — `syncQueue.ts` `window` SSR Guard Eksik

**Sorun:** `src/utils/syncQueue.ts` dosyasının sonunda `window.addEventListener('online', processSyncQueue)` var ama bu kod module load'da çalışıyor. Server-side render veya test ortamında `window` tanımsız olursa crash.

**Dosya:** `src/utils/syncQueue.ts`

**Yapılacak:**
```typescript
// MEVCUT (crash riski):
window.addEventListener('online', processSyncQueue);

// YENİ — guard ekle:
if (typeof window !== 'undefined') {
  window.addEventListener('online', processSyncQueue);
  // Sayfa açıldığında da çalıştır (pending işlemler varsa):
  if (document.readyState === 'complete') {
    processSyncQueue();
  } else {
    window.addEventListener('load', processSyncQueue, { once: true });
  }
}
```

---

## 🟢 BÖLÜM D — YENİ ÖZELLİKLER (Henüz yapılmamış)

### D1 — Koç Chat Geçmişini Temizle Butonu

**Sorun/İstek:** `chatHistory` büyüdükçe store şişiyor ve eski irrelevant mesajlar AI context'e giriyor.

**Dosya:** `src/App.tsx` (coach tab'ı)

**Yapılacak:**
```typescript
// Coach tab'ının sohbet alanı üst kısmına ekle:
<div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] bg-[#1A1A1A]">
  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
    {store.chatHistory.length} Mesaj
  </span>
  <button
    onClick={() => {
      if (window.confirm('Sohbet geçmişi silinecek. Emin misin?')) {
        store.clearChatHistory();
      }
    }}
    className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
  >
    <Trash2 size={12} /> Geçmişi Temizle
  </button>
</div>

// appStore.ts'e metod ekle:
clearChatHistory: () => set({ chatHistory: [] }),
```

---

### D2 — Log Giriş Formu: Önceki Girişlerden Otomatik Doldurma

**İstek:** Aynı ders/konuyu tekrar girerken önceki değerleri (kaynak, soru sayısı) hatırlasın.

**Dosya:** `src/components/forms/LogEntryWidget.tsx`

**Yapılacak:**
```typescript
// Store'dan son log'u okuyup form'u prefill et:
const { logs } = useAppStore();

// Ders seçildiğinde son log'dan kaynak öner:
const handleSubjectChange = (newSubject: string) => {
  setSubject(newSubject);
  setTopic('');
  
  // O derse ait son log'dan kaynak öner:
  const lastLogForSubject = logs
    .filter(l => l.subject.includes(newSubject))
    .slice(-1)[0];
    
  if (lastLogForSubject?.sourceName) {
    setSourceName(lastLogForSubject.sourceName);
  }
};

// En çok kullanılan kaynakları dropdown olarak sun:
const topSources = useMemo(() => {
  const counts = logs.reduce((acc: Record<string, number>, l) => {
    if (l.sourceName) acc[l.sourceName] = (acc[l.sourceName] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
}, [logs]);
```

---

### D3 — Deneme Giriş Modalında Not Alanı

**İstek:** Denemeye not ekleyebilmek (örn. "Dikkat eksikliğiyle çözdüm", "Yorgundum").

**Dosya:** `src/components/forms/ExamEntryModal.tsx`

**Yapılacak:**
```typescript
// State ekle:
const [note, setNote] = useState('');

// Form'a ekle:
<div className="mt-4">
  <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] block mb-2">
    Not (opsiyonel)
  </label>
  <input
    type="text"
    placeholder="Örn: Sabah yorgunken çözdüm, süreli değildi..."
    value={note}
    onChange={e => setNote(e.target.value)}
    className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-sm text-zinc-200 focus:border-[#C17767] outline-none"
  />
</div>

// Submit'e ekle:
onSave({
  // ... mevcut alanlar
  note: note.trim() || undefined,
});
```

---

### D4 — Mezarlık: Soru Fotoğrafı Yükleme

**İstek:** Hatalı sorunun fotoğrafını mezarlık kartına ekleyebilmek.

**Dosya:** `src/App.tsx` (ArchiveWidget) ve `src/types/index.ts`

**Yapılacak:**
```typescript
// ArchiveWidget içine foto yükleme ekle:
const [questionImage, setQuestionImage] = useState<string | undefined>();

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { alert('Max 3MB'); return; }
  
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    // Compress to ~800px
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(800 / img.width, 800 / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setQuestionImage(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
};

// Mezarlık kartında göster:
{q.imageUrl && (
  <img 
    src={q.imageUrl} 
    alt="Soru görseli" 
    className="w-full rounded-xl mt-3 border border-[#2A2A2A] cursor-pointer"
    onClick={() => window.open(q.imageUrl, '_blank')}
  />
)}
```

---

### D5 — Odak Zamanlayıcısı Tarayıcı Sekmesi Başlığına Süre Yaz

**İstek:** Odak modu aktifken tarayıcı sekmesinde süreyi göster.

**Dosya:** `src/hooks/useFocusTimer.ts`

**Yapılacak:**
```typescript
// Timer çalışırken document title'ı güncelle:
useEffect(() => {
  const originalTitle = document.title;
  
  if (isRunning) {
    document.title = `⏱ ${formatTime(sessionSeconds)} — Boho Mentosluk`;
  } else {
    document.title = originalTitle;
  }
  
  return () => {
    document.title = 'Boho Mentosluk';
  };
}, [isRunning, sessionSeconds]);
```

---

### D6 — Müfredat Haritasında Toplu Durum Güncelleme

**İstek:** Bir dersin tüm konularını tek tıkla "Başladım" veya "Bitti" yapabilmek.

**Dosya:** `src/App.tsx` (SubjectMap ve SubjectList bileşenleri) ve `src/store/appStore.ts`

**Yapılacak:**
```typescript
// appStore.ts'e toplu güncelleme metodları ekle:
interface AppState {
  bulkUpdateTytSubjectsByGroup: (subjectGroup: string, status: SubjectStatusType) => void;
  bulkUpdateAytSubjectsByGroup: (subjectGroup: string, status: SubjectStatusType) => void;
}

// Implementation:
bulkUpdateTytSubjectsByGroup: (subjectGroup, status) => set((state) => ({
  tytSubjects: state.tytSubjects.map(s => 
    s.subject === subjectGroup ? { ...s, status } : s
  )
})),

// SubjectMap içinde ders başlığına buton ekle:
<div className="flex items-center gap-3 mb-4">
  <h4 className="font-display italic text-xl ...">{province} Eyaleti</h4>
  <div className="flex gap-1 ml-auto">
    <button
      onClick={() => onBulkUpdate(province, 'in-progress')}
      className="text-[9px] px-2 py-1 bg-blue-900/20 text-blue-400 rounded border border-blue-900/30 font-bold uppercase"
    >
      Hepsini Başlat
    </button>
    <button
      onClick={() => onBulkUpdate(province, 'mastered')}
      className="text-[9px] px-2 py-1 bg-green-900/20 text-green-400 rounded border border-green-900/30 font-bold uppercase"
    >
      Hepsini Bitir
    </button>
  </div>
</div>
```

---

### D7 — Koç Ekranında Hızlı Komut Şablonları (Command Palette)

**İstek:** Kullanıcının sıfırdan yazmak yerine hazır komutları tıklayarak gönderebileceği bir palette.

**Dosya:** `src/App.tsx` (coach tab)

**Yapılacak:**
```typescript
// Hazır komutlar:
const QUICK_COMMANDS = [
  { label: '📋 Plan Oluştur', cmd: 'Bugün için detaylı plan oluştur' },
  { label: '📊 Log Analiz', cmd: 'ANALİZ ET' },
  { label: '📈 Deneme Özeti', cmd: 'Son denemelerimi analiz et' },
  { label: '⚠️ Zayıf Noktalar', cmd: 'En zayıf konularımı ve kaynaklarımı listele' },
  { label: '🎯 Haftalık Plan', cmd: 'Bu hafta için 7 günlük savaş planı hazırla' },
  { label: '🔥 Panik Modu', cmd: 'Sınava az kaldı, önceliklendirme yap' },
];

// Hızlı komut butonları — mevcut butonların altına:
<div className="flex flex-wrap gap-2 mb-3">
  {QUICK_COMMANDS.map((qc) => (
    <button
      key={qc.cmd}
      onClick={() => handleSendMessage(undefined, qc.cmd)}
      disabled={isTyping}
      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-zinc-700 disabled:opacity-40"
    >
      {qc.label}
    </button>
  ))}
</div>
```

---

### D8 — ELO Skoru Geçmişi Grafiği

**İstek:** ELO skorunun zaman içindeki değişimini görmek.

**Dosya:** `src/components/EloRankCard.tsx` veya yeni `src/components/EloHistory.tsx`

**Yapılacak:**
```typescript
// appStore'a ELO geçmişi ekle:
interface AppState {
  eloHistory: Array<{ date: string; elo: number; reason: string }>;
}

// addElo çağrıldığında kayıt tut:
addElo: (amount, reason = '') => set((state) => ({
  eloScore: state.eloScore + amount,
  eloHistory: [
    ...state.eloHistory.slice(-30), // Son 30 kayıt tut
    {
      date: new Date().toISOString(),
      elo: state.eloScore + amount,
      reason
    }
  ]
})),

// EloRankCard veya profil sayfasında mini grafik:
<ResponsiveContainer width="100%" height={80}>
  <LineChart data={store.eloHistory.slice(-14)}>
    <Line type="monotone" dataKey="elo" stroke="#C17767" strokeWidth={2} dot={false} />
    <Tooltip contentStyle={{ background: '#121212', border: 'none', fontSize: 10 }} />
  </LineChart>
</ResponsiveContainer>
```

---

## 🔵 BÖLÜM E — GÜVENLİK VE VERİ KORUMASI

### E1 — `supabaseClient.ts` API Key Açıkta

**Sorun:** `src/services/supabaseClient.ts` içinde Supabase URL ve anon key doğrudan dosyada yazılı.

**Dosya:** `src/services/supabaseClient.ts`

**Yapılacak:**
```typescript
// MEVCUT (güvensiz):
const supabaseUrl = 'https://vixfopnlglccfefnaupm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qmkn2oOTM3pCuaOedrq9XQ_8WFkJJXG';

// YENİ — env değişkenlerine taşı:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// .env.local'e ekle (git'e commit etme!):
// VITE_SUPABASE_URL=https://vixfopnlglccfefnaupm.supabase.co
// VITE_SUPABASE_ANON_KEY=sb_publishable_...

// .gitignore'a ekle:
// .env.local
// .env*.local
```

---

### E2 — `firestore.rules` — `userData` Subcollections Kuralı Güçlendir

**Sorun:** Mevcut `userData/{userId}` kuralı `{subcollections=**}` ile tüm alt koleksiyonlara erişim veriyor. Bu çok geniş.

**Dosya:** `firestore.rules`

**Yapılacak:**
```javascript
// YENİ kural yapısı — daha granüler:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Super Admin — her şeye erişim
    match /{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == "9z9OAxBXsFU3oPT8AqIxnDSfzNy2";
    }
    
    // Kullanıcı profili
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Kullanıcı verileri — sadece kendi UID'sine
    match /userData/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId
        // Rate limit: 100 write/dakika (production'da Cloud Functions ile enforce et)
        && request.resource.size() < 2097152; // 2MB limit per write
    }
    
    // Admin logları
    match /adminLogs/{logId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == "9z9OAxBXsFU3oPT8AqIxnDSfzNy2";
    }
    
    // Sistem meta
    match /system/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Sadece Cloud Functions yazabilir
    }
  }
}
```

---

### E3 — `api/ai.ts` Rate Limit IP Bazlı Artırılmalı

**Sorun:** Mevcut rate limit `Map<string, {count, windowStart}>` şeklinde bellekte tutuluyor. Serverless function'lar stateless olduğu için farklı instance'lar arasında paylaşılmıyor.

**Dosya:** `api/ai.ts`

**Yapılacak:**
```typescript
// KV store (Vercel KV veya Upstash Redis) yoksa en azından
// header bazlı rate limit ekle ve daha sıkı kural koy:

// Request'e Vercel'in eklediği rate limit header'larını kontrol et:
const rateLimitHeader = req.headers['x-ratelimit-limit'];
const rateLimitRemaining = req.headers['x-ratelimit-remaining'];

// Basit çözüm: Her istekte min/max token kontrolü yap:
const maxTokensSafe = Math.min(
  typeof body.maxTokens === 'number' ? body.maxTokens : 1000,
  1500 // Mutlak maksimum — büyük israfı önle
);

// User message uzunluğu kontrolü:
if (userMessage.length > 5000) {
  res.statusCode = 400;
  res.end(JSON.stringify({ error: 'MESSAGE_TOO_LONG' }));
  return;
}
```

---

## ✅ UYGULAMA ÖNCELİK SIRASI

```
KRİTİK (hemen yap — runtime crash önler):
□ A1 — QuestionNav motion import
□ A2 — WarRoomResultScreen Zap import
□ A3 — MobileMenuModal store referansı
□ A5 — appStore signOut metodu

YÜKSEK (bu sprint içinde):
□ A4 — Firebase env typing
□ A6 — FailedQuestion tip düzeltmesi
□ A7 — OptionsPanel store metodları
□ A8 — useWarRoom addLog parametreleri
□ B1 — Sayfa geçişi scroll sıfırlama
□ B3 — Dark mode flash (FOUC)
□ B4 — ExamDetailModal dark mode
□ C1 — useFocusTimer localStorage debounce
□ C2 — appStore persist partialize
□ C5 — syncQueue SSR guard

ORTA (sonraki sprint):
□ B2 — Mobil aktif tab breadcrumb
□ B5 — ProfileSettings kayıt feedback
□ B6 — War Room select-none
□ B7 — Agenda tarih format güvenliği
□ C3 — getCoachResponse payload küçültme
□ C4 — MorningBlocker soru çeşitlendirme
□ E1 — Supabase key env'e taşı
□ E2 — Firestore rules güçlendir

YENİ ÖZELLİK (backlog):
□ D1 — Chat geçmiş temizle butonu
□ D2 — Log form otomatik doldurma
□ D3 — Deneme not alanı
□ D4 — Mezarlık fotoğraf yükleme
□ D5 — Timer sekme başlığı
□ D6 — Müfredat toplu güncelleme
□ D7 — Koç komut palette
□ D8 — ELO geçmiş grafiği
□ E3 — API rate limit güçlendir
```

---

*Sprint Promptu v3.0 — Boho Mentosluk Operation Full Clean + Feature Push*
*Önceki sprintlerde (Faz 1–5, 16–24) yapılanlardan bağımsız, tümü yeni maddeler.*




