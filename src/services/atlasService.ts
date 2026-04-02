/**
 * Atlas Service — Frontend API Client
 * Sorumluluk: Atlas Data Engine backend servisi ile iletişim kurmak
 * Not: Build güvenilirliği için native 'fetch' kullanılmıştır.
 */

const ATLAS_API_URL = 
  (typeof process !== 'undefined' && process.env.VITE_ATLAS_API_URL) ||
  (import.meta.env?.VITE_ATLAS_API_URL) ||
  '/api/atlas'; // Default to relative path for production proxy

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
      console.error('Atlas Search Error:', err);
      return [];
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
