/**
 * AMAÇ: Local geliştirme sunucusu — Vercel Function'ı Express üzerinde çalıştırır.
 * MANTIK: Express req/res → VercelRequest-uyumlu adaptör → api/ai.ts handler
 * UYARI: BUILD-001 fix — double-parse riski giderildi. req.body zaten express.json() parse etti.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import express, { type Request, type Response } from 'express';
import handler from './api/ai';
import bootstrapOwnerHandler from './api/admin/bootstrap-owner';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '10mb' }));

function adaptExpressToVercel(
  expressReq: Request,
  expressRes: Response
): [
  Record<string, unknown>,
  { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void }
] {
  const vercelReq: Record<string, unknown> = {
    method: expressReq.method,
    body: expressReq.body,
    headers: expressReq.headers as Record<string, string | undefined>,
    socket: { remoteAddress: expressReq.socket?.remoteAddress },
    query: expressReq.query,
    url: expressReq.url,
  };

  const vercelRes = {
    statusCode: 200,
    setHeader(k: string, v: string) {
      expressRes.setHeader(k, v);
    },
    end(body: string) {
      expressRes.status(vercelRes.statusCode).send(body);
    },
  };

  return [vercelReq, vercelRes];
}

app.post('/api/ai', async (req, res) => {
  const action = (req.body as Record<string, unknown>)?.action ?? 'default';
  console.log(`→ [API] Request received: ${action}`);

  try {
    const [vercelReq, vercelRes] = adaptExpressToVercel(req, res);
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error('✘ [API] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  }
});

app.post('/api/admin/bootstrap-owner', async (req, res) => {
  try {
    const [vercelReq, vercelRes] = adaptExpressToVercel(req, res);
    await bootstrapOwnerHandler(vercelReq, vercelRes);
  } catch (error) {
    console.error('✘ [OWNER] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'OWNER_BOOTSTRAP_FAILED' });
    }
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`\n🚀 [BOHO API] Server running at http://127.0.0.1:${port}`);
  console.log(`📡 [PROXY] Vite will redirect /api to this server.`);
});
