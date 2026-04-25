import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { Conversation, ChatMessage, AppNotification } from '../../types';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

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
}

export const createSocialSlice: StateCreator<AppState, [], [], SocialSlice> = (set, get) => ({
  conversations: [],
  activeConversationId: null,
  notifications: [],
  dailyQuestsGeneratedDate: '',
  dailyAiRequests: 0,
  lastAiRequestDate: new Date().toISOString().split('T')[0],
  chatHistory: [],

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
      deleteDoc(doc(db, 'users', authUser.uid, 'chatHistory', id)).catch(console.error);
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
      setDoc(doc(db, 'users', authUser.uid, 'chatHistory', targetId, 'messages', newMessage.id), newMessage).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid, 'chatHistory', targetId), { 
        id: targetId, 
        updatedAt: new Date().toISOString(),
        lastMessage: message.content.slice(0, 50)
      }, { merge: true }).catch(console.error);
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
      setDoc(doc(db, 'users', authUser.uid), { dailyAiRequests: newCount, lastAiRequestDate: today }, { merge: true }).catch(console.error);
    }
  },
});
