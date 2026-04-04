import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import type { StudentProfile } from '../../types';
import { searchYokAtlas, type YokAtlasProgram } from '../../data/yokAtlasData';

interface ProfileSettingsProps {
  onSubmit: (profile: StudentProfile) => void;
  initialData?: StudentProfile | null;
  isEditMode?: boolean;
}

type Track = StudentProfile['track'];
type StepId = 1 | 2 | 3 | 4 | 5;

const TRACKS: Array<{ value: Track; label: string; sub: string; icon: string }> = [
  { value: 'Sayısal', label: 'Sayısal', sub: 'Mühendislik · Tıp · Mimarlık', icon: '⚡' },
  { value: 'Eşit Ağırlık', label: 'Eşit Ağırlık', sub: 'Hukuk · İşletme · İktisat', icon: '⚖️' },
  { value: 'Sözel', label: 'Sözel', sub: 'Edebiyat · İletişim · Psikoloji', icon: '📚' },
  { value: 'Dil', label: 'Dil', sub: 'Mütercim · Filoloji · Edebiyat', icon: '🌐' },
];

const COACH_OPTIONS = [
  { id: 'harsh', icon: '💀', title: 'DİSİPLİNER', subtitle: 'Sert. Gerçekçi. Acımasız.', desc: 'Mazeret dinlemez, hedef farkını yüzüne söyler.', color: '#EF4444', glow: 'rgba(239,68,68,0.15)' },
  { id: 'motivational', icon: '🔥', title: 'DESTEKLEYİCİ', subtitle: 'Güven. Enerji. Motivasyon.', desc: 'Düştüğünde toplar, ritmini geri kazandırır.', color: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
  { id: 'analytical', icon: '📊', title: 'ANALİTİK', subtitle: 'Veri. Strateji. Hassasiyet.', desc: 'Kararı metrik ve trend üstünden kurar.', color: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
] as const;

const STEP_TITLES: Record<StepId, string> = {
  1: 'Kaderini İnşa Et',
  2: 'Hedefini Kilitle',
  3: 'Net Hedefleri',
  4: 'Koç Karakteri',
  5: 'Hazırsın!',
};

function buildProfilePayload(params: {
  name: string;
  examYear: string;
  track: Track;
  targetUni: string;
  targetMajor: string;
  tytTarget: number;
  aytTarget: number;
  minHours: number;
  coachPersonality: string;
  avatar?: string;
  initialData?: StudentProfile | null;
}): StudentProfile {
  const { name, examYear, track, targetUni, targetMajor, tytTarget, aytTarget, minHours, coachPersonality, avatar, initialData } = params;
  return {
    name,
    exam: initialData?.exam ?? 'YKS',
    track,
    targetUniversity: targetUni,
    targetMajor,
    tytTarget,
    aytTarget,
    minHours,
    maxHours: initialData?.maxHours ?? minHours + 2,
    dailyGoalHours: minHours,
    startTime: initialData?.startTime ?? '09:00',
    endTime: initialData?.endTime ?? '22:00',
    aytPriorities: initialData?.aytPriorities ?? '',
    weakSubjects: initialData?.weakSubjects ?? '',
    strongSubjects: initialData?.strongSubjects ?? '',
    resources: initialData?.resources ?? '',
    motivationQuote: initialData?.motivationQuote,
    examYear,
    minDailyQuestions: initialData?.minDailyQuestions ?? 100,
    maxDailyQuestions: initialData?.maxDailyQuestions ?? 300,
    coachPersonality,
    yokAtlasNet: initialData?.yokAtlasNet,
    avatar,
    targetGoals: initialData?.targetGoals,
    lastSyncAt: initialData?.lastSyncAt,
  };
}

export function ProfileSettings({ onSubmit, initialData, isEditMode = false }: ProfileSettingsProps) {
  const [step, setStep] = useState<StepId>(1);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [visible, setVisible] = useState(true);
  const [name, setName] = useState(initialData?.name ?? '');
  const [examYear, setExamYear] = useState(initialData?.examYear ?? '2026');
  const [track, setTrack] = useState<Track>(initialData?.track ?? 'Sayısal');
  const [avatar, setAvatar] = useState<string | undefined>(initialData?.avatar);
  const [targetUni, setTargetUni] = useState(initialData?.targetUniversity ?? '');
  const [targetMajor, setTargetMajor] = useState(initialData?.targetMajor ?? '');
  const [tytTarget, setTytTarget] = useState(initialData?.tytTarget ?? 90);
  const [aytTarget, setAytTarget] = useState(initialData?.aytTarget ?? 65);
  const [minHours, setMinHours] = useState(initialData?.minHours ?? 6);
  const [coachPersonality, setCoachPersonality] = useState(initialData?.coachPersonality ?? 'harsh');
  const [showUniDrop, setShowUniDrop] = useState(false);
  const [uniSuggestions, setUniSuggestions] = useState<YokAtlasProgram[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedAtlasProgram = useMemo(() => {
    const normalizedUni = targetUni.trim().toLocaleLowerCase('tr-TR');
    const normalizedMajor = targetMajor.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedUni || !normalizedMajor) return null;
    return searchYokAtlas(`${targetUni} ${targetMajor}`, track).find((program) =>
      program.university.toLocaleLowerCase('tr-TR') === normalizedUni &&
      program.major.toLocaleLowerCase('tr-TR') === normalizedMajor) ?? null;
  }, [targetUni, targetMajor, track]);

  useEffect(() => {
    if (targetUni.length >= 2 && showUniDrop) {
      setUniSuggestions(searchYokAtlas(targetUni, track).slice(0, 8));
    } else {
      setUniSuggestions([]);
    }
  }, [targetUni, showUniDrop, track]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(400 / img.width, 400 / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const goTo = (next: StepId) => {
    setAnimDir(next > step ? 'forward' : 'back');
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 220);
  };

  const handleSelectUni = (program: YokAtlasProgram) => {
    setTargetUni(program.university);
    setTargetMajor(program.major);
    setTytTarget(program.tytNet);
    setAytTarget(program.aytNet);
    setShowUniDrop(false);
    setUniSuggestions([]);
  };

  const handleSubmit = () => onSubmit(buildProfilePayload({
    name, examYear, track, targetUni, targetMajor, tytTarget, aytTarget, minHours, coachPersonality, avatar, initialData,
  }));

  const canProceed = () => (step === 1 ? name.trim().length > 0 : step === 2 ? targetUni.trim().length > 0 && targetMajor.trim().length > 0 : true);

  if (isEditMode) {
    return (
      <EditModeForm
        name={name} setName={setName} examYear={examYear} setExamYear={setExamYear} track={track} setTrack={setTrack}
        avatar={avatar} fileRef={fileRef} handleAvatarChange={handleAvatarChange}
        targetUni={targetUni} setTargetUni={setTargetUni} targetMajor={targetMajor} setTargetMajor={setTargetMajor}
        tytTarget={tytTarget} setTytTarget={setTytTarget} aytTarget={aytTarget} setAytTarget={setAytTarget}
        minHours={minHours} setMinHours={setMinHours} coachPersonality={coachPersonality} setCoachPersonality={setCoachPersonality}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .ps-orb{position:absolute;border-radius:50%;filter:blur(120px);pointer-events:none;animation:ps-pulse 8s ease-in-out infinite}
        .ps-o1{width:600px;height:600px;background:rgba(193,119,103,.06);top:-200px;right:-200px}.ps-o2{width:500px;height:500px;background:rgba(59,130,246,.04);bottom:-150px;left:-150px;animation-delay:3s}.ps-o3{width:300px;height:300px;background:rgba(245,158,11,.04);top:40%;left:40%;animation-delay:5s}
        @keyframes ps-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
        .ps-input{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 18px;font-size:15px;color:rgba(255,255,255,.9);outline:none;transition:.2s;box-sizing:border-box;font-family:inherit}.ps-input:focus{border-color:rgba(193,119,103,.5);background:rgba(193,119,103,.04);box-shadow:0 0 0 3px rgba(193,119,103,.08)}
        .ps-label{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px;display:block}
        .ps-slide{transition:all .22s cubic-bezier(.4,0,.2,1)} .ps-slide.hidden-forward{opacity:0;transform:translateX(40px)} .ps-slide.hidden-back{opacity:0;transform:translateX(-40px)} .ps-slide.visible{opacity:1;transform:translateX(0)}
        .ps-track{padding:16px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);cursor:pointer;transition:.2s;display:flex;align-items:center;gap:14px}.ps-track.sel,.ps-track:hover{border-color:rgba(193,119,103,.35);background:rgba(193,119,103,.07)}
        .ps-coach{padding:20px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);cursor:pointer;transition:.25s}.ps-coach:hover{transform:translateY(-2px)}
        .ps-drop{position:absolute;top:calc(100% + 4px);left:0;right:0;background:rgba(14,14,14,.98);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;z-index:50;box-shadow:0 20px 50px rgba(0,0,0,.6);backdrop-filter:blur(20px)} .ps-drop-item{padding:12px 16px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04)} .ps-drop-item:hover{background:rgba(193,119,103,.08)}
        .ps-slider{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer}.ps-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#C17767;cursor:pointer}
      `}</style>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="ps-orb ps-o1" /><div className="ps-orb ps-o2" /><div className="ps-orb ps-o3" />
      </div>
      <div style={{ background: 'rgba(12,12,12,.98)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 28, width: '100%', maxWidth: 640, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 0 0 1px rgba(255,255,255,.04), 0 60px 120px rgba(0,0,0,.8)', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
          <StepTrack step={step} />
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: '#C17767', margin: 0 }}>Adım {step} / 5</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-.03em', lineHeight: 1.1, margin: '6px 0 0' }}>{STEP_TITLES[step]}</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', scrollbarWidth: 'none' }}>
          <div className={`ps-slide ${visible ? 'visible' : animDir === 'forward' ? 'hidden-forward' : 'hidden-back'}`}>
            {step === 1 && <IdentityStep name={name} setName={setName} examYear={examYear} setExamYear={setExamYear} track={track} setTrack={setTrack} avatar={avatar} fileRef={fileRef} handleAvatarChange={handleAvatarChange} />}
            {step === 2 && <TargetStep targetUni={targetUni} setTargetUni={setTargetUni} targetMajor={targetMajor} setTargetMajor={setTargetMajor} uniSuggestions={uniSuggestions} showUniDrop={showUniDrop} setShowUniDrop={setShowUniDrop} handleSelectUni={handleSelectUni} selectedAtlasProgram={selectedAtlasProgram} />}
            {step === 3 && <GoalStep tytTarget={tytTarget} setTytTarget={setTytTarget} aytTarget={aytTarget} setAytTarget={setAytTarget} minHours={minHours} setMinHours={setMinHours} />}
            {step === 4 && <CoachStep coachPersonality={coachPersonality} setCoachPersonality={setCoachPersonality} />}
            {step === 5 && <SummaryStep name={name} examYear={examYear} track={track} avatar={avatar} targetUni={targetUni} targetMajor={targetMajor} tytTarget={tytTarget} aytTarget={aytTarget} minHours={minHours} coachPersonality={coachPersonality} />}
          </div>
        </div>
        <div style={{ padding: '20px 32px 24px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', gap: 12, flexShrink: 0 }}>
          {step > 1 && <FooterGhost onClick={() => goTo((step - 1) as StepId)}><ChevronLeft size={16} /> Geri</FooterGhost>}
          {step < 5 ? <FooterPrimary onClick={() => goTo((step + 1) as StepId)} disabled={!canProceed()}>{step === 4 ? 'Özeti Gör' : 'Devam Et'} <ChevronRight size={16} /></FooterPrimary> : <FooterPrimary onClick={handleSubmit}><Sparkles size={16} /> Sistemi Başlat</FooterPrimary>}
        </div>
      </div>
    </div>
  );
}

function StepTrack({ step }: { step: StepId }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
      {[1, 2, 3, 4, 5].map((value, index) => (
        <React.Fragment key={value}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, background: value < step ? '#C17767' : value === step ? 'rgba(193,119,103,.15)' : 'rgba(255,255,255,.04)',
            color: value < step ? 'white' : value === step ? '#C17767' : 'rgba(255,255,255,.2)', border: value === step ? '1.5px solid #C17767' : '1px solid rgba(255,255,255,.1)',
          }}>{value < step ? <CheckCircle2 size={14} /> : value}</div>
          {index < 4 && <div style={{ flex: 1, height: 1, background: value < step ? 'rgba(193,119,103,.4)' : 'rgba(255,255,255,.06)' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function FooterPrimary({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ flex: 1, padding: '14px 24px', background: 'linear-gradient(135deg,#C17767,#a85e4e)', color: 'white', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{children}</button>;
}

function FooterGhost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ padding: '14px 20px', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>{children}</button>;
}

function IdentityStep(props: { name: string; setName: React.Dispatch<React.SetStateAction<string>>; examYear: string; setExamYear: React.Dispatch<React.SetStateAction<string>>; track: Track; setTrack: React.Dispatch<React.SetStateAction<Track>>; avatar?: string; fileRef: React.RefObject<HTMLInputElement | null>; handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) {
  const { name, setName, examYear, setExamYear, track, setTrack, avatar, fileRef, handleAvatarChange } = props;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div>
        <span className="ps-label">Fotoğraf</span>
        <div onClick={() => fileRef.current?.click()} style={{ width: 100, height: 100, borderRadius: 24, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          {avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={22} style={{ color: 'rgba(255,255,255,.25)' }} />}
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: '#C17767', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={11} color="white" /></div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
      </div>
      <div style={{ flex: 1 }}>
        <span className="ps-label">Kod Adın / Mahlasın</span>
        <input className="ps-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Savaşçı, Yıldız, Titan..." autoFocus />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', marginTop: 6 }}>Bu isimle çağrılacaksın. İstersen gerçek ismin de olur.</p>
      </div>
    </div>
    <div>
      <span className="ps-label">Sınav Yılı</span>
      <div style={{ display: 'flex', gap: 10 }}>{['2025', '2026', '2027'].map((year) => <button key={year} type="button" onClick={() => setExamYear(year)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${examYear === year ? '#C17767' : 'rgba(255,255,255,.08)'}`, background: examYear === year ? 'rgba(193,119,103,.1)' : 'rgba(255,255,255,.02)', color: examYear === year ? '#C17767' : 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>YKS {year}</button>)}</div>
    </div>
    <div>
      <span className="ps-label">Akademik Alan</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{TRACKS.map((trackOption) => <div key={trackOption.value} className={`ps-track ${track === trackOption.value ? 'sel' : ''}`} onClick={() => setTrack(trackOption.value)}><span style={{ fontSize: 22 }}>{trackOption.icon}</span><div><p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: track === trackOption.value ? '#C17767' : 'rgba(255,255,255,.8)' }}>{trackOption.label}</p><p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{trackOption.sub}</p></div>{track === trackOption.value && <CheckCircle2 size={16} style={{ color: '#C17767', marginLeft: 'auto' }} />}</div>)}</div>
    </div>
  </div>;
}

