import { createClient } from '@supabase/supabase-js';

// TODO: Gerçek projede bu verileri .env dosyasına (.env.local) taşımamız güvenlidir.
// Şimdilik ilettiğin keylerle direct client'ı oluşturuyorum (MF-Warrior Veritabanı)

const supabaseUrl = 'https://vixfopnlglccfefnaupm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qmkn2oOTM3pCuaOedrq9XQ_8WFkJJXG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
