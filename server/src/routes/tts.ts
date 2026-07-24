import { Router } from 'express';
import { TtsRequestSchema } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { synthesizeSpeech } from '../services/pollyTts.js';

export function createTtsRouter(config: ServerConfig): Router {
  const router = Router();

  router.post('/', validateBody(TtsRequestSchema), async (req, res, next) => {
    try {
      const result = await synthesizeSpeech(config, req.body);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('X-Voice-Id', result.voiceId);
      res.setHeader('X-Characters', String(result.characters));
      res.send(result.audio);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