function TargetStep(props: { targetUni: string; setTargetUni: React.Dispatch<React.SetStateAction<string>>; targetMajor: string; setTargetMajor: React.Dispatch<React.SetStateAction<string>>; uniSuggestions: YokAtlasProgram[]; showUniDrop: boolean; setShowUniDrop: React.Dispatch<React.SetStateAction<boolean>>; handleSelectUni: (program: YokAtlasProgram) => void; selectedAtlasProgram: YokAtlasProgram | null; }) {
  const { targetUni, setTargetUni, targetMajor, setTargetMajor, uniSuggestions, showUniDrop, setShowUniDrop, handleSelectUni, selectedAtlasProgram } = props;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(193,119,103,.2)', background: 'rgba(193,119,103,.04)' }}><p style={{ margin: 0, fontSize: 12, color: 'rgba(193,119,103,.8)', lineHeight: 1.6 }}><strong style={{ color: '#C17767' }}>💡 İpucu:</strong> Üniversite adı yazarak otomatik taban net verilerini çek.</p></div>
    <div style={{ position: 'relative' }}>
      <span className="ps-label">Hedef Üniversite</span>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.25)' }} />
        <input className="ps-input" style={{ paddingLeft: 44 }} type="text" value={targetUni} onChange={(e) => { setTargetUni(e.target.value); setShowUniDrop(true); }} onFocus={() => setShowUniDrop(true)} onBlur={() => setTimeout(() => setShowUniDrop(false), 200)} placeholder="Boğaziçi, ODTÜ, Hacettepe..." />
      </div>
      {showUniDrop && uniSuggestions.length > 0 && <div className="ps-drop">{uniSuggestions.map((program) => <div key={program.id} className="ps-drop-item" onMouseDown={() => handleSelectUni(program)}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}><div><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>{program.university}</p><p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{program.major}</p></div><span style={{ fontSize: 11, fontWeight: 700, color: '#C17767', background: 'rgba(193,119,103,.12)', padding: '3px 8px', borderRadius: 6 }}>TYT {program.tytNet} · AYT {program.aytNet}</span></div></div>)}</div>}
    </div>
    <div>
      <span className="ps-label">Hedef Bölüm / Fakülte</span>
      <div style={{ position: 'relative' }}>
        <GraduationCap size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.25)' }} />
        <input className="ps-input" style={{ paddingLeft: 44 }} type="text" value={targetMajor} onChange={(e) => setTargetMajor(e.target.value)} placeholder="Bilgisayar Mühendisliği, Tıp..." />
      </div>
    </div>
    {selectedAtlasProgram && <div style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.04)', display: 'flex', gap: 14, alignItems: 'center' }}><div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={18} style={{ color: '#22C55E' }} /></div><div><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#22C55E' }}>Hedef Kilitlendi</p><p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{selectedAtlasProgram.university} · {selectedAtlasProgram.major}</p></div></div>}
  </div>;
}

