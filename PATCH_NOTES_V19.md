# BOHO MENTOSLUK V19 PATCH NOTES
## Dosya: PATCH_NOTES_V19.md
## Tarih: 2026-04-05

Bu dosya, doğrudan overwrite yapılamayacak kadar büyük dosyalar için
patch direktiflerini içerir. AI coding session'da uygulanacak.

---

## 1. package.json — BUILD-005 (Windows-safe clean)

**BULMAK:**
```json
"clean": "rm -rf dist",
```

**DEĞIŞTIRMEK:**
```json
"clean": "node -e \"const fs=require('fs');fs.rmSync('dist',{recursive:true,force:true});\"",
```

---

## 2. src/store/appStore.ts — COACH-006, SYNC-010

### 2a. INITIAL_STATE'e yeni alanlar ekle:

**Mevcut INITIAL_STATE bloğunun sonuna ekle:**
```typescript
// V19: Directive history ve coach memory
directiveHistory: [] as import('../services/directiveHistory').DirectiveRecord[],  // wait, import from types
coachMemory: null as import('../types/coach').CoachMemory | null,
```

**Tipler için AppState interface'e ekle (isSyncing'in hemen altına):**
```typescript
// V19: Directive history (chat'ten bağımsız kalıcı hafıza)
directiveHistory: import('../services/directiveHistory').DirectiveRecord[];
coachMemory: import('../types/coach').CoachMemory | null;
```

**NOT:** TypeScript circular import'u önlemek için `DirectiveRecord` tipini `src/types/coach.ts`'den al, `src/services/directiveHistory.ts`'yi store'da `type`-only import et.

### 2b. persist merge fonksiyonuna ekle:

**BULMAK (merge içinde):**
```typescript
hasHydrated: false,
lastCoachDirective: null,
```

**DEĞIŞTIRMEK:**
```typescript
hasHydrated: false,
lastCoachDirective: null,
directiveHistory: persistedState?.directiveHistory || [],
coachMemory: persistedState?.coachMemory || null,
```

### 2c. syncSchema ile uyumlu root alanlara ekle:

`SYNC_ROOT_WHITELIST`'te zaten `directiveHistory` ve `coachMemory` var.
Store'da bu alanlar persist edildiği için cloud sync otomatik çalışacak.

---

## 3. src/App.tsx — COACH-004 (context builder migration)

### 3a. Import ekle (dosya başı):
```typescript
import { buildCoachContext, summarizeLogsForPrompt, summarizeExamsForPrompt } from './services/coachContext';
import { useCoachCore } from './hooks/useCoachCore';
```

### 3b. handleSendMessage fonksiyonunu sadeleştir:

**BULMAK (App.tsx ~line 600):**
```typescript
const compactProfile = profile ? `${profile.name}, Alan:${profile.track}, ...` : "Bilinmiyor";
const logsCtx = summarizeLogs(logs.slice(-5));
const examsCtx = exams.slice(-3).map(e => `${e.type}:${e.totalNet}N`).join('|');
let context = `P:${compactProfile}\nLogs:${logsCtx}\nExams:${examsCtx}`;
```

**DEĞIŞTIRMEK:**
```typescript
// COACH-004: Merkezi context builder
const { contextString, userState } = buildCoachContext({
  profile,
  logs,
  exams,
  eloScore,
  streakDays,
  tytSubjects,
  aytSubjects,
  activeAlerts,
  lastDirective: lastCoachDirective,
  callerSurface: action === 'qa_mode' ? 'qa_mode' : 'free_chat',
});
const context = contextString;
```

### 3c. action/intent migration (BUILD-001):

**BULMAK:**
```typescript
let action: "coach" | "qa_mode" = "coach";
```

**DEĞIŞTIRMEK:**
```typescript
// BUILD-001: intent bazlı model — "coach" kaldırıldı
let intent: CoachIntent = 'free_chat';
```

**İlgili kullanımları da güncelle:**
- `action === "qa_mode"` → `intent === "qa_mode"`
- `action: action` → `intent: intent` (getCoachResponse çağrısında)

### 3d. Auto-trigger: exam sonrası debrief (COACH-PRODUCT-004):

**handleExamSave fonksiyonuna ekle (addExam çağrısının hemen altına):**
```typescript
// COACH-PRODUCT-004: Deneme sonrası otomatik savaş raporu
if (exam) {
  setTimeout(() => triggerExamDebrief(exam), 1500);
}
```

**triggerExamDebrief `useCoachCore` hook'undan alınır.**

### 3e. CoachBriefing'i coach tab'ına entegre et:

