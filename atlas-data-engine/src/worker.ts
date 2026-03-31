/**
 * Atlas Data Engine — BullMQ Worker
 * Sorumluluk: Kuyruğa düşen senkronizasyon görevlerini Playwright ile icra etmek
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { AtlasScraper } from './services/scraper';

dotenv.config();

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

// Worker Tanımı
const worker = new Worker('atlas-sync', async (job: Job) => {
  console.log(`👷 İş Başladı: ${job.id} | Veri: ${JSON.stringify(job.data)}`);
  
  const scraper = new AtlasScraper();
  
  try {
    // Örnek: Üniversite veya Program bazlı sync
    const data = await scraper.syncProgram(job.data.programId || '10111001'); // Varsayılan: Boğaziçi Tıp (Mock)
    
    // Redis Cache Güncelleme
    await redisConnection.set(`atlas:program:${job.data.programId}`, JSON.stringify(data), 'EX', 86400 * 7); // 7 Gün TTL
    
    console.log(`✅ İş Tamamlandı: ${job.id}`);
    return { status: 'success', data };
  } catch (err) {
    console.error(`❌ İş Hatası: ${job.id}`, err);
    throw err; // BullMQ otomatik retry edecek
  }
}, { 
  connection: redisConnection,
  concurrency: 2 // Aynı anda 2 browser instance çalışabilir
});

worker.on('failed', (job, err) => {
  console.error(`💀 Job ${job?.id} kalıcı olarak başarısız oldu: ${err.message}`);
});

console.log('🚀 Atlas Sync Worker is active and listening for jobs...');
