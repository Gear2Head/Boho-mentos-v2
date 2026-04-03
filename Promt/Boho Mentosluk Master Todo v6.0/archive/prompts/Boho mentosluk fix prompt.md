# 🚨 BOHO MENTOSLUK — ACİL DURUM TAMİR PROMPTU v2.0
## Kodename: OPERATION CLEAN SLATE
### Hedef: 500 Hatası + Mobil Bozulma + Auth Engeli + UI Taşması → Sıfır Sorun

---

## 📋 BAĞLAM VE SORUN TANIMI

Bu proje YKS 2026 öğrencileri için geliştirilmiş bir React + TypeScript + Vite uygulamasıdır. Firebase Auth, Firestore, Zustand store ve Vercel Serverless Functions kullanıyor. Şu anda 4 kritik sorun var:

1. **`api/ai.ts` TypeScript derleme hataları** → Vercel'de FUNCTION_INVOCATION_FAILED (500)
2. **Mobil UI bozulmaları** → Tasarımlar taşıyor, HTML gibi görünüyor, dark mode çalışmıyor
3. **Auth Gate sorunu** → Siteden girerken "hata oluştu" mesajı, hesap açma engellenebiliyor
4. **Cihazlar arası giriş çökmesi** → Başka cihazdan login olunca sunucu hatası

---

## 🔴 FAZ 1 — KRİTİK: `api/ai.ts` DERLEME HATALARINI TEMİZLE

### Görev 1.1 — Template Literal Hatası (TS1160)

**Hata:** `api/ai.ts(689,1): error TS1160: Unterminated template literal`

**Kök Neden:** `SYSTEM_INSTRUCTION_BASE` veya benzeri bir değişkeni saran backtick template literal kapanmamış. 689. satırda string aniden bitmekte.

**Yapılacak:**
```
api/ai.ts dosyasını aç.
SYSTEM_INSTRUCTION_BASE = ` ile başlayan büyük string bloğunu bul.
En alt satırına git — backtick (`) ile kapandığından emin ol.
Eğer kapanmıyorsa dosyanın en sonuna   `;  ekle.
Ardından tüm template literal içinde ${...} ifadelerinin düzgün escape edildiğini kontrol et.
```

### Görev 1.2 — Geçersiz Karakter Hatası (TS1127)

**Hata:** `api/ai.ts(546,50): error TS1127: Invalid character` — 546 ve 597. satırlar

**Kök Neden:** Büyük ihtimalle internetten kopyalama sırasında gelen:
- Eğik/akıllı tırnaklar: `"` `"` yerine düz `"` `"` olmalı
- Sıfır genişlikli boşluklar (zero-width space, U+200B)
- Unicode em-dash `—` yerine normal `-` karakteri

**Yapılacak:**
```
546. satıra git. Satırın tamamını sil.
Klavyeyle baştan yaz — copy-paste yapma.
597. satır için aynısını uygula.
Dosyayı kaydet ve   tsc --noEmit   ile hata sayısını kontrol et.
```

### Görev 1.3 — `buildSystemInstruction` Fonksiyon Yapısını Doğrula

**Yapılacak:**
```typescript
// Bu fonksiyonun sonunda şu yapı olmalı — kontrol et:
const buildSystemInstruction = (
  coachPersonality?: string,
  action?: string,
  userState?: any
) => {
  const safePersonalization = (coachPersonality ?? "").trim();
  // ... içerik ...
  return baseInstruction + '\n' + stateContext + '\n' + personalityLayer;
  // ↑ Bu satırın string concatenation'ı düzgün kapandığından emin ol
};
// ↑ Bu kapanan süslü parantez var mı? Kontrol et.
```

### Görev 1.4 — Vercel Deployment Doğrulaması

```
Yukarıdaki düzeltmeleri yaptıktan sonra:
1. git add api/ai.ts
2. git commit -m "fix: TS compilation errors in api/ai.ts"  
3. git push
4. Vercel dashboard'da deployment loglarını izle
5. "Build Completed" görünce /api/ai endpoint'ine test isteği at
```

---

## 🟠 FAZ 2 — MOBİL UI BOZULMALARINI TAMAMEN ÇÖZEN OTOMATİK BOYUTLANDIRMA SİSTEMİ

### Görev 2.1 — `useViewport` Hook'u Oluştur

**Yeni dosya:** `src/hooks/useViewport.ts`

```typescript
/**
 * AMAÇ: Ekran boyutunu reaktif olarak takip et, breakpoint kararlarını merkezi yönet
 * MANTIK: window.innerWidth + ResizeObserver — SSR safe
 */
import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768–1023px
  isDesktop: boolean;     // >= 1024px
  isSmall: boolean;       // < 480px (küçük telefon)
  safeAreaBottom: number; // iOS home bar için
  orientation: 'portrait' | 'landscape';
}

