/**
 * AMAÇ: Firestore senkronizasyon servisi — okuma, yazma ve migration
 * MANTIK: pushToFirestore debounce 2s ile tetiklenir, pull tüm store'u günceller
 * UYARI: Avatar Base64 büyük olabilir — Firestore 1MB döküman limiti. Avatar ayrı saklanır.
 */

import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  StudentProfile, DailyLog, ExamResult, FailedQuestion,
  SubjectStatus, ChatMessage, AgendaEntry, FocusSessionRecord, Trophy, HabitAlert
} from '../types';

export interface FirestoreUserData {
  profile: StudentProfile | null;
  tytSubjects: SubjectStatus[];
  aytSubjects: SubjectStatus[];
  logs: DailyLog[];
  exams: ExamResult[];
  failedQuestions: FailedQuestion[];
  agendaEntries: AgendaEntry[];
  focusSessions: FocusSessionRecord[];
  trophies: Trophy[];
  eloScore: number;
  streakDays: number;
  theme: 'light' | 'dark';
  subjectViewMode: 'list' | 'map';
  chatHistory: ChatMessage[];
  isPassiveMode: boolean;
  activeAlerts: HabitAlert[];
}

const EXCLUDED_KEYS = new Set([
  'warRoomSession',
  'warRoomAnswers',
  'warRoomEliminated',
  'warRoomTimeLeft',
  'warRoomMode',
  'isFocusSidePanelOpen',
  'qaSession',
  'drawingMode',
  'authUser',
  'isDevMode',
  'subjectViewMode',
  'isSyncing',
  'lastSyncAt',
]);

export async function pushToFirestore(uid: string, data: Partial<FirestoreUserData>, onComplete?: () => void): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const payload: Record<string, unknown> = { 
      updatedAt: serverTimestamp(),
      lastSyncAt: new Date().toISOString()
    };

    for (const [key, value] of Object.entries(data)) {
      if (EXCLUDED_KEYS.has(key)) continue;
      payload[key] = value;
    }

    if (payload.profile && typeof payload.profile === 'object') {
      const profileObj = payload.profile as Record<string, unknown>;
      if (typeof profileObj.avatar === 'string' && profileObj.avatar.length > 50000) {
        payload.profile = { ...profileObj };
        delete (payload.profile as Record<string, unknown>).avatar;
      }
    }

    await setDoc(userRef, payload, { merge: true });
    if (onComplete) onComplete();
  } catch (err) {
    console.warn('[Firestore] Push failed:', err);
  }
}

export async function pullFromFirestore(uid: string): Promise<FirestoreUserData | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const d = userSnap.data();

    return {
      profile: d.profile ?? null,
      tytSubjects: d.tytSubjects ?? [],
      aytSubjects: d.aytSubjects ?? [],
      eloScore: d.eloScore ?? 0,
      streakDays: d.streakDays ?? 0,
      theme: d.theme ?? 'dark',
      subjectViewMode: d.subjectViewMode ?? 'map',
      trophies: d.trophies ?? [],
      chatHistory: d.chatHistory ?? [],
      focusSessions: d.focusSessions ?? [],
      logs: d.logs ?? [],
      exams: d.exams ?? [],
      failedQuestions: d.failedQuestions ?? [],
      agendaEntries: d.agendaEntries ?? [],
      isPassiveMode: d.isPassiveMode ?? false,
      activeAlerts: d.activeAlerts ?? [],
    };
  } catch (err) {
    console.warn('[Firestore] Pull failed:', err);
    return null;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedPush(uid: string, data: Partial<FirestoreUserData>, onComplete?: () => void, delayMs = 2500): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pushToFirestore(uid, data, onComplete);
    debounceTimer = null;
  }, delayMs);
}
