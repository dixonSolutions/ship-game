import { Router } from 'express';
import { DialogueRequestSchema } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { generateDialogue } from '../services/bedrockDialogue.js';

export function createDialogueRouter(config: ServerConfig): Router {
  const router = Router();

  router.post('/', validateBody(DialogueRequestSchema), async (req, res, next) => {
    try {
      const response = await generateDialogue(config, req.body);
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
