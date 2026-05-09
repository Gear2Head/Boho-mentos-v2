#!/usr/bin/env node
/**
 * BOHO MENTOSLUK — DOKTOR
 * Her `npm run dev` öncesi otomatik çalışır.
 * Görev: Cache temizle, port kontrol et, env doğrula, server başlat.
 */

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const net  = require('net');

const ROOT = path.resolve(__dirname, '..');

// ── Renkler ──────────────────────────────────────────────────────────────────
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const log  = (icon, msg) => console.log(`${icon}  ${msg}`);
const ok   = (msg) => log(C.green('✔'), msg);
const warn = (msg) => { log(C.yellow('⚠'), msg); global.warnCount++; };
const err  = (msg) => log(C.red('✘'), msg);
const info = (msg) => log(C.cyan('→'), msg);

// ── Kontroller ────────────────────────────────────────────────────────────────

function checkNodeVersion() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) {
    err(`Node.js 18+ gerekli. Mevcut: ${process.version}`);
    process.exit(1);
  }
  ok(`Node.js ${process.version}`);
}

function clearViteCache() {
  const cachePath = path.join(ROOT, 'node_modules', '.vite');
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true });
    ok('Vite cache temizlendi');
  } else {
    info('Vite cache zaten temiz');
  }
}

function checkNodeModules() {
  const nm = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(nm)) {
    warn('node_modules bulunamadı — npm install çalıştırılıyor...');
    try {
      execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
      ok('Paketler yüklendi');
    } catch {
      err('npm install başarısız!');
      process.exit(1);
    }
  } else {
    ok('node_modules mevcut');
  }
}

function checkEnvFile() {
  const envPath = path.join(ROOT, '.env');
  const envExamplePath = path.join(ROOT, '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      warn('.env bulunamadı — .env.example kopyalandı. API anahtarlarını doldur!');
    } else {
      warn('.env dosyası yok! API özellikleri çalışmayabilir.');
    }
    return;
  }

  const env = fs.readFileSync(envPath, 'utf8');
  const required = ['GEMINI_API_KEY'];
  const optional = ['GROQ_API_KEY', 'CEREBRAS_API_KEY', 'OPENROUTER_API_KEY'];

  let missingRequired = false;
  required.forEach(key => {
    if (!env.includes(key) || env.includes(`${key}=\n`) || env.includes(`${key}=`)) {
      if (!env.match(new RegExp(`${key}=.+`))) {
        err(`Zorunlu env eksik: ${key}`);
        missingRequired = true;
      }
    }
  });

  optional.forEach(key => {
    if (!env.match(new RegExp(`${key}=.+`))) {
      warn(`Opsiyonel env tanımsız (fallback olmayabilir): ${key}`);
    }
  });

  if (missingRequired) {
    err('.env dosyasındaki zorunlu anahtarları doldur ve tekrar çalıştır.');
    process.exit(1);
  }

  ok('.env doğrulandı');
}

function checkTailwindConfig() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const isV4 = pkg.devDependencies?.['@tailwindcss/vite'] || pkg.dependencies?.['@tailwindcss/vite'];

  if (isV4) {
    const indexPath = path.join(ROOT, 'src', 'index.css');
    if (fs.existsSync(indexPath)) {
      const css = fs.readFileSync(indexPath, 'utf8');
      if (css.includes('@import "tailwindcss"') || css.includes('@import ' + "'tailwindcss'")) {
        ok('Tailwind v4 (CSS-first) doğrulandı');
        return;
      }
    }
  }

  const configPath = path.join(ROOT, 'tailwind.config.js');
  const configTsPath = path.join(ROOT, 'tailwind.config.ts');
  const target = fs.existsSync(configPath) ? configPath : configTsPath;

  if (!fs.existsSync(target)) {
    if (isV4) {
      warn('Tailwind v4 tespit edildi ama src/index.css içinde @import "tailwindcss" bulunamadı!');
    } else {
      warn('tailwind.config bulunamadı — dark mode çalışmayabilir');
    }
    return;
  }

  const content = fs.readFileSync(target, 'utf8');
  if (!content.includes("darkMode: 'class'")) {
    warn("tailwind.config'de darkMode: 'class' yok — Light/Dark mod çalışmayabilir!");
    warn("  Çözüm: tailwind.config içine darkMode: 'class' ekle");
  } else {
    ok("Tailwind darkMode: 'class' doğrulandı");
  }
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => { server.close(); resolve(false); });
    server.listen(port);
  });
}

