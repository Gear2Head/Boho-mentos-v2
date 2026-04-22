import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { ChatMessage, AppNotification } from '../../types';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export interface SocialSlice {
  chatHistory: ChatMessage[];
  notifications: AppNotification[];
  dailyQuestsGeneratedDate: string;
  dailyAiRequests: number;
  lastAiRequestDate: string;

  addChatMessage: (message: ChatMessage) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  setDailyQuestsGeneratedDate: (date: string) => void;
  incrementAiRequest: () => void;
}

export const createSocialSlice: StateCreator<AppState, [], [], SocialSlice> = (set, get) => ({
  chatHistory: [],
  notifications: [],
  dailyQuestsGeneratedDate: '',
  dailyAiRequests: 0,
  lastAiRequestDate: new Date().toISOString().split('T')[0],

  addChatMessage: (message) => {
    const { authUser, chatHistory } = get();
    const newMessage: ChatMessage = {
      ...message,
      id: message.id ?? `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    const newHistory = [...chatHistory, newMessage].slice(-80);
    set({ chatHistory: newHistory });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'chatHistory', newMessage.id), newMessage).catch(console.error);
    }
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
