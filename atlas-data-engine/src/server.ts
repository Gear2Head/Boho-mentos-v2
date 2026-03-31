/**
 * Atlas Data Engine — Fastify API
 * Port: 3002 (Default)
 * Sorumluluk: Arama, Filtreleme ve Senkronizasyon Kuyruğuna Görev Ekleme
 */

import fastify from 'fastify';
import cors from '@fastify/cors';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const server = fastify({ logger: true });
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

// BullMQ Queue
const atlasQueue = new Queue('atlas-sync', { connection: redisConnection });

// CORS
server.register(cors, {
  origin: true 
});

// Health Check
server.get('/health', async () => {
  return { status: 'ok', service: 'atlas-data-engine' };
});

/**
 * Arama Endpoint'i
 * GET /api/atlas/search?q=tıp
 */
server.get('/api/atlas/search', async (request, reply) => {
  const { q } = request.query as { q: string };
  if (!q) return reply.status(400).send({ error: 'Query is required' });

  // TODO: Redis cache-first arama, yoksa Atlas tetikle
  return { query: q, results: [], source: 'cache' };
});

/**
 * Senkronizasyon Tetikleyici
 * POST /api/atlas/sync
 */
server.post('/api/atlas/sync', async (request, reply) => {
  const body = request.body as { programId?: string, university?: string };
  
  // Kuyruğa yeni iş ekle
  const job = await atlasQueue.add('sync-job', body);
  
  return { jobId: job.id, message: 'Sync job enqueued' };
});

const start = async () => {
  try {
    await server.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🚀 Atlas Data Engine API is running on port 3002');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
