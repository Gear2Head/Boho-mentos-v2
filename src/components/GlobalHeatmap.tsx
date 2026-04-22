import React from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/appStore';
import { Globe2, Users, TrendingUp } from 'lucide-react';

export function GlobalHeatmap() {
  const profile = useAppStore(s => s.profile);
  const eloScore = useAppStore(s => s.eloScore);
  
  // Calculate a mock percentile based on ELO or target
  const mockPercentile = Math.min(99, Math.max(1, Math.floor((eloScore / 2000) * 100)));
  
  // Mock data for regions
  const regions = [
    { name: 'Marmara', active: 12450, avgElo: 1450, topFeature: 'Matematik Süreç Odaklı' },
    { name: 'İç Anadolu', active: 8320, avgElo: 1380, topFeature: 'AYT FKB Ağırlıklı' },
    { name: 'Ege', active: 6200, avgElo: 1420, topFeature: 'Edebiyat/Sosyal Güçlü' },
    { name: 'Ülke Geneli', active: 38400, avgElo: 1400, topFeature: 'TYT Türkçe Hızlanıyor' }
  ];

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe2 size={20} />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-zinc-100">Global Net Haritası</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Kullanıcı Popülasyon Analizi</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl font-mono text-zinc-200 font-bold">%{(100 - mockPercentile).toFixed(0)}</span>
          <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Türkiye Geneli Yüzdelik</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {regions.map((region, idx) => {
          const isUserRegion = idx === 3;
          return (
            <div key={region.name} className={`p-4 rounded-2xl border transition-all ${isUserRegion ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#121212] border-zinc-800/80 hover:border-zinc-700'}`}>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">{region.name}</div>
              
              <div className="flex items-center gap-2 mb-2">
                <Users size={12} className="text-zinc-600" />
                <span className="text-xs font-mono text-zinc-300">{new Intl.NumberFormat('tr-TR').format(region.active)} Aktif</span>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={12} className={region.avgElo > 1400 ? 'text-green-500' : 'text-amber-500'} />
                <span className="text-xs font-mono text-zinc-300">{region.avgElo} Ort. ELO</span>
              </div>

              <div className="pt-3 border-t border-white/5">
                <span className="text-[9px] text-blue-400/80 uppercase tracking-widest font-bold block leading-tight">
                  {region.topFeature}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between relative z-10">
        <span className="text-xs text-zinc-500">Bu veriler anlık aktif Gear Head kullanıcılarının ELO ve log istatistiklerinden hesaplanmaktadır.</span>
        <button className="text-[10px] font-bold uppercase tracking-widest text-[#C17767] hover:text-white transition-colors">Detaylı İncele</button>
      </div>
    </div>
  );
}