const getBreakpoint = (w: number): Breakpoint => {
  if (w < 480) return 'xs';
  if (w < 768) return 'sm';
  if (w < 1024) return 'md';
  if (w < 1280) return 'lg';
  return 'xl';
};

export function useViewport(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 375, height: 812, breakpoint: 'sm',
        isMobile: true, isTablet: false, isDesktop: false,
        isSmall: false, safeAreaBottom: 0, orientation: 'portrait'
      };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      width: w, height: h,
      breakpoint: getBreakpoint(w),
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      isSmall: w < 480,
      safeAreaBottom: parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--sab') || '0'
      ),
      orientation: h > w ? 'portrait' : 'landscape'
    };
  });

  const update = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setInfo({
      width: w, height: h,
      breakpoint: getBreakpoint(w),
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      isSmall: w < 480,
      safeAreaBottom: parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--sab') || '0'
      ),
      orientation: h > w ? 'portrait' : 'landscape'
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [update]);

  return info;
}

// Yardımcı: CSS sınıfı seçici (Tailwind alternatifi olarak)
export function responsive<T>(
  viewport: ViewportInfo,
  options: { mobile: T; tablet?: T; desktop: T }
): T {
  if (viewport.isDesktop) return options.desktop;
  if (viewport.isTablet) return options.tablet ?? options.mobile;
  return options.mobile;
}
```

### Görev 2.2 — `MobileGuard` Wrapper Bileşeni Oluştur

**Yeni dosya:** `src/components/MobileGuard.tsx`

```typescript
/**
 * AMAÇ: Mobil ekranlar için overflow ve taşma koruyucusu
 * MANTIK: Tüm sayfa içeriğini sarar, viewport'a göre padding/margin ayarlar
 */
import React from 'react';
import { useViewport } from '../hooks/useViewport';

interface MobileGuardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileGuard({ children, className = '' }: MobileGuardProps) {
  const vp = useViewport();
  
  return (
    <div
      className={`w-full max-w-full overflow-x-hidden ${className}`}
      style={{
        // Küçük ekranlarda font boyutunu scale et
        fontSize: vp.isSmall ? '14px' : '16px',
        // iOS safe area
        paddingBottom: vp.isMobile ? `${vp.safeAreaBottom}px` : '0',
      }}
    >
      {children}
    </div>
  );
}

// Metin taşmasını önleyen wrapper
export function SafeText({ children, className = '' }: MobileGuardProps) {
  return (
    <span className={`break-words overflow-wrap-anywhere ${className}`}>
      {children}
    </span>
  );
}
```

### Görev 2.3 — `App.tsx` Ana Layout'unu Güncelle

`App.tsx` içindeki ana `<div>` container'ına şu class'ları ekle:

```typescript
// MEVCUT:
<div className="flex flex-col md:flex-row h-[100dvh] bg-app text-ink ...">

// YENİ — overflow korumaları ekle:
<div className="flex flex-col md:flex-row h-[100dvh] bg-app text-ink overflow-x-hidden w-full max-w-full ...">
```

`<main>` elementine de ekle:
```typescript
// MEVCUT:
<main className="flex-1 overflow-auto relative bg-app pb-24 md:pb-0 pt-0">

