/**
 * AMAÇ: Login / Kayıt ekranı — Email ve Google ile giriş
 * MANTIK: isEditMode=false ise tam ekran modal, true ise ayarlar içi satır içi form
 */

import React, { useState } from 'react';
import { Mail, Lock, User, Chrome, Eye, EyeOff, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthGateProps {
  onSkip?: () => void;
}

export function AuthGate({ onSkip }: AuthGateProps) {
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
    if (!email) { setAuthError?.('E-posta adresini gir.'); return; }
    const ok = await resetPassword(email);
    if (ok) setResetSent(true);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C17767]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C17767]/10 rounded-2xl mb-4 border border-[#C17767]/20">
            <span className="font-serif italic text-3xl font-bold text-[#C17767]">B</span>
          </div>
          <h1 className="font-serif italic text-3xl text-zinc-100 mb-1">Boho Mentosluk</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">YKS Akademik OS</p>
        </div>

        <div className="bg-[#111111] border border-[#222222] rounded-3xl p-7 shadow-2xl shadow-black/50">

          {/* Mod seçici */}
          <div className="flex mb-6 bg-[#1A1A1A] rounded-2xl p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-[#C17767] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-[#C17767] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Hesap Aç
            </button>
          </div>

          {/* Google ile Giriş */}
          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl py-3.5 text-sm font-bold transition-all mb-4 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google ile {mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#2A2A2A]" />
            <span className="text-[10px] uppercase text-zinc-600 tracking-widest font-bold">veya</span>
            <div className="flex-1 h-px bg-[#2A2A2A]" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Adın / Mahlasın"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#C17767] outline-none transition-colors"
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
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#C17767] outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Şifre"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3 pl-10 pr-12 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#C17767] outline-none transition-colors"
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
              <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-3 py-2.5 text-xs text-red-400">
                {authError}
              </div>
            )}

            {resetSent && (
              <div className="bg-green-950/50 border border-green-800/50 rounded-xl px-3 py-2.5 text-xs text-green-400">
                Şifre sıfırlama bağlantısı e-postana gönderildi.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#C17767] hover:bg-[#A56253] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  {mode === 'register' ? 'Hesap Oluştur' : 'Giriş Yap'}
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={handleResetPassword}
              className="w-full mt-3 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors text-center"
            >
              Şifremi Unuttum
            </button>
          )}
        </div>

        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-3"
          >
            Şimdilik misafir olarak devam et <ArrowRight size={12} />
          </button>
        )}

        <p className="text-center text-[10px] text-zinc-700 mt-4 tracking-widest uppercase">
          Veriler cihazlar arası senkronize edilir
        </p>
      </div>
    </div>
  );
}
