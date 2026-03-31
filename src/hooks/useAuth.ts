/**
 * AMAÇ: Firebase Authentication hook — giriş, çıkış, oturum takibi
 * MANTIK: onAuthStateChanged ile oturum senkronize, store'a AuthUser yazar
 */

import { useEffect, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAppStore } from '../store/appStore';
import { pullFromFirestore, pushToFirestore } from '../services/firestoreSync';

type AuthMode = 'login' | 'register';

export function useAuth() {
  const store = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        store.setAuthUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        const cloudData = await pullFromFirestore(firebaseUser.uid);
        if (cloudData && cloudData.profile) {
          store.setProfile(cloudData.profile);
          if (cloudData.eloScore !== undefined) store.addElo(cloudData.eloScore - store.eloScore);
          if (cloudData.theme) store.setTheme(cloudData.theme);
        }
        
        // Geliştirici mimarisi için zorunlu (users dökümanı)
        try {
           const isSuperAdmin = firebaseUser.uid === '9z9OAxBXsFU3oPT8AqIxnDSfzNy2';
           await setDoc(doc(db, 'users', firebaseUser.uid), {
             uid: firebaseUser.uid,
             email: firebaseUser.email,
             displayName: firebaseUser.displayName || '',
             photoURL: firebaseUser.photoURL || '',
             role: isSuperAdmin ? 'super_admin' : 'standard',
             lastSignedInAt: new Date().toISOString()
           }, { merge: true });
        } catch (e) {
           console.error("User doc sync error:", e);
        }
      } else {
        store.setAuthUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const cloudData = await pullFromFirestore(user.uid);
      if (!cloudData?.profile && store.profile) {
        await pushToFirestore(user.uid, {
          profile: store.profile,
          eloScore: store.eloScore,
          logs: store.logs,
          exams: store.exams,
          trophies: store.trophies,
          theme: store.theme,
        });
      }
    } catch (err: any) {
      setAuthError(parseAuthError(err.code));
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const signInWithEmail = useCallback(async (email: string, password: string, mode: AuthMode, displayName?: string) => {
    setAuthError(null);
    try {
      setIsLoading(true);
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(result.user, { displayName });
        if (store.profile) {
          await pushToFirestore(result.user.uid, {
            profile: store.profile,
            eloScore: store.eloScore,
            logs: store.logs,
            exams: store.exams,
            trophies: store.trophies,
            theme: store.theme,
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(parseAuthError(err.code));
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const signOut = useCallback(async () => {
    try {
      if (store.authUser && store.profile) {
        await pushToFirestore(store.authUser.uid, {
          profile: store.profile,
          eloScore: store.eloScore,
          logs: store.logs,
          exams: store.exams,
          trophies: store.trophies,
          theme: store.theme,
        });
      }
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('[Auth] Sign out error:', err);
    }
  }, [store]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  return {
    user: store.authUser,
    isLoading,
    authError,
    setAuthError,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    resetPassword,
  };
}

function parseAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
    'auth/wrong-password': 'Şifre yanlış.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/too-many-requests': 'Çok fazla deneme. Biraz bekle.',
    'auth/popup-closed-by-user': 'Google girişi iptal edildi.',
    'auth/network-request-failed': 'Bağlantı hatası. İnterneti kontrol et.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  };
  return map[code] ?? 'Bir hata oluştu. Tekrar dene.';
}
