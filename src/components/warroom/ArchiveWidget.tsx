import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { uploadImageFile } from '../../services/storageService';
import { useAppStore } from '../../store/appStore';
import type { FailedQuestion } from '../../types';

export function ArchiveWidget({ onSubmit, onCancel, subjects }: { onSubmit: (q: FailedQuestion) => void, onCancel: () => void, subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] || '');
  const [topic, setTopic] = useState('');
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [reason, setReason] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageSelect = async (f: File) => {
    setFile(f);
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // AI okuma başarımı için kontrast ve parlaklık artırma (ön işleme)
              ctx.filter = 'contrast(1.3) brightness(1.1)';
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
            } else {
              resolve((reader.result as string).split(',')[1]);
            }
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(f);
      });
      // 2. Call AI
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'vision_archive_parse',
          userMessage: 'Parse this image',
          imageBase64: b64,
          imageMediaType: f.type,
          forceJson: true
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        let parsed = data;
        if(data.text) {
          try { parsed = JSON.parse(data.text); } catch(e){}
        }
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.topic) setTopic(parsed.topic);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.reason) setReason(parsed.reason);
      }
    } catch(e) {
      console.error('Vision OCR failed', e);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6 shadow-lg mb-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-display italic text-2xl text-[#C17767] dark:text-rose-400">Yeni Mezar Kaz</h3>
          <p className="text-[10px] uppercase tracking-widest opacity-50 text-zinc-500 font-bold">Hatalı soruyu arşive gönder</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X size={20} className="text-[#4A443C] dark:text-zinc-200" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">DERS</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200">
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">ZORLUK</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200">
            <option value="easy">KOLAY (DİKKAT HATASI)</option>
            <option value="medium">ORTA (SÜRE/BİLGİ)</option>
            <option value="hard">ZOR (MANTIK/ÜST DÜZEY)</option>
          </select>
        </div>
        <input type="text" placeholder="Konu Başlığı" value={topic} onChange={e => setTopic(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        <input type="text" placeholder="Kitap / Kaynak Adı" value={book} onChange={e => setBook(e.target.value)} className="bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        <div className="flex gap-2">
          <input type="text" placeholder="Sayfa" value={page} onChange={e => setPage(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
          <input type="text" placeholder="Soru No" value={questionNumber} onChange={e => setQuestionNumber(e.target.value)} className="w-1/2 bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200" />
        </div>
      </div>

      
      <div className="mb-4">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 block mb-1">SORU FOTOĞRAFI (OPSİYONEL - MAX 5MB)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size < 5 * 1024 * 1024) handleImageSelect(f);
            else if (f) alert('Dosya boyutu 5 MB\'ı geçemez.');
          }}
          className="block w-full text-sm text-[#4A443C] dark:text-zinc-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C17767]/10 file:text-[#C17767] hover:file:bg-[#C17767]/20"
        />
      </div>

      <textarea
        placeholder="Neden yanlış yaptın? Hangi bilgi eksikti veya hangi tuzağa düştün?"
        value={reason} onChange={e => setReason(e.target.value)}
        className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C17767] mb-6 h-24 resize-none text-[#4A443C] dark:text-zinc-200"
      />

      <button
        onClick={async () => {
          if (subject && topic && book) {
            let imageUrl: string | undefined = undefined;
            if (file) {
              setIsUploading(true);
              try {
                  const uid = useAppStore.getState().authUser?.uid || 'unknown';
                imageUrl = await uploadImageFile(file, `failed_questions/${uid}/${Date.now()}_${file.name}`);
              } catch (e) {
                console.error("Resim yüklenemedi", e);
                alert("Resim yüklenemedi, ancak soru eklenecek.");
              } finally {
                setIsUploading(false);
              }
            }
            onSubmit({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
              date: new Date().toISOString(),
              subject, topic, book, page, questionNumber, reason,
              difficulty,
              status: 'active',
              solveCount: 0,
              imageUrl
            });
          }
        }}
        disabled={isUploading}
        className="w-full py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold tracking-[0.3em] uppercase hover:bg-[#A56253] transition-all hover:shadow-xl hover:shadow-[#C17767]/20 active:scale-[0.98]"
      >
        {isUploading ? "YÜKLENİYOR..." : "MEZARA GÖNDER"}
      </button>
    </motion.div>
  );
}
