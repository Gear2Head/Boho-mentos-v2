/**
 * AMAÇ: YÖK Atlas üzerinden üniversite/bölüm arama ve hedeflere ekleme
 * MANTIK: atlasService üzerinden backend API ile iletişim kurar, store'a hedefleri kaydeder
 */

import React, { useState } from 'react';
import { Search, Plus, MapPin, GraduationCap, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { atlasService, AtlasProgram } from '../services/atlasService';
import { useAppStore } from '../store/appStore';

interface AtlasExplorerProps {
  onClose: () => void;
}

function DataSourceBadge({ results }: { results: AtlasProgram[] }) {
  if (results.length > 0 && results.some(r => r.isSnapshot)) {
    return (
      <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Snapshot Veri
      </p>
    );
  }
  if (results.length > 0) {
    return (
      <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Canlı YÖK Verisi
      </p>
    );
  }
  return (
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">YÖK Atlas Verileri</p>
  );
}

export function AtlasExplorer({ onClose }: AtlasExplorerProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [results, setResults] = useState<AtlasProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const profile = useAppStore(s => s.profile);
  const addTargetGoal = useAppStore(s => s.addTargetGoal);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !activeFilter) return;

    setIsLoading(true);
    setSearchError(null);
    try {
      const data = await atlasService.search(query, activeFilter);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError('Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
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
              <DataSourceBadge results={results} />
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            aria-label="Kapat"
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
                    setSearchError(null);
                    try {
                      const data = await atlasService.search(query, newFilter);
                      setResults(data);
                    } catch (err) {
                      setSearchError('Filtre uygulanırken hata oluştu.');
                    } finally {
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
          ) : searchError ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-3 bg-rose-500/10 rounded-2xl">
                <AlertTriangle size={32} className="text-rose-400" />
              </div>
              <p className="text-sm font-bold text-rose-300">{searchError}</p>
              <button
                onClick={() => { setSearchError(null); setResults([]); }}
                className="text-[10px] uppercase tracking-widest font-black text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Tekrar Dene
              </button>
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
                      {program.isSnapshot && (
                        <div className="mt-2 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                          Snapshot veri
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-zinc-200 leading-snug">{program.universityName}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{program.programName}</p>
                    </div>
                    <button 
                      onClick={() => !isAlreadyAdded(program.id) && addTargetGoal(program)}
                      disabled={isAlreadyAdded(program.id)}
                      className={`p-2 rounded-xl transition-all ${isAlreadyAdded(program.id) ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-zinc-400 hover:bg-[#C17767] hover:text-white'}`}
                      aria-label={`${program.universityName} Hedeflere Ekle`}
                    >
                      {isAlreadyAdded(program.id) ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800/50">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">Sıralama</span>
                      <span className="text-xs font-mono text-zinc-300">#{program.successRank?.toLocaleString() || '\u2014'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-green-500/70 font-bold block">TYT NET</span>
                      <span className="text-xs font-mono text-green-400">{program.tytNet || '\u2014'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-blue-500/70 font-bold block">AYT NET</span>
                      <span className="text-xs font-mono text-blue-400">{program.aytNet || '\u2014'}</span>
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
