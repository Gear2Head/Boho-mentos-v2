/**
 * AMAÇ: Firebase Authentication hook — giriş, çıkış, oturum takibi
 * MANTIK: onAuthStateChanged ile oturum senkronize, store'a AuthUser yazar.
 *         onSnapshot hasPendingWrites kontrolü ile infinite-loop engellenir.
 *         pullFromFirestore tüm kritik state alanlarını store'a basar.
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
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAppStore } from '../store/appStore';
import { pullFromFirestore, pushToFirestore } from '../services/firestoreSync';
import { parseAuthError } from '../utils/parseAuthError';
import type { FirestoreUserData } from '../services/firestoreSync';

type AuthMode = 'login' | 'register';

const SYNC_FIELDS: Array<keyof FirestoreUserData> = [
  'profile', 'tytSubjects', 'aytSubjects', 'logs', 'exams',
  'failedQuestions', 'agendaEntries', 'focusSessions', 'trophies',
  'eloScore', 'streakDays', 'theme', 'chatHistory',
  'isPassiveMode', 'activeAlerts',
];

function applyCloudDataToStore(incoming: Partial<FirestoreUserData>) {
  const current = useAppStore.getState();

  if (incoming.profile) current.setProfile(incoming.profile);
  if (incoming.theme) current.setTheme(incoming.theme);

  if (incoming.eloScore !== undefined) {
    const delta = incoming.eloScore - current.eloScore;
    if (delta !== 0) current.addElo(delta);
  }

  useAppStore.setState({
    tytSubjects: incoming.tytSubjects?.length ? incoming.tytSubjects : current.tytSubjects,
    aytSubjects: incoming.aytSubjects?.length ? incoming.aytSubjects : current.aytSubjects,
    logs: incoming.logs ?? current.logs,
    exams: incoming.exams ?? current.exams,
    failedQuestions: incoming.failedQuestions ?? current.failedQuestions,
    agendaEntries: incoming.agendaEntries ?? current.agendaEntries,
    focusSessions: incoming.focusSessions ?? current.focusSessions,
    trophies: incoming.trophies?.length ? incoming.trophies : current.trophies,
    streakDays: incoming.streakDays ?? current.streakDays,
    isPassiveMode: incoming.isPassiveMode ?? current.isPassiveMode,
    activeAlerts: incoming.activeAlerts ?? current.activeAlerts,
    chatHistory: incoming.chatHistory ?? current.chatHistory,
  });
}

export function useAuth() {
  const store = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        store.setAuthUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        const cloudData = await pullFromFirestore(firebaseUser.uid);
        if (cloudData) {
          applyCloudDataToStore(cloudData);
        }

        unsubscribeSnapshot = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          { includeMetadataChanges: true },
          (docSnap) => {
            if (!docSnap.exists()) return;
            if (docSnap.metadata.hasPendingWrites) return;

            const rtData = docSnap.data() as Partial<FirestoreUserData>;
            const partial: Partial<FirestoreUserData> = {};
            for (const key of SYNC_FIELDS) {
              if (rtData[key] !== undefined) {
                (partial as Record<string, unknown>)[key] = rtData[key];
              }
            }
            if (Object.keys(partial).length > 0) {
              applyCloudDataToStore(partial);
            }
          }
        );

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
          console.warn('[Auth] User doc sync error:', e);
        }
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        store.resetStore();
        store.setAuthUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const buildFullSnapshot = useCallback((): Partial<FirestoreUserData> => {
    const s = useAppStore.getState();
    return {
      profile: s.profile ?? undefined,
      tytSubjects: s.tytSubjects,
      aytSubjects: s.aytSubjects,
      logs: s.logs,
      exams: s.exams,
      failedQuestions: s.failedQuestions,
      agendaEntries: s.agendaEntries,
      focusSessions: s.focusSessions,
      trophies: s.trophies,
      eloScore: s.eloScore,
      streakDays: s.streakDays,
      theme: s.theme,
      chatHistory: s.chatHistory,
      isPassiveMode: s.isPassiveMode,
      activeAlerts: s.activeAlerts,
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const cloudData = await pullFromFirestore(user.uid);
      if (!cloudData?.profile && store.profile) {
        await pushToFirestore(user.uid, buildFullSnapshot());
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setAuthError(parseAuthError(code ?? ''));
    } finally {
      setIsLoading(false);
    }
  }, [store, buildFullSnapshot]);

  const signInWithEmail = useCallback(async (email: string, password: string, mode: AuthMode, displayName?: string) => {
    setAuthError(null);
    try {
      setIsLoading(true);
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(result.user, { displayName });
        if (store.profile) {
          await pushToFirestore(result.user.uid, buildFullSnapshot());
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setAuthError(parseAuthError(code ?? ''));
    } finally {
      setIsLoading(false);
    }
  }, [store, buildFullSnapshot]);

  const signOut = useCallback(async () => {
    try {
      const currentUid = useAppStore.getState().authUser?.uid;
      if (currentUid) {
        await pushToFirestore(currentUid, buildFullSnapshot());
      }
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('[Auth] Sign out error:', err);
    }
  }, [buildFullSnapshot]);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch {
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