// YENİ:
<main className="flex-1 overflow-auto overflow-x-hidden relative bg-app pb-24 md:pb-0 pt-0 w-full min-w-0">
```

### Görev 2.4 — Koç Sohbet Balonlarını Onar (Dark Mode + Taşma)

`App.tsx` içindeki coach mesaj baloncuğunu bul ve güncelle:

```typescript
// MEVCUT (taşıyor + dark mode yok):
<div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-2xl ${msg.role === 'user' 
  ? 'bg-[#C17767] text-[#FDFBF7]' 
  : 'bg-[#121212] border border-green-800/50 ...'}`}>

// YENİ — break-words + min-w-0 ekle:
<div className={`max-w-[85%] md:max-w-[70%] min-w-0 p-5 rounded-2xl break-words overflow-hidden ${
  msg.role === 'user' 
    ? 'bg-[#C17767] text-[#FDFBF7]' 
    : 'bg-zinc-900 dark:bg-zinc-900 border border-green-800/50 text-zinc-200 dark:text-zinc-200'
}`}>

// İçindeki ReactMarkdown sarmalını da güncelle:
<div className="text-sm font-mono leading-relaxed opacity-90 break-words overflow-wrap-anywhere">
  <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
</div>
```

### Görev 2.5 — `index.css`'e Mobil Temel Ayarları Ekle

```css
/* Mobil taşma kökten engelle */
html, body {
  overflow-x: hidden !important;
  max-width: 100vw;
}

/* Tüm içeriklerin viewport'u taşmaması */
* {
  box-sizing: border-box;
  min-width: 0; /* Flexbox taşmayı engeller */
}

/* Uzun URL/kod taşması */
p, li, td, th, div {
  overflow-wrap: break-word;
  word-break: break-word;
}

/* iOS ekran kesimi */
:root {
  --sab: env(safe-area-inset-bottom, 0px);
  --sat: env(safe-area-inset-top, 0px);
}
```

---

## 🟡 FAZ 3 — AUTH GATE: GİRİŞ EKRANINI ONAR VE DETAYLANDİR

### Görev 3.1 — Firebase Auth Hata Yakalama Güçlendir

`src/hooks/useAuth.ts` içindeki `signInWithGoogle` fonksiyonunu güncelle:

```typescript
const signInWithGoogle = useCallback(async () => {
  setAuthError(null);
  try {
    setIsLoading(true);
    
    // Popup blocked olunca redirect'e geç
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // ... devam
    } catch (popupError: any) {
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/cancelled-popup-request') {
        // Mobil için redirect kullan
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw popupError;
    }
  } catch (err: any) {
    console.error('[Auth] Google signin error:', err);
    setAuthError(parseAuthError(err.code));
  } finally {
    setIsLoading(false);
  }
}, [store]);
```

`useAuth.ts` import satırına `signInWithRedirect` ekle:
```typescript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,  // ← YENİ
  getRedirectResult,   // ← YENİ
  // ...
} from 'firebase/auth';
```

`useEffect` içinde redirect sonucunu yakala:
```typescript
useEffect(() => {
  // Redirect sonucu kontrolü (mobil Google girişi için)
  getRedirectResult(auth).then((result) => {
    if (result?.user) {
      // Başarılı redirect sonrası işlemler burada
      console.log('[Auth] Redirect result:', result.user.email);
    }
  }).catch(console.error);
  
  // ... mevcut onAuthStateChanged kodu
}, []);
```

### Görev 3.2 — `AuthGate.tsx` Bileşenini Yeniden Yaz

**Mevcut `src/components/AuthGate.tsx` dosyasını tamamen şununla değiştir:**

