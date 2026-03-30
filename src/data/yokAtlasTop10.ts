/**
 * AMAÇ: YÖK Atlas “kovalamaca” için gömülü mini veri seti (Top10).
 * MANTIK: Program bazında son giren net eşiği + Mart referansı.
 * UYARI: Bu veri örneklemedir; gerçek atlas verisi ile güncellenmelidir.
 */

export type YokAtlasProgram = {
  id: string;
  university: string;
  major: string;
  examType: 'TYT' | 'AYT';
  lastEntrantNet: number;
  marchReferenceNet: number;
};

export const YOK_ATLAS_TOP10: YokAtlasProgram[] = [
  { id: 'akdeniz_cs_ayt', university: 'Akdeniz Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 67, marchReferenceNet: 70 },
  { id: 'akdeniz_cs_tyt', university: 'Akdeniz Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'TYT', lastEntrantNet: 92, marchReferenceNet: 95 },
  { id: 'ege_cs_ayt', university: 'Ege Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 70, marchReferenceNet: 73 },
  { id: 'dokuz_cs_ayt', university: 'Dokuz Eylül Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 69, marchReferenceNet: 72 },
  { id: 'gazi_cs_ayt', university: 'Gazi Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 71, marchReferenceNet: 74 },
  { id: 'sakarya_cs_ayt', university: 'Sakarya Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 65, marchReferenceNet: 68 },
  { id: 'pamukkale_cs_ayt', university: 'Pamukkale Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 64, marchReferenceNet: 66 },
  { id: 'uludag_cs_ayt', university: 'Bursa Uludağ Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 66, marchReferenceNet: 69 },
  { id: 'marmara_cs_ayt', university: 'Marmara Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 72, marchReferenceNet: 75 },
  { id: 'ankara_cs_ayt', university: 'Ankara Üniversitesi', major: 'Bilgisayar Mühendisliği', examType: 'AYT', lastEntrantNet: 68, marchReferenceNet: 71 },
];