async function checkPorts() {
  const ports = [3000, 3001];

  for (const port of ports) {
    let inUse = await isPortInUse(port);
    if (inUse) {
      warn(`Port ${port} kullanımda! Temizleniyor...`);
      if (process.platform !== 'win32') {
        try {
          const pid = execSync(`lsof -ti:${port}`).toString().trim();
          if (pid) {
            execSync(`kill -9 ${pid} 2>/dev/null || true`);
            ok(`Port ${port} zorla boşaltıldı (PID: ${pid})`);
          }
        } catch {
          warn(`Port ${port} boşaltılamadı — manuel kapat`);
        }
      } else {
        // Windows: Agresif Retry Döngüsü
        for (let i = 0; i < 2; i++) {
          try {
            execSync(`for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do taskkill /F /PID %a /T 2>nul`, { shell: true });
            await new Promise(r => setTimeout(r, 400)); // Sürecin ölmesi için bekle
            inUse = await isPortInUse(port);
            if (!inUse) break;
          } catch (e) {
            // Hata sessizce geçilir
          }
        }
        
        if (inUse) {
           warn(`Port ${port} hala kullanımda! Lütfen Görev Yöneticisi'nden (node.exe/tsx.exe) kapatın.`);
        } else {
           ok(`Port ${port} boşaltıldı`);
        }
      }
    } else {
      ok(`Port ${port} müsait`);
    }
  }
}

function checkViteProxy() {
  const viteConfig = path.join(ROOT, 'vite.config.ts');
  if (!fs.existsSync(viteConfig)) return;

  const content = fs.readFileSync(viteConfig, 'utf8');
  if (!content.includes('proxy') || !content.includes('/api')) {
    warn("vite.config.ts'de /api proxy ayarı bulunamadı!");
    warn("  Çözüm: server.proxy içine '/api' → 'http://localhost:3001' ekle");
    warn("  Aksi halde Koç ekranı AI HATASI: 404 verecek (ERR-001)");
  } else {
    ok('Vite proxy /api doğrulandı');
  }
}

function checkCriticalFiles() {
  const required = [
    'src/App.tsx',
    'src/store/appStore.ts',
    'src/services/gemini.ts',
    'api/ai.ts',
  ];

  const optional = [
    'public/assets/questions/questions-db.json',
  ];

  required.forEach(file => {
    if (!fs.existsSync(path.join(ROOT, file))) {
      err(`Kritik dosya eksik: ${file}`);
    } else {
      ok(`Dosya mevcut: ${file}`);
    }
  });

  optional.forEach(file => {
    if (!fs.existsSync(path.join(ROOT, file))) {
      warn(`Opsiyonel dosya yok: ${file} — Soru bankası çalışmayabilir`);
    }
  });
}

function printSummary(warnings) {
  console.log('\n' + C.bold('─'.repeat(50)));
  if (warnings === 0) {
    console.log(C.green(C.bold('  ✔ Tüm kontroller geçti — Sistem sağlıklı')));
  } else {
    console.log(C.yellow(C.bold(`  ⚠ ${warnings} uyarı — Yukarıdaki çözümlere bak`)));
    console.log(C.cyan('  💡 İPUCU: Eğer "localhost" beyaz ekran veriyorsa http://127.0.0.1:3000 adresini deneyin.'));
  }
  console.log(C.bold('─'.repeat(50)) + '\n');
}

// ── Ana Akış ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + C.bold(C.cyan('  BOHO MENTOSLUK — SİSTEM DOKTORU')));
  console.log(C.cyan('  Kontroller başlıyor...\n'));

  global.warnCount = 0;
  const origWarn = global.console.warn;

  checkNodeVersion();
  checkNodeModules();
  clearViteCache();
  checkEnvFile();
  checkTailwindConfig();
  checkViteProxy();
  checkCriticalFiles();
  await checkPorts();

  printSummary(global.warnCount);

  info('Sunucu başlatılıyor...\n');
}

main().catch(e => {
  err(`Doktor çöktü: ${e.message}`);
  process.exit(1);
});
