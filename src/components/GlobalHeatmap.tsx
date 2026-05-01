import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { Globe2, MapPin, TrendingUp, University } from 'lucide-react';
import { YOK_ATLAS_DATA, type YokAtlasProgram } from '../data/uniGoals';

const REGION_CITIES: Record<string, string[]> = {
  Ege: ['Izmir', 'Aydin', 'Manisa', 'Mugla', 'Denizli', 'Usak', 'Afyonkarahisar', 'Kutahya'],
  Marmara: ['Istanbul', 'Bursa', 'Kocaeli', 'Sakarya', 'Edirne', 'Tekirdag', 'Balikesir', 'Canakkale'],
  'Ic Anadolu': ['Ankara', 'Eskisehir', 'Konya', 'Kayseri', 'Sivas', 'Kirikkale'],
  Akdeniz: ['Antalya', 'Isparta', 'Burdur', 'Adana', 'Mersin', 'Hatay'],
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function getCoverage(programs: YokAtlasProgram[], tytNet: number, aytNet: number) {
  const passable = programs.filter((program) => tytNet >= program.tytNet && aytNet >= program.aytNet);
  const closest = [...programs]
    .sort((a, b) => {
      const aGap = Math.max(0, a.tytNet - tytNet) + Math.max(0, a.aytNet - aytNet);
      const bGap = Math.max(0, b.tytNet - tytNet) + Math.max(0, b.aytNet - aytNet);
      return aGap - bGap;
    })[0];

  return {
    passable,
    closest,
    percent: programs.length ? Math.round((passable.length / programs.length) * 100) : 0,
  };
}

export function GlobalHeatmap() {
  const profile = useAppStore((s) => s.profile);
  const exams = useAppStore((s) => s.exams);

  const latestTyt = useMemo(
    () => [...exams].reverse().find((exam) => exam.type === 'TYT')?.totalNet ?? profile?.tytTarget ?? 0,
    [exams, profile?.tytTarget]
  );
  const latestAyt = useMemo(
    () => [...exams].reverse().find((exam) => exam.type === 'AYT')?.totalNet ?? profile?.aytTarget ?? 0,
    [exams, profile?.aytTarget]
  );

  const csPrograms = useMemo(
    () => YOK_ATLAS_DATA.filter((program) => normalize(program.major).includes('bilgisayar')),
    []
  );

  const regions = useMemo(() => Object.entries(REGION_CITIES).map(([name, cities]) => {
    const normalizedCities = new Set(cities.map(normalize));
    const programs = csPrograms.filter((program) => normalizedCities.has(normalize(program.city)));
    const coverage = getCoverage(programs, latestTyt, latestAyt);
    return { name, programs, ...coverage };
  }), [csPrograms, latestTyt, latestAyt]);

  const bestRegion = [...regions].sort((a, b) => b.percent - a.percent)[0];
  const targetMajor = profile?.targetMajor || 'Bilgisayar Muhendisligi';

  return (
    <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#C17767]/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-[0_0_28px_rgba(59,130,246,0.14)]">
            <Globe2 size={21} />
          </div>
          <div>
            <h3 className="font-display italic text-2xl text-zinc-100">Global Net Haritasi</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">TYT + AYT net bazli YOK Atlas kapsami</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Son net profili</div>
          <div className="mt-1 text-xl font-black text-white">
            TYT {latestTyt.toFixed(1)} <span className="text-zinc-600">/</span> AYT {latestAyt.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="relative z-10 mb-6 rounded-3xl border border-[#C17767]/20 bg-[#C17767]/[0.06] p-5">
        <div className="flex items-center gap-2 text-[#C17767] text-[10px] uppercase tracking-[0.25em] font-black mb-2">
          <TrendingUp size={14} /> Net bazli sonuc
        </div>
        <p className="text-sm md:text-base text-zinc-200 leading-relaxed">
          {latestAyt.toFixed(1)} AYT ve {latestTyt.toFixed(1)} TYT net ile {bestRegion?.name ?? 'bolgesel'} bolgesindeki
          {' '}{targetMajor.toLocaleLowerCase('tr-TR')} programlarinin yaklasik %{bestRegion?.percent ?? 0} kapsamina giriyorsun.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
        {regions.map((region) => {
          const gapTyt = Math.max(0, (region.closest?.tytNet ?? 0) - latestTyt);
          const gapAyt = Math.max(0, (region.closest?.aytNet ?? 0) - latestAyt);
          return (
            <div key={region.name} className="p-4 rounded-2xl border bg-[#121212]/80 border-zinc-800/80 hover:border-[#C17767]/35 transition-all hover:shadow-[0_0_30px_rgba(193,119,103,0.08)]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">{region.name}</div>
                  <div className="text-3xl font-black text-zinc-100">%{region.percent}</div>
                </div>
                <MapPin size={16} className="text-[#C17767]" />
              </div>

              <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-gradient-to-r from-[#C17767] to-amber-400" style={{ width: `${region.percent}%` }} />
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Girilebilir CS</span>
                  <span className="font-mono text-zinc-200">{region.passable.length}/{region.programs.length}</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-1">
                    <University size={12} /> En yakin esik
                  </div>
                  <div className="text-zinc-200 font-bold leading-snug">{region.closest?.university ?? 'Veri yok'}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {gapTyt <= 0 && gapAyt <= 0 ? 'Esik gecildi' : `Kalan: TYT ${gapTyt.toFixed(1)} / AYT ${gapAyt.toFixed(1)}`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-white/5 text-xs text-zinc-500 relative z-10">
        Hesaplama kesin tercih sonucu degil; mevcut deneme netlerini 2025 YOK Atlas taban net tahminleriyle bolgesel olarak karsilastirir.
      </div>
    </div>
  );
}
