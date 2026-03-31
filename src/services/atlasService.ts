/**
 * Atlas Service — Frontend API Client
 * Sorumluluk: Atlas Data Engine backend servisi ile iletişim kurmak
 */

import axios from 'axios';

const ATLAS_API_URL = process.env.VITE_ATLAS_API_URL || 'http://localhost:3002/api/atlas';

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
      const response = await axios.get(`${ATLAS_API_URL}/search`, {
        params: { q: query }
      });
      return response.data.results || [];
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
      const response = await axios.post(`${ATLAS_API_URL}/sync`, { programId });
      return response.data.jobId;
    } catch (err) {
      console.error('Atlas Sync Trigger Error:', err);
      return null;
    }
  },

  /**
   * Program detaylarını getir (Cache'den veya API'den)
   */
  async getProgramDetails(programId: string): Promise<any | null> {
    try {
      const response = await axios.get(`${ATLAS_API_URL}/programs/${programId}`);
      return response.data;
    } catch (err) {
      console.error('Atlas Get Details Error:', err);
      return null;
    }
  }
};
