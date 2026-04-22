## Project Snapshot
Stack: React + TypeScript + Firebase Firestore + Storage + FCM + Tailwind + Zustand
Active module: Firebase Storage (storageService.ts), FCM Messaging (messagingService.ts)
Architecture pattern: Serverless API (Vercel) + Client-heavy state + NoSQL + Storage Buckets

## Completed in This Session
[x] Firebase Storage Service upload/delete metodları eklendi (storageService.ts) Birçok argüman imzası (polymorphic) desteklendi.
[x] cleanForFirestore yardımıcısı eklendi (undefined hataları için)
[x] useCoachCore ve appStore'da Firestore veri yazma güvenliği (clean) sağlandı.
[x] FCM Servis İşçisi (Service Worker) ve messagingService.ts kuruldu
[x] Storage Güvenlik Kuralları kontrol edildi

## Current Task
[ ] Kübra Push Bildirimleri (FCM) UI entegrasyonu ve Token kaydı işlemleri
[ ] Push API vasıtasıyla Kübra'nın "Öğrenciyi masaya oturtma" tetikleyicisini yazmak

## Key Contracts
storageService.uploadFile(uid, folder, file) → URL
messagingService.requestPermissionAndGetToken(uid) → FCM Token
FCM Service Worker → Arka planda gelen mesajları Native Push Notification olarak çıkarır

## Open Decisions / Assumptions
ASSUME: service-worker public klasöründe. Kullanıcı auth olduktan sonra izin isteyeceğiz (AuthGate.tsx veya dashboard girişi). VAPID KEY `.env` içerisinden okunacak.
