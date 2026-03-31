/**
 * AMAÇ: Firestore senkronizasyon servisi — okuma, yazma ve migration
 * MANTIK: pushToFirestore debounce 2s ile tetiklenir, pull tüm store'u günceller
 * UYARI: Avatar Base64 büyük olabilir — Firestore 1MB döküman limiti. Avatar ayrı saklanır.
 */

import {
  doc, getDoc, setDoc, collection, getDocs,
  writeBatch, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  StudentProfile, DailyLog, ExamResult, FailedQuestion,
  SubjectStatus, ChatMessage, AgendaEntry, FocusSessionRecord, Trophy
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
}

export async function pushToFirestore(uid: string, data: Partial<FirestoreUserData>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const payload: any = { ...data, updatedAt: serverTimestamp() };
    
    // Avatarı Firebase döküman 1MB limitinden ve yazma yükünden korumak için Cloud'a yollarken büyükse at
    if (payload.profile?.avatar && payload.profile.avatar.length > 50000) {
      payload.profile = { ...payload.profile };
      delete payload.profile.avatar;
    }

    // Her debounced tetiklenmede tam olarak SADECE 1 Write kotası harcar! (20K Single limitine çok uygun)
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Push failed:', err);
  }
}

export async function pullFromFirestore(uid: string): Promise<FirestoreUserData | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;
    
    // Tek okuma ile (1 Read kotası) tüm state geri gelir
    const userData = userSnap.data();

    return {
      profile: userData.profile ?? null,
      tytSubjects: userData.tytSubjects ?? [],
      aytSubjects: userData.aytSubjects ?? [],
      eloScore: userData.eloScore ?? 0,
      streakDays: userData.streakDays ?? 0,
      theme: userData.theme ?? 'dark',
      subjectViewMode: userData.subjectViewMode ?? 'map',
      trophies: userData.trophies ?? [],
      chatHistory: userData.chatHistory ?? [],
      focusSessions: userData.focusSessions ?? [],
      logs: userData.logs ?? [],
      exams: userData.exams ?? [],
      failedQuestions: userData.failedQuestions ?? [],
      agendaEntries: userData.agendaEntries ?? [],
    };
  } catch (err) {
    console.warn('[Firestore] Pull failed:', err);
    return null;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedPush(uid: string, data: Partial<FirestoreUserData>, delayMs = 2000): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pushToFirestore(uid, data);
    debounceTimer = null;
  }, delayMs);
}