function GoalStep(props: { tytTarget: number; setTytTarget: React.Dispatch<React.SetStateAction<number>>; aytTarget: number; setAytTarget: React.Dispatch<React.SetStateAction<number>>; minHours: number; setMinHours: React.Dispatch<React.SetStateAction<number>>; }) {
  const { tytTarget, setTytTarget, aytTarget, setAytTarget, minHours, setMinHours } = props;
  const tytPct = Math.round((tytTarget / 120) * 100);
  const aytPct = Math.round((aytTarget / 80) * 100);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <MetricSlider label="TYT Net Hedefi" hint="Maksimum 120 net" value={tytTarget} maxLabel="/ 120" color="#C17767" percent={tytPct} min={40} max={120} onChange={setTytTarget} />
    <MetricSlider label="AYT Net Hedefi" hint="Maksimum 80 net" value={aytTarget} maxLabel="/ 80" color="#E09F3E" percent={aytPct} min={20} max={80} onChange={setAytTarget} />
    <div style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
      <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)' }}>Günlük Minimum Çalışma</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer' }} onClick={() => setMinHours(Math.max(1, minHours - 1))}>−</button>
        <div style={{ flex: 1, textAlign: 'center' }}><span style={{ fontSize: 48, fontWeight: 800, color: '#3B82F6', letterSpacing: '-.04em' }}>{minHours}</span><span style={{ fontSize: 14, color: 'rgba(255,255,255,.3)', marginLeft: 6 }}>saat</span></div>
        <button type="button" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer' }} onClick={() => setMinHours(Math.min(16, minHours + 1))}>+</button>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(255,255,255,.2)', textAlign: 'center' }}>Günlük {minHours * 60} dakika · Aylık ~{minHours * 30} saat</p>
    </div>
  </div>;
}