**BULMAK (activeTab === 'coach' render bloğunda chat history render'ının hemen önüne):**
```typescript
{/* Mevcut chat geçmişi boşken açılış mesajı */}
```

**DEĞIŞTIRMEK:**
```typescript
{/* V19: COACH-PRODUCT-001 — Briefing ekranı (chat boşken) */}
{chatHistory.length === 0 && !isTyping && (
  <CoachBriefing
    onSendMessage={(msg, intent) => handleSendMessage(undefined, msg, intent)}
    isTyping={isTyping}
  />
)}
```

---

## 4. src/App.tsx — SYNC-010 (whitelist-based payload)

**BULMAK (syncWithCloud fonksiyonu):**
```typescript
const EXCLUDED = new Set([...]);
...
for (const [k, v] of Object.entries(state)) {
  if (!EXCLUDED.has(k) && typeof v !== 'function') {
    payload[k] = v;
  }
}
```

**DEĞIŞTIRMEK:**
```typescript
import { buildSyncPayload, buildBeaconSnapshot } from './services/syncSchema';

// SYNC-010: Explicit whitelist payload builder
const { root, entities } = buildSyncPayload(state);
// root + entities ayrı ayrı pushToFirestore'a verilecek şekilde
// firestoreSync.ts'de rootData + entity batch mantığı zaten var
await pushToFirestore(uid, { ...root, ...
  // entity subcollection'lar subcollection writer'a
});
```

---

## 5. src/hooks/useWarRoom.ts — WAR-003 (auto analysis)

**finishSession fonksiyonunun sonuna ekle:**
```typescript
// WAR-003: War Room bittikten sonra otomatik koç analizi
const { triggerWarRoomAnalysis } = useCoachCore();
setTimeout(() => {
  triggerWarRoomAnalysis({
    examType: endedSession.examType,
    correct,
    wrong,
    accuracy,
    topics: endedSession.questions
      .map((q) => q.topic)
      .filter((v, i, arr) => arr.indexOf(v) === i),
  });
}, 2000);
```

---

## 6. src/components/forms/LogEntryWidget.tsx — COACH-PRODUCT-005

**handleManualSubmit içinde onSubmit çağrısının sonuna ekle:**
```typescript
// COACH-PRODUCT-005: log sonrası mikro analiz (parent üzerinden tetiklenir)
// Parent (App.tsx) triggerLogAnalysis'i onSubmit callback sonrası çağırmalı
```

**App.tsx'te handleLogSubmit fonksiyonunu güncelle:**
```typescript
const handleLogSubmit = async (log: DailyLog) => {
  setIsLogWidgetOpen(false);
  addLog(log);
  // COACH-PRODUCT-005: mikro analiz otomatik tetikle
  await triggerLogAnalysis(log);
};
```

---

## 7. src/services/gemini.ts — BUILD-001

Tam dosya zaten `/home/claude/boho-impl/services/gemini.ts` olarak üretildi.
Mevcut `src/services/gemini.ts` ile replace et.

---

## 8. api/ai.ts — BUILD-001, COACH-002, OBS-001, SEC-005

Tam dosya zaten `/home/claude/boho-impl/api/ai.ts` olarak üretildi.
Mevcut `api/ai.ts` ile replace et.

---

## 9. src/types/coach.ts — COACH-001, COACH-007

Tam dosya zaten `/home/claude/boho-impl/types/coach.ts` olarak üretildi.
Mevcut `src/types/coach.ts` ile replace et.

---

## 10. Yeni dosyalar (doğrudan kopyala):

| Kaynak | Hedef |
|--------|-------|
| `/home/claude/boho-impl/services/coachContext.ts` | `src/services/coachContext.ts` |
| `/home/claude/boho-impl/services/directiveHistory.ts` | `src/services/directiveHistory.ts` |
| `/home/claude/boho-impl/services/syncSchema.ts` | `src/services/syncSchema.ts` |
| `/home/claude/boho-impl/hooks/useCoachCore.ts` | `src/hooks/useCoachCore.ts` |
| `/home/claude/boho-impl/components/CoachBriefing.tsx` | `src/components/CoachBriefing.tsx` |
| `/home/claude/boho-impl/api/ai.ts` | `api/ai.ts` |
| `/home/claude/boho-impl/types/coach.ts` | `src/types/coach.ts` |
| `/home/claude/boho-impl/services/gemini.ts` | `src/services/gemini.ts` |

---

## Doğrulama Checklist

- [ ] `tsc --noEmit` temiz geçiyor
- [ ] `CoachIntent` union tüm yüzeylerde kullanılıyor
- [ ] `buildCoachContext` App.tsx'te import edilmiş
- [ ] `directiveHistory` store'a eklenmiş
- [ ] `CoachBriefing` chat boşken render ediliyor
- [ ] `triggerLogAnalysis` log submit sonrası çağrılıyor
- [ ] `triggerExamDebrief` exam save sonrası çağrılıyor
- [ ] `package.json clean` script Windows-safe
- [ ] `api/ai.ts` rate limiter Upstash'ı tercih ediyor
- [ ] Raw provider hataları client'a sızmıyor (SEC-005)
