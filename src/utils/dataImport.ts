/**
 * Data Import Utils
 * Handle reading and parsing of JSON and CSV files to hydrate local store
 */

import { useAppStore } from '../store/appStore';

export async function importDataFromFile(file: File): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let payload: any = null;

        if (file.name.endsWith('.json')) {
          payload = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          // Basit bir CSV to JSON cevrimi
          const lines = text.split('\\n');
          const headers = lines[0].split(',');
          payload = lines.slice(1).map(line => {
            const data = line.split(',');
            return headers.reduce((obj, nextKey, index) => {
              obj[nextKey.trim()] = data[index]?.trim();
              return obj;
            }, {} as Record<string, string>);
          });
          // CSV import varsayimi: Gelen csv formatina gore ilgili state'e eklenmeli
          // Suan JSON kabul ediliyormus gibi basitce paketliyoruz:
          resolve({ success: false, message: 'CSV formatı şu an desteklenmiyor, lütfen JSON formatında içe aktarınız.' });
          return;
        }

        if (!payload) {
          resolve({ success: false, message: 'Geçersiz dosya içeriği.' });
          return;
        }

        const state = useAppStore.getState();
        // Destructuring old methods removed
        if (Array.isArray(payload.exams) && payload.exams.length > 0) {
           useAppStore.setState({ exams: [...state.exams, ...payload.exams] });
        }
        
        if (Array.isArray(payload.logs) && payload.logs.length > 0) {
           useAppStore.setState({ logs: [...state.logs, ...payload.logs] });
        }

        if (Array.isArray(payload.chatHistory) && payload.chatHistory.length > 0) {
           useAppStore.setState({ chatHistory: [...state.chatHistory, ...payload.chatHistory] });
        }

        resolve({ success: true, message: 'Veriler başarıyla içe aktarıldı ve store güncellendi.' });
      } catch (err: any) {
        resolve({ success: false, message: 'Dosya okuma hatası: ' + err.message });
      }
    };

    reader.onerror = () => resolve({ success: false, message: 'Dosya okunamadı.' });

    reader.readAsText(file);
  });
}
