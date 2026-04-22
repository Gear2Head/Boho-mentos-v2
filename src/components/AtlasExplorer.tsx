/**
 * AMAÇ: YÖK Atlas üzerinden üniversite/bölüm arama ve hedeflere ekleme
 * MANTIK: atlasService üzerinden backend API ile iletişim kurar, store'a hedefleri kaydeder
 */

import React, { useState } from 'react';
import { Search, Plus, MapPin, GraduationCap, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { atlasService, AtlasProgram } from '../services/atlasService';
import { useAppStore } from '../store/appStore';

interface AtlasExplorerProps {
  onClose: () => void;
}

export function AtlasExplorer({ onClose }: AtlasExplorerProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [results, setResults] = useState<AtlasProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const profile = useAppStore(s => s.profile);
  const addTargetGoal = useAppStore(s => s.addTargetGoal);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !activeFilter) return;

    setIsLoading(true);
    try {
      const data = await atlasService.search(query, activeFilter);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyAdded = (id: string) => {
    return profile?.targetGoals?.some(g => g.id === id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#121212] border border-[#2A2A2A] w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C17767]/10 rounded-xl text-[#C17767]">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-zinc-200">Atlas Explorer</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Gerçek YÖK Atlas Verileri</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            aria-label="Modalı Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-6 bg-[#1A1A1A] border-b border-[#2A2A2A] shrink-0">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Üniversite veya bölüm adı yazın (Örn: Boğaziçi Bilgisayar)"
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-2xl py-4 pl-12 pr-32 text-sm focus:outline-none focus:border-[#C17767] text-zinc-200 transition-all shadow-inner"
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#C17767] text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors disabled:opacity-50 flex items-center gap-2"
              aria-label="Üniversite veya Bölüm Ara"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'ARA'}
            </button>
          </form>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2 shrink-0">Filtre:</span>
            {['SAY', 'EA', 'SÖZ', 'DİL'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={async () => {
                  const newFilter = activeFilter === f ? '' : f;
                  setActiveFilter(newFilter);
                  if (query.trim() || newFilter) {
                    setIsLoading(true);
                    try {
                      const data = await atlasService.search(query, newFilter);
                      setResults(data);
                    } catch (err) {} finally {
                      setIsLoading(false);
                    }
                  } else {
                    setResults([]);
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors shrink-0 ${
                  activeFilter === f ? 'bg-[#C17767] border-[#C17767] text-white' : 'bg-transparent border-[#2A2A2A] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <Loader2 size={40} className="animate-spin text-[#C17767]" />
              <p className="text-zinc-500 text-sm italic tracking-wide">YÖK Atlas taranıyor...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((program) => (
                <div 
                  key={program.id}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] p-5 rounded-2xl hover:border-[#C17767]/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#C17767] mb-1">
                        <MapPin size={10} /> {program.scoreType}
                      </div>
                      <h4 className="text-sm font-bold text-zinc-200 leading-snug">{program.universityName}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{program.programName}</p>
                    </div>
                    <button 
                      onClick={() => !isAlreadyAdded(program.id) && addTargetGoal(program)}
                      disabled={isAlreadyAdded(program.id)}
                      className={`p-2 rounded-xl transition-all ${isAlreadyAdded(program.id) ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-zinc-400 hover:bg-[#C17767] hover:text-white'}`}
                      aria-label={`${program.universityName} Programını Hedeflere Ekle`}
                    >
                      {isAlreadyAdded(program.id) ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800/50">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">Sıralama</span>
                      <span className="text-xs font-mono text-zinc-300">#{program.successRank?.toLocaleString() || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-green-500/70 font-bold block">TYT NET</span>
                      <span className="text-xs font-mono text-green-400">{program.tytNet || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-blue-500/70 font-bold block">AYT NET</span>
                      <span className="text-xs font-mono text-blue-400">{program.aytNet || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30 text-center">
              <GraduationCap size={64} strokeWidth={1} />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1">Henüz sonuç yok</p>
                <p className="text-xs italic">Üniversite veya bölüm ismi yazarak keşfetmeye başla.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