function MetricSlider({ label, hint, value, maxLabel, color, percent, min, max, onChange }: { label: string; hint: string; value: number; maxLabel: string; color: string; percent: number; min: number; max: number; onChange: React.Dispatch<React.SetStateAction<number>>; }) {
  return <div style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div><p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)' }}>{label}</p><p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.2)' }}>{hint}</p></div>
      <div style={{ textAlign: 'right' }}><span style={{ fontSize: 36, fontWeight: 800, color, letterSpacing: '-.03em' }}>{value}</span><span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginLeft: 4 }}>{maxLabel}</span></div>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="ps-slider" style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(255,255,255,.1) ${percent}%, rgba(255,255,255,.1) 100%)` }} />
  </div>;
}

function CoachStep({ coachPersonality, setCoachPersonality }: { coachPersonality: string; setCoachPersonality: React.Dispatch<React.SetStateAction<string>>; }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(255,255,255,.3)', lineHeight: 1.6 }}>Koç seçimin tüm mesaj tonunu belirler. İstediğin zaman ayarlardan değiştirebilirsin.</p>
    {COACH_OPTIONS.map((option) => <div key={option.id} className="ps-coach" onClick={() => setCoachPersonality(option.id)} style={{ borderColor: coachPersonality === option.id ? option.color : 'rgba(255,255,255,.07)', background: coachPersonality === option.id ? option.glow : 'rgba(255,255,255,.02)', boxShadow: coachPersonality === option.id ? `0 0 0 1px ${option.color}30, 0 8px 32px ${option.glow}` : 'none' }}><div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}><span style={{ fontSize: 32, lineHeight: 1 }}>{option.icon}</span><div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: coachPersonality === option.id ? option.color : 'rgba(255,255,255,.7)' }}>{option.title}</p>{coachPersonality === option.id && <CheckCircle2 size={16} style={{ color: option.color }} />}</div><p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: coachPersonality === option.id ? option.color : 'rgba(255,255,255,.3)', letterSpacing: '.05em' }}>{option.subtitle}</p><p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>{option.desc}</p></div></div></div>)}
  </div>;
}

function SummaryStep(props: { name: string; examYear: string; track: string; avatar?: string; targetUni: string; targetMajor: string; tytTarget: number; aytTarget: number; minHours: number; coachPersonality: string; }) {
  const { name, examYear, track, avatar, targetUni, targetMajor, tytTarget, aytTarget, minHours, coachPersonality } = props;
  const coach = COACH_OPTIONS.find((item) => item.id === coachPersonality);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ padding: 24, borderRadius: 20, border: '1px solid rgba(193,119,103,.2)', background: 'linear-gradient(135deg, rgba(193,119,103,.06) 0%, rgba(193,119,103,.02) 100%)', display: 'flex', gap: 18, alignItems: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: avatar ? 'transparent' : 'rgba(193,119,103,.15)', border: '1.5px solid rgba(193,119,103,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} style={{ color: '#C17767' }} />}</div>
      <div><p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-.02em' }}>{name}</p><p style={{ margin: '4px 0 0', fontSize: 12, color: '#C17767', fontWeight: 600, letterSpacing: '.08em' }}>{track.toUpperCase()} · YKS {examYear}</p></div>
    </div>
    <SummaryRow label="Hedef" value={<div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{targetUni}</p><p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{targetMajor}</p></div>} />
    <SummaryRow label="TYT Hedefi" value={<span style={{ fontSize: 20, fontWeight: 800, color: '#C17767' }}>{tytTarget} <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>net</span></span>} />
    <SummaryRow label="AYT Hedefi" value={<span style={{ fontSize: 20, fontWeight: 800, color: '#E09F3E' }}>{aytTarget} <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>net</span></span>} />
    <SummaryRow label="Günlük Hedef" value={<span style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{minHours} <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>saat</span></span>} />
    <SummaryRow label="Koç" last value={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 18 }}>{coach?.icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: coach?.color }}>{coach?.title}</span></div>} />
    <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}><p style={{ margin: 0, fontSize: 12, color: 'rgba(34,197,94,.8)', lineHeight: 1.6 }}>✓ Tüm veriler cihazında yerel olarak saklanacak. İstersen Google hesabınla senkronize edebilirsin.</p></div>
  </div>;
}

function SummaryRow({ label, value, last = false }: { label: string; value: React.ReactNode; last?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,.05)' }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</span>{value}</div>;
}

function EditModeForm(props: { name: string; setName: React.Dispatch<React.SetStateAction<string>>; examYear: string; setExamYear: React.Dispatch<React.SetStateAction<string>>; track: Track; setTrack: React.Dispatch<React.SetStateAction<Track>>; avatar?: string; fileRef: React.RefObject<HTMLInputElement | null>; handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void; targetUni: string; setTargetUni: React.Dispatch<React.SetStateAction<string>>; targetMajor: string; setTargetMajor: React.Dispatch<React.SetStateAction<string>>; tytTarget: number; setTytTarget: React.Dispatch<React.SetStateAction<number>>; aytTarget: number; setAytTarget: React.Dispatch<React.SetStateAction<number>>; minHours: number; setMinHours: React.Dispatch<React.SetStateAction<number>>; coachPersonality: string; setCoachPersonality: React.Dispatch<React.SetStateAction<string>>; onSubmit: () => void; }) {
  const { name, setName, examYear, setExamYear, track, setTrack, avatar, fileRef, handleAvatarChange, targetUni, setTargetUni, targetMajor, setTargetMajor, tytTarget, setTytTarget, aytTarget, setAytTarget, minHours, setMinHours, coachPersonality, setCoachPersonality, onSubmit } = props;
  const tytPct = Math.round((tytTarget / 120) * 100);
  const aytPct = Math.round((aytTarget / 80) * 100);
  const minHoursPct = Math.round((minHours / 16) * 100);
  return <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
    <style>{`.em-label{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px;display:block}.em-input{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 16px;font-size:14px;color:rgba(255,255,255,.9);outline:none;box-sizing:border-box}.em-input:focus{border-color:rgba(193,119,103,.5)}.em-section{margin-bottom:24px}.em-title{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#C17767;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:16px}.em-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.em-pill{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);cursor:pointer;font-size:12px;font-weight:700;color:rgba(255,255,255,.4)}.em-pill.sel{border-color:#C17767;background:rgba(193,119,103,.1);color:#C17767}.em-slider{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer}.em-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#C17767;cursor:pointer}.em-save{width:100%;padding:14px;background:#C17767;color:white;border:none;border-radius:12px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}`}</style>
    <div className="em-section"><div className="em-title">Kimlik</div><div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}><div onClick={() => fileRef.current?.click()} style={{ width: 64, height: 64, borderRadius: 16, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>{avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={20} style={{ color: 'rgba(255,255,255,.2)' }} />}</div><input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} /><div style={{ flex: 1 }}><span className="em-label">İsim / Mahlas</span><input className="em-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="İsmin" /></div></div><div className="em-grid"><div><span className="em-label">Sınav Yılı</span><select className="em-input" value={examYear} onChange={(e) => setExamYear(e.target.value)}><option value="2025">YKS 2025</option><option value="2026">YKS 2026</option><option value="2027">YKS 2027</option></select></div><div><span className="em-label">Alan</span><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{TRACKS.map((trackOption) => <button key={trackOption.value} type="button" className={`em-pill ${track === trackOption.value ? 'sel' : ''}`} onClick={() => setTrack(trackOption.value)}>{trackOption.label}</button>)}</div></div></div></div>
    <div className="em-section"><div className="em-title">Hedef</div><div className="em-grid"><div><span className="em-label">Üniversite</span><input className="em-input" type="text" value={targetUni} onChange={(e) => setTargetUni(e.target.value)} placeholder="Üniversite" /></div><div><span className="em-label">Bölüm</span><input className="em-input" type="text" value={targetMajor} onChange={(e) => setTargetMajor(e.target.value)} placeholder="Bölüm" /></div></div></div>
    <div className="em-section"><div className="em-title">Net Hedefleri</div><div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="em-label" style={{ margin: 0 }}>TYT Hedefi</span><span style={{ fontSize: 20, fontWeight: 800, color: '#C17767' }}>{tytTarget}</span></div><input type="range" min={40} max={120} value={tytTarget} onChange={(e) => setTytTarget(Number(e.target.value))} className="em-slider" style={{ background: `linear-gradient(to right,#C17767 0%,#C17767 ${tytPct}%,rgba(255,255,255,.1) ${tytPct}%,rgba(255,255,255,.1) 100%)` }} /></div><div style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="em-label" style={{ margin: 0 }}>AYT Hedefi</span><span style={{ fontSize: 20, fontWeight: 800, color: '#E09F3E' }}>{aytTarget}</span></div><input type="range" min={20} max={80} value={aytTarget} onChange={(e) => setAytTarget(Number(e.target.value))} className="em-slider" style={{ background: `linear-gradient(to right,#E09F3E 0%,#E09F3E ${aytPct}%,rgba(255,255,255,.1) ${aytPct}%,rgba(255,255,255,.1) 100%)` }} /></div><div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="em-label" style={{ margin: 0 }}>Günlük Min. Saat</span><span style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{minHours}</span></div><input type="range" min={1} max={16} value={minHours} onChange={(e) => setMinHours(Number(e.target.value))} className="em-slider" style={{ background: `linear-gradient(to right,#3B82F6 0%,#3B82F6 ${minHoursPct}%,rgba(255,255,255,.1) ${minHoursPct}%,rgba(255,255,255,.1) 100%)` }} /></div></div>
    <div className="em-section"><div className="em-title">Koç Karakteri</div><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{COACH_OPTIONS.map((option) => <button key={option.id} type="button" style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${coachPersonality === option.id ? option.color : 'rgba(255,255,255,.07)'}`, background: coachPersonality === option.id ? option.glow : 'rgba(255,255,255,.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }} onClick={() => setCoachPersonality(option.id)}><span style={{ fontSize: 20 }}>{option.icon}</span><div style={{ textAlign: 'left' }}><p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: coachPersonality === option.id ? option.color : 'rgba(255,255,255,.6)' }}>{option.title}</p><p style={{ margin: '1px 0 0', fontSize: 10, color: 'rgba(255,255,255,.25)' }}>{option.subtitle}</p></div>{coachPersonality === option.id && <CheckCircle2 size={14} style={{ color: option.color, marginLeft: 'auto' }} />}</button>)}</div></div>
    <button type="button" className="em-save" onClick={onSubmit}>Değişiklikleri Kaydet</button>
  </div>;
}
