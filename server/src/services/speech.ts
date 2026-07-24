import type { TtsRequest } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';
import { elevenLabsConfigured, synthesizeElevenSpeech } from './elevenLabs.js';
import { synthesizeSpeech as synthesizePolly } from './pollyTts.js';

/** Route TTS through ElevenLabs when configured, otherwise Polly/mock. */
export async function synthesizeSpeech(config: ServerConfig, request: TtsRequest) {
  if (elevenLabsConfigured(config)) {
    return synthesizeElevenSpeech(config, request);
  }
  return synthesizePolly(config, request);
}
