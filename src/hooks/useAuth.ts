/**
 * AMAÇ: Supabase Authentication hook — Firebase useAuth'un tam karşılığı.
 * MANTIK: onAuthStateChange ile oturum senkronize, store'a AuthUser yazar.
 *         pullFromSupabase tüm kritik state alanlarını store'a basar.
 *         Admin kontrolü: users tablosundaki role alanından gelir.
 */

import { useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabaseClient';
import { pullFromSupabase, pushToSupabase } from '../services/supabaseSync';
import { buildSyncPayload } from '../services/syncSchema';
import { parseAuthError } from '../utils/parseAuthError';
import { useAppStore } from '../store/appStore';
import type { SupabaseUserData } from '../services/supabaseSync';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';

const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

function decompressSubjectsLocal(comp: any[], initial: any[]): any[] {
  if (!comp || !Array.isArray(comp) || comp.length === 0) return [...initial];
  if (typeof comp[0] !== 'string') return comp;

  const res = initial.map(s => ({...s}));
  comp.forEach(c => {
    if (typeof c !== 'string') return;
    const parts = c.split('|');
    const idx = parseInt(parts[0], 10);
    if (isNaN(idx) || !res[idx]) return;
    
    if (parts[1] === 'M') res[idx].status = 'mastered';
    else if (parts[1] === 'I') res[idx].status = 'in-progress';
    else if (parts[1] === 'N') { res[idx].status = 'not-started'; res[idx].notes = parts[2] || ''; }
  });
  return res;
}

type AuthMode = 'login' | 'register';

// ─── Apply cloud data to local store ─────────────────────────────────────────

function applyCloudDataToStore(incoming: Partial<SupabaseUserData> & { updated_at?: string }) {
  const current = useAppStore.getState();

  const localTime = current.lastLocalUpdateAt ? new Date(current.lastLocalUpdateAt).getTime() : 0;
  const cloudTime = incoming.updated_at ? new Date(incoming.updated_at).getTime() : 0;

  // CRDT Merge Strategy (SYNC-011): Eger Local data buluttan daha yeni ise (offline degisiklikler),
  // Buluttan indirmeyi reddet ve yukarı dogru PUSH(senkronizasyon) baslat.
  if (localTime > cloudTime + 5000) {
    if (current.authUser?.uid) {
       console.log('[SupabaseSync] Local is newer! Pushing to cloud instead of pulling.');
       pushToSupabase(current.authUser.uid, { ...current });
    }
    return;
  }

  if (incoming.profile) current.setProfile(incoming.profile);
  if (incoming.theme) current.setTheme(incoming.theme);

  if (incoming.eloScore !== undefined) {
    const delta = incoming.eloScore - current.eloScore;
    if (delta !== 0) current.addElo(delta);
  }

  useAppStore.setState({
    tytSubjects: incoming.tytSubjects && incoming.tytSubjects.length > 0 ? incoming.tytSubjects : current.tytSubjects,
    aytSubjects: incoming.aytSubjects && incoming.aytSubjects.length > 0 ? incoming.aytSubjects : current.aytSubjects,
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
    directiveHistory: Array.isArray(incoming.directiveHistory) ? incoming.directiveHistory : current.directiveHistory,
  });
}

// ─── Map Supabase User to AuthUser shape ──────────────────────────────────────

function mapSupabaseUser(user: User) {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    photoURL: user.user_metadata?.avatar_url ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const authUser = useAppStore((s) => s.authUser);
  const profile = useAppStore((s) => s.profile);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ─── Realtime auth state ────────────────────────────────────────────────────

  // SAFTY TIMEOUT: Prevent infinite loading screen
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sb = getSupabaseClient();

    const { data: { subscription } } = sb.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          setAuthUser(mappedUser);

          // Upsert user row on every sign-in so profile is always fresh
          try {
            await sb.from('users').upsert({
              uid: session.user.id,
              email: session.user.email ?? null,
              display_name: mappedUser.displayName,
              photo_url: mappedUser.photoURL,
              updated_at: new Date().toISOString(),
            } as never, { onConflict: 'uid' });
          } catch (e) {
            console.warn('[Auth] User upsert error:', e);
          }

          // Pull full data from Supabase
          try {
            const cloudData = await pullFromSupabase(session.user.id);
            if (cloudData) applyCloudDataToStore(cloudData);
          } catch (e) {
            console.warn('[Auth] Initial pull failed:', e);
          }
        } else {
          setAuthUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check existing session on mount
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) setIsLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, [setAuthUser]);

  // ─── Realtime subscription for users table ──────────────────────────────────

  useEffect(() => {
    if (!authUser?.uid) return;
    const sb = getSupabaseClient();

    const channel = sb
      .channel(`user-${authUser.uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `uid=eq.${authUser.uid}` },
        (payload) => {
          const u = payload.new as Record<string, unknown>;
          applyCloudDataToStore({
            updated_at: u.updated_at as string, // [CRITICAL FIX] Prevents infinite push loop!
            profile: u.profile as SupabaseUserData['profile'],
            tytSubjects: decompressSubjectsLocal((u.tyt_subjects as any[]) || [], INITIAL_TYT),
            aytSubjects: decompressSubjectsLocal((u.ayt_subjects as any[]) || [], INITIAL_AYT),
            eloScore: u.elo_score as number,
            streakDays: u.streak_days as number,
            theme: u.theme as SupabaseUserData['theme'],
            trophies: u.trophies as SupabaseUserData['trophies'],
            isPassiveMode: u.is_passive_mode as boolean,
            activeAlerts: u.active_alerts as SupabaseUserData['activeAlerts'],
            subjectViewMode: u.subject_view_mode as SupabaseUserData['subjectViewMode'],
            coachMemory: u.coach_memory as SupabaseUserData['coachMemory'],
            lastCoachDirective: u.last_coach_directive as SupabaseUserData['lastCoachDirective'],
          });
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [authUser?.uid]);

  // ─── Auth Actions ───────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const sb = getSupabaseClient();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin + '/', 
        queryParams: { prompt: 'select_account' } 
      },
    });
    if (error) setAuthError(parseAuthError(error.message));
  }, []);

  const signInWithSpotify = useCallback(async () => {
    setAuthError(null);
    const sb = getSupabaseClient();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: 'user-read-email user-read-private', // Minimum scopes required to login
        redirectTo: window.location.origin + '/',
      },
    });
    if (error) setAuthError(parseAuthError(error.message));
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, mode: AuthMode, displayName?: string) => {
      setAuthError(null);
      setIsLoading(true);
      const sb = getSupabaseClient();
      try {
        if (mode === 'register') {
          const { error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { full_name: displayName ?? '' } },
          });
          if (error) { setAuthError(parseAuthError(error.message)); return; }
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) { setAuthError(parseAuthError(error.message)); return; }
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    const uid = useAppStore.getState().authUser?.uid;
    if (uid) {
      const state = useAppStore.getState();
      const { root, entities } = buildSyncPayload(state);
      await pushToSupabase(uid, { ...root, ...entities } as Partial<SupabaseUserData>);
    }
    await getSupabaseClient().auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return !error;
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
