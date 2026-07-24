import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import type { ServerConfig } from './config.js';

const testConfig: ServerConfig = {
  PORT: 8787,
  CORS_ORIGIN: 'http://localhost:4200',
  NODE_ENV: 'test',
  AWS_REGION: 'us-east-1',
  BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
  BEDROCK_MAX_TOKENS: 256,
  BEDROCK_RATE_LIMIT_PER_MINUTE: 100,
  POLLY_VOICE_ID: 'Matthew',
  POLLY_ENGINE: 'neural',
  POLLY_RATE_LIMIT_PER_MINUTE: 100,
  MOCK_AWS: true,
};

describe('API security skeleton', () => {
  const app = createApp(testConfig);

  it('rejects invalid dialogue payloads', async () => {
    const res = await request(app).post('/api/dialogue').send({ playerLine: 'hi' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
  });

  it('returns a mock dialogue reply for valid payloads', async () => {
    const res = await request(app)
      .post('/api/dialogue')
      .send({
        context: {
          crewRole: 'lookout',
          crewName: 'Nessa',
          shipName: 'Sea Lark',
          weather: 'fog',
          combatState: 'peaceful',
          windStrength: 0.3,
          hullIntegrity: 0.9,
        },
        playerLine: 'Anything on the horizon?',
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(res.body.mood).toBeTruthy();
  });

  it('rejects oversized TTS text', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: 'a'.repeat(501), voiceId: 'Matthew' });
    expect(res.status).toBe(400);
  });

  it('does not expose env keys in error responses', async () => {
    const res = await request(app).post('/api/dialogue').send({});
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/AWS_|SECRET|ACCESS_KEY/i);
  });
});
