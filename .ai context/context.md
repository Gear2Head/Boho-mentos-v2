## Project Snapshot
Stack: React + Vite + Zustand + Supabase + Tailwind
Active module: Sync Engine, AI Orchestrator, Integration Panel
Architecture pattern: Service-based store hydration, HMR-safe singletons

## Completed in This Session
[x] Admin Panel: 'Çalışma logları' fetch edilirken oluşan sonsuz devService kilitleme sorunu çözüldü (AbortError loop break).
[x] Supabase Senkronizasyon: `useSyncManager.ts` tarafındaki dışsal `Promise.race` iptal edildi ve timeout kontrolü tamamen kilit kırılmalarına toleranslı olan native servise devredildi.
[x] War Room: Groq'un ısrarla array `[...]` dönmesi durumunda regex parser'ın sadece obje araması iptal edildi, array/json objesi hibrit parser eklendi. Timeout fallback'ler onarıldı.
[x] Notion & Data Upload: `AdminDashboard` içerisinde "Veri Dışa Aktarımı (Notion)" ve "Veri Yükleme (İçe Aktar)" özelliği eklendi. `.json` ve `.csv` desteği getirildi. Samsung Notes ve Google Keep'in public API yokluğu nedeniyle Notion tek yetkili dışa aktarım servisi yapıldı.

## Current Task
[ ] Sistem kullanım testleri ve genel QA.

## Open Decisions / Assumptions
ASSUME: Notion entegration requires "Internal Integration" mode (Bearer Token + Database ID).
ASSUME: Google Keep & Samsung Notes API restrictions mean user can only use Notion or manual File Export as backup.

## Key Contracts (do not break these)
supabaseUpdateWithTimeout(uid, fragment, timeout) -> Retries on lock steal.
safeParseDirective(text) -> Recovers both {} and [] wrapped structures.
