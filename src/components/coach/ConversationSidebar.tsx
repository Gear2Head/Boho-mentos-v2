import React from 'react';
import { Plus, MessageSquare, Trash2, Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { motion, AnimatePresence } from 'motion/react';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ConversationSidebar({ isOpen, onToggle }: ConversationSidebarProps) {
  const conversations = useAppStore(s => s.conversations);
  const activeId = useAppStore(s => s.activeConversationId);
  const createNew = useAppStore(s => s.createNewConversation);
  const deleteConv = useAppStore(s => s.deleteConversation);
  const setActive = useAppStore(s => s.setActiveConversation);

  return (
    <motion.div 
      initial={false}
      animate={{ width: isOpen ? 256 : 0, opacity: isOpen ? 1 : 0 }}
      className="h-full bg-[#FDFBF7]/50 dark:bg-black/20 border-r border-app flex flex-col shrink-0 overflow-hidden backdrop-blur-xl relative"
    >
      <div className="w-64 h-full flex flex-col absolute left-0 top-0">
        <div className="p-4 border-b border-app flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C17767]">Geçmiş</h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={onToggle}
              className="p-1.5 text-zinc-400 hover:text-ink transition-all rounded-lg hover:bg-surface"
              title="Gizle"
            >
              <PanelLeftClose size={14} />
            </button>
            <button 
              onClick={() => createNew()}
              className="p-1.5 bg-[#C17767] text-white rounded-lg hover:rotate-90 transition-all shadow-lg shadow-[#C17767]/20"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  activeId === conv.id 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm border border-app' 
                    : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                }`}
                onClick={() => setActive(conv.id)}
              >
                <div className={`p-2 rounded-lg ${activeId === conv.id ? 'bg-[#C17767] text-white' : 'bg-black/5 dark:bg-white/5 text-zinc-500'}`}>
                  <MessageSquare size={14} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${activeId === conv.id ? 'text-ink' : 'text-zinc-500 group-hover:text-ink'}`}>
                    {conv.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 opacity-40 text-[9px] font-medium">
                    <Clock size={8} />
                    <span>{new Date(conv.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Bu sohbeti silmek istediğine emin misin?')) deleteConv(conv.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
