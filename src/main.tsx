import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './index.css';

// --- BEYAZ EKRAN (CACHE/SW) RESETLEYICI ---
if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('Eski PWA Servis Worker Silindi (Beyaz Ekran Fixi).');
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
