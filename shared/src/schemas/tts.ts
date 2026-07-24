import { z } from 'zod';

/** Logical crew / narrator voices — server maps these to provider voice IDs. */
export const VoiceIdSchema = z.enum([
  'Matthew',
  'Joanna',
  'Brian',
  'Amy',
  'Ruth',
  'Stephen',
  'captain',
  'helmsman',
  'gunner',
  'lookout',
  'boatswain',
]);

export const TtsRequestSchema = z.object({
  text: z.string().min(1).max(500),
  voiceId: VoiceIdSchema.default('Matthew'),
  /** Optional SSML-safe speaking rate hint (percent). */
  ratePercent: z.number().int().min(80).max(120).optional(),
});

export const TtsResponseMetaSchema = z.object({
  contentType: z.literal('audio/mpeg'),
  voiceId: z.string(),
  characters: z.number().int().nonnegative(),
});

export type VoiceId = z.infer<typeof VoiceIdSchema>;
export type TtsRequest = z.infer<typeof TtsRequestSchema>;
export type TtsResponseMeta = z.infer<typeof TtsResponseMetaSchema>;
