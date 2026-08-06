/**
 * Minimal standalone server for Phase 2's Generate feature. Its only job is
 * to hold the MiniMax API key server-side and proxy the generate call — no
 * database, no auth, no persistence (see CLAUDE.md's Phase 2 scope). Run
 * with `npm run server`, alongside `npm run dev` for Vite.
 */

import 'dotenv/config';
import express from 'express';
import { createGenerateHandler } from './generateHandler';

const PORT = Number(process.env.PORT) || 3001;
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2';

if (!MINIMAX_API_KEY) {
  console.warn(
    'MINIMAX_API_KEY is not set — copy .env.example to .env and fill it in. Generate requests will fail until then.'
  );
}

const app = express();
app.use(express.json());

app.post(
  '/api/generate',
  createGenerateHandler({ apiKey: MINIMAX_API_KEY ?? '', model: MINIMAX_MODEL })
);

app.listen(PORT, () => {
  console.log(`AInimate generate server listening on http://localhost:${PORT}`);
});
