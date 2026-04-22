import sys

with open('src/components/AgendaPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('  return (')
text = text[:start] + '''  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 border-b border-[#EAE6DF] dark:border-zinc-800 pb-6">
        <h2 className="font-display italic text-4xl text-[#4A443C] dark:text-zinc-200 mb-2">Ajanda</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17767] font-bold font-mono">Günlük kayıt — deneme/net yazarsan Analiz’e işler</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6 mb-8">
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 mb-3">
              Bugün ne yaptın?
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              placeholder="Örn: Deneme yaptım AYT 55 net. Matematikte trigonometri yine patladı. 150 soru çözdüm."
              className="w-full p-4 rounded-2xl border border-[#EAE6DF] dark:border-zinc-800 bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors resize-none"
            />
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={addEntry}
                className="flex items-center gap-2 px-5 py-3 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors"
                aria-label="Ajanda Girişini Kaydet"
              >
                <Plus size={16} /> Kaydet
              </button>
            </div>
          </div>

          {activeTasks.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#C17767]" />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#C17767]">Kübra'nın Görevleri</h3>
                <span className="px-1.5 py-0.5 bg-[#C17767]/10 text-[#C17767] rounded text-[8px] font-bold">{activeTasks.length} AKTİF</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTasks.map((t) => (
                  <div key={`${t.recordId}-${t.taskIndex}`} className="bg-white dark:bg-zinc-900 border-l-4 border-l-[#C17767] border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${
                            t.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {t.priority} PRiORiTY
                          </span>
                          {t.subject && <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{t.subject}</span>}
                        </div>
                        <h4 className="font-bold text-sm text-[#4A443C] dark:text-zinc-100">{t.title}</h4>
                      </div>
                      <CircleDashed className="w-4 h-4 text-[#C17767] animate-pulse" />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">{t.action}</p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => completeCoachTask(t.recordId, t.taskIndex)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600/10 hover:bg-green-600 hover:text-white text-green-600 rounded-lg text-[10px] font-bold uppercase transition-all"
                      >
                        <CheckCircle2 size={12} /> TAMAMLA
                      </button>
                      <button 
                        onClick={() => deferCoachTask(t.recordId, t.taskIndex)}
                        className="p-2 bg-amber-600/10 hover:bg-amber-600 hover:text-white text-amber-600 rounded-lg transition-all"
                        title="Ertele (-5 ELO)"
                      >
                        <Timer size={14} />
                      </button>
                      <button 
                        onClick={() => failCoachTask(t.recordId, t.taskIndex)}
                        className="p-2 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg transition-all"
                        title="Yapamadım (-15 ELO)"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-16 opacity-40 text-xs uppercase tracking-widest font-bold text-[#4A443C] dark:text-zinc-400">
                Henüz ajanda kaydı yok.
              </div>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-6 mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-400">
                        {(parseFlexibleDate(e.date) ?? new Date()).toLocaleString('tr-TR')}
                      </div>
                      {e.parsedExam && (
                        <div className="mt-2 text-[10px] uppercase tracking-widest font-bold text-[#C17767] dark:text-rose-400">
                          Otomatik Deneme: {e.parsedExam.type} {e.parsedExam.totalNet} net
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => analyzeEntry(e)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-900/10 text-blue-400 border border-blue-900/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                        aria-label="AI ile Girişi Analiz Et"
                      >
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        AI Analiz
                      </button>
                      <button
                        onClick={() => removeAgendaEntry(e.id)}
                        className="p-2 bg-red-900/10 text-red-400 border border-red-900/30 rounded-xl hover:bg-red-900/20 transition-colors"
                        aria-label="Girişi Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed text-[#4A443C] dark:text-zinc-200 whitespace-pre-wrap">
                    {e.content}
                  </div>

                  {e.aiAnalysis && (
                    <div className="mt-4 p-4 rounded-2xl bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800">
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 mb-2">
                        AI Özet
                      </div>
                      <ReactMarkdown components={markdownComponents}>{e.aiAnalysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 h-[700px] sticky top-6">
          <InteractiveCalendar />
        </div>
      </div>
    </div>
  );
}
'''

with open('src/components/AgendaPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Rewrite AgendaPage.tsx generated!')
