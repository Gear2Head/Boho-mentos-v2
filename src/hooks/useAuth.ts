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
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { useAppStore } from '../store/appStore';
import {
  pullFromFirestore,
  pushToFirestore,
  mergeRemoteDocsWithLocal,
} from '../services/firestoreSync';
import { parseAuthError } from '../utils/parseAuthError';
import { buildSyncPayload } from '../services/syncSchema';
import type { FirestoreUserData } from '../services/firestoreSync';

type AuthMode = 'login' | 'register';

/** Full pull from pullFromFirestore (includes subcollections + legacy root arrays). */
function applyCloudDataToStore(incoming: Partial<FirestoreUserData>) {
  const current = useAppStore.getState();

  if (incoming.profile) current.setProfile(incoming.profile);
  if (incoming.theme) current.setTheme(incoming.theme);

  if (incoming.eloScore !== undefined) {
    const delta = incoming.eloScore - current.eloScore;
    if (delta !== 0) current.addElo(delta);
  }

  // SYNC-001 OPTIMIZATION: Buluttan gelen veri her zaman "Truth" kabul edilir.
  // Not: incoming[key] === undefined ise buluttan çekilememiştir; bu durumda yereli koru.
  useAppStore.setState({
    tytSubjects: incoming.tytSubjects !== undefined
      ? incoming.tytSubjects
      : current.tytSubjects,
    aytSubjects: incoming.aytSubjects !== undefined
      ? incoming.aytSubjects
      : current.aytSubjects,
    logs: Array.isArray(incoming.logs) ? incoming.logs : current.logs,
    exams: Array.isArray(incoming.exams) ? incoming.exams : current.exams,
    failedQuestions: Array.isArray(incoming.failedQuestions) ? incoming.failedQuestions : current.failedQuestions,
    agendaEntries: Array.isArray(incoming.agendaEntries) ? incoming.agendaEntries : current.agendaEntries,
    focusSessions: Array.isArray(incoming.focusSessions) ? incoming.focusSessions : current.focusSessions,
    trophies: incoming.trophies !== undefined ? incoming.trophies : current.trophies,
    streakDays: incoming.streakDays ?? current.streakDays,
    isPassiveMode: incoming.isPassiveMode ?? current.isPassiveMode,
    activeAlerts: incoming.activeAlerts !== undefined ? incoming.activeAlerts : current.activeAlerts,
    chatHistory: Array.isArray(incoming.chatHistory) ? incoming.chatHistory : current.chatHistory,
    subjectViewMode: incoming.subjectViewMode ?? current.subjectViewMode,
    coachMemory: incoming.coachMemory !== undefined ? incoming.coachMemory : current.coachMemory,
    lastCoachDirective: incoming.lastCoachDirective !== undefined ? incoming.lastCoachDirective : current.lastCoachDirective,
  });
}

/** Realtime root doc only — entity arrays live in subcollections. */
const ROOT_RT_FIELDS: Array<keyof FirestoreUserData> = [
  'profile',
  'tytSubjects',
  'aytSubjects',
  'trophies',
  'eloScore',
  'streakDays',
  'theme',
  'isPassiveMode',
  'activeAlerts',
  'subjectViewMode',
  'coachMemory',
  'lastCoachDirective',
];

function applyRootCloudDataToStore(incoming: Partial<FirestoreUserData>) {
  const current = useAppStore.getState();

  if (incoming.profile) current.setProfile(incoming.profile);
  if (incoming.theme) current.setTheme(incoming.theme);

  if (incoming.eloScore !== undefined) {
    const delta = incoming.eloScore - current.eloScore;
    if (delta !== 0) current.addElo(delta);
  }

  // SYNC-001 OPTIMIZATION: Realtime root listener.
  useAppStore.setState({
    tytSubjects: incoming.tytSubjects !== undefined
      ? incoming.tytSubjects
      : current.tytSubjects,
    aytSubjects: incoming.aytSubjects !== undefined
      ? incoming.aytSubjects
      : current.aytSubjects,
    trophies: incoming.trophies !== undefined ? incoming.trophies : current.trophies,
    streakDays: incoming.streakDays ?? current.streakDays,
    isPassiveMode: incoming.isPassiveMode ?? current.isPassiveMode,
    activeAlerts: incoming.activeAlerts !== undefined ? incoming.activeAlerts : current.activeAlerts,
    subjectViewMode: incoming.subjectViewMode ?? current.subjectViewMode,
    coachMemory: incoming.coachMemory !== undefined ? incoming.coachMemory : current.coachMemory,
    lastCoachDirective: incoming.lastCoachDirective !== undefined ? incoming.lastCoachDirective : current.lastCoachDirective,
  });
}

