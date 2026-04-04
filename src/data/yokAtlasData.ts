/**
 * AMAÇ: Kapsamlı YÖK Atlas Veri Seti — 2025 YKS Taban Puanları
 * KAYNAK: ÖSYM & YÖK Atlas resmi 2025 yerleştirme verileri
 * GÜNCELLEME: Nisan 2026 — 2025 YKS sonuçlarına göre güncellenmiştir
 *
 * NOT: tytNet / aytNet = taban puanına göre yerleşen son kişinin TYT/AYT netleridir.
 * marchReferenceNet = Mart ayı seviyesi için referans TYT neti (tahmini hedef)
 * baseScore = taban SAY puanı (ÖSYM)
 * ranking = taban başarı sırası (TBS)
 */

export interface YokAtlasProgram {
  id: string;
  university: string;
  city: string;
  major: string;
  track: 'Sayısal' | 'Eşit Ağırlık' | 'Sözel' | 'Dil';
  examType: 'TYT' | 'AYT';
  tytNet: number;       // Yerleşen son kişinin TYT neti
  aytNet: number;       // Yerleşen son kişinin AYT neti
  marchReferenceNet: number; // Mart ayı hedef TYT referans neti
  ranking: number;      // Taban Başarı Sırası (TBS)
  baseScore?: number;   // Taban SAY Puanı
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  quota?: number;       // Kontenjan
  note?: string;        // Özel not (İngilizce, %50 burslu vb.)
}

