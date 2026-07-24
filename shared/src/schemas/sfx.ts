import { z } from 'zod';

/** Browser may only request these IDs — prompts live server-side. */
export const SoundIdSchema = z.enum([
  'ambient_wind',
  'ambient_waves',
  'ambient_creak',
  'ambient_rain',
  'sfx_thunder',
  'sfx_cannon',
  'sfx_impact',
  'sfx_splash',
  'sfx_sail_flap',
  'sfx_anchor',
  'music_horizon',
]);

export const SfxRequestSchema = z.object({
  soundId: SoundIdSchema,
});

export type SoundId = z.infer<typeof SoundIdSchema>;
export type SfxRequest = z.infer<typeof SfxRequestSchema>;
