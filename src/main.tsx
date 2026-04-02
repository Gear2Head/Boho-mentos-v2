import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- BEYAZ EKRAN (CACHE/SW) RESETLEYICI ---
if (typeof window !== 'undefined') {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.warn('SW Unregistered.');
        }
      });
    }

    const REFRESH_KEY = 'boho_app_emergency_reset_v2';
    if (!localStorage.getItem(REFRESH_KEY)) {
      if ('caches' in window) {
        caches.keys().then((names) => {
          Promise.all(names.map(name => caches.delete(name))).then(() => {
            localStorage.setItem(REFRESH_KEY, 'true');
            window.location.reload();
          });
        });
      }
    }
  }
}

// --- ACIL SIFIRLAMA FONKSIYONU (CACHE/SW) ---
const hardReset = async () => {
  if (typeof window === 'undefined') return;
  
  // 0. Temizlik öncesi görsel geri bildirim (isteğe bağlı konsol logu)
  console.log('NÜKLEER SIFIRLAMA BAŞLATILDI...');

  // 1. Service Worker'ları temizle
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    } catch (e) { console.error('SW Unregister Error:', e); }
  }

  // 2. Browser Cache'i temizle
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) { console.error('Cache Clear Error:', e); }
  }

  // 3. LocalStorage ve SessionStorage temizle
  localStorage.clear();
  sessionStorage.clear();

  // 4. IndexedDB temizle (Vite-PWA ve App Store için)
  if ('indexedDB' in window) {
    try {
      const databases = ['yks_coach_storage', 'workbox-precache-v2']; // Bilinen DB'ler
      databases.forEach(db => window.indexedDB.deleteDatabase(db));
    } catch (e) { console.error('IDB Clear Error:', e); }
  }
  
  // 5. Sert Yenileme (URL'e timestamp ekleyerek CDN önbelleğini bypass et)
  const refreshUrl = window.location.origin + '/?v=' + Date.now();
  window.location.href = refreshUrl;
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('BOHO_CRASH:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-4xl font-serif italic text-red-500 mb-4 animate-pulse">SİSTEM KRİZİ</h1>
          <p className="text-zinc-400 font-mono text-sm max-w-md">Kritik bir modül çöktü. Tarayıcı önbelleği veya veri uyuşmazlığı olabilir. Kübra durumu logladı, sistemi tamamen sıfırlayıp en güncel haliyle başlatabilirsin.</p>
          <button 
            onClick={() => hardReset()} 
            className="mt-8 px-8 py-4 bg-[#C17767] text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-[#A56253] transition-all shadow-lg shadow-[#C17767]/20"
          >
            SİSTEMİ SERT SIFIRLA & YENİDEN BAŞLAT
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { ToastProvider } from './contexts/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
