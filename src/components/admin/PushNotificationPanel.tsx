import React, { useState } from 'react';
import { Send, Bell, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { auth } from '../../services/firebase';

type PushTarget = 'all' | 'active';

export function PushNotificationPanel() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<PushTarget>('all');
  const [isSending, setIsSending] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const handleSendPush = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    setResultMsg('');

    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        throw new Error('AUTH_REQUIRED');
      }

      const response = await fetch('/api/admin/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          target,
          notification: {
            title: title.trim(),
            body: body.trim(),
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data.error || 'PUSH_SEND_FAILED'));
      }

      setResultMsg(`Basarili. ${Number(data.sentCount || 0)} cihaza bildirim gonderildi.`);
      setTitle('');
      setBody('');
    } catch (err) {
      console.error(err);
      setResultMsg('Hata: Bildirim servisi server tarafinda yetkili ve aktif degil.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6 border-b border-[#2A2A2A] pb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Bell className="text-blue-500" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-zinc-100">Global Duyuru Paneli</h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Server-side FCM Broadcast</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Baslik</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Orn: Acil calisma uyarisi"
              maxLength={120}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Icerik</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Orn: Bugunku hedeflerin icin masaya don."
              maxLength={500}
              rows={4}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Hedef Kitle</label>
            <div className="flex bg-[#1A1A1A] p-1 rounded-xl border border-[#2A2A2A]">
              <button
                onClick={() => setTarget('all')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${target === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Users size={14} /> Tum Kullanicilar
              </button>
              <button
                onClick={() => setTarget('active')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${target === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <AlertTriangle size={14} /> Aktif Segment
              </button>
            </div>
          </div>

          <div className="bg-blue-900/10 border border-blue-900/20 rounded-xl p-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mb-2">Guvenli Push Modeli</h4>
            <p className="text-xs text-blue-200/60 leading-relaxed">
              Cihaz tokenlari client tarafinda okunmaz veya gonderilmez. Admin yetkisi ve FCM broadcast secimi server tarafinda dogrulanir.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#2A2A2A] pt-6">
        <span className={`text-xs font-bold ${resultMsg.includes('Hata') ? 'text-red-400' : 'text-green-400'}`}>{resultMsg}</span>

        <button
          onClick={handleSendPush}
          disabled={isSending || !title.trim() || !body.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {isSending ? 'Gonderiliyor...' : 'Yayina Al'}
        </button>
      </div>
    </div>
  );
}
