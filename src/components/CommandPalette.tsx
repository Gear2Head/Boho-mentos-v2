import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { 
  Search, Command, LayoutDashboard, Target, MessageSquare, 
  Map as MapIcon, Calendar, Activity, BookOpen, Clock, PenTool 
} from 'lucide-react';

interface CommandItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action: () => void;
  category: 'Navigation' | 'Actions';
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    { id: 'nav-dash', icon: <LayoutDashboard size={16} />, label: 'Dashboard', category: 'Navigation', action: () => navigate('/dashboard') },
    { id: 'nav-coach', icon: <MessageSquare size={16} />, label: 'AI Koç ile Konuş', category: 'Navigation', action: () => navigate('/coach') },
    { id: 'nav-warroom', icon: <Target size={16} />, label: 'War Room (Mebi)', category: 'Navigation', action: () => navigate('/war_room') },
    { id: 'nav-agenda', icon: <Calendar size={16} />, label: 'Ajanda & Plan', category: 'Navigation', action: () => navigate('/agenda') },
    { id: 'nav-subjects', icon: <MapIcon size={16} />, label: 'Müfredat Haritası', category: 'Navigation', action: () => navigate('/subjects') },
    { id: 'nav-strategy', icon: <Activity size={16} />, label: 'Strateji Merkezi', category: 'Navigation', action: () => navigate('/strategy') },
    { id: 'nav-explain', icon: <BookOpen size={16} />, label: 'Konu Anlatımı', category: 'Navigation', action: () => navigate('/explain') },
    { id: 'nav-questions', icon: <PenTool size={16} />, label: 'Soru Motoru', category: 'Navigation', action: () => navigate('/questions') },
    { id: 'nav-simulator', icon: <Target size={16} />, label: 'Sınav Simülatörü (Tam Ekran)', category: 'Navigation', action: () => navigate('/simulator') },
    
    { id: 'act-log', icon: <Clock size={16} />, label: 'Çalışma Kaydı (Log) Ekle', category: 'Actions', action: () => { navigate('/dashboard'); setTimeout(() => document.dispatchEvent(new CustomEvent('OPEN_LOG_MODAL')), 300); } },
    { id: 'act-exam', icon: <Target size={16} />, label: 'Deneme Sonucu Gir', category: 'Actions', action: () => { navigate('/dashboard'); setTimeout(() => document.dispatchEvent(new CustomEvent('OPEN_EXAM_MODAL')), 300); } },
  ];

  const filteredItems = items.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) || 
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-2xl glass-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden bg-[#1A1A1A]/90"
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-4 border-b border-white/10">
              <Search className="text-zinc-400 mr-3 shrink-0" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Komut yazın veya bir yere gidin..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-lg placeholder-zinc-500"
              />
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-zinc-500 bg-white/5 px-2 py-1 rounded">
                <Command size={10} /> <span>K</span>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm italic">Sonuç bulunamadı.</div>
              ) : (
                <div className="space-y-1">
                  {['Navigation', 'Actions'].map((cat) => {
                    const categoryItems = filteredItems.filter(i => i.category === cat);
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={cat} className="mb-4">
                        <h4 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#C17767]/70">
                          {cat}
                        </h4>
                        {categoryItems.map((item) => {
                          const index = filteredItems.findIndex(i => i.id === item.id);
                          const isSelected = index === selectedIndex;
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                item.action();
                                setIsOpen(false);
                              }}
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${
                                isSelected 
                                  ? 'bg-[#C17767] text-white' 
                                  : 'text-zinc-300 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                  {item.icon}
                                </div>
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-white/10 px-4 py-3 bg-black/40 flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <span>Geçiş İçin Yön Tuşları</span>
              <span>Kapatmak İçin ESC</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
