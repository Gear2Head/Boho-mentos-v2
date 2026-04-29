import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export function DMPanel({ onClose, forceTargetUid }: { onClose: () => void, forceTargetUid?: string | null }) {
  const { authUser, directMessages, sendDirectMessage } = useAppStore(useShallow((s: any) => ({
    authUser: s.authUser,
    directMessages: s.directMessages || {},
    sendDirectMessage: s.sendDirectMessage
  })));

  const [activeTab, setActiveTab] = useState<'list' | 'chat'>(forceTargetUid ? 'chat' : 'list');
  const [selectedUser, setSelectedUser] = useState<{ uid: string; name: string } | null>(
    forceTargetUid ? { uid: forceTargetUid, name: 'Savaşçı' } : null
  );

  useEffect(() => {
    if (forceTargetUid) {
      setSelectedUser({ uid: forceTargetUid, name: 'Savaşçı' });
      setActiveTab('chat');
    }
  }, [forceTargetUid]);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUser?.uid || !selectedUser?.uid) return;
    const chatRoomId = [authUser.uid, selectedUser.uid].sort().join('_');
    const q = query(collection(db, 'global_chats', chatRoomId, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snap) => {
      const incoming = snap.docs.map(d => d.data() as any);
      useAppStore.setState((state: any) => ({
        directMessages: {
          ...(state.directMessages || {}),
          [selectedUser.uid]: incoming,
        },
      }));
    }, console.error);
  }, [authUser?.uid, selectedUser?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedUser, directMessages]);

  const handleSend = () => {
    if (!message.trim() || !selectedUser) return;
    sendDirectMessage(selectedUser.uid, message.trim());
    setMessage('');
  };

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
            <button onClick={() => setActiveTab('list')} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C17767]/40" aria-label="Mesaj listesine don">
               <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h3 className="font-display italic font-bold text-zinc-100 uppercase tracking-tight">
              {activeTab === 'list' ? 'Mesajlar' : selectedUser?.name}
            </h3>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Boho Social Engine</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C17767]/40" aria-label="Mesaj panelini kapat">
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
                 <p className="text-sm italic font-serif">Henüz bir mesajlaşma yok.<br/>Liderlik tablosundan birine selam ver!</p>
              </div>
            ) : (
              (Object.entries(directMessages) as [string, any[]][]).map(([uid, msgs]) => (
                <button
                  key={uid}
                  onClick={() => {
                    setSelectedUser({ uid, name: 'Savaşçı' }); // TODO: Fetch real name
                    setActiveTab('chat');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#C17767]/10 border border-[#C17767]/20 flex items-center justify-center text-[#C17767]">
                     <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">Savaşçı</p>
                    <p className="text-xs text-zinc-500 truncate">{(msgs as any)[(msgs as any).length - 1]?.content}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {(directMessages[selectedUser?.uid || ''] || []).map((msg, i) => {
                const isMe = msg.senderId === authUser?.uid;
                return (
                  <div key={msg.id ?? `${msg.timestamp}-${i}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      isMe ? 'bg-[#C17767] text-white rounded-br-sm' : 'bg-white/5 border border-white/10 text-zinc-200 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Mesaj yaz..."
                  aria-label="Mesaj yaz"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C17767]/50 focus:ring-2 focus:ring-[#C17767]/20 min-h-11"
                />
                <button 
                  onClick={handleSend}
                  disabled={!message.trim()}
                  aria-label="Mesaj gonder"
                  className="w-11 h-11 rounded-xl bg-[#C17767] text-white flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#C17767]/40"
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