const ENTITY_SUB_LISTENERS: Array<{
  collectionName: string;
  storeKey: keyof Pick<
    FirestoreUserData,
    | 'logs'
    | 'exams'
    | 'failedQuestions'
    | 'agendaEntries'
    | 'focusSessions'
    | 'chatHistory'
  >;
}> = [
  { collectionName: 'logs', storeKey: 'logs' },
  { collectionName: 'exams', storeKey: 'exams' },
  { collectionName: 'failedQuestions', storeKey: 'failedQuestions' },
  { collectionName: 'agendaEntries', storeKey: 'agendaEntries' },
  { collectionName: 'focusSessions', storeKey: 'focusSessions' },
  { collectionName: 'chatMessages', storeKey: 'chatHistory' },
];

export function useAuth() {
  const authUser = useAppStore(s => s.authUser);
  const profile = useAppStore(s => s.profile);
  const setAuthUser = useAppStore(s => s.setAuthUser);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeFns: Array<() => void> = [];

    console.log('[Auth] Initializing auth state listener...');

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] onAuthStateChanged:', firebaseUser?.email || 'null');
      if (firebaseUser) {
        unsubscribeFns.forEach((u) => u());
        unsubscribeFns.length = 0;

        setAuthUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        try {
          const cloudData = await pullFromFirestore(firebaseUser.uid);
          if (cloudData) {
            applyCloudDataToStore(cloudData);
          }
        } catch (e) {
          console.warn('[Auth] Initial pull failed:', e);
        }

        unsubscribeFns.push(
          onSnapshot(
            doc(db, 'users', firebaseUser.uid),
            { includeMetadataChanges: true },
            (docSnap) => {
              if (!docSnap.exists()) {
                console.warn('[Auth] No user doc found in Firestore for UID:', firebaseUser.uid);
                return;
              }
              const { isSyncing } = useAppStore.getState();
              if (isSyncing || docSnap.metadata.hasPendingWrites) return;

              const rtData = docSnap.data() as Partial<FirestoreUserData>;
              const partial: Partial<FirestoreUserData> = {};
              for (const key of ROOT_RT_FIELDS) {
                if (rtData[key] !== undefined) (partial as Record<string, unknown>)[key as string] = rtData[key];
              }
              if (Object.keys(partial).length > 0) applyRootCloudDataToStore(partial);
            },
            (error) => {
              console.error('[Auth] Root doc listener error:', error);
              if (error.code === 'permission-denied') {
                console.warn('[Auth] Critcal: Permission denied for user root doc. Check Firestore Rules.');
              }
            }
          )
        );

        for (const { collectionName, storeKey } of ENTITY_SUB_LISTENERS) {
          unsubscribeFns.push(
            onSnapshot(
              collection(db, 'users', firebaseUser.uid, collectionName),
              { includeMetadataChanges: true },
              (snap) => {
                if (snap.metadata.hasPendingWrites) return;
                const { isSyncing } = useAppStore.getState();
                if (isSyncing) return;
                const local = useAppStore.getState()[storeKey] as unknown[];
                const merged = mergeRemoteDocsWithLocal(
                  local as Parameters<typeof mergeRemoteDocsWithLocal>[0],
                  snap.docs
                );
                useAppStore.setState({ [storeKey]: merged } as Record<string, unknown>);
              },
              (error) => {
                console.error(`[Auth] Sub-collection listener error (${collectionName}):`, error);
              }
            )
          );
        }

        try {
          const token = await firebaseUser.getIdTokenResult();
          const claims = token.claims as Record<string, unknown>;
          const isSuperAdmin = claims.superAdmin === true;
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: isSuperAdmin ? 'super_admin' : 'standard',
              lastSignedInAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('[Auth] User doc sync error:', e);
        }
      } else {
        unsubscribeFns.forEach((u) => u());
        unsubscribeFns.length = 0;
        setAuthUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFns.forEach((u) => u());
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      setIsLoading(true);
      console.log('[Auth] Starting Google Sign-In via Popup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[Auth] Popup success for:', result.user.email);
    } catch (err: unknown) {
      console.error('[Auth] Popup error:', err);
      const code = (err as { code?: string }).code;
      setAuthError(parseAuthError(code ?? ''));
      setIsLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string, mode: AuthMode, displayName?: string) => {
    setAuthError(null);
    try {
      setIsLoading(true);
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(result.user, { displayName });
        if (profile) {
          const state = useAppStore.getState();
          const { root, entities } = buildSyncPayload(state);
          await pushToFirestore(result.user.uid, { ...root, ...entities });
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
  }, [profile]);

  const signOut = useCallback(async () => {
    try {
      const currentUid = useAppStore.getState().authUser?.uid;
      if (currentUid) {
        const state = useAppStore.getState();
        const { root, entities } = buildSyncPayload(state);
        await pushToFirestore(currentUid, { ...root, ...entities });
      }
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('[Auth] Sign out error:', err);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    user: authUser,
    isLoading,
    authError,
    setAuthError,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    resetPassword,
  };
}
