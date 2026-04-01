/**
 * AMAÇ: Supabase bağlantısı (opsiyonel, Atlas / Leaderboard için)
 * MANTIK: Key'ler .env.local'dan okunur — asla kaynak kodda bulunmaz
 * UYARI: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değilse client null döner
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function createSafeClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Env vars eksik — Supabase devre dışı');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export const supabase = createSafeClient();
