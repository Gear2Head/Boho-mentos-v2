import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function SubjectMasterySunburst() {
  const tytSubjects = useAppStore(s => s.tytSubjects);
  
  const data = useMemo(() => {
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

  const totalMastered = data.reduce((acc, curr) => acc + curr.mastered, 0);
  const totalSubjects = data.reduce((acc, curr) => acc + curr.total, 0);
  const totalPercent = totalSubjects > 0 ? Math.round((totalMastered / totalSubjects) * 100) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-black uppercase text-zinc-300 mb-1">{data.name}</p>
          <p className="text-[10px] text-zinc-500 font-bold">{data.mastered} / {data.total} Konu Bitti</p>
          <p className="text-sm font-black mt-1" style={{ color: data.fill }}>%{Math.round(data.value)} Başarı</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 rounded-[32px] relative overflow-hidden group border border-app shadow-xl h-[320px] flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display italic text-xl font-bold text-zinc-100 leading-none">Müfredat Hakimiyeti</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-black">TYT BİTİRME ORANI</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative z-10 flex items-center justify-center min-h-[220px]">
        {/* Center absolute text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-zinc-100">%{totalPercent}</span>
          <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Tamamlandı</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              cornerRadius={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
