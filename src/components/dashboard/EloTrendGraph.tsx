import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Target } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function EloTrendGraph() {
  const exams = useAppStore(s => s.exams);
  const profile = useAppStore(s => s.profile);
  
  const targetNet = (profile?.tytTarget ?? 80);

  const data = useMemo(() => {
    // Sadece TYT denemelerini baz alıyoruz, yoksa dummy data
    const tytExams = [...exams].filter(e => e.type === 'TYT').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (tytExams.length < 2) {
      return [
        { name: 'Oca', net: Math.max(0, targetNet - 35) },
        { name: 'Şub', net: Math.max(0, targetNet - 20) },
        { name: 'Mar', net: Math.max(0, targetNet - 12) },
        { name: 'Nis', net: Math.max(0, targetNet - 5) },
        { name: 'May', net: targetNet },
      ];
    }
    
    return tytExams.slice(-6).map(e => ({
      name: new Date(e.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
      net: e.totalNet,
    }));
  }, [exams, targetNet]);

  const currentNet = data[data.length - 1]?.net ?? 0;
  const isMeetingTarget = currentNet >= targetNet;

  return (
    <div className="glass-card p-6 rounded-[32px] relative overflow-hidden group border border-app shadow-xl h-[320px] flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <TrendingUp size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-display italic text-xl font-bold text-zinc-100 leading-none">Performans Trendi</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-black">TYT NET GELİŞİMİ</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-mono font-black ${isMeetingTarget ? 'text-emerald-400' : 'text-blue-400'}`}>
            {currentNet.toFixed(1)}
          </div>
          <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">
            Son Durum
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px] relative z-10 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dx={-10} domain={['dataMin - 10', 'dataMax + 20']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
              itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
            />
            <ReferenceLine y={targetNet} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'HEDEF', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />
            <Area type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
