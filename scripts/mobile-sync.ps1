# Boho Mentosluk — APK Build & Sync (v5.2)
# Bu script projeyi build eder, Capacitor ile senkronize eder ve Android Studio'yu açar.

Write-Host "🚀 Build süreci başlıyor..." -ForegroundColor Cyan

# 1. Vite Build
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build hatası!" -ForegroundColor Red; exit }

# 2. Capacitor Sync
npx cap sync
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Sync hatası!" -ForegroundColor Red; exit }

Write-Host "✅ İşlem tamam! Android Studio açılıyor..." -ForegroundColor Green

# 3. Open Android Studio
npx cap open android
