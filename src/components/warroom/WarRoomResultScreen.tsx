/**
 * AMAÇ: War Room Oturum Sonucu (Raporlama) Ekranı
 * MANTIK: Doğru/Yanlış net ve AI analizi gösterir. Log olarak otomatik atıldı.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Target, CheckCircle2, XCircle, Clock, Home, ArrowRight, Zap } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function WarRoomResultScreen() {
  const warRoomSession = useAppStore(s => s.warRoomSession);
  const setWarRoomSession = useAppStore(s => s.setWarRoomSession);
  const setWarRoomMode = useAppStore(s => s.setWarRoomMode);
  
  const session = warRoomSession;

  if (!session || !session.result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app">
        <p className="text-zinc-500 font-mono text-sm uppercase">Oturum Bulunamadı.</p>
        <button onClick={() => setWarRoomMode('setup')} className="mt-4 px-6 py-2 bg-[#C17767] text-white rounded-lg text-xs font-bold uppercase tracking-widest">Geri Dön</button>
      </div>
    );
  }

  const res = session.result;

  return (
    <div className="flex-1 overflow-auto bg-app p-4 md:p-8">
      <div className="max-w-4xl mx-auto mt-12">

        <header className="mb-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`inline-flex w-20 h-20 items-center justify-center rounded-3xl mb-6 shadow-2xl ${res.accuracy > 70 ? 'bg-[#22C55E] shadow-[#22C55E]/20 text-white'
                : res.accuracy > 40 ? 'bg-[#E09F3E] shadow-[#E09F3E]/20 text-white'
                  : 'bg-[#EF4444] shadow-[#EF4444]/20 text-white'
              }`}
          >
            {res.accuracy > 70 ? <Target size={40} /> : res.accuracy > 40 ? <Clock size={40} /> : <XCircle size={40} />}
          </motion.div>
          <h1 className="font-display italic text-5xl font-bold bg-gradient-to-r from-zinc-200 to-zinc-500 bg-clip-text text-transparent mb-2">Simülasyon Bitti</h1>
          <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold text-[#C17767]">Savaş Sonrası Analiz Raporu</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#FFFFFF] dark:bg-[#121212] border border-[#EAE6DF] dark:border-[#2A2A2A] rounded-2xl p-6 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2">Başarı Oranı</div>
            <div className={`text-4xl font-display font-bold ${res.accuracy > 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>%{res.accuracy}</div>
          </div>
          <div className="bg-[#FFFFFF] dark:bg-[#121212] border border-[#EAE6DF] dark:border-[#2A2A2A] rounded-2xl p-6 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2">Net Skor</div>
            <div className="text-4xl font-display font-bold text-[#4A443C] dark:text-zinc-200">{res.net.toFixed(2)}</div>
          </div>
          <div className="bg-[#FFFFFF] dark:bg-[#121212] border border-[#EAE6DF] dark:border-[#2A2A2A] rounded-2xl p-6 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2">Geçen Süre</div>
            <div className="text-4xl font-display font-bold text-[#4A443C] dark:text-zinc-200">{Math.floor(res.timeSpentSeconds / 60)}<span className="text-sm">dk</span></div>
          </div>
          <div className="bg-[#FFFFFF] dark:bg-[#121212] border border-[#EAE6DF] dark:border-[#2A2A2A] rounded-2xl p-6 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2">Özet</div>
            <div className="text-sm font-bold text-[#4A443C] dark:text-zinc-300 mt-2 flex justify-center gap-2">
              <span className="text-[#22C55E]">{res.correct}D</span> •
              <span className="text-[#EF4444]">{res.wrong}Y</span> •
              <span className="text-zinc-500">{res.empty}B</span>
            </div>
          </div>
        </div>

        {/* AI Değerlendirmesi */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#121212] border border-[#2A2A2A] rounded-3xl p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Target size={120} />
          </div>
          <h3 className="font-display italic text-2xl mb-4 text-[#C17767] flex items-center gap-3 relative z-10">
            <Zap size={24} /> Kübra Analizi
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400 font-mono relative z-10">
            {res.accuracy > 80 ? "Savaşta keskin nişancı gibiydin. Bu bölgede ustalaşmak üzeresin. Ancak gerçek düşman (ÖSYM) sadece kolay hedefleri seçmez, hazırlıklı ol." :
              res.accuracy > 40 ? "Cephe hattını korudun ama kayıplarımız var. Oyalayıcı şıklara ve zaman tuzaklarına düşmemen gerekiyor. Mezarlıktan ödevlerin çıkacak." :
                "Ağır kayıp. Konu eksiğin bariz şekilde ortada. Bu seviyeye tekrar saldırmadan önce karargaha (Özetlere) dön ve eksiklerini kapa."}
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setWarRoomSession(null);
              setWarRoomMode('setup');
            }}
            className="px-8 py-4 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#C17767]/20 hover:scale-105 transition-transform flex items-center gap-3"
          >
            YENİDEN SALDIR <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
