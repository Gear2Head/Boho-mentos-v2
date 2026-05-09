import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User, MessageCircle, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { onSnapshot, collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTypingIndicator, useOtherUserTyping } from '../hooks/useTypingIndicator';
import { DMMessageCard, type CardPayload } from './DMMessageCard';

export function DMPanel({ onClose, forceTargetUid }: { onClose: () => void, forceTargetUid?: string | null }) {
  const { authUser, directMessages, sendDirectMessage } = useAppStore(useShallow((s: any) => ({
    authUser: s.authUser,
    directMessages: s.directMessages || {},
    sendDirectMessage: s.sendDirectMessage,
  })));

  const [activeTab, setActiveTab] = useState<'list' | 'chat'>(forceTargetUid ? 'chat' : 'list');
  const [selectedUser, setSelectedUser] = useState<{ uid: string; name: string } | null>(
    forceTargetUid ? { uid: forceTargetUid, name: 'Savaşçı' } : null
  );
  const [message, setMessage] = useState('');
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatRoomId = authUser?.uid && selectedUser?.uid
    ? [authUser.uid, selectedUser.uid].sort().join('_')
    : null;

  // Yazıyor göstergesi
  const { onInputChange } = useTypingIndicator(chatRoomId, authUser?.uid ?? null);
  useOtherUserTyping(chatRoomId, selectedUser?.uid ?? null, setOtherIsTyping);

  useEffect(() => {
    if (forceTargetUid) {
      setSelectedUser({ uid: forceTargetUid, name: 'Savaşçı' });
      setActiveTab('chat');
    }
  }, [forceTargetUid]);

  // İsim çek
  useEffect(() => {
    if (!authUser?.uid || !selectedUser?.uid) return;
    if (selectedUser.name === 'Savaşçı') {
      import('firebase/firestore').then(({ doc: fiDoc, getDoc }) => {
        getDoc(fiDoc(db, 'publicProfiles', selectedUser.uid)).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            setSelectedUser(prev => prev ? { ...prev, name: data.profile?.name || data.display_name || 'Savaşçı' } : null);
          }
        });
      });
    }
  }, [selectedUser?.uid]);

  // Mesajları dinle
  useEffect(() => {
    if (!chatRoomId) return;
    const q = query(collection(db, 'global_chats', chatRoomId, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snap) => {
      const incoming = snap.docs.map(d => d.data() as any);
      useAppStore.setState((state: any) => ({
        directMessages: {
          ...(state.directMessages || {}),
          [selectedUser!.uid]: incoming,
        },
      }));

      // Gelen mesajları okundu olarak işaretle
      snap.docs.forEach(d => {
        const data = d.data() as any;
        if (data.senderId !== authUser?.uid && !data.readAt) {
          updateDoc(d.ref, { readAt: serverTimestamp() }).catch(() => {});
        }
      });
    }, console.error);
  }, [chatRoomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedUser, directMessages, otherIsTyping]);

  const handleSend = useCallback(() => {
    if (!message.trim() || !selectedUser) return;
    sendDirectMessage(selectedUser.uid, message.trim());
    setMessage('');
  }, [message, selectedUser, sendDirectMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onInputChange();
  }, [onInputChange]);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full md:w-96 glass-nav border-l border-white/5 z-[150] flex flex-col shadow-2xl pb-[env(safe-area-inset-bottom)]"
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'list' ? 'Mesajlar' : `${selectedUser?.name} sohbeti`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          {activeTab === 'chat' && (
            <button
              onClick={() => setActiveTab('list')}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C17767]/40 cursor-pointer"
              aria-label="Mesaj listesine dön"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h3 className="font-display italic font-bold text-zinc-100 uppercase tracking-tight">
              {activeTab === 'list' ? 'Mesajlar' : selectedUser?.name}
            </h3>
            {activeTab === 'chat' && otherIsTyping ? (
              <p className="text-[9px] uppercase tracking-widest text-[#22C55E] font-black animate-pulse">
                yazıyor...
              </p>
            ) : (
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Boho Social Engine</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C17767]/40 cursor-pointer"
          aria-label="Mesaj panelini kapat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'list' ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.keys(directMessages).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center p-8">
                <MessageCircle size={48} className="mb-4" />
                <p className="text-sm italic font-serif">Henüz bir mesajlaşma yok.<br />Liderlik tablosundan birine selam ver!</p>
              </div>
            ) : (
              (Object.entries(directMessages) as [string, any[]][]).map(([uid, msgs]) => {
                const lastMsg = msgs[msgs.length - 1];
                return (
                  <button
                    key={uid}
                    onClick={() => { setSelectedUser({ uid, name: 'Savaşçı' }); setActiveTab('chat'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#C17767]/10 border border-[#C17767]/20 flex items-center justify-center text-[#C17767]">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-100 truncate">Savaşçı</p>
                      <p className="text-xs text-zinc-500 truncate">{lastMsg?.content || lastMsg?.text}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {(directMessages[selectedUser?.uid || ''] || []).map((msg: any, i: number) => {
                const isMe = msg.senderId === authUser?.uid;
                const time = msg.timestamp
                  ? new Date(typeof msg.timestamp === 'object' && msg.timestamp.seconds
                      ? msg.timestamp.seconds * 1000
                      : msg.timestamp
                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div key={msg.id ?? `${msg.timestamp}-${i}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {msg.type === 'card' && msg.cardPayload ? (
                      <DMMessageCard payload={msg.cardPayload as CardPayload} isMe={isMe} />
                    ) : (
                      <div className={`max-w-[85%] p-3.5 rounded-[22px] text-sm shadow-sm transition-all hover:brightness-110 ${
                        isMe
                          ? 'bg-[#C17767] text-white rounded-br-none'
                          : 'bg-zinc-900 border border-white/5 text-zinc-100 rounded-bl-none'
                      }`}>
                        {msg.content || msg.text}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1 px-1">
                      {time && (
                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{time}</span>
                      )}
                      {isMe && (
                        msg.readAt
                          ? <CheckCheck size={10} className="text-[#C17767]" />
                          : <Check size={10} className="text-zinc-600" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Yazıyor göstergesi */}
              <AnimatePresence>
                {otherIsTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-2"
                  >
                    <div className="bg-zinc-900 border border-white/5 rounded-[22px] rounded-bl-none px-4 py-3 flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, delay, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Mesaj yaz..."
                  aria-label="Mesaj yaz"
                  autoComplete="off"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C17767]/50 focus:ring-2 focus:ring-[#C17767]/20 min-h-11"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  aria-label="Mesaj gönder"
                  className="w-11 h-11 rounded-xl bg-[#C17767] text-white flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#C17767]/40 cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