```typescript
/**
 * AMAÇ: Giriş/Kayıt ekranı — detaylı, mobil uyumlu, hata toleranslı
 * MANTIK: Google popup → başarısız → redirect fallback
 *         Email/şifre → validasyon → kayıt/giriş
 *         Misafir modu → onSkip
 */
import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, LogIn,
  Sparkles, Shield, Zap, BookOpen, Target, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

interface AuthGateProps {
  onSkip?: () => void;
}

// Şifre gücü hesaplama
const getPasswordStrength = (password: string) => {
  if (password.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score, label: 'Çok Zayıf', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Zayıf', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Orta', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Güçlü', color: 'bg-green-500' };
  return { score, label: 'Çok Güçlü', color: 'bg-emerald-500' };
};

// Özellik kartları
const FEATURES = [
  { icon: <Target size={18} />, text: 'YKS hedef takibi & net analizi' },
  { icon: <Zap size={18} />, text: 'AI koç — Kübra direktifleri' },
  { icon: <BookOpen size={18} />, text: 'Müfredat haritası & soru bankası' },
  { icon: <Shield size={18} />, text: 'Veriler cihazlar arası senkron' },
];

export function AuthGate({ onSkip }: AuthGateProps) {
  const { signInWithGoogle, signInWithEmail, resetPassword, authError, setAuthError, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');

  const passwordStrength = getPasswordStrength(password);

  // Email doğrulama
  const validateEmail = (val: string) => {
    if (!val) { setEmailError('E-posta zorunlu'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setEmailError('Geçersiz e-posta formatı'); return false; }
    setEmailError('');
    return true;
  };

  const validateName = (val: string) => {
    if (mode === 'register' && val.length < 2) { setNameError('İsim en az 2 karakter olmalı'); return false; }
    setNameError('');
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = validateEmail(email);
    const nameOk = mode === 'register' ? validateName(displayName) : true;
    if (!emailOk || !nameOk) return;
    await signInWithEmail(email, password, mode, displayName);
  };

  const handleResetPassword = async () => {
    if (!validateEmail(email)) return;
    const ok = await resetPassword(email);
    if (ok) setResetSent(true);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex items-center justify-center overflow-y-auto">
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C17767]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px]" />
        <div className="absolute top-3/4 left-1/2 w-48 h-48 bg-emerald-600/5 rounded-full blur-[60px]" />
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-12 items-center min-h-screen lg:min-h-0">
        
        {/* Sol panel — Tanıtım (sadece masaüstü) */}
        <div className="hidden lg:flex flex-col flex-1 pr-8">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#C17767]/15 rounded-2xl mb-6 border border-[#C17767]/30">
              <span className="font-serif italic text-2xl font-bold text-[#C17767]">B</span>
            </div>
            <h1 className="font-serif italic text-5xl text-zinc-100 mb-3 leading-tight">
              Boho<br />Mentosluk
            </h1>
            <p className="text-sm uppercase tracking-[0.3em] text-[#C17767]/80 font-bold mb-2">
              YKS 2026 Akademik OS
            </p>
            <p className="text-zinc-400 leading-relaxed text-base mt-6 max-w-sm">
              Yapay zeka destekli koçluk sistemi. Her denemeni, her logunu, her hatanı analiz eder — seni hedefine götürür.
            </p>
          </div>

          <div className="space-y-4 mb-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-zinc-400">
                <div className="w-8 h-8 bg-[#C17767]/10 rounded-lg flex items-center justify-center text-[#C17767] shrink-0">
                  {f.icon}
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="p-5 bg-[#111] border border-[#222] rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-[#C17767]/60 font-bold mb-2">Sistem İstatistikleri</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold font-mono text-zinc-200">120</div>
                <div className="text-[10px] text-zinc-500 uppercase">TYT Konu</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-zinc-200">9</div>
                <div className="text-[10px] text-zinc-500 uppercase">Şablon</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-zinc-200">∞</div>
                <div className="text-[10px] text-zinc-500 uppercase">AI Soru</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ panel — Auth formu */}
        <div className="w-full max-w-sm lg:max-w-md">
          
          {/* Mobil logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#C17767]/15 rounded-2xl mb-4 border border-[#C17767]/30">
              <span className="font-serif italic text-2xl font-bold text-[#C17767]">B</span>
            </div>
            <h1 className="font-serif italic text-3xl text-zinc-100">Boho Mentosluk</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-1">YKS 2026 Akademik OS</p>
          </div>

          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-3xl p-7 shadow-2xl shadow-black/60">
            
            {/* Mod seçici */}
            <div className="flex mb-7 bg-[#161616] rounded-2xl p-1 border border-[#222]">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setAuthError?.(null); setEmailError(''); setNameError(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    mode === m 
                      ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {m === 'login' ? 'Giriş Yap' : 'Hesap Aç'}
                </button>
              ))}
            </div>

            {/* Google butonu */}
            <button
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 text-zinc-900 rounded-xl py-3.5 text-sm font-bold transition-all mb-5 disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Google ile {mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#222]" />
              <span className="text-[10px] uppercase text-zinc-600 tracking-widest font-bold">veya e-posta</span>
              <div className="flex-1 h-px bg-[#222]" />
            </div>

            {/* E-posta formu */}
            <AnimatePresence mode="wait">
              {!showForgot ? (
                <motion.form
                  key="loginForm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleEmailSubmit}
                  className="space-y-3"
                >
                  {/* İsim alanı (sadece register) */}
                  <AnimatePresence>
                    {mode === 'register' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Adın veya mahlasın"
                            value={displayName}
                            onChange={e => { setDisplayName(e.target.value); validateName(e.target.value); }}
                            className={`w-full bg-[#1a1a1a] border rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors ${
                              nameError ? 'border-red-500' : 'border-[#2a2a2a] focus:border-[#C17767]'
                            }`}
                          />
                        </div>
                        {nameError && (
                          <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {nameError}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* E-posta */}
                  <div>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        placeholder="E-posta adresin"
                        value={email}
                        onChange={e => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                        onBlur={() => validateEmail(email)}
                        required
                        className={`w-full bg-[#1a1a1a] border rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors ${
                          emailError ? 'border-red-500' : 'border-[#2a2a2a] focus:border-[#C17767]'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> {emailError}
                      </p>
                    )}
                  </div>

                  {/* Şifre */}
                  <div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifren"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-3 pl-10 pr-12 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#C17767] outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    
                    {/* Şifre güç göstergesi */}
                    {mode === 'register' && password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-800'
                            }`} />
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-500">{passwordStrength.label}</p>
                      </div>
                    )}
                  </div>

                  {/* Hata mesajı */}
                  {authError && (
                    <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{authError}</p>
                    </div>
                  )}

                  {/* Submit butonu */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-[#C17767] hover:bg-[#A56253] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <LogIn size={16} />
                        {mode === 'register' ? 'Hesap Oluştur' : 'Giriş Yap'}
                      </>
                    )}
                  </button>

                  {/* Şifremi unuttum */}
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="w-full text-center text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors mt-1"
                    >
                      Şifremi unuttum
                    </button>
                  )}
                </motion.form>
              ) : (
                // Şifre sıfırlama ekranı
                <motion.div
                  key="forgotForm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-4">
                    <p className="text-sm text-zinc-300 font-bold mb-1">Şifre Sıfırlama</p>
                    <p className="text-xs text-zinc-500">E-posta adresini gir, sıfırlama linki gönderelim.</p>
                  </div>
                  
                  {!resetSent ? (
                    <>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="email"
                          placeholder="E-posta adresin"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 focus:border-[#C17767] outline-none transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleResetPassword}
                        className="w-full py-3.5 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest"
                      >
                        Sıfırlama Linki Gönder
                      </button>
                    </>
                  ) : (
                    <div className="bg-green-950/50 border border-green-800/50 rounded-xl p-4 text-center">
                      <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                      <p className="text-sm text-green-400 font-bold">Link gönderildi!</p>
                      <p className="text-xs text-zinc-500 mt-1">E-posta kutunu kontrol et</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => { setShowForgot(false); setResetSent(false); }}
                    className="w-full text-center text-[11px] text-zinc-600 hover:text-zinc-400 flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={10} /> Giriş ekranına dön
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Misafir geçişi */}
          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-3"
            >
              <ArrowRight size={12} />
              Şimdilik misafir olarak devam et
            </button>
          )}

          <p className="text-center text-[10px] text-zinc-700 mt-4 tracking-widest uppercase">
            Veriler cihazlar arası şifreli senkronize edilir
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Görev 3.3 — `parseAuthError` Hata Mesajlarını Genişlet

`src/hooks/useAuth.ts` içindeki `parseAuthError` fonksiyonuna yeni hata kodları ekle:

```typescript
function parseAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap bulunamadı.',
    'auth/wrong-password': 'Şifre yanlış. Şifremi unuttum seçeneğini kullanabilirsin.',
    'auth/invalid-email': 'Geçersiz e-posta formatı.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen birkaç dakika bekle.',
    'auth/popup-closed-by-user': 'Google girişi iptal edildi.',
    'auth/popup-blocked': 'Popup engellendi. E-posta ile giriş yapmayı dene.',
    'auth/network-request-failed': 'İnternet bağlantısı yok. Bağlantını kontrol et.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
    'auth/requires-recent-login': 'Bu işlem için tekrar giriş yapman gerekiyor.',
    'auth/account-exists-with-different-credential': 'Bu e-posta başka bir giriş yöntemiyle kayıtlı.',
    'auth/operation-not-allowed': 'Bu giriş yöntemi şu an aktif değil.',
  };
  return map[code] ?? `Bir hata oluştu (${code}). Tekrar dene.`;
}
```

---

## 🟢 FAZ 4 — VİTE CHUNK OPTİMİZASYONU

### Görev 4.1 — `vite.config.ts` Güncelle

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({ /* mevcut PWA config aynen kalır */ })
  ],
  
  // ↓ YENİ BÖLÜM EKLE
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom')) return 'react-core';
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/motion') || 
              id.includes('node_modules/framer-motion')) return 'animation';
          if (id.includes('node_modules/katex') || 
              id.includes('node_modules/react-katex')) return 'math';
          if (id.includes('node_modules/@google')) return 'google-ai';
        }
      }
    }
  },
  
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

---

## 🔵 FAZ 5 — FIRESTORE KURALLARINI DOĞRULA

### Görev 5.1 — `firestore.rules` Kontrol Listesi

Firebase Console'a git → Firestore → Rules sekmesi:

```
1. "Publish" butonuna son ne zaman basıldı? Eğer local dosyayı değiştirip
   deploy etmediysen kurallar güncellenmemiştir.

