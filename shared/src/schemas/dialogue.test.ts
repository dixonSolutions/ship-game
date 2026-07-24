import { describe, expect, it } from 'vitest';
import { DialogueRequestSchema } from './dialogue.js';

describe('DialogueRequestSchema', () => {
  it('accepts a valid constrained request', () => {
    const parsed = DialogueRequestSchema.parse({
      context: {
        crewRole: 'helmsman',
        crewName: 'Pike',
        shipName: 'Sea Lark',
        weather: 'storm',
        combatState: 'skirmish',
        windStrength: 0.7,
        hullIntegrity: 0.85,
      },
      playerLine: 'How is the helm holding?',
    });
    expect(parsed.context.crewRole).toBe('helmsman');
  });

  it('rejects oversized player lines', () => {
    expect(() =>
      DialogueRequestSchema.parse({
        context: {
          crewRole: 'captain',
          crewName: 'Ada',
          shipName: 'Sea Lark',
          weather: 'clear',
          combatState: 'peaceful',
          windStrength: 0.2,
          hullIntegrity: 1,
        },
        playerLine: 'x'.repeat(281),
      }),
    ).toThrow();
  });
});
