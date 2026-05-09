const fs = require('fs');
const path = require('path');

// 🔍 KRİTİK KONTROLLER (BOHO AUTO-BUG FIXER)
const fixProject = () => {
  console.log("🛠️ BOHO Auto-Bug Fixer çalışıyor... Proje taranıyor.");

  // 1. App.tsx'deki mükerrer tanımları (isAdminPanelOpen, vb.) temizleme
  const appPath = path.join(__dirname, '../src/App.tsx');
  if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, 'utf8');
    
    // Spesifik olarak karşılaşılan Hata:
    const duplicateMatch = content.match(/const \[isAdminPanelOpen, setIsAdminPanelOpen\] = useState\(false\);/g);
    
    if (duplicateMatch && duplicateMatch.length > 1) {
      console.log("⚠️ Mükerrer isAdminPanelOpen bulundu! Temizleniyor...");
      // Sadece ilk referansı tutup gerisini uçur:
      content = content.replace(/const \[isAdminPanelOpen, setIsAdminPanelOpen\] = useState\(false\);/g, (match, offset, string) => {
        return string.indexOf(match) === offset ? match : ''; 
      });
      fs.writeFileSync(appPath, content);
      console.log("✅ App.tsx başarıyla fixlendi.");
    }
  }

  // 2. Vite "Beyaz Ekran" (Ghost Cache) Önlemi
  const viteCachePath = path.join(__dirname, '../node_modules/.vite');
  // Gelecekte gerekiyorsa otomatik fs.rmdirSync(...)
  
  // 3. .env Dosyası Kritik Değişken Taraması
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('VITE_FIREBASE_API_KEY')) {
       console.log("⚠️ UYARI: .env.local içerisinde VITE_FIREBASE_API_KEY eksik olabilir!");
    }
  }

  // 4. EADDRINUSE (Port Çakışması) Otonom Temizliği
  try {
    console.log("🧹 Eski açık kalan portlar (3000, 3001) temizleniyor...");
    const { execSync } = require('child_process');
    execSync('npx --yes kill-port 3000 3001', { stdio: 'ignore' });
    console.log("✅ Eski process'ler vuruldu, Portlar temiz.");
  } catch (err) {
    // Portlar zaten boşsa veya komut başarısızsa sessizce geç
  }

  console.log("🎯 BOHO Autofix devresi tamamlandı. Vite başlatılıyor...\n");
};

fixProject();
