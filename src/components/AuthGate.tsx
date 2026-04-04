/**
 * AMAC: Login / kayit ekrani. Uygulama acilisinda daima login-first akis sunar.
 */

import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function AuthGate() {
  const { signInWithGoogle, signInWithEmail, resetPassword, authError, setAuthError, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password, mode, displayName);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError?.('E-posta adresini gir.');
      return;
    }
    const ok = await resetPassword(email);
    if (ok) setResetSent(true);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050505] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#C17767]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C17767]/20 bg-[#C17767]/10">
            <span className="font-serif text-3xl italic font-bold text-[#C17767]">B</span>
          </div>
          <h1 className="mb-1 font-serif text-3xl italic text-zinc-100">Boho Mentosluk</h1>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">YKS Akademik OS</p>
        </div>

        <div className="rounded-3xl border border-[#222222] bg-[#111111] p-7 shadow-2xl shadow-black/50">
          <div className="mb-4 rounded-2xl border border-[#2A2A2A] bg-[#171717] px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Giris Akisi</div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {mode === 'login' ? 'Önce giriş yap, hesabın yoksa kayıt sekmesine geç.' : 'Yeni hesap oluşturuyorsun.'}
            </div>
          </div>

          <div className="mb-6 flex rounded-2xl bg-[#1A1A1A] p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-[#C17767] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Giris Yap
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-[#C17767] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Hesap Ac
            </button>
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-bold text-zinc-900 transition-all hover:bg-zinc-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google ile {mode === 'register' ? 'Kayit Ol' : 'Giris Yap'}
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2A2A2A]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">veya</span>
            <div className="h-px flex-1 bg-[#2A2A2A]" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Adin / mahlasın"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-3 pl-10 pr-4 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#C17767]"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                placeholder="E-posta"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-3 pl-10 pr-4 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#C17767]"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sifre"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-3 pl-10 pr-12 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#C17767]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {authError && (
              <div className="rounded-xl border border-red-800/50 bg-red-950/50 px-3 py-2.5 text-xs text-red-400">
                {authError}
              </div>
            )}

            {resetSent && (
              <div className="rounded-xl border border-green-800/50 bg-green-950/50 px-3 py-2.5 text-xs text-green-400">
                Sifre sifirlama baglantisi e-postana gonderildi.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#C17767] py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#A56253] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <LogIn size={16} />
                  {mode === 'register' ? 'Hesap Olustur' : 'Giris Yap'}
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={handleResetPassword}
              className="mt-3 w-full text-center text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Sifremi Unuttum
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-zinc-700">
          Veriler cihazlar arasinda senkronize edilir
        </p>
      </div>
    </div>
  );
}
