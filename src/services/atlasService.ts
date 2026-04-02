/**
 * Atlas Service — Frontend API Client
 * Sorumluluk: Atlas Data Engine backend servisi ile iletişim kurmak
 * Not: Build güvenilirliği için native 'fetch' kullanılmıştır.
 */

const ATLAS_API_URL = 
  (import.meta.env?.VITE_ATLAS_API_URL) ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3002/api/atlas' 
    : '/api/atlas');

export interface AtlasProgram {
  id: string;
  universityName: string;
  programName: string;
  faculty: string;
  scoreType: string;
  baseScore?: number;
  successRank?: number;
}

export const atlasService = {
  /**
   * Üniversite veya bölüm arama
   */
  async search(query: string): Promise<AtlasProgram[]> {
    try {
      const url = new URL(`${ATLAS_API_URL}/search`, window.location.origin);
      url.searchParams.append('q', query);
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.warn('Atlas Search Error (Redirecting to Mock):', err);
      
      // [FALLBACK]: Backend kapalıysa (ERR_CONNECTION_REFUSED) mock verilerle devam et
      const mockPrograms: AtlasProgram[] = [
        { id: 'm1', universityName: 'Boho Üniversitesi (Offline)', programName: 'Yazılım Mühendisliği', faculty: 'Mühendislik Fakültesi', scoreType: 'SAY', baseScore: 485, successRank: 1200 },
        { id: 'm2', universityName: 'Mentos Teknik (Offline)', programName: 'Bilgisayar Mühendisliği', faculty: 'Bilgisayar Bilimleri', scoreType: 'SAY', baseScore: 512, successRank: 450 },
        { id: 'm3', universityName: 'Akdeniz Üniversitesi (Mock)', programName: 'Tıp Fakültesi', faculty: 'Tıp', scoreType: 'SAY', baseScore: 505, successRank: 800 },
      ];

      return mockPrograms.filter(p => 
        p.universityName.toLowerCase().includes(query.toLowerCase()) || 
        p.programName.toLowerCase().includes(query.toLowerCase())
      );
    }
  },

  /**
   * Manuel senkronizasyon tetikle
   */
  async triggerSync(programId: string): Promise<string | null> {
    try {
      const response = await fetch(`${ATLAS_API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId })
      });
      
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      
      const data = await response.json();
      return data.jobId;
    } catch (err) {
      console.error('Atlas Sync Trigger Error:', err);
      return null;
    }
  },

  /**
   * Program detaylarını getir
   */
  async getProgramDetails(programId: string): Promise<any | null> {
    try {
      const response = await fetch(`${ATLAS_API_URL}/programs/${programId}`);
      if (!response.ok) throw new Error(`Details fetch failed: ${response.status}`);
      
      return await response.json();
    } catch (err) {
      console.error('Atlas Get Details Error:', err);
      return null;
    }
  }
};
