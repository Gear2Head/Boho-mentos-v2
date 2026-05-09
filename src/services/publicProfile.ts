import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { cleanForFirestore } from '../utils/firebaseHelpers';
import type { StudentProfile, Trophy, SubjectStatus } from '../types';

export interface PublicProfileProjection {
  uid: string;
  name: string;
  avatar?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  track?: string | null;
  targetUniversity?: string | null;
  targetMajor?: string | null;
  targetProgram?: string | null;
  eloScore: number;
  streakDays: number;
  totalFocusMinutes: number;
  profile?: Partial<StudentProfile>;
  trophies?: Trophy[];
  tytSubjects?: SubjectStatus[];
  aytSubjects?: SubjectStatus[];
  inventory?: unknown;
  updatedAt: string;
}

export function buildPublicProfileProjection(state: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  profile?: StudentProfile | null;
  eloScore?: number;
  streakDays?: number;
  focusSessions?: unknown[];
  trophies?: Trophy[];
  tytSubjects?: SubjectStatus[];
  aytSubjects?: SubjectStatus[];
  inventory?: unknown;
}): PublicProfileProjection {
  const profile = state.profile ?? null;
  const totalFocusMinutes = (state.focusSessions ?? []).reduce((sum, session) => {
    const record = session as { durationMinutes?: number; duration?: number; minutes?: number };
    return sum + (Number(record.durationMinutes ?? record.duration ?? record.minutes ?? 0) || 0);
  }, 0);

  return {
    uid: state.uid,
    name: profile?.name || state.displayName || 'Savaşçı',
    avatar: profile?.avatar ?? state.photoURL ?? null,
    displayName: state.displayName ?? null,
    photoURL: state.photoURL ?? null,
    track: profile?.track ?? null,
    targetUniversity: profile?.targetUniversity ?? null,
    targetMajor: profile?.targetMajor ?? null,
    targetProgram: (profile as { targetProgram?: string } | null)?.targetProgram ?? profile?.targetMajor ?? null,
    eloScore: Number(state.eloScore ?? 0) || 0,
    streakDays: Number(state.streakDays ?? 0) || 0,
    totalFocusMinutes,
    profile: profile
      ? {
          name: profile.name,
          avatar: profile.avatar,
          track: profile.track,
          examYear: profile.examYear,
          targetUniversity: profile.targetUniversity,
          targetMajor: profile.targetMajor,
          targetGoals: profile.targetGoals,
          tytTarget: profile.tytTarget,
          aytTarget: profile.aytTarget,
          motivationQuote: profile.motivationQuote,
          dailyGoalHours: profile.dailyGoalHours,
        }
      : undefined,
    trophies: state.trophies ?? [],
    tytSubjects: state.tytSubjects ?? [],
    aytSubjects: state.aytSubjects ?? [],
    inventory: state.inventory ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishPublicProfileProjection(state: Parameters<typeof buildPublicProfileProjection>[0]): Promise<void> {
  const projection = buildPublicProfileProjection(state);
  await setDoc(doc(db, 'publicProfiles', state.uid), cleanForFirestore(projection), { merge: true });
}
