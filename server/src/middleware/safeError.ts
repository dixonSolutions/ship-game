import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** Never leak stack traces, credentials, or AWS error internals to clients. */
export function safeErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_failed',
      message: 'Request body failed schema validation.',
      details: err.flatten(),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected error';
  const isClient = message.startsWith('CLIENT:');

  if (!isClient) {
    // Log server-side only — do not include env secrets.
    console.error('[server-error]', message);
  }

  res.status(isClient ? 400 : 500).json({
    error: isClient ? 'bad_request' : 'internal_error',
    message: isClient ? message.replace(/^CLIENT:\s*/, '') : 'Something went wrong.',
  });
}