2. Firebase CLI ile deploy et:
   firebase deploy --only firestore:rules

3. Kuralların aktif olduğunu doğrula:
   Firebase Console > Firestore > Rules > "Published at" tarihini kontrol et.

4. Yeni cihazdan test için:
   Firebase Console > Authentication > Users listesinde
   test kullanıcısının oluştuğunu gör.
```

### Görev 5.2 — Cross-Origin Hatasını Gider

Console'da görünen `ERR_BLOCKED_BY_CLIENT` hatası büyük ihtimalle reklam engelleyiciden kaynaklanıyor. Kullanıcıya gösterilecek mesaj:

```typescript
// useAuth.ts içindeki Firebase push hatalarını yakala:
try {
  await pushToFirestore(uid, data);
} catch (err: any) {
  // Sessizce başarısız ol — kritik değil
  if (err?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
    console.warn('[Firestore] Reklam engelleyici tarafından bloke edildi. Veri localStorage\'da.');
  }
}
```

---

## ✅ UYGULAMA SIRASI VE DOĞRULAMA

```
1. api/ai.ts → TypeScript hatalarını düzelt → git push → Vercel log kontrol
2. src/hooks/useViewport.ts → Yeni hook oluştur  
3. src/components/MobileGuard.tsx → Yeni bileşen oluştur
4. src/index.css → Mobil CSS temellerini ekle
5. App.tsx → Main container overflow düzelt + sohbet balonları onar
6. src/components/AuthGate.tsx → Tümden yeniden yaz
7. src/hooks/useAuth.ts → Redirect fallback + hata kodları ekle
8. vite.config.ts → Build optimizasyonu ekle
9. firebase deploy --only firestore:rules → Kuralları yayınla

