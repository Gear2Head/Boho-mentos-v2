import { doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, messaging } from '../services/firebase';

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(): Promise<string | null> {
  try {
    if (!messaging) return null;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return null;
    
    // FCM Token'ı al (Service Worker arka planda public klasöründen yüklenecek)
    const token = await getToken(messaging, { vapidKey });
    return token;
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
      platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save push token to Firestore:', err);
  }
}

export function listenForForegroundMessages() {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    console.log('UIForeground message received:', payload);
    // TODO: Toast or AppNotification triggered here
  });
}
