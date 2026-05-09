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
import { doc, onSnapshot, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAppStore } from '../store/appStore';
import { parseAuthError } from '../utils/parseAuthError';
import { loginWithSpotify } from '../services/spotifyService';
import { publishPublicProfileProjection } from '../services/publicProfile';

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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult(true).catch(() => null);
        const mappedUser = { ...mapFirebaseUser(user), claims: tokenResult?.claims ?? {} };
        
        // ISOLATION: Clear any stale war room session from a previous user
        useAppStore.setState({ warRoomSession: null, warRoomTimeLeft: 0 });
        
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
        setIsProfileLoading(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [setAuthUser]);


  useEffect(() => {
    if (!authUser?.uid) return;

    // Subcollection hydration
    const fetchSubcollections = async () => {
      try {
        const collectionsToFetch = ['logs', 'exams', 'failedQuestions', 'agendaEntries', 'focusSessions', 'flashcards'];
        const store = useAppStore.getState();
        const mergedData: any = {};
        let hasData = false;

        for (const col of collectionsToFetch) {
          const snap = await getDocs(collection(db, 'users', authUser.uid, col));
          if (!snap.empty) {
            mergedData[col] = snap.docs.map(d => d.data());
            hasData = true;
          }
        }

        if (hasData) {
          useAppStore.setState(mergedData);
          useAppStore.getState().recomputeFullElo();
          useAppStore.getState().recomputeStreak(false);
          
          const current = useAppStore.getState();
          publishPublicProfileProjection({
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            profile: current.profile,
            eloScore: current.eloScore,
            streakDays: current.streakDays,
            focusSessions: current.focusSessions,
            trophies: current.trophies,
            tytSubjects: current.tytSubjects,
            aytSubjects: current.aytSubjects,
            inventory: current.inventory,
          }).catch(console.error);
        }
      } catch (e) {
        console.warn('[Sync] Failed to fetch subcollections:', e);
      }
    };
    fetchSubcollections();

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
         // Ancak yerelde profil yoksa (ilk yükleme) mutlaka uzak veriyi kabul et.
         let shouldBypassStaleCheck = false;
         if (typeof data.streakDays === 'number' && data.streakDays > (store.streakDays || 0)) {
           shouldBypassStaleCheck = true;
           // Auto-backfill activeDays so the manual override persists through computeStudyStreak
           if (data.profile) {
             const neededDays = data.streakDays;
             const today = new Date();
             data.profile.activeDays = Array.isArray(data.profile.activeDays) ? data.profile.activeDays : [];
             for (let i = 0; i < neededDays; i++) {
               const d = new Date(today);
               d.setDate(d.getDate() - i);
               // Simple local YYYY-MM-DD
               const tzOffset = d.getTimezoneOffset() * 60000;
               const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
               if (!data.profile.activeDays.includes(localISOTime)) {
                 data.profile.activeDays.push(localISOTime);
               }
             }
           }
         }

         if (!shouldBypassStaleCheck && store.profile && new Date(remoteUpdateAt).getTime() < new Date(localUpdateAt).getTime()) {
           console.log('[Sync] Remote data is stale, keeping local version.');
           setIsProfileLoading(false);
           return;
         }

         const fields = [
           'profile', 'theme', 'eloScore', 'streakDays', 'bohoCoins', 
           'economyLedger', 'inventory', 'trophies', 'activeAlerts', 'isPassiveMode',
           'tytSubjects', 'aytSubjects', 'dailyAiRequests', 'lastCoachDirective',
           'coachMemory', 'unlockedAchievementIds', 'userAchievements',
           'logs', 'exams', 'failedQuestions', 'agendaEntries', 'focusSessions',
           'flashcards', 'chatHistory', 'directiveHistory'
         ];

         fields.forEach(field => {
           if (data[field] !== undefined) {
             const currentVal = (store as any)[field];
             let newVal = data[field];

             if (field === 'streakDays') {
               const remoteStreak = typeof newVal === 'number' ? newVal : 0;
               const localStreak = typeof currentVal === 'number' ? currentVal : 0;
               // Never pull down a higher local streak unless it's a legitimate break (0)
               if (remoteStreak < localStreak && remoteStreak !== 0) return;
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
      setIsProfileLoading(false);
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
      setIsAuthLoading(true);
      try {
        if (mode === 'register') {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (error: any) {
        setAuthError(parseAuthError(error.message));
      } finally {
        setIsAuthLoading(false);
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
          'coachMemory', 'unlockedAchievementIds', 'userAchievements',
          'logs', 'exams', 'failedQuestions', 'agendaEntries', 'focusSessions',
          'flashcards', 'chatHistory', 'directiveHistory'
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
    isLoading: isAuthLoading || isProfileLoading,
    authError,
    setAuthError,
    signInWithGoogle,
    signInWithSpotify,
    signInWithEmail,
    signOut,
    resetPassword,
  };
}
