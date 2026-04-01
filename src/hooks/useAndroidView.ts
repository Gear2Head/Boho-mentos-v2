/**
 * AMAÇ: Android cihazlarda Status Bar ve Navigasyon davranışını yönetmek
 * MANTIK: Capacitor eklentilerini kullanarak UI'ı yerel uygulama standartlarına çeker
 */

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function useAndroidView() {
  useEffect(() => {
    // Sadece native platformlarda (Android/iOS) çalışır
    if (!Capacitor.isNativePlatform()) return;

    const setupNativeUI = async () => {
      try {
        // Status Bar'ı koyu temaya sabitle (Gear_Head Elit Siyah)
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#121212' });
        
        // Android "Geri" tuşu yönetimi (Uygulamadan çıkışı engelle/onayla)
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            // Ana sayfadaysak çıkış için çift basma veya onay istenebilir (Gelecek TODO)
            App.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch (err) {
        console.warn('Native UI Setup Error:', err);
      }
    };

    setupNativeUI();
  }, []);
}
