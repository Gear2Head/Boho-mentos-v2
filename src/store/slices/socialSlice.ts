import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { Conversation, ChatMessage, AppNotification } from '../../types';
import { doc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { cleanForFirestore } from "../../utils/firebaseHelpers";
import { setDocWithOfflineQueue, deleteDocWithOfflineQueue } from "../../services/firestoreWriteQueue";

export interface SocialSlice {
  conversations: Conversation[];
  activeConversationId: string | null;
  notifications: AppNotification[];
  dailyQuestsGeneratedDate: string;
  dailyAiRequests: number;
  lastAiRequestDate: string;
  chatHistory: ChatMessage[]; // [LEGACY COMPAT]

  // Actions
  addChatMessage: (message: ChatMessage) => void;
  createNewConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;

  // Legacy cleanup
  migrateLegacyChat: () => void;

  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  setDailyQuestsGeneratedDate: (date: string) => void;
  incrementAiRequest: () => void;

  // Ghost Rivals
  ghostRival: import('../../types/coach').GhostRival | null;
  generateGhostRival: () => void;
  
  // Direct Messaging
  directMessages: Record<string, ChatMessage[]>;
  sendDirectMessage: (toUid: string, content: string) => void;
}

export const createSocialSlice: StateCreator<AppState, [], [], SocialSlice> = (set, get) => ({
  conversations: [],
  activeConversationId: null,
  notifications: [],
  dailyQuestsGeneratedDate: '',
  dailyAiRequests: 0,
  lastAiRequestDate: new Date().toISOString().split('T')[0],
  chatHistory: [],
  ghostRival: null,

  generateGhostRival: () => {
    const { eloScore } = get();
    // ELO'ya %5 toleransla rakip üret
    const variance = eloScore * 0.05;
    const rivalElo = Math.floor(eloScore + (Math.random() * variance * 2 - variance));

    // Rastgele isimler
    const names = ["Azra Nisa", "Jhonny Sins", "Kübra Nisa", "Mezun_2025", "Asrin Ak", "Orhan Erdemir"];
    const randomName = names[Math.floor(Math.random() * names.length)];

    // TYT/AYT tahminleri (kabaca ELO'ya göre)
    const baseNet = Math.min(120, Math.max(30, rivalElo / 20));

    set({
      ghostRival: {
        id: `rival_${Date.now()}`,
        name: randomName,
        eloScore: rivalElo,
        tytNet: Math.floor(baseNet + (Math.random() * 10 - 5)),
        aytNet: Math.floor((baseNet * 0.8) + (Math.random() * 10 - 5)),
        streakDays: Math.floor(Math.random() * 14),
        source: 'community_avg'
      }
    });
  },

  migrateLegacyChat: () => {
    const s = get() as any;
    if (s.chatHistory && s.chatHistory.length > 0 && s.conversations.length === 0) {
      const legacyConv: Conversation = {
        id: 'legacy_genel',
        title: 'Genel Sohbet',
        updatedAt: new Date().toISOString(),
        messages: s.chatHistory,
      };
      set({
        conversations: [legacyConv],
        activeConversationId: 'legacy_genel',
        // Clear old array to avoid re-migration
        chatHistory: []
      } as any);
    } else if (get().conversations.length > 0 && !get().activeConversationId) {
      set({ activeConversationId: get().conversations[0].id });
    }
  },

  setActiveConversation: (id) => {
    const conv = get().conversations.find(c => c.id === id);
    set({ activeConversationId: id, chatHistory: conv?.messages || [] });
  },

  createNewConversation: (title) => {
    const id = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id,
      title: title || `Yeni Sohbet ${get().conversations.length + 1}`,
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    set(state => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: id
    }));
    return id;
  },

  deleteConversation: (id) => {
    const { authUser, activeConversationId, conversations } = get();
    const newConvs = conversations.filter(c => c.id !== id);
    let nextActive = activeConversationId;
    if (activeConversationId === id) {
      nextActive = newConvs.length > 0 ? newConvs[0].id : null;
    }
    set({ conversations: newConvs, activeConversationId: nextActive });

    if (authUser?.uid) {
      deleteDocWithOfflineQueue(doc(db, 'users', authUser.uid, 'chatHistory', id)).catch(console.error);
    }
  },

  renameConversation: (id, title) => {
    set(state => ({
      conversations: state.conversations.map(c => c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c)
    }));
  },

  addChatMessage: (message) => {
    const { authUser, activeConversationId, conversations } = get();
    let targetId = activeConversationId;

    // Auto-create if none active
    if (!targetId) {
      targetId = `conv_${Date.now()}`;
      const firstConv: Conversation = {
        id: targetId,
        title: 'İlk Sohbet',
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      set({ conversations: [firstConv], activeConversationId: targetId });
    }

    const newMessage: ChatMessage = {
      ...message,
      id: message.id ?? `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === targetId
          ? { ...c, messages: [...c.messages, newMessage].slice(-100), updatedAt: new Date().toISOString(), lastMessage: message.content.slice(0, 50) }
          : c
      )
    }));

    if (authUser?.uid && targetId) {
      setDocWithOfflineQueue(doc(db, 'users', authUser.uid, 'chatHistory', targetId, 'messages', newMessage.id), cleanForFirestore(newMessage)).catch(console.error);
      setDocWithOfflineQueue(doc(db, 'users', authUser.uid, 'chatHistory', targetId), cleanForFirestore({
        id: targetId,
        updatedAt: new Date().toISOString(),
        lastMessage: message.content.slice(0, 50)
      }), { merge: true }).catch(console.error);
    }
    // Update legacy pointer
    const active = get().conversations.find(c => c.id === targetId);
    set({ chatHistory: active?.messages || [] });
  },

  addNotification: (notif) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    set(state => ({ notifications: [newNotif, ...state.notifications].slice(0, 50) }));
  },

  markNotificationAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  },

  clearNotifications: () => set({ notifications: [] }),

  setDailyQuestsGeneratedDate: (date) => set({ dailyQuestsGeneratedDate: date }),

  incrementAiRequest: () => {
    const { authUser, dailyAiRequests, lastAiRequestDate } = get();
    const today = new Date().toISOString().split('T')[0];
    const newCount = lastAiRequestDate === today ? dailyAiRequests + 1 : 1;
    set({ dailyAiRequests: newCount, lastAiRequestDate: today });
    if (authUser?.uid) {
      setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ dailyAiRequests: newCount, lastAiRequestDate: today }), { merge: true }).catch(console.error);
    }
  },

  directMessages: {},
  sendDirectMessage: (toUid, content) => {
    const { authUser, directMessages } = get();
    if (!authUser) return;

    const newMessage: ChatMessage = {
      id: `dm_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      senderId: authUser.uid
    } as ChatMessage;

    const updated = { ...directMessages };
    updated[toUid] = [...(updated[toUid] || []), newMessage];

    set({ directMessages: updated });

    // Firestore sync
    const participants = [authUser.uid, toUid].sort();
    const chatRoomId = participants.join('_');
    setDocWithOfflineQueue(doc(db, 'global_chats', chatRoomId), cleanForFirestore({
      participants,
      lastMessage: content,
      updatedAt: new Date().toISOString()
    }), { merge: true })
      .then(() => setDocWithOfflineQueue(doc(db, 'global_chats', chatRoomId, 'messages', newMessage.id), cleanForFirestore(newMessage)))
      .catch(console.error);
  },
});



