import { useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAppStore } from '../store/appStore';
import { parseAuthError } from '../utils/parseAuthError';
import { loginWithSpotify } from '../services/spotifyService';

type AuthMode = 'login' | 'register';

function mapFirebaseUser(user: FirebaseUser) {
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
  };
}

export function useAuth() {
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const authUser = useAppStore((s) => s.authUser);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const mappedUser = mapFirebaseUser(user);
        setAuthUser(mappedUser);

        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
             await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                display_name: mappedUser.displayName,
                photo_url: mappedUser.photoURL,
                eloScore: 1200, // Default ELO
                streakDays: 0,
                updated_at: new Date().toISOString(),
             }, { merge: true });
          }
        } catch (e) {
          console.warn('[Auth] User upsert error:', e);
        }
      } else {
        setAuthUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setAuthUser]);

  useEffect(() => {
    if (!authUser?.uid) return;
    const userRef = doc(db, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
         const data = docSnap.data();
         // Sadece verileri State'e yansıt (Loop engellemek için action çağırmıyoruz)
         useAppStore.setState({
           ...(data.profile && { profile: data.profile }),
           ...(data.theme && { theme: data.theme }),
           ...(data.eloScore !== undefined && { eloScore: data.eloScore }),
           ...(data.streakDays !== undefined && { streakDays: data.streakDays }),
           ...(data.trophies && { trophies: data.trophies }),
           ...(data.activeAlerts && { activeAlerts: data.activeAlerts }),
           ...(data.isPassiveMode !== undefined && { isPassiveMode: data.isPassiveMode }),
           ...(data.tytSubjects && { tytSubjects: data.tytSubjects }),
           ...(data.aytSubjects && { aytSubjects: data.aytSubjects }),
           ...(data.dailyAiRequests !== undefined && { dailyAiRequests: data.dailyAiRequests }),
           ...(data.lastCoachDirective && { lastCoachDirective: data.lastCoachDirective }),
           ...(data.coachMemory && { coachMemory: data.coachMemory }),
           ...(data.exams && { exams: data.exams }),
           ...(data.logs && { logs: data.logs }),
           ...(data.failedQuestions && { failedQuestions: data.failedQuestions }),
           ...(data.agendaEntries && { agendaEntries: data.agendaEntries }),
           ...(data.focusSessions && { focusSessions: data.focusSessions }),
           ...(data.flashcards && { flashcards: data.flashcards }),
           ...(data.unlockedAchievementIds && { unlockedAchievementIds: data.unlockedAchievementIds }),
           ...(data.userAchievements && { userAchievements: data.userAchievements }),
         });
      }
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setAuthError(parseAuthError(error.message));
    }
  }, []);

  const signInWithSpotify = useCallback(async () => {
    loginWithSpotify();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, mode: AuthMode, displayName?: string) => {
      setAuthError(null);
      setIsLoading(true);
      try {
        if (mode === 'register') {
          await createUserWithEmailAndPassword(auth, email, password);
          // displayName is not directly settable in creation this way without updating profile, skipping for now
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (error: any) {
        setAuthError(parseAuthError(error.message));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  return {
    user: authUser,
    isLoading,
    authError,
    setAuthError,
    signInWithGoogle,
    signInWithSpotify,
    signInWithEmail,
    signOut,
    resetPassword,
  };
}
