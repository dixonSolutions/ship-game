import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { ServerConfig } from './config.js';
import { safeErrorHandler } from './middleware/safeError.js';
import { createDialogueRouter } from './routes/dialogue.js';
import { createSfxRouter } from './routes/sfx.js';
import { createTtsRouter } from './routes/tts.js';
import { elevenLabsConfigured } from './services/elevenLabs.js';

export function createApp(config: ServerConfig): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      mockAws: config.MOCK_AWS,
      audioProvider: elevenLabsConfigured(config) ? 'elevenlabs' : config.AUDIO_PROVIDER,
      elevenLabs: elevenLabsConfigured(config),
    });
  });

  app.use(
    '/api/dialogue',
    rateLimit({
      windowMs: 60_000,
      max: config.BEDROCK_RATE_LIMIT_PER_MINUTE,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'rate_limited', message: 'Dialogue rate limit exceeded.' },
    }),
    createDialogueRouter(config),
  );

  app.use(
    '/api/tts',
    rateLimit({
      windowMs: 60_000,
      max: config.ELEVENLABS_RATE_LIMIT_PER_MINUTE,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'rate_limited', message: 'TTS rate limit exceeded.' },
    }),
    createTtsRouter(config),
  );

  app.use(
    '/api/sfx',
    rateLimit({
      windowMs: 60_000,
      max: config.ELEVENLABS_RATE_LIMIT_PER_MINUTE,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'rate_limited', message: 'SFX rate limit exceeded.' },
    }),
    createSfxRouter(config),
  );

  app.use(safeErrorHandler);
  return app;
}
