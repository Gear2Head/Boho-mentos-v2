/**
 * AMAÇ: DM Yazıyor ve Görüldü micro-feedback hook'u.
 * MANTIK: Firestore realtime typing flag + readAt timestamp.
 */

import { useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface TypingStatus {
  isTyping: boolean;
  updatedAt?: unknown;
}

export function useTypingIndicator(chatRoomId: string | null, myUid: string | null) {
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTyping = useCallback((typing: boolean) => {
    if (!chatRoomId || !myUid) return;
    const ref = doc(db, 'global_chats', chatRoomId, 'typing', myUid);
    setDoc(ref, { isTyping: typing, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [chatRoomId, myUid]);

  const onInputChange = useCallback(() => {
    setTyping(true);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => setTyping(false), 2000);
  }, [setTyping]);

  // Çıkışta typing'i false yap
  useEffect(() => {
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
      setTyping(false);
    };
  }, [setTyping]);

  return { onInputChange };
}

export function useOtherUserTyping(
  chatRoomId: string | null,
  otherUid: string | null,
  onTypingChange: (isTyping: boolean) => void
) {
  useEffect(() => {
    if (!chatRoomId || !otherUid) return;
    const ref = doc(db, 'global_chats', chatRoomId, 'typing', otherUid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { onTypingChange(false); return; }
      const data = snap.data() as TypingStatus;
      onTypingChange(data.isTyping ?? false);
    });
    return () => unsub();
  }, [chatRoomId, otherUid, onTypingChange]);
}
