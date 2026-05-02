import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, Download, Share2, Trophy, X } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  achievement: string;
  date: string;
  eloScore?: number;
}

async function renderElementToPng(element: HTMLElement): Promise<string> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  const wrapper = document.createElement('div');
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = '#0f0f0f';
  wrapper.appendChild(clone);

  const markup = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context is not available');
    ctx.scale(2, 2);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'image/png' });
}

export function CertificateModal({ isOpen, onClose, userName, achievement, date, eloScore }: CertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportAsPng = useCallback(async () => {
    if (!certRef.current) return;
    setIsExporting(true);
    try {
      const url = await renderElementToPng(certRef.current);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boho-sertifika-${userName.replace(/\s/g, '-')}.png`;
      a.click();
    } catch (error) {
      console.error('[Certificate] Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [userName]);

  const shareOnSocial = useCallback(async () => {
    if (!navigator.share) {
      await exportAsPng();
      return;
    }

    try {
      if (!certRef.current) return;
      const dataUrl = await renderElementToPng(certRef.current);
      const file = await dataUrlToFile(dataUrl, 'boho-sertifika.png');
      const shareData: ShareData = {
        title: `${userName} - Boho Mentos Basari Sertifikasi`,
        text: `${achievement} basarimini tamamladim.`,
        files: [file],
      };

      if (navigator.canShare?.(shareData) === false) {
        await navigator.share({ title: shareData.title, text: shareData.text });
      } else {
        await navigator.share(shareData);
      }
    } catch {
      // User cancelled the share sheet or the platform rejected file sharing.
    }
  }, [achievement, exportAsPng, userName]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative w-full max-w-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-4 -top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:text-white"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>

          <div
            ref={certRef}
            className="relative overflow-hidden rounded-3xl border border-[#C17767]/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-8 shadow-2xl shadow-[#C17767]/10 md:p-12"
          >
            <div className="absolute left-0 top-0 h-32 w-32 rounded-tl-3xl border-l-2 border-t-2 border-[#C17767]/20" />
            <div className="absolute bottom-0 right-0 h-32 w-32 rounded-br-3xl border-b-2 border-r-2 border-[#C17767]/20" />
            <div className="absolute right-4 top-4 opacity-5">
              <Trophy size={120} />
            </div>

            <div className="relative z-10 space-y-6 text-center">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-[#C17767]">Boho Mentos Academy</p>
                <h2 className="font-display text-3xl font-bold italic text-white md:text-4xl">Basari Sertifikasi</h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C17767]/30 to-transparent" />
                <Award size={24} className="text-[#C17767]" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C17767]/30 to-transparent" />
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Bu sertifika</p>
                <p className="font-display text-2xl font-bold italic text-[#C17767] md:text-3xl">{userName}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-500">adina duzenlenmistir</p>
              </div>

              <div className="inline-block rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-4">
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-zinc-600">Basarim</p>
                <p className="text-lg font-bold text-white">{achievement}</p>
              </div>

              <div className="flex items-center justify-center gap-8 text-xs text-zinc-500">
                <span>{date}</span>
                {eloScore && <span className="font-mono font-bold text-[#C17767]">{eloScore.toLocaleString()} ELO</span>}
              </div>

              <p className="mt-4 text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">
                boho-mentos.vercel.app - Davranissal Kocluk Platformu
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={exportAsPng}
              disabled={isExporting}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <Download size={14} />
              PNG Indir
            </button>
            <button
              type="button"
              onClick={shareOnSocial}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#C17767] py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#C17767]/20 transition hover:bg-[#A56253]"
            >
              <Share2 size={14} />
              Paylas
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
