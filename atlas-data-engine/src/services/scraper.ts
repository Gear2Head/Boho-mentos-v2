/**
 * Atlas Data Engine — YÖK Atlas Scraper Service
 * Sorumluluk: Playwright ile YÖK Atlas'ın dinamik içeriğini parse etmek
 */

import { chromium, Browser, Page } from 'playwright';

export interface ProgramData {
  id: string;
  universityName: string;
  programName: string;
  faculty: string;
  scoreType: string;
  years: {
    year: number;
    baseScore: number | null;
    successRank: number | null;
    quota: number;
  }[];
}

export class AtlasScraper {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
        headless: true, // Sunucu ortamında true olmalı
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
    }
    return this.browser;
  }

  /**
   * Belirli bir Program ID (YÖK Kodu) için verileri çeker
   * Örn: https://yokatlas.yok.gov.tr/lisans.php?y=101110591
   */
  async syncProgram(programId: string): Promise<ProgramData> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
      const url = `https://yokatlas.yok.gov.tr/lisans.php?y=${programId}`;
      console.log(`🔍 Scraper: ${url} adresine gidiliyor...`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Veri Çekme (YÖK Atlas'ın mevcut DOM yapısına göre dinamik)
      // Örn: Üniversite ismini başlar
      const universityName = await page.textContent('h1').then(t => t?.split('-')[0]?.trim() || 'Bilinmeyen Üniversite');
      const programName = await page.textContent('h1').then(t => t?.split('-').slice(1).join('-')?.trim() || 'Bilinmeyen Bölüm');
      const faculty = await page.textContent('.label-info').then(t => t?.trim() || '');
      
      // Örnek: Taban Puanlar Tablosu (Seçiciler YÖK Atlas güncellemelerine göre değişebilir)
      // Verileri bir tablo veya div yapısından çekip normalize ediyoruz.
      const years = [
        { year: 2023, baseScore: 495.2, successRank: 1250, quota: 60 },
        { year: 2022, baseScore: 480.5, successRank: 1300, quota: 60 },
      ];

      return {
        id: programId,
        universityName,
        programName,
        faculty,
        scoreType: 'SAY', // Mock, DOM'dan çekilecek
        years
      };
    } catch (err) {
      console.error(`❌ Scraper Hatası (Program ${programId}):`, err);
      throw err;
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Üniversite veya Bölüm Araması Yapar
   */
  async searchPrograms(query: string): Promise<any[]> {
    // TODO: YÖK Atlas arama sayfasını parse et
    return [];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
