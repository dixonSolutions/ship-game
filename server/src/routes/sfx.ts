import { Router } from 'express';
import { SoundIdSchema, SfxRequestSchema } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { elevenLabsConfigured, generateElevenSound } from '../services/elevenLabs.js';

export function createSfxRouter(config: ServerConfig): Router {
  const router = Router();

  router.get('/catalog', (_req, res) => {
    res.json({
      provider: elevenLabsConfigured(config) ? 'elevenlabs' : 'mock',
      sounds: SoundIdSchema.options,
    });
  });

  router.post('/', validateBody(SfxRequestSchema), async (req, res, next) => {
    try {
      if (!elevenLabsConfigured(config)) {
        res.status(503).json({
          error: 'audio_unavailable',
          message: 'ElevenLabs is not configured. Falling back to local procedural audio.',
        });
        return;
      }
      const result = await generateElevenSound(config, req.body.soundId);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('X-Sound-Id', req.body.soundId);
      res.setHeader('X-Cache', result.cached ? 'HIT' : 'MISS');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(result.audio);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
