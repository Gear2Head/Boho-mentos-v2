import { doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, messaging } from '../services/firebase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function requestPushPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { receive } = await PushNotifications.requestPermissions();
    return receive === 'granted';
  } else {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}

export async function subscribeToPush(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      await PushNotifications.register();
      
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          resolve(token.value);
        });
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ', JSON.stringify(error));
          resolve(null);
        });
      });
    } else {
      if (!messaging) return null;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return null;
      
      // FCM Token'ı al (Service Worker arka planda public klasöründen yüklenecek)
      const token = await getToken(messaging, { vapidKey });
      return token;
    }
  } catch (e) {
    console.log('Push sub error:', e);
    return null;
  }
}

export async function savePushSubscription(uid: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, 'users', uid, 'pushTokens', encodeURIComponent(token));
    await setDoc(tokenRef, {
      token,
      updatedAt: new Date().toISOString(),
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'desktop'
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save push token to Firestore:', err);
  }
}

export function listenForForegroundMessages() {
  if (Capacitor.isNativePlatform()) {
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Capacitor push received: ', notification);
      // TODO: Toast or AppNotification triggered here
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Capacitor push action: ', notification);
    });
  } else {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('UIForeground message received:', payload);
      // TODO: Toast or AppNotification triggered here
    });
  }
}
