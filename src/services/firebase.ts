import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    enableIndexedDbPersistence(db).catch(console.error);
  } else if (err.code == 'unimplemented') {
    console.error('Firebase offline hatası: Tarayıcı desteklemiyor.', err);
  }
});
