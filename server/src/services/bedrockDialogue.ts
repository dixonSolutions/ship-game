import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { DialogueRequest, DialogueResponse } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';
import { buildDialoguePrompt } from './prompt.js';

function mockReply(req: DialogueRequest): DialogueResponse {
  const { crewName, crewRole, weather, combatState } = req.context;
  return {
    reply: `${crewName} the ${crewRole} nods. "${weather} skies, ${combatState} for now — aye, Captain."`,
    mood: combatState === 'peaceful' ? 'calm' : 'tense',
    voiceHint: crewRole,
  };
}

function inferMood(text: string): DialogueResponse['mood'] {
  const lower = text.toLowerCase();
  if (/(sink|fire|board|danger|storm)/.test(lower)) return 'urgent';
  if (/(aye|steady|hold)/.test(lower)) return 'calm';
  if (/(cheer|fair|good)/.test(lower)) return 'joyful';
  if (/(grim|lost|dead)/.test(lower)) return 'grim';
  return 'tense';
}

export async function generateDialogue(
  config: ServerConfig,
  request: DialogueRequest,
): Promise<DialogueResponse> {
  if (config.MOCK_AWS || !process.env['AWS_ACCESS_KEY_ID']) {
    return mockReply(request);
  }

  const client = new BedrockRuntimeClient({ region: config.AWS_REGION });
  const prompt = buildDialoguePrompt(request.context, request.playerLine);

  const result = await client.send(
    new ConverseCommand({
      modelId: config.BEDROCK_MODEL_ID,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: {
        maxTokens: config.BEDROCK_MAX_TOKENS,
        temperature: 0.7,
      },
    }),
  );

  const text =
    result.output?.message?.content
      ?.map((part) => ('text' in part ? part.text : ''))
      .join(' ')
      .trim() ?? '';

  if (!text) {
    throw new Error('CLIENT: Dialogue model returned an empty reply.');
  }

  return {
    reply: text.slice(0, 500),
    mood: inferMood(text),
    voiceHint: request.context.crewRole,
  };
}
