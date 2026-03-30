import React, { useState } from 'react';
import type { StudentProfile } from '../../types';

interface ProfileSettingsProps {
  initialData?: Partial<StudentProfile>;
  onSubmit: (profile: StudentProfile) => void;
  isEditMode?: boolean;
}

export function ProfileSettings({ initialData, onSubmit, isEditMode = false }: ProfileSettingsProps) {
  const [formData, setFormData] = useState<Partial<StudentProfile>>(initialData || {
    name: '',
    exam: 'YKS',
    track: 'Sayısal',
    targetUniversity: '',
    targetMajor: '',
    tytTarget: 80,
    aytTarget: 50,
    minHours: 4,
    dailyGoalHours: 6,
    weakSubjects: 'Matematik',
    strongSubjects: 'Türkçe',
    motivationQuote: '',
    examYear: '2026',
    minDailyQuestions: 100,
    maxDailyQuestions: 300,
    coachPersonality: ''
  });

  const handleChange = (field: keyof StudentProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetUniversity || !formData.targetMajor) {
      alert("Lütfen İsim, Hedef Üniversite ve Bölüm alanlarını zorunlu olarak doldurun.");
      return;
    }
    onSubmit(formData as StudentProfile);
  };

  return (
    <div className={isEditMode ? "" : "min-h-screen bg-[#121212] flex items-center justify-center p-4 md:p-8"}>
      <div className={`w-full max-w-2xl bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-xl ${isEditMode ? 'p-0 border-none' : 'p-8 md:p-12'}`}>
        {!isEditMode && (
           <div className="mb-10 text-center">
             <h1 className="font-serif italic text-4xl mb-3 text-[#C17767]">Boho Mentosluk</h1>
             <p className="text-xs uppercase opacity-50 tracking-widest text-[#EAE6DF]">YKS Operasyon Sistemi Kurulumu</p>
           </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Öğrenci Adı</label>
                 <input 
                   type="text" 
                   value={formData.name || ''} 
                   onChange={e => handleChange('name', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none transition-colors"
                   placeholder="Örn: Alper Şener"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Hedef Üniversite</label>
                 <input 
                   type="text" 
                   value={formData.targetUniversity || ''} 
                   onChange={e => handleChange('targetUniversity', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none transition-colors"
                   placeholder="Örn: Akdeniz Üniversitesi"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Alan (Track)</label>
                 <select 
                   value={formData.track || 'Sayısal'} 
                   onChange={e => handleChange('track', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none transition-colors"
                 >
                   <option value="Sayısal">Sayısal</option>
                   <option value="Eşit Ağırlık">Eşit Ağırlık</option>
                   <option value="Sözel">Sözel</option>
                   <option value="Dil">Dil</option>
                 </select>
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Hedef Bölüm</label>
                 <input 
                   type="text" 
                   value={formData.targetMajor || ''} 
                   onChange={e => handleChange('targetMajor', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none transition-colors"
                   placeholder="Örn: Bilgisayar Müh."
                 />
               </div>
            </div>

            <div className="border-t border-[#2A2A2A] pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Hedef TYT Neti</label>
                 <input 
                   type="number" min="0" max="120"
                   value={formData.tytTarget || ''} 
                   onChange={e => handleChange('tytTarget', Number(e.target.value))} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Hedef AYT Neti</label>
                 <input 
                   type="number" min="0" max="80"
                   value={formData.aytTarget || ''} 
                   onChange={e => handleChange('aytTarget', Number(e.target.value))} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Günlük Çalışma Hedefi (Saat)</label>
                 <input 
                   type="number" min="1" max="16"
                   value={formData.dailyGoalHours || ''} 
                   onChange={e => handleChange('dailyGoalHours', Number(e.target.value))} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-amber-500 opacity-90 block mb-2">En Zayıf Ders/Konu (AI Odak)</label>
                 <input 
                   type="text"
                   value={formData.weakSubjects || ''} 
                   onChange={e => handleChange('weakSubjects', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-amber-500 focus:outline-none"
                   placeholder="Örn: Matematik, Kimya"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Hedef Sınav Yılı</label>
                 <select 
                   value={formData.examYear || '2025'} 
                   onChange={e => handleChange('examYear', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none transition-colors"
                 >
                   <option value="2025">YKS 2025</option>
                   <option value="2026">YKS 2026</option>
                   <option value="2027">YKS 2027</option>
                 </select>
               </div>
               <div className="md:col-span-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] opacity-80 block mb-2">Sana Hitap Edecek Bir Başarı Mottosu (Motivasyon Cümlesi)</label>
                 <input 
                   type="text"
                   value={formData.motivationQuote || ''} 
                   onChange={e => handleChange('motivationQuote', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-[#C17767] focus:outline-none"
                   placeholder="Örn: Çalışkanlık, bahaneleri çöpe atar."
                 />
               </div>
               <div className="md:col-span-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-blue-400 opacity-90 block mb-2">Koç Kişiselleştirme İstekleri (AI Prompt Override)</label>
                 <textarea 
                   rows={3}
                   value={formData.coachPersonality || ''} 
                   onChange={e => handleChange('coachPersonality', e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl focus:border-blue-400 focus:outline-none resize-none"
                   placeholder="Örn: Bana sert davran, azarla. Veya: Daha çok motivasyon ver, detaylı konu anlat."
                 />
               </div>
            </div>

           <button 
             type="submit" 
             className="w-full mt-4 py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors shadow-lg shadow-[#C17767]/20"
           >
             {isEditMode ? 'Değişiklikleri Kaydet' : 'Aksiyon Başlasın'}
           </button>
        </form>
      </div>
    </div>
  );
}
