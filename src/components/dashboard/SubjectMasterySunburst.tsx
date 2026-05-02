import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

type ExamTab = 'tyt' | 'ayt';

export function SubjectMasterySunburst() {
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const profile = useAppStore(s => s.profile);
  const [tab, setTab] = useState<ExamTab>('tyt');

  const getAytSubjectsForTrack = (track: string) => {
    if (track === 'EA' || track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'];
    if (track === 'SÖZ' || track === 'Sözel') return ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe Grubu', 'Din Kültürü'];
    if (track === 'DİL' || track === 'Dil') return ['Yabancı Dil'];
    return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
  };

  const tytData = useMemo(() => {
    let mathMastered = 0, mathTotal = 0;
    let scienceMastered = 0, scienceTotal = 0;
    let socialMastered = 0, socialTotal = 0;
    let languageMastered = 0, languageTotal = 0;

    tytSubjects.forEach(s => {
      const isMastered = s.status === 'mastered' ? 1 : 0;
      if (s.subject === 'Matematik' || s.subject === 'Geometri') {
        mathTotal++; mathMastered += isMastered;
      } else if (['Fizik', 'Kimya', 'Biyoloji'].includes(s.subject)) {
        scienceTotal++; scienceMastered += isMastered;
      } else if (['Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'].includes(s.subject)) {
        socialTotal++; socialMastered += isMastered;
      } else if (s.subject === 'Türkçe') {
        languageTotal++; languageMastered += isMastered;
      }
    });

    return [
      { name: 'Matematik', value: mathTotal > 0 ? (mathMastered / mathTotal) * 100 : 0, fill: '#3b82f6', total: mathTotal, mastered: mathMastered },
      { name: 'Fen Bilimleri', value: scienceTotal > 0 ? (scienceMastered / scienceTotal) * 100 : 0, fill: '#10b981', total: scienceTotal, mastered: scienceMastered },
      { name: 'Sosyal Bil.', value: socialTotal > 0 ? (socialMastered / socialTotal) * 100 : 0, fill: '#f59e0b', total: socialTotal, mastered: socialMastered },
      { name: 'Türkçe', value: languageTotal > 0 ? (languageMastered / languageTotal) * 100 : 0, fill: '#8b5cf6', total: languageTotal, mastered: languageMastered },
    ].filter(d => d.total > 0);
  }, [tytSubjects]);

  const aytData = useMemo(() => {
    const track = profile?.track || 'Sayısal';
    const trackSubs = getAytSubjectsForTrack(track);
    const filtered = aytSubjects.filter(s => trackSubs.includes(s.subject));

    // Group by subject
    const groups: Record<string, { mastered: number; total: number; fill: string }> = {};
    const colors = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#84cc16'];
    filtered.forEach((s, idx) => {
      if (!groups[s.subject]) groups[s.subject] = { mastered: 0, total: 0, fill: colors[idx % colors.length] };
      groups[s.subject].total++;
      if (s.status === 'mastered') groups[s.subject].mastered++;
    });

    return Object.entries(groups).map(([name, g]) => ({
      name,
      value: g.total > 0 ? (g.mastered / g.total) * 100 : 0,
      fill: g.fill,
      total: g.total,
      mastered: g.mastered,
    }));
  }, [aytSubjects, profile?.track]);

  const activeData = tab === 'tyt' ? tytData : aytData;
  const totalMastered = activeData.reduce((acc, curr) => acc + curr.mastered, 0);
  const totalSubjects = activeData.reduce((acc, curr) => acc + curr.total, 0);
  const totalPercent = totalSubjects > 0 ? Math.round((totalMastered / totalSubjects) * 100) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-black uppercase text-zinc-300 mb-1">{d.name}</p>
          <p className="text-[10px] text-zinc-500 font-bold">{d.mastered} / {d.total} Konu Bitti</p>
          <p className="text-sm font-black mt-1" style={{ color: d.fill }}>%{Math.round(d.value)} Başarı</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 rounded-[32px] relative overflow-hidden border border-app shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display italic text-xl font-bold text-zinc-100 leading-none">Müfredat Hakimiyeti</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-black">BİTİRME ORANI</p>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
          <button
            onClick={() => setTab('tyt')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'tyt' ? 'bg-[#C17767] text-white shadow-[0_0_20px_rgba(193,119,103,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            TYT MODU
          </button>
          <button
            onClick={() => setTab('ayt')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'ayt' ? 'bg-[#3b82f6] text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            AYT MODU
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-4 flex-wrap relative z-10">
        {activeData.map(d => (
          <div key={d.name} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-[10px] font-bold text-zinc-400">{d.name}</span>
            <span className="text-[10px] font-black text-zinc-200">{d.mastered}/{d.total}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 relative z-10">
        {/* Chart */}
        <div className="relative flex-1" style={{ height: 240 }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <span className="text-4xl font-black text-zinc-100">%{totalPercent}</span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">Tamamlandı</span>
          </div>
          <ResponsiveContainer width="100%" height={240} minWidth={0}>
            <PieChart>
              <Pie
                data={activeData.length > 0 ? activeData : [{ name: 'Yok', value: 1, fill: '#27272a', total: 0, mastered: 0 }]}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                cornerRadius={6}
              >
                {(activeData.length > 0 ? activeData : [{ fill: '#27272a' }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2 shrink-0">
          {activeData.map(d => (
            <div key={d.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
              <div>
                <p className="text-[10px] font-bold text-zinc-300">{d.name}</p>
                <p className="text-[9px] text-zinc-600">{d.mastered}/{d.total} konu</p>
              </div>
            </div>
          ))}
          {activeData.length === 0 && (
            <p className="text-[11px] text-zinc-500 italic">Veri yok</p>
          )}
        </div>
      </div>
    </div>
  );
}