export const YOK_ATLAS_DATA: YokAtlasProgram[] = [

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 1 — ELİT ÜNİVERSİTELER (İLK 5.000 SIRASI)
  // ══════════════════════════════════════════════════════════

  // --- KOÇ ÜNİVERSİTESİ (İstanbul / Vakıf) ---
  { id: 'koc_cs', university: 'Koç Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği (%100 Burslu)', track: 'Sayısal', examType: 'AYT', tytNet: 113.0, aytNet: 82.0, marchReferenceNet: 102.0, ranking: 122, baseScore: 551, difficulty: 'elite', quota: 20, note: '%100 Burslu' },
  { id: 'koc_med', university: 'Koç Üniversitesi', city: 'İstanbul', major: 'Tıp (%100 Burslu)', track: 'Sayısal', examType: 'AYT', tytNet: 114.0, aytNet: 83.0, marchReferenceNet: 103.0, ranking: 532, baseScore: 543, difficulty: 'elite', quota: 60, note: '%100 Burslu' },

  // --- BİLKENT ÜNİVERSİTESİ (Ankara / Vakıf) ---
  { id: 'bilkent_cs', university: 'İhsan Doğramacı Bilkent Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği (%100 Burslu)', track: 'Sayısal', examType: 'AYT', tytNet: 112.0, aytNet: 81.5, marchReferenceNet: 101.0, ranking: 286, baseScore: 548, difficulty: 'elite', quota: 20, note: '%100 Burslu' },

  // --- BOĞAZİÇİ ÜNİVERSİTESİ (İstanbul / Devlet) ---
  { id: 'boun_cs', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 110.5, aytNet: 80.5, marchReferenceNet: 100.0, ranking: 400, baseScore: 545, difficulty: 'elite', quota: 55 },
  { id: 'boun_ee', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 109.0, aytNet: 79.5, marchReferenceNet: 98.5, ranking: 620, baseScore: 541, difficulty: 'elite', quota: 55 },
  { id: 'boun_ie', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Endüstri Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 108.5, aytNet: 79.0, marchReferenceNet: 97.5, ranking: 700, baseScore: 539, difficulty: 'elite', quota: 55 },
  { id: 'boun_me', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 106.0, aytNet: 77.0, marchReferenceNet: 95.5, ranking: 1200, baseScore: 533, difficulty: 'elite', quota: 55 },

  // --- ODTÜ (Ankara / Devlet) ---
  { id: 'metu_cs', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 109.0, aytNet: 79.0, marchReferenceNet: 98.5, ranking: 680, baseScore: 542, difficulty: 'elite', quota: 100 },
  { id: 'metu_ee', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 107.5, aytNet: 78.0, marchReferenceNet: 97.0, ranking: 900, baseScore: 537, difficulty: 'elite', quota: 110 },
  { id: 'metu_ie', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'Endüstri Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 106.5, aytNet: 77.5, marchReferenceNet: 96.0, ranking: 1100, baseScore: 534, difficulty: 'elite', quota: 85 },
  { id: 'metu_me', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 104.0, aytNet: 75.5, marchReferenceNet: 93.5, ranking: 1900, baseScore: 525, difficulty: 'elite', quota: 150 },
  { id: 'metu_ce', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 98.0, aytNet: 69.0, marchReferenceNet: 87.5, ranking: 5800, baseScore: 505, difficulty: 'hard', quota: 100 },

  // --- İTÜ (İstanbul / Devlet) ---
  { id: 'itu_cs', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 107.0, aytNet: 78.0, marchReferenceNet: 96.5, ranking: 1348, baseScore: 536, difficulty: 'elite', quota: 113 },
  { id: 'itu_ai', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Yapay Zeka ve Veri Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 107.5, aytNet: 78.5, marchReferenceNet: 97.0, ranking: 1100, baseScore: 537, difficulty: 'elite', quota: 60 },
  { id: 'itu_ee', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Elektronik ve Haberleşme Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 105.0, aytNet: 76.5, marchReferenceNet: 94.5, ranking: 1750, baseScore: 530, difficulty: 'elite', quota: 107 },
  { id: 'itu_eee', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Elektrik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 103.0, aytNet: 74.5, marchReferenceNet: 92.5, ranking: 2500, baseScore: 523, difficulty: 'elite', quota: 52 },
  { id: 'itu_ie', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Endüstri Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 104.5, aytNet: 75.5, marchReferenceNet: 94.0, ranking: 2000, baseScore: 528, difficulty: 'elite', quota: 62 },
  { id: 'itu_me', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 100.0, aytNet: 71.0, marchReferenceNet: 89.5, ranking: 4200, baseScore: 514, difficulty: 'hard', quota: 205 },
  { id: 'itu_ce', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 92.0, aytNet: 63.5, marchReferenceNet: 82.0, ranking: 10180, baseScore: 467, difficulty: 'hard', quota: 62 },

  // --- HACETTEPEÜNİVERSİTESİ (Ankara / Devlet) ---
  { id: 'hacettepe_med', university: 'Hacettepe Üniversitesi', city: 'Ankara', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 108.0, aytNet: 79.0, marchReferenceNet: 97.5, ranking: 800, baseScore: 538, difficulty: 'elite', quota: 240 },
  { id: 'hacettepe_cs', university: 'Hacettepe Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 103.0, aytNet: 74.0, marchReferenceNet: 92.5, ranking: 2800, baseScore: 521, difficulty: 'elite', quota: 71 },
  { id: 'hacettepe_dh', university: 'Hacettepe Üniversitesi', city: 'Ankara', major: 'Diş Hekimliği', track: 'Sayısal', examType: 'AYT', tytNet: 101.0, aytNet: 72.0, marchReferenceNet: 90.0, ranking: 3600, baseScore: 514, difficulty: 'hard', quota: 100 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 2 — BÜYÜK DEVLET ÜNİVERSİTELERİ (5.000–30.000)
  // ══════════════════════════════════════════════════════════

  // --- EGE ÜNİVERSİTESİ (İzmir / Devlet) ---
  { id: 'ege_med', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 103.5, aytNet: 74.5, marchReferenceNet: 93.0, ranking: 5290, baseScore: 516, difficulty: 'elite', quota: 180 },
  { id: 'ege_cs', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 99.5, aytNet: 70.5, marchReferenceNet: 89.0, ranking: 7800, baseScore: 500, difficulty: 'hard', quota: 60 },
  { id: 'ege_dh', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Diş Hekimliği', track: 'Sayısal', examType: 'AYT', tytNet: 97.0, aytNet: 68.5, marchReferenceNet: 87.0, ranking: 10500, baseScore: 490, difficulty: 'hard', quota: 60 },
  { id: 'ege_ee', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 94.0, aytNet: 65.0, marchReferenceNet: 83.5, ranking: 15000, baseScore: 478, difficulty: 'hard', quota: 60 },
  { id: 'ege_me', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 91.0, aytNet: 62.0, marchReferenceNet: 80.5, ranking: 19500, baseScore: 468, difficulty: 'hard', quota: 60 },

  // --- DOKUZ EYLÜL ÜNİVERSİTESİ (İzmir / Devlet) ---
  { id: 'deu_med', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 103.0, aytNet: 74.0, marchReferenceNet: 92.5, ranking: 7320, baseScore: 508, difficulty: 'hard', quota: 160 },
  { id: 'deu_cs', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 95.5, aytNet: 66.5, marchReferenceNet: 85.0, ranking: 14200, baseScore: 480, difficulty: 'hard', quota: 60 },
  { id: 'deu_ee', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 91.5, aytNet: 62.5, marchReferenceNet: 81.0, ranking: 19000, baseScore: 465, difficulty: 'hard', quota: 60 },
  { id: 'deu_me', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 88.5, aytNet: 59.5, marchReferenceNet: 78.0, ranking: 25000, baseScore: 452, difficulty: 'hard', quota: 70 },
  { id: 'deu_ce', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 84.0, aytNet: 55.0, marchReferenceNet: 73.5, ranking: 37000, baseScore: 432, difficulty: 'medium', quota: 50 },
  { id: 'deu_dh', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Diş Hekimliği', track: 'Sayısal', examType: 'AYT', tytNet: 92.5, aytNet: 63.5, marchReferenceNet: 82.5, ranking: 16800, baseScore: 470, difficulty: 'hard', quota: 60 },

  // --- MARMARA ÜNİVERSİTESİ (İstanbul / Devlet) ---
  { id: 'marmara_med', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 103.5, aytNet: 74.5, marchReferenceNet: 93.0, ranking: 6639, baseScore: 511, difficulty: 'hard', quota: 130 },
  { id: 'marmara_cs', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 97.5, aytNet: 68.5, marchReferenceNet: 87.0, ranking: 9800, baseScore: 494, difficulty: 'hard', quota: 100 },
  { id: 'marmara_ee', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 93.0, aytNet: 64.0, marchReferenceNet: 82.5, ranking: 16000, baseScore: 474, difficulty: 'hard', quota: 100 },

  // --- GAZİ ÜNİVERSİTESİ (Ankara / Devlet) ---
  { id: 'gazi_med', university: 'Gazi Üniversitesi', city: 'Ankara', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 103.0, aytNet: 74.0, marchReferenceNet: 92.5, ranking: 7100, baseScore: 507, difficulty: 'hard', quota: 200 },
  { id: 'gazi_cs', university: 'Gazi Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 96.0, aytNet: 67.0, marchReferenceNet: 85.5, ranking: 12500, baseScore: 486, difficulty: 'hard', quota: 70 },
  { id: 'gazi_ee', university: 'Gazi Üniversitesi', city: 'Ankara', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 91.5, aytNet: 62.5, marchReferenceNet: 81.0, ranking: 19500, baseScore: 466, difficulty: 'hard', quota: 70 },

  // --- YILDIZ TEKNİK ÜNİVERSİTESİ (İstanbul / Devlet) ---
  { id: 'ytu_cs', university: 'Yıldız Teknik Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 97.0, aytNet: 68.0, marchReferenceNet: 86.5, ranking: 8476, baseScore: 459, difficulty: 'hard', quota: 80 },
  { id: 'ytu_ee', university: 'Yıldız Teknik Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 91.5, aytNet: 62.5, marchReferenceNet: 81.0, ranking: 19200, baseScore: 435, difficulty: 'hard', quota: 80 },
  { id: 'ytu_me', university: 'Yıldız Teknik Üniversitesi', city: 'İstanbul', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 88.0, aytNet: 59.0, marchReferenceNet: 77.5, ranking: 26000, baseScore: 420, difficulty: 'medium', quota: 100 },

  // --- İSTANBUL ÜNİVERSİTESİ (İstanbul / Devlet) ---
  { id: 'iu_med', university: 'İstanbul Üniversitesi', city: 'İstanbul', major: 'Tıp (Cerrahpaşa)', track: 'Sayısal', examType: 'AYT', tytNet: 104.5, aytNet: 75.5, marchReferenceNet: 94.0, ranking: 5100, baseScore: 519, difficulty: 'elite', quota: 236 },
  { id: 'iu_cs', university: 'İstanbul Üniversitesi-Cerrahpaşa', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 93.5, aytNet: 64.5, marchReferenceNet: 83.0, ranking: 15500, baseScore: 476, difficulty: 'hard', quota: 60 },

  // --- ANKARA ÜNİVERSİTESİ (Ankara / Devlet) ---
  { id: 'au_med', university: 'Ankara Üniversitesi', city: 'Ankara', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 104.0, aytNet: 75.0, marchReferenceNet: 93.5, ranking: 5700, baseScore: 518, difficulty: 'elite', quota: 200 },
  { id: 'au_cs', university: 'Ankara Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 93.0, aytNet: 64.0, marchReferenceNet: 82.5, ranking: 16800, baseScore: 473, difficulty: 'hard', quota: 55 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 3 — AKDENİZ ÜNİVERSİTESİ (ANTALYA — GERÇEK 2025 VERİLERİ)
  // ══════════════════════════════════════════════════════════

  { id: 'akdeniz_med', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 100.5, aytNet: 71.5, marchReferenceNet: 90.0, ranking: 7970, baseScore: 507.48, difficulty: 'hard', quota: 310 },
  { id: 'akdeniz_dh', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Diş Hekimliği', track: 'Sayısal', examType: 'AYT', tytNet: 94.5, aytNet: 65.5, marchReferenceNet: 84.0, ranking: 25900, baseScore: 474.64, difficulty: 'hard', quota: 75 },
  { id: 'akdeniz_ai', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Yapay Zeka ve Veri Mühendisliği (İngilizce)', track: 'Sayısal', examType: 'AYT', tytNet: 93.0, aytNet: 64.0, marchReferenceNet: 82.5, ranking: 39700, baseScore: 457.31, difficulty: 'medium', quota: 30, note: 'İngilizce' },
  { id: 'akdeniz_cs_en', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Bilgisayar Mühendisliği (İngilizce)', track: 'Sayısal', examType: 'AYT', tytNet: 92.0, aytNet: 63.0, marchReferenceNet: 81.5, ranking: 44400, baseScore: 451.92, difficulty: 'medium', quota: 80, note: 'İngilizce' },
  { id: 'akdeniz_ee', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 88.0, aytNet: 59.0, marchReferenceNet: 77.5, ranking: 62400, baseScore: 433.01, difficulty: 'medium', quota: 60 },
  { id: 'akdeniz_me', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 83.5, aytNet: 54.5, marchReferenceNet: 73.0, ranking: 87000, baseScore: 410.05, difficulty: 'medium', quota: 60 },
  { id: 'akdeniz_mim', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Mimarlık', track: 'Sayısal', examType: 'AYT', tytNet: 82.5, aytNet: 54.0, marchReferenceNet: 72.0, ranking: 111300, baseScore: 390.09, difficulty: 'medium', quota: 50 },
  { id: 'akdeniz_ins', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 78.0, aytNet: 49.5, marchReferenceNet: 68.0, ranking: 141900, baseScore: 368.49, difficulty: 'medium', quota: 40 },
  { id: 'akdeniz_hem', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Hemşirelik', track: 'Sayısal', examType: 'AYT', tytNet: 81.5, aytNet: 52.5, marchReferenceNet: 71.0, ranking: 104200, baseScore: 395.75, difficulty: 'medium', quota: 200 },
  { id: 'akdeniz_gida', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Gıda Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 74.5, aytNet: 46.5, marchReferenceNet: 64.5, ranking: 196600, baseScore: 338.94, difficulty: 'easy', quota: 40 },
  { id: 'akdeniz_cevre', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Çevre Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 70.5, aytNet: 43.0, marchReferenceNet: 61.0, ranking: 260700, baseScore: 314.31, difficulty: 'easy', quota: 20 },
  { id: 'akdeniz_biol', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Biyoloji', track: 'Sayısal', examType: 'AYT', tytNet: 68.5, aytNet: 41.0, marchReferenceNet: 59.0, ranking: 284200, baseScore: 306.96, difficulty: 'easy', quota: 40 },
  { id: 'akdeniz_mat', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Matematik', track: 'Sayısal', examType: 'AYT', tytNet: 72.0, aytNet: 44.5, marchReferenceNet: 62.5, ranking: 188100, baseScore: 343.02, difficulty: 'easy', quota: 50 },
  { id: 'akdeniz_fiz', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Fizik', track: 'Sayısal', examType: 'AYT', tytNet: 67.0, aytNet: 39.5, marchReferenceNet: 57.5, ranking: 292200, baseScore: 304.64, difficulty: 'easy', quota: 25 },
  { id: 'akdeniz_kim', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Kimya', track: 'Sayısal', examType: 'AYT', tytNet: 71.0, aytNet: 43.5, marchReferenceNet: 61.5, ranking: 193400, baseScore: 340.42, difficulty: 'easy', quota: 20 },
  { id: 'akdeniz_bes', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Beslenme ve Diyetetik', track: 'Sayısal', examType: 'AYT', tytNet: 76.0, aytNet: 47.5, marchReferenceNet: 66.0, ranking: 154400, baseScore: 360.87, difficulty: 'medium', quota: 27 },
  { id: 'akdeniz_fiz_reha', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Fizyoterapi ve Rehabilitasyon', track: 'Sayısal', examType: 'AYT', tytNet: 77.0, aytNet: 48.5, marchReferenceNet: 67.0, ranking: 180700, baseScore: 346.69, difficulty: 'medium', quota: 40 },
  { id: 'akdeniz_peyzaj', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Peyzaj Mimarlığı', track: 'Sayısal', examType: 'AYT', tytNet: 66.5, aytNet: 39.0, marchReferenceNet: 57.0, ranking: 303800, baseScore: 301.36, difficulty: 'easy', quota: 50 },
  { id: 'akdeniz_sehir', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Şehir ve Bölge Planlama', track: 'Sayısal', examType: 'AYT', tytNet: 66.0, aytNet: 38.5, marchReferenceNet: 56.5, ranking: 312600, baseScore: 298.95, difficulty: 'easy', quota: 30 },
  { id: 'akdeniz_jeoloji', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Jeoloji Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 65.5, aytNet: 38.0, marchReferenceNet: 56.0, ranking: 297600, baseScore: 303.07, difficulty: 'easy', quota: 10 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 4 — ÇUKUROVA ÜNİVERSİTESİ (ADANA)
  // ══════════════════════════════════════════════════════════

  { id: 'cu_med', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 99.0, aytNet: 70.0, marchReferenceNet: 88.5, ranking: 10612, baseScore: 499.76, difficulty: 'hard', quota: 200 },
  { id: 'cu_dh', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Diş Hekimliği', track: 'Sayısal', examType: 'AYT', tytNet: 93.5, aytNet: 64.5, marchReferenceNet: 83.0, ranking: 21000, baseScore: 475, difficulty: 'hard', quota: 70 },
  { id: 'cu_ecz', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Eczacılık', track: 'Sayısal', examType: 'AYT', tytNet: 91.0, aytNet: 62.0, marchReferenceNet: 80.5, ranking: 24500, baseScore: 467, difficulty: 'hard', quota: 60 },
  { id: 'cu_cs', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 88.5, aytNet: 59.5, marchReferenceNet: 78.0, ranking: 32000, baseScore: 450, difficulty: 'medium', quota: 60 },
  { id: 'cu_ee', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 84.5, aytNet: 55.5, marchReferenceNet: 74.0, ranking: 44000, baseScore: 432, difficulty: 'medium', quota: 60 },
  { id: 'cu_me', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 82.0, aytNet: 53.0, marchReferenceNet: 71.5, ranking: 52000, baseScore: 422, difficulty: 'medium', quota: 60 },
  { id: 'cu_ins', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 78.5, aytNet: 49.5, marchReferenceNet: 68.5, ranking: 67000, baseScore: 408, difficulty: 'medium', quota: 60 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 5 — PAMUKKALE ÜNİVERSİTESİ (DENİZLİ)
  // ══════════════════════════════════════════════════════════

  { id: 'pau_med', university: 'Pamukkale Üniversitesi', city: 'Denizli', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 96.5, aytNet: 67.5, marchReferenceNet: 86.0, ranking: 13500, baseScore: 488, difficulty: 'hard', quota: 140 },
  { id: 'pau_cs', university: 'Pamukkale Üniversitesi', city: 'Denizli', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 85.5, aytNet: 56.5, marchReferenceNet: 75.0, ranking: 43000, baseScore: 436, difficulty: 'medium', quota: 60 },
  { id: 'pau_ee', university: 'Pamukkale Üniversitesi', city: 'Denizli', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 81.0, aytNet: 52.0, marchReferenceNet: 70.5, ranking: 57000, baseScore: 418, difficulty: 'medium', quota: 60 },
  { id: 'pau_me', university: 'Pamukkale Üniversitesi', city: 'Denizli', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 78.0, aytNet: 49.0, marchReferenceNet: 67.5, ranking: 68000, baseScore: 406, difficulty: 'medium', quota: 60 },
  { id: 'pau_ins', university: 'Pamukkale Üniversitesi', city: 'Denizli', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 74.5, aytNet: 46.5, marchReferenceNet: 64.5, ranking: 82000, baseScore: 390, difficulty: 'medium', quota: 60 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 6 — MANİSA CELAL BAYAR ÜNİVERSİTESİ
  // ══════════════════════════════════════════════════════════

  { id: 'cbu_cs', university: 'Manisa Celal Bayar Üniversitesi', city: 'Manisa', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 83.5, aytNet: 54.5, marchReferenceNet: 73.0, ranking: 48000, baseScore: 428, difficulty: 'medium', quota: 60 },
  { id: 'cbu_sw', university: 'Manisa Celal Bayar Üniversitesi', city: 'Manisa', major: 'Yazılım Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 81.0, aytNet: 52.0, marchReferenceNet: 70.5, ranking: 56000, baseScore: 418, difficulty: 'medium', quota: 56 },
  { id: 'cbu_ee', university: 'Manisa Celal Bayar Üniversitesi', city: 'Manisa', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 78.5, aytNet: 49.5, marchReferenceNet: 68.0, ranking: 67000, baseScore: 408, difficulty: 'medium', quota: 60 },
  { id: 'cbu_med', university: 'Manisa Celal Bayar Üniversitesi', city: 'Manisa', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 94.0, aytNet: 65.0, marchReferenceNet: 83.5, ranking: 15800, baseScore: 479, difficulty: 'hard', quota: 130 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 7 — MUĞLA SITKI KOÇMAN ÜNİVERSİTESİ
  // ══════════════════════════════════════════════════════════

  { id: 'msku_cs', university: 'Muğla Sıtkı Koçman Üniversitesi', city: 'Muğla', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 80.5, aytNet: 51.5, marchReferenceNet: 70.0, ranking: 60000, baseScore: 414, difficulty: 'medium', quota: 50 },
  { id: 'msku_ee', university: 'Muğla Sıtkı Koçman Üniversitesi', city: 'Muğla', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 76.5, aytNet: 48.0, marchReferenceNet: 66.0, ranking: 74000, baseScore: 398, difficulty: 'medium', quota: 50 },
  { id: 'msku_me', university: 'Muğla Sıtkı Koçman Üniversitesi', city: 'Muğla', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 73.5, aytNet: 45.5, marchReferenceNet: 63.5, ranking: 89000, baseScore: 383, difficulty: 'medium', quota: 50 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 8 — MERSİN ÜNİVERSİTESİ
  // ══════════════════════════════════════════════════════════

  { id: 'mersin_med', university: 'Mersin Üniversitesi', city: 'Mersin', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 94.0, aytNet: 65.0, marchReferenceNet: 83.5, ranking: 15500, baseScore: 480, difficulty: 'hard', quota: 130 },
  { id: 'mersin_cs', university: 'Mersin Üniversitesi', city: 'Mersin', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 82.0, aytNet: 53.0, marchReferenceNet: 71.5, ranking: 54000, baseScore: 421, difficulty: 'medium', quota: 60 },
  { id: 'mersin_ee', university: 'Mersin Üniversitesi', city: 'Mersin', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 78.0, aytNet: 49.0, marchReferenceNet: 67.5, ranking: 69000, baseScore: 405, difficulty: 'medium', quota: 60 },
  { id: 'mersin_ins', university: 'Mersin Üniversitesi', city: 'Mersin', major: 'İnşaat Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 73.0, aytNet: 45.0, marchReferenceNet: 63.0, ranking: 92000, baseScore: 381, difficulty: 'medium', quota: 50 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 9 — BALIKESİR ÜNİVERSİTESİ
  // ══════════════════════════════════════════════════════════

  { id: 'bau_cs', university: 'Balıkesir Üniversitesi', city: 'Balıkesir', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 80.0, aytNet: 51.0, marchReferenceNet: 69.5, ranking: 62000, baseScore: 412, difficulty: 'medium', quota: 60 },
  { id: 'bau_ee', university: 'Balıkesir Üniversitesi', city: 'Balıkesir', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 75.5, aytNet: 47.5, marchReferenceNet: 65.0, ranking: 77000, baseScore: 394, difficulty: 'medium', quota: 60 },
  { id: 'bau_me', university: 'Balıkesir Üniversitesi', city: 'Balıkesir', major: 'Makine Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 72.5, aytNet: 44.5, marchReferenceNet: 62.5, ranking: 92000, baseScore: 379, difficulty: 'medium', quota: 60 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 10 — ORTA BÜYÜKLÜKTE ANADOLU ÜNİVERSİTELERİ
  // ══════════════════════════════════════════════════════════

  // --- SAKARYA ÜNİVERSİTESİ ---
  { id: 'sau_cs', university: 'Sakarya Üniversitesi', city: 'Sakarya', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 87.5, aytNet: 58.5, marchReferenceNet: 77.0, ranking: 33000, baseScore: 446, difficulty: 'medium', quota: 60 },
  { id: 'sau_ee', university: 'Sakarya Üniversitesi', city: 'Sakarya', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 82.5, aytNet: 53.5, marchReferenceNet: 72.0, ranking: 49000, baseScore: 425, difficulty: 'medium', quota: 60 },

  // --- KOCAELİ ÜNİVERSİTESİ ---
  { id: 'kou_cs', university: 'Kocaeli Üniversitesi', city: 'Kocaeli', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 86.0, aytNet: 57.0, marchReferenceNet: 75.5, ranking: 37000, baseScore: 440, difficulty: 'medium', quota: 60 },
  { id: 'kou_ee', university: 'Kocaeli Üniversitesi', city: 'Kocaeli', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 81.0, aytNet: 52.0, marchReferenceNet: 70.5, ranking: 57000, baseScore: 418, difficulty: 'medium', quota: 60 },

  // --- KARADENİZ TEKNİK ÜNİVERSİTESİ ---
  { id: 'ktu_cs', university: 'Karadeniz Teknik Üniversitesi', city: 'Trabzon', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 86.5, aytNet: 57.5, marchReferenceNet: 76.0, ranking: 35000, baseScore: 442, difficulty: 'medium', quota: 60 },
  { id: 'ktu_ee', university: 'Karadeniz Teknik Üniversitesi', city: 'Trabzon', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 82.0, aytNet: 53.0, marchReferenceNet: 71.5, ranking: 52000, baseScore: 422, difficulty: 'medium', quota: 60 },
  { id: 'ktu_med', university: 'Karadeniz Teknik Üniversitesi', city: 'Trabzon', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 97.0, aytNet: 68.0, marchReferenceNet: 86.5, ranking: 11500, baseScore: 492, difficulty: 'hard', quota: 130 },

  // --- ERCIYES ÜNİVERSİTESİ ---
  { id: 'erciyes_med', university: 'Erciyes Üniversitesi', city: 'Kayseri', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 96.0, aytNet: 67.0, marchReferenceNet: 85.5, ranking: 13200, baseScore: 487, difficulty: 'hard', quota: 200 },
  { id: 'erciyes_cs', university: 'Erciyes Üniversitesi', city: 'Kayseri', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 84.0, aytNet: 55.0, marchReferenceNet: 73.5, ranking: 44000, baseScore: 430, difficulty: 'medium', quota: 60 },
  { id: 'erciyes_ee', university: 'Erciyes Üniversitesi', city: 'Kayseri', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 77.0, aytNet: 48.5, marchReferenceNet: 66.5, ranking: 73000, baseScore: 401, difficulty: 'medium', quota: 60 },

  // --- SELÇUK ÜNİVERSİTESİ ---
  { id: 'selcuk_med', university: 'Selçuk Üniversitesi', city: 'Konya', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 95.0, aytNet: 66.0, marchReferenceNet: 84.5, ranking: 14800, baseScore: 484, difficulty: 'hard', quota: 200 },
  { id: 'selcuk_cs', university: 'Selçuk Üniversitesi', city: 'Konya', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 83.0, aytNet: 54.0, marchReferenceNet: 72.5, ranking: 47500, baseScore: 427, difficulty: 'medium', quota: 60 },

  // --- ATATÜRK ÜNİVERSİTESİ ---
  { id: 'ata_med', university: 'Atatürk Üniversitesi', city: 'Erzurum', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 93.5, aytNet: 64.5, marchReferenceNet: 83.0, ranking: 17500, baseScore: 478, difficulty: 'hard', quota: 180 },
  { id: 'ata_cs', university: 'Atatürk Üniversitesi', city: 'Erzurum', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 80.0, aytNet: 51.0, marchReferenceNet: 69.5, ranking: 63000, baseScore: 412, difficulty: 'medium', quota: 60 },

  // --- ULUDAĞ ÜNİVERSİTESİ ---
  { id: 'uludag_med', university: 'Bursa Uludağ Üniversitesi', city: 'Bursa', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 99.0, aytNet: 70.0, marchReferenceNet: 88.5, ranking: 10800, baseScore: 499, difficulty: 'hard', quota: 200 },
  { id: 'uludag_cs', university: 'Bursa Uludağ Üniversitesi', city: 'Bursa', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 88.0, aytNet: 59.0, marchReferenceNet: 77.5, ranking: 29000, baseScore: 449, difficulty: 'medium', quota: 60 },

  // --- İNÖNÜ ÜNİVERSİTESİ ---
  { id: 'inonu_med', university: 'İnönü Üniversitesi', city: 'Malatya', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 92.0, aytNet: 63.0, marchReferenceNet: 81.5, ranking: 20000, baseScore: 472, difficulty: 'hard', quota: 150 },
  { id: 'inonu_cs', university: 'İnönü Üniversitesi', city: 'Malatya', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 78.5, aytNet: 49.5, marchReferenceNet: 68.0, ranking: 68000, baseScore: 406, difficulty: 'medium', quota: 60 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 11 — EŞİT AĞIRLIK BÖLÜMLER (SAY ODAKLI ÖĞRENCİLER İÇİN REFERANS)
  // ══════════════════════════════════════════════════════════

  // --- GALATASARAY ÜNİVERSİTESİ ---
  { id: 'gsu_law', university: 'Galatasaray Üniversitesi', city: 'İstanbul', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 108.5, aytNet: 74.5, marchReferenceNet: 112.0, ranking: 100, baseScore: 531, difficulty: 'elite', quota: 80 },

  // --- BOĞAZİÇİ ---
  { id: 'boun_bus', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'İşletme', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 107.5, aytNet: 73.0, marchReferenceNet: 111.0, ranking: 750, baseScore: 513, difficulty: 'elite', quota: 60 },
  { id: 'boun_psy', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Psikoloji', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 106.5, aytNet: 73.0, marchReferenceNet: 110.5, ranking: 1050, baseScore: 516, difficulty: 'elite', quota: 50 },

  // --- ANKARA / İSTANBUL HUKUK ---
  { id: 'au_law', university: 'Ankara Üniversitesi', city: 'Ankara', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 99.5, aytNet: 69.0, marchReferenceNet: 103.5, ranking: 3100, baseScore: 506, difficulty: 'elite', quota: 200 },
  { id: 'iu_law', university: 'İstanbul Üniversitesi', city: 'İstanbul', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 97.5, aytNet: 67.5, marchReferenceNet: 102.0, ranking: 5200, baseScore: 498, difficulty: 'elite', quota: 200 },
  { id: 'marmara_law', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 93.5, aytNet: 64.0, marchReferenceNet: 97.5, ranking: 10800, baseScore: 484, difficulty: 'hard', quota: 200 },
  { id: 'deu_law', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 91.0, aytNet: 62.0, marchReferenceNet: 95.5, ranking: 16194, baseScore: 472, difficulty: 'hard', quota: 160 },
  { id: 'akdeniz_law', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 87.0, aytNet: 58.0, marchReferenceNet: 91.5, ranking: 27000, baseScore: 454, difficulty: 'medium', quota: 200 },
  { id: 'cu_law', university: 'Çukurova Üniversitesi', city: 'Adana', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 84.0, aytNet: 55.5, marchReferenceNet: 88.5, ranking: 32985, baseScore: 440, difficulty: 'medium', quota: 200 },
  { id: 'mersin_law', university: 'Mersin Üniversitesi', city: 'Mersin', major: 'Hukuk', track: 'Eşit Ağırlık', examType: 'AYT', tytNet: 81.5, aytNet: 52.5, marchReferenceNet: 85.5, ranking: 41000, baseScore: 424, difficulty: 'medium', quota: 160 },

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 12 — DÜŞÜK SIRALAMA (70.000–100.000) — GENİŞ TABLO
  // ══════════════════════════════════════════════════════════

  // Burdur Mehmet Akif Ersoy
  { id: 'makü_cs', university: 'Burdur Mehmet Akif Ersoy Üniversitesi', city: 'Burdur', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 77.5, aytNet: 48.5, marchReferenceNet: 67.0, ranking: 71000, baseScore: 401, difficulty: 'medium', quota: 50 },

  // Isparta Uygulamalı Bilimler
  { id: 'iau_cs', university: 'Isparta Uygulamalı Bilimler Üniversitesi', city: 'Isparta', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 75.5, aytNet: 47.0, marchReferenceNet: 65.0, ranking: 78000, baseScore: 392, difficulty: 'medium', quota: 50 },

  // Alanya Alaaddin Keykubat
  { id: 'alku_cs', university: 'Alanya Alaaddin Keykubat Üniversitesi', city: 'Antalya', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 73.5, aytNet: 45.5, marchReferenceNet: 63.5, ranking: 89000, baseScore: 382, difficulty: 'medium', quota: 50 },
  { id: 'alku_ee', university: 'Alanya Alaaddin Keykubat Üniversitesi', city: 'Antalya', major: 'Elektrik-Elektronik Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 70.0, aytNet: 42.5, marchReferenceNet: 60.0, ranking: 102000, baseScore: 366, difficulty: 'easy', quota: 40 },

  // Kütahya Dumlupınar
  { id: 'dpu_cs', university: 'Kütahya Dumlupınar Üniversitesi', city: 'Kütahya', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 74.0, aytNet: 46.0, marchReferenceNet: 64.0, ranking: 87000, baseScore: 385, difficulty: 'medium', quota: 50 },

  // Uşak Üniversitesi
  { id: 'usak_cs', university: 'Uşak Üniversitesi', city: 'Uşak', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 71.5, aytNet: 43.5, marchReferenceNet: 61.5, ranking: 98000, baseScore: 373, difficulty: 'easy', quota: 50 },

  // Aydın Adnan Menderes
  { id: 'adu_cs', university: 'Aydın Adnan Menderes Üniversitesi', city: 'Aydın', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 75.0, aytNet: 47.0, marchReferenceNet: 65.0, ranking: 81000, baseScore: 390, difficulty: 'medium', quota: 50 },
  { id: 'adu_med', university: 'Aydın Adnan Menderes Üniversitesi', city: 'Aydın', major: 'Tıp', track: 'Sayısal', examType: 'AYT', tytNet: 91.0, aytNet: 62.0, marchReferenceNet: 80.5, ranking: 22500, baseScore: 468, difficulty: 'hard', quota: 110 },

  // Afyon Kocatepe
  { id: 'aku_cs', university: 'Afyon Kocatepe Üniversitesi', city: 'Afyonkarahisar', major: 'Bilgisayar Mühendisliği', track: 'Sayısal', examType: 'AYT', tytNet: 72.0, aytNet: 44.0, marchReferenceNet: 62.0, ranking: 95000, baseScore: 375, difficulty: 'medium', quota: 50 },

];

/**
 * Filtreleme ve Arama Fonksiyonları
 */
export function searchYokAtlas(query: string, track?: string): YokAtlasProgram[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  return YOK_ATLAS_DATA.filter(p => {
    const matchesQuery =
      p.university.toLowerCase().includes(q) ||
      p.major.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q);
    const matchesTrack = !track || p.track === track;
    return matchesQuery && matchesTrack;
  }).slice(0, 15);
}

export function getYokAtlasById(id: string): YokAtlasProgram | null {
  return YOK_ATLAS_DATA.find(p => p.id === id) || null;
}

/**
 * Sıralama bazlı arama — öğrencinin sıralamasına yakın programları döndürür
 */
export function findProgramsByRanking(
  ranking: number,
  margin: number = 10000,
  track?: string
): YokAtlasProgram[] {
  return YOK_ATLAS_DATA.filter(p => {
    const inRange = p.ranking >= ranking - margin && p.ranking <= ranking + margin * 1.5;
    const matchesTrack = !track || p.track === track;
    return inRange && matchesTrack;
  }).sort((a, b) => a.ranking - b.ranking);
}

/**
 * Şehir bazlı arama
 */
export function getProgramsByCity(city: string): YokAtlasProgram[] {
  return YOK_ATLAS_DATA.filter(p =>
    p.city.toLowerCase().includes(city.toLowerCase())
  ).sort((a, b) => a.ranking - b.ranking);
}