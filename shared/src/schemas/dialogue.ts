import { z } from 'zod';

/** Constrained game context sent to the dialogue API — never free-form secrets. */
export const CrewRoleSchema = z.enum([
  'captain',
  'helmsman',
  'gunner',
  'lookout',
  'boatswain',
]);

export const DialogueContextSchema = z.object({
  crewRole: CrewRoleSchema,
  crewName: z.string().min(1).max(64),
  shipName: z.string().min(1).max(64),
  weather: z.enum(['clear', 'rain', 'storm', 'fog', 'lightning', 'hurricane', 'tsunami']),
  combatState: z.enum(['peaceful', 'skirmish', 'battle', 'sinking']),
  windStrength: z.number().min(0).max(1),
  hullIntegrity: z.number().min(0).max(1),
  recentEvent: z.string().max(200).optional(),
});

export const DialogueRequestSchema = z.object({
  context: DialogueContextSchema,
  playerLine: z.string().min(1).max(280),
});

export const DialogueResponseSchema = z.object({
  reply: z.string().min(1).max(500),
  mood: z.enum(['calm', 'tense', 'urgent', 'joyful', 'grim']),
  voiceHint: z.string().max(64).optional(),
});

export type CrewRole = z.infer<typeof CrewRoleSchema>;
export type DialogueContext = z.infer<typeof DialogueContextSchema>;
export type DialogueRequest = z.infer<typeof DialogueRequestSchema>;
export type DialogueResponse = z.infer<typeof DialogueResponseSchema>;
