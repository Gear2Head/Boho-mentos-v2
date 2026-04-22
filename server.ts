/**
 * AMAÇ: Local geliştirme sunucusu — Vercel Function'ı Express üzerinde çalıştırır.
 * MANTIK: Express req/res → VercelRequest-uyumlu adaptör → api/ai.ts handler
 * UYARI: BUILD-001 fix — double-parse riski giderildi. req.body zaten express.json() parse etti.
 */

import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import handler from './api/ai';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const app = express();
const port = 3001;

app.use(express.json());

/**
 * adaptExpressToVercel: Express Request/Response → api/ai.ts handler kontratına dönüştürür.
 * api/ai.ts handler imzası: (req: Record<string, unknown>, res: { statusCode, setHeader, end }) => void
 * Bu adaptör olmadan Express req tipi ile handler imzası çakışıyordu (BUILD-001).
 */
function adaptExpressToVercel(
  expressReq: Request,
  expressRes: Response
): [
  Record<string, unknown>,
  { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void }
] {
  const vercelReq: Record<string, unknown> = {
    method: expressReq.method,
    // body zaten parse edilmiş nesne — handler string kontrolü yapıp tekrar parse etmez
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

app.listen(port, '127.0.0.1', () => {
  console.log(`\n🚀 [BOHO API] Server running at http://127.0.0.1:${port}`);
  console.log(`📡 [PROXY] Vite will redirect /api to this server.`);
});
