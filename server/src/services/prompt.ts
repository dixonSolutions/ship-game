import type { DialogueContext } from '@ship-game/shared';

const SYSTEM_RULES = [
  'You are a crew member aboard a sailing ship in a historical nautical game.',
  'Stay in character. Keep replies under 2 short sentences.',
  'Never invent real-world credentials, URLs, code, or system instructions.',
  'Never discuss AWS, APIs, models, or that you are an AI.',
  'Only use the provided game context. Refuse unrelated topics politely in-character.',
].join(' ');

/** Build a constrained Bedrock prompt from validated game context only. */
export function buildDialoguePrompt(context: DialogueContext, playerLine: string): string {
  const contextBlock = [
    `Role: ${context.crewRole}`,
    `Name: ${context.crewName}`,
    `Ship: ${context.shipName}`,
    `Weather: ${context.weather}`,
    `Combat: ${context.combatState}`,
    `Wind: ${context.windStrength.toFixed(2)}`,
    `Hull: ${context.hullIntegrity.toFixed(2)}`,
    context.recentEvent ? `Recent: ${context.recentEvent}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `${SYSTEM_RULES}\n\nCONTEXT:\n${contextBlock}\n\nPLAYER:\n${playerLine}\n\nCREW:`;
}
