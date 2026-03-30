import express from 'express';
import dotenv from 'dotenv';
import handler from './api/ai';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const app = express();
const port = 3001;

app.use(express.json());

// Vercel Benzetimi (req/res objelerini adapt ediyoruz)
app.post('/api/ai', async (req, res) => {
  console.log('→ [API] Request received:', req.body?.action || 'default');
  
  // Vercel handler'ı standart (req, res) bekliyor. 
  // Express req/res objeleri Vercel ortamındakilere büyük oranda uyumludur.
  try {
    await handler(req, res);
  } catch (error) {
    console.error('✘ [API] Error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`\n🚀 [BOHO API] Server running at http://127.0.0.1:${port}`);
  console.log(`📡 [PROXY] Vite will redirect /api to this server.`);
});
