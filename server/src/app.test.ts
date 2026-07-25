import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import type { ServerConfig } from './config.js';

const testConfig: ServerConfig = {
  PORT: 8787,
  SERVER_PORT: 8787,
  CLIENT_PORT: 4200,
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
  AUDIO_PROVIDER: 'mock',
  ELEVENLABS_API_KEY: '',
  ELEVENLABS_TTS_MODEL: 'eleven_flash_v2_5',
  ELEVENLABS_SFX_MODEL: 'eleven_text_to_sound_v2',
  ELEVENLABS_RATE_LIMIT_PER_MINUTE: 100,
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

  it('rejects free-form SFX prompts and unknown sound ids', async () => {
    const freeForm = await request(app)
      .post('/api/sfx')
      .send({ text: 'explode the server with a custom prompt' });
    expect(freeForm.status).toBe(400);

    const unknown = await request(app).post('/api/sfx').send({ soundId: 'hack_the_planet' });
    expect(unknown.status).toBe(400);
    expect(JSON.stringify(unknown.body)).not.toMatch(/ELEVENLABS|sk_/i);
  });

  it('lists SFX catalog without exposing secrets', async () => {
    const res = await request(app).get('/api/sfx/catalog');
    expect(res.status).toBe(200);
    expect(res.body.sounds).toContain('sfx_cannon');
    expect(JSON.stringify(res.body)).not.toMatch(/ELEVENLABS_API_KEY|sk_/i);
  });

  it('enforces dialogue rate limits without leaking internals', async () => {
    const tightApp = createApp({
      ...testConfig,
      BEDROCK_RATE_LIMIT_PER_MINUTE: 2,
    });
    const payload = {
      context: {
        crewRole: 'helmsman',
        crewName: 'Bram',
        shipName: 'Sea Lark',
        weather: 'clear',
        combatState: 'peaceful',
        windStrength: 0.4,
        hullIntegrity: 1,
      },
      playerLine: 'Steady as she goes.',
    };

    expect((await request(tightApp).post('/api/dialogue').send(payload)).status).toBe(200);
    expect((await request(tightApp).post('/api/dialogue').send(payload)).status).toBe(200);
    const limited = await request(tightApp).post('/api/dialogue').send(payload);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe('rate_limited');
    expect(JSON.stringify(limited.body)).not.toMatch(/AWS_|SECRET|ACCESS_KEY|stack/i);
  });
});
