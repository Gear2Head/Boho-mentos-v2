import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const messagingService = {
  requestPermissionAndGetToken: async (userId: string): Promise<string | null> => {
    try {
      if (!messaging) return null;
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // Ensure you add this to .env
        });
        
        if (token) {
          // Store token in user's document for sending push notifications later
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmToken: token,
            updatedAt: new Date().toISOString()
          });
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error('FCM Token Error:', error);
      return null;
    }
  },

  onMessageListener: () => {
    return new Promise((resolve) => {
      if (!messaging) return;
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  }
};
