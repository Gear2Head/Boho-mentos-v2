import React from 'react';
import { motion } from 'motion/react';
import { BohoMark } from '../brand/BohoMark';

interface AppLoadingScreenProps {
  message?: string;
  subMessage?: string;
  variant?: 'boot' | 'route' | 'auth';
}

const LOADING_STEPS = [
  'Profil hafızası',
  'Çalışma kayıtları',
  'Deneme analizleri',
];

export function AppLoadingScreen({
  message = 'Boho Mentosluk',
  subMessage = 'Veriler senkronize ediliyor',
  variant = 'boot',
}: AppLoadingScreenProps) {
  const isCompact = variant === 'route';

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#070708] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(193,119,103,0.16),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(120,113,108,0.09),transparent_32%),linear-gradient(180deg,#09090B_0%,#050506_100%)]" />

      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:44px_44px]" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`relative z-10 mx-5 w-full ${isCompact ? 'max-w-sm' : 'max-w-md'}`}
      >
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/52 p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="mx-auto mb-7 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#C17767]/20 blur-2xl" />
              <BohoMark
                animated
                className={isCompact ? 'relative h-20 w-20' : 'relative h-24 w-24'}
              />
            </div>
          </div>

          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl font-black italic tracking-tight text-[#C17767]"
            >
              {message}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500"
            >
              {subMessage}
            </motion.p>
          </div>

          {!isCompact && (
            <div className="mt-8 space-y-3">
              {LOADING_STEPS.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + index * 0.08 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.03] px-4 py-3"
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C17767] opacity-25" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#C17767]" />
                  </span>

                  <span className="text-xs font-bold text-zinc-400">{step}</span>

                  <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    hazır
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8">
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: ['-100%', '0%', '100%'] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.6,
                  ease: 'easeInOut',
                }}
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#C17767] to-transparent"
              />
            </div>

            <p className="mt-4 text-center text-[10px] font-medium text-zinc-600">
              Çalışma hafızası hazırlanıyor. Birkaç saniye sürebilir.
            </p>
          </div>
        </div>

        <div className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.28em] text-zinc-700">
          YKS Mentor OS
        </div>
      </motion.div>
    </div>
  );
}
