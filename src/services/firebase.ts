import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBxF8Rnwi-26PHXMmoG38UGinsbCAoYANk",
  authDomain: "boho-mentosluk.firebaseapp.com",
  databaseURL: "https://boho-mentosluk-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "boho-mentosluk",
  storageBucket: "boho-mentosluk.firebasestorage.app",
  messagingSenderId: "838509251180",
  appId: "1:838509251180:web:fd2039197ac60cacbe2649"
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;
