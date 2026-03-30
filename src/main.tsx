import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- BEYAZ EKRAN (CACHE/SW) RESETLEYICI ---
if (typeof window !== 'undefined') {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    // 1. Service Worker'ları kesinlikle sil
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.warn('SW Unregistered.');
        }
      });
    }

    // 2. Cache-Control: Hard Clear 
    const REFRESH_KEY = 'boho_app_emergency_reset_v2';
    if (!localStorage.getItem(REFRESH_KEY)) {
      if ('caches' in window) {
        caches.keys().then((names) => {
          Promise.all(names.map(name => caches.delete(name))).then(() => {
            localStorage.setItem(REFRESH_KEY, 'true');
            window.location.reload(); // Zorunlu Yenileme
          });
        });
      }
    }
  }
}

import React, { Component } from 'react';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error('BOHO_CRASH:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-4xl font-serif italic text-red-500 mb-4">SİSTEM KRİZİ</h1>
          <p className="text-zinc-400 font-mono text-sm max-w-md">Kritik bir modül (muhtemelen Grafik) çöktü. Panik yapma, Kübra bu durumu logladı.</p>
          <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-[#C17767] text-white rounded-xl font-bold uppercase tracking-widest text-xs">YENİDEN BAŞLAT</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