DOĞRULAMA ADIMI:
□ Chrome DevTools → Console → Kırmızı hata yok
□ Chrome DevTools → Network → /api/ai → 200 OK
□ Mobil Chrome'da AuthGate açıl → Form düzgün görünüyor
□ Google ile giriş → Profil oluşturma ekranı geldi
□ Başka cihazdan giriş → Veriler senkronize geldi
□ Koç sayfasında mesaj yaz → AI yanıtı geldi
□ Mobil ekranda sohbet → Taşma yok, dark mode çalışıyor
```

---

## 📌 NOTLAR

- `api/ai.ts` içindeki büyük prompt string (SYSTEM_INSTRUCTION_BASE) içinde `\`` backtick kullanıyorsan mutlaka `\\\`` şeklinde escape et.
- Template literal içinde `${...}` kullanıyorsan `\${...}` ile escape et ya da string dışına al.
- Vercel free tier'da serverless function timeout 10 saniye — büyük AI isteklerinde zaman aşımı olabilir, `maxTokens` değerini düşür (900'e çek).
- Mobil Safari'de `100vh` bazen adres çubuğu yüksekliğini hesaba katmaz — her yerde `100dvh` kullan (zaten kullanıyorsun, iyi).

---

*Prompt Todo v2.0 — Boho Mentosluk Operation Clean Slate*
*Tüm değişiklikler sırayla uygulanmalı — bağımlılık sırası önemli.*