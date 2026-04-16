import { getSupabaseClient } from '../services/supabaseClient';

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return null;
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });
  } catch (e) {
    console.log('Push sub error:', e);
    return null;
  }
}

export async function savePushSubscription(uid: string, subscription: PushSubscription): Promise<void> {
  const sb = getSupabaseClient();
  await (sb.from('users').update as any)({ push_subscription: subscription.toJSON() }).eq('uid', uid);
}
