// İşler Cepte 39-Haftalık YKS Ders Programları
export interface StudyProgram {
  week: number;
  title: string;
  track: 'SAY' | 'EA' | 'SÖZ' | 'DİL' | 'Ortak';
  url: string;
}

// ASSUME: Public Google Drive PDF links — replace with actual URLs when available
const BASE_URL = 'https://drive.google.com/drive/folders/1YKS-islerce-cepde';

export const studyPrograms: StudyProgram[] = [
  // Ortak (TYT) haftalık programlar
  ...Array.from({ length: 39 }, (_, i) => ({
    week: i + 1,
    title: `${i + 1}. Hafta TYT Programı`,
    track: 'Ortak' as const,
    url: `${BASE_URL}/tyt-hafta-${i + 1}.pdf`,
  })),
  // SAY AYT programları
  ...Array.from({ length: 39 }, (_, i) => ({
    week: i + 1,
    title: `${i + 1}. Hafta AYT Sayısal`,
    track: 'SAY' as const,
    url: `${BASE_URL}/say-hafta-${i + 1}.pdf`,
  })),
  // EA AYT programları
  ...Array.from({ length: 39 }, (_, i) => ({
    week: i + 1,
    title: `${i + 1}. Hafta AYT EA`,
    track: 'EA' as const,
    url: `${BASE_URL}/ea-hafta-${i + 1}.pdf`,
  })),
  // SÖZ AYT programları
  ...Array.from({ length: 39 }, (_, i) => ({
    week: i + 1,
    title: `${i + 1}. Hafta AYT Sözel`,
    track: 'SÖZ' as const,
    url: `${BASE_URL}/soz-hafta-${i + 1}.pdf`,
  })),
];
