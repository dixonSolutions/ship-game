import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import type { TtsRequest } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';

export interface TtsResult {
  audio: Buffer;
  contentType: 'audio/mpeg';
  voiceId: string;
  characters: number;
}

/** Minimal silent-ish MPEG frame placeholder when MOCK_AWS is enabled. */
function mockAudio(text: string, voiceId: string): TtsResult {
  // Not a full MP3 — clients should treat MOCK as non-playable stub bytes.
  const payload = Buffer.from(`MOCK_TTS:${voiceId}:${text.slice(0, 32)}`, 'utf8');
  return {
    audio: payload,
    contentType: 'audio/mpeg',
    voiceId,
    characters: text.length,
  };
}

export async function synthesizeSpeech(
  config: ServerConfig,
  request: TtsRequest,
): Promise<TtsResult> {
  const voiceId = request.voiceId ?? config.POLLY_VOICE_ID;

  if (config.MOCK_AWS || !process.env['AWS_ACCESS_KEY_ID']) {
    return mockAudio(request.text, voiceId);
  }

  const client = new PollyClient({ region: config.AWS_REGION });
  const result = await client.send(
    new SynthesizeSpeechCommand({
      Text: request.text,
      OutputFormat: 'mp3',
      VoiceId: voiceId,
      Engine: config.POLLY_ENGINE,
      TextType: 'text',
    }),
  );

  if (!result.AudioStream) {
    throw new Error('CLIENT: Speech synthesis returned no audio.');
  }

  const bytes = await result.AudioStream.transformToByteArray();
  return {
    audio: Buffer.from(bytes),
    contentType: 'audio/mpeg',
    voiceId,
    characters: request.text.length,
  };
}
