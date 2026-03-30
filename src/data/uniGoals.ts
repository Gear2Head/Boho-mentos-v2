/**
 * AMAÇ: Kapsamlı üniversite ve bölüm taban net veritabanı
 * MANTIK: YÖK Atlas verilerine dayalı statik dataset — autocomplete + Net Borcu hesabı için
 */

export interface UniGoal {
  id: string;
  university: string;
  city: string;
  major: string;
  examType: 'TYT' | 'AYT';
  lastEntrantNet: number;
  marchReferenceNet: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
}

export const UNI_GOALS: UniGoal[] = [
  // === BOĞAZ / ORTADOĞU / BİLKENT (Elite) ===
  { id: 'boun_cs', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 97, marchReferenceNet: 98, difficulty: 'elite' },
  { id: 'boun_ee', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', examType: 'AYT', lastEntrantNet: 95, marchReferenceNet: 96, difficulty: 'elite' },
  { id: 'metu_cs', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 96, marchReferenceNet: 97, difficulty: 'elite' },
  { id: 'bilkent_cs', university: 'Bilkent Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 94, marchReferenceNet: 95, difficulty: 'elite' },
  { id: 'itu_cs', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 93, marchReferenceNet: 94, difficulty: 'elite' },

  // === İSTANBUL ÜNİVERSİTELERİ ===
  { id: 'marmara_cs', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 72, marchReferenceNet: 75, difficulty: 'hard' },
  { id: 'marmara_ee', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', examType: 'AYT', lastEntrantNet: 70, marchReferenceNet: 73, difficulty: 'hard' },
  { id: 'marmara_law', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'Hukuk', examType: 'TYT', lastEntrantNet: 110, marchReferenceNet: 112, difficulty: 'elite' },
  { id: 'yildiz_cs', university: 'Yıldız Teknik Üniversitesi', city: 'İstanbul', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 80, marchReferenceNet: 82, difficulty: 'hard' },
  { id: 'yildiz_ee', university: 'Yıldız Teknik Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', examType: 'AYT', lastEntrantNet: 78, marchReferenceNet: 80, difficulty: 'hard' },

  // === ANKARA ÜNİVERSİTELERİ ===
  { id: 'gazi_cs', university: 'Gazi Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 71, marchReferenceNet: 74, difficulty: 'hard' },
  { id: 'gazi_law', university: 'Gazi Üniversitesi', city: 'Ankara', major: 'Hukuk', examType: 'TYT', lastEntrantNet: 108, marchReferenceNet: 110, difficulty: 'elite' },
  { id: 'hacettepe_med', university: 'Hacettepe Üniversitesi', city: 'Ankara', major: 'Tıp', examType: 'AYT', lastEntrantNet: 95, marchReferenceNet: 96, difficulty: 'elite' },
  { id: 'hacettepe_cs', university: 'Hacettepe Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 85, marchReferenceNet: 87, difficulty: 'hard' },
  { id: 'ankara_law', university: 'Ankara Üniversitesi', city: 'Ankara', major: 'Hukuk', examType: 'TYT', lastEntrantNet: 107, marchReferenceNet: 109, difficulty: 'elite' },
  { id: 'ankara_cs', university: 'Ankara Üniversitesi', city: 'Ankara', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 68, marchReferenceNet: 71, difficulty: 'hard' },

  // === EGE / AKDENİZ BÖLGESİ ===
  { id: 'ege_cs', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 70, marchReferenceNet: 73, difficulty: 'hard' },
  { id: 'ege_med', university: 'Ege Üniversitesi', city: 'İzmir', major: 'Tıp', examType: 'AYT', lastEntrantNet: 91, marchReferenceNet: 93, difficulty: 'elite' },
  { id: 'dokuz_cs', university: 'Dokuz Eylül Üniversitesi', city: 'İzmir', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 69, marchReferenceNet: 72, difficulty: 'hard' },
  { id: 'akdeniz_cs', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 67, marchReferenceNet: 70, difficulty: 'hard' },
  { id: 'akdeniz_med', university: 'Akdeniz Üniversitesi', city: 'Antalya', major: 'Tıp', examType: 'AYT', lastEntrantNet: 87, marchReferenceNet: 89, difficulty: 'elite' },

  // === KARADENIZ / İÇ ANADOLU ===
  { id: 'sakarya_cs', university: 'Sakarya Üniversitesi', city: 'Sakarya', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 65, marchReferenceNet: 68, difficulty: 'medium' },
  { id: 'ktu_cs', university: 'Karadeniz Teknik Üniversitesi', city: 'Trabzon', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 63, marchReferenceNet: 65, difficulty: 'medium' },
  { id: 'selcuk_cs', university: 'Selçuk Üniversitesi', city: 'Konya', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 60, marchReferenceNet: 62, difficulty: 'medium' },
  { id: 'pamukkale_cs', university: 'Pamukkale Üniversitesi', city: 'Denizli', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 64, marchReferenceNet: 66, difficulty: 'medium' },
  { id: 'uludag_cs', university: 'Bursa Uludağ Üniversitesi', city: 'Bursa', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 66, marchReferenceNet: 69, difficulty: 'medium' },

  // === TYT BAZLI BÖLÜMLER ===
  { id: 'istanbul_tyt_acc', university: 'İstanbul Üniversitesi', city: 'İstanbul', major: 'İşletme', examType: 'TYT', lastEntrantNet: 100, marchReferenceNet: 102, difficulty: 'hard' },
  { id: 'marmara_tyt_acc', university: 'Marmara Üniversitesi', city: 'İstanbul', major: 'İşletme', examType: 'TYT', lastEntrantNet: 103, marchReferenceNet: 105, difficulty: 'hard' },

  // === EK PROGRAMLAR ===
  { id: 'boun_eco', university: 'Boğaziçi Üniversitesi', city: 'İstanbul', major: 'Ekonomi', examType: 'AYT', lastEntrantNet: 90, marchReferenceNet: 92, difficulty: 'elite' },
  { id: 'metu_ee', university: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', major: 'Elektrik-Elektronik Mühendisliği', examType: 'AYT', lastEntrantNet: 94, marchReferenceNet: 95, difficulty: 'elite' },
  { id: 'itu_ee', university: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', major: 'Elektrik-Elektronik Mühendisliği', examType: 'AYT', lastEntrantNet: 91, marchReferenceNet: 92, difficulty: 'elite' },
  { id: 'hacettepe_pharmacy', university: 'Hacettepe Üniversitesi', city: 'Ankara', major: 'Eczacılık', examType: 'AYT', lastEntrantNet: 82, marchReferenceNet: 84, difficulty: 'hard' },
];

export function searchUniGoals(query: string, examType?: 'TYT' | 'AYT'): UniGoal[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return UNI_GOALS.filter(u => {
    const matchesQuery = u.university.toLowerCase().includes(q) || u.major.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
    const matchesType = !examType || u.examType === examType;
    return matchesQuery && matchesType;
  }).slice(0, 8);
}

export function findUniGoal(university: string, major: string, examType: 'TYT' | 'AYT'): UniGoal | null {
  const u = university.toLowerCase();
  const m = major.toLowerCase();
  return UNI_GOALS.find(g =>
    g.university.toLowerCase().includes(u) &&
    g.major.toLowerCase().includes(m) &&
    g.examType === examType
  ) ?? null;
}
