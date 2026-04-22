/**
 * AMAÇ: Kullanıcı verilerini dışa aktarma (Data Portability)
 * MANTIK: Firestore'dan gelen verileri CSV veya JSON formatına dönüştürüp indirilebilir bloklar oluşturur.
 */

import { saveAs } from 'file-saver';

export const exportService = {
  /**
   * JSON olarak indir
   */
  exportToJson: (data: any, fileName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `${fileName}.json`);
  },

  /**
   * CSV olarak indir (Çalışma Logları)
   */
  exportLogsToCsv: (logs: any[]) => {
    const headers = ['Tarih', 'Ders', 'Konu', 'Soru Sayısı', 'Doğru', 'Yanlış', 'Süre (DK)', 'Notlar'];
    const rows = logs.map(l => [
      l.date,
      l.subject,
      l.topic,
      l.questions,
      l.correct,
      l.wrong,
      l.avgTime,
      `"${(l.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Boho_Mentos_Loglar_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * CSV olarak indir (Deneme Sonuçları)
   */
  exportExamsToCsv: (exams: any[]) => {
    const headers = ['Tarih', 'Tip', 'Kaynak', 'Toplam Net', 'Not'];
    const rows = exams.map(e => [
      e.date,
      e.type,
      e.source,
      e.totalNet,
      `"${(e.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Boho_Mentos_Denemeler_${new Date().toISOString().split('T')[0]}.csv`);
  }
};
