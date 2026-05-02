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
import { OWNER_EMAIL } from '../config/owner';

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
        const tokenResult = await user.getIdTokenResult(true).catch(() => null);
        const mappedUser = { ...mapFirebaseUser(user), claims: tokenResult?.claims ?? {} };
        
        // ISOLATION: Clear any stale war room session from a previous user
        useAppStore.setState({ warRoomSession: null, warRoomTimeLeft: 0 });
        
        setAuthUser(mappedUser);
        
        if (user.email?.trim().toLowerCase() === OWNER_EMAIL) {
          fetch('/api/admin/bootstrap-owner', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-bootstrap-secret': import.meta.env.VITE_BOOTSTRAP_SECRET || 'BohoAdmin2024!_Secure'
            },
            body: JSON.stringify({ idToken: await user.getIdToken().catch(() => '') }),
          })
            .then(async (res) => {
              if (res.ok) {
                const refreshed = await user.getIdTokenResult(true);
                setAuthUser({ ...mapFirebaseUser(user), claims: refreshed.claims });
              }
            })
            .catch(() => {});
        }

        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
             await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                display_name: mappedUser.displayName,
                photo_url: mappedUser.photoURL,
                eloScore: 0, 
                streakDays: 0,
                bohoCoins: 0,
                economyLedger: [],
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
         const store = useAppStore.getState();
         
         // Batch updates to avoid multiple re-renders and use deep equality for large arrays
         const updates: any = {};
         const remoteUpdateAt = data.updated_at || data.lastLocalUpdateAt || '0';
         const localUpdateAt = store.lastLocalUpdateAt || '0';

         // CONFLICT RESOLUTION: If remote data is older than our last local change, ignore it.
         // This prevents "flickering" or data loss during sync races.
         if (new Date(remoteUpdateAt).getTime() < new Date(localUpdateAt).getTime()) {
           console.log('[Sync] Remote data is stale, keeping local version.');
           return;
         }

         const fields = [
           'profile', 'theme', 'eloScore', 'streakDays', 'bohoCoins', 
           'economyLedger', 'inventory', 'trophies', 'activeAlerts', 'isPassiveMode',
           'tytSubjects', 'aytSubjects', 'dailyAiRequests', 'lastCoachDirective',
           'coachMemory', 'unlockedAchievementIds', 'userAchievements'
         ];

         fields.forEach(field => {
           if (data[field] !== undefined) {
             const currentVal = (store as any)[field];
             let newVal = data[field];

             if (field === 'streakDays') {
               const remoteStreak = typeof newVal === 'number' ? newVal : 0;
               const localStreak = typeof currentVal === 'number' ? currentVal : 0;
               if (remoteStreak < localStreak) return;
             }

             if (field === 'profile' && currentVal && newVal) {
               const localActiveDays = Array.isArray(currentVal.activeDays) ? currentVal.activeDays : [];
               const remoteActiveDays = Array.isArray(newVal.activeDays) ? newVal.activeDays : [];
               newVal = {
                 ...currentVal,
                 ...newVal,
                 activeDays: Array.from(new Set([...localActiveDays, ...remoteActiveDays])).slice(-365),
                 usedStreakShieldDates: Array.from(new Set([
                   ...(Array.isArray(currentVal.usedStreakShieldDates) ? currentVal.usedStreakShieldDates : []),
                   ...(Array.isArray(newVal.usedStreakShieldDates) ? newVal.usedStreakShieldDates : []),
                 ])).slice(-365),
               };
             }
             
             if (JSON.stringify(currentVal) !== JSON.stringify(newVal)) {
               updates[field] = newVal;
             }
           }
         });

         if (Object.keys(updates).length > 0) {
           useAppStore.setState({ ...updates, lastLocalUpdateAt: remoteUpdateAt });
         }
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

  const lastSyncRequestedAt = useAppStore((s) => s.lastSyncRequestedAt);

  useEffect(() => {
    if (!authUser?.uid || lastSyncRequestedAt === 0) return;
    
    const performManualSync = async () => {
      console.log('[Sync] Manual sync triggered.');
      const userRef = doc(db, 'users', authUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const store = useAppStore.getState();
        const updates: any = {};
        
        const fields = [
          'profile', 'theme', 'eloScore', 'streakDays', 'bohoCoins', 
          'economyLedger', 'inventory', 'trophies', 'activeAlerts', 'isPassiveMode',
          'tytSubjects', 'aytSubjects', 'dailyAiRequests', 'lastCoachDirective',
          'coachMemory', 'unlockedAchievementIds', 'userAchievements'
        ];

        fields.forEach(field => {
          if (data[field] !== undefined) {
            if (JSON.stringify((store as any)[field]) !== JSON.stringify(data[field])) {
              updates[field] = data[field];
            }
          }
        });

        if (Object.keys(updates).length > 0) {
          useAppStore.setState({ ...updates, lastLocalUpdateAt: data.updated_at || data.lastLocalUpdateAt || new Date().toISOString() });
        }
      }
    };

    performManualSync();
  }, [lastSyncRequestedAt, authUser?.uid]);

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
