/**
 * AMAÇ: Mezarlık (Hatalı Soru Havuzu) — Premium Liste Görünümü
 * MANTIK: Store'daki `failedQuestions` verilerini listeler, filtreler ve aksiyon aldırır.
 */

import React, { useState } from 'react';
import { Ghost, Trash2, CheckCircle2, Search, Filter, AlertCircle, BookOpen, Clock, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/appStore';
import type { FailedQuestion } from '../types';

export function GraveyardPanel() {
  const failedQuestions = useAppStore(s => s.failedQuestions);
  const solveFailedQuestion = useAppStore(s => s.solveFailedQuestion);
  const removeFailedQuestion = useAppStore(s => s.removeFailedQuestion);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const subjects = ['all', ...new Set(failedQuestions.map(q => q.subject))];

  const filtered = failedQuestions.filter(q => {
    const matchesSearch = q.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterSubject === 'all' || q.subject === filterSubject;
    return matchesSearch && matchesFilter;
  });

  if (failedQuestions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-20 text-center"
      >
        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-zinc-400">
          <Ghost size={40} />
        </div>
        <h3 className="text-xl font-display italic text-[#C17767] mb-2">Huzurlu Bir Sessizlik...</h3>
        <p className="text-sm opacity-50 max-w-xs mx-auto">Henüz mezarlığa gönderilmiş bir soru yok. Yanlışlarını buraya gömerek onlarla yüzleşebilirsin.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtreleme Barı */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-[#EAE6DF] dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Soru veya konu ara..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-[#C17767]"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-zinc-400" />
          <select 
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="flex-1 md:w-40 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-[#C17767]"
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'TÜM DERSLER' : s.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Soru Listesi */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((q) => (
            <motion.div
              layout
              key={q.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="group bg-white dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-[#C17767]/50 transition-all"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Sol: Soru Görseli veya Placeholder */}
                <div className="w-full md:w-32 h-32 shrink-0 rounded-xl bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 overflow-hidden relative">
                  {q.imageUrl ? (
                    <img src={q.imageUrl} alt={q.topic} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <AlertCircle size={24} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      q.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' : 
                      q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-500' : 
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                </div>

                {/* Sağ: Detaylar */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-[#4A443C] dark:text-zinc-200">{q.topic}</h4>
                      <p className="text-[10px] uppercase tracking-widest text-[#C17767] font-bold">{q.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Gömülme Tarihi</p>
                      <p className="text-xs font-mono">{new Date(q.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>

                  <div className="bg-[#F5F2EB]/50 dark:bg-zinc-950/50 p-3 rounded-lg border border-[#EAE6DF] dark:border-zinc-800/50">
                    <p className="text-xs italic text-zinc-500 line-clamp-2">"{q.reason || 'Not bırakılmadı...'}"</p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50 uppercase tracking-widest">
                      <BookOpen size={12} /> {q.book || 'KAYNAKSIZ'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50 uppercase tracking-widest">
                      <Clock size={12} /> {q.solveCount || 0} KEZ BAKILDI
                    </div>
                  </div>
                </div>

                {/* Aksiyonlar */}
                <div className="flex md:flex-col gap-2 shrink-0 justify-center">
                  <button 
                    onClick={() => solveFailedQuestion(q.id)}
                    className="flex-1 md:flex-none p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                    title="Bu soruyu hallettim (Ölümden döndür)"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button 
                    onClick={() => removeFailedQuestion(q.id)}
                    className="flex-1 md:flex-none p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    title="Kalıcı olarak yok et"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
