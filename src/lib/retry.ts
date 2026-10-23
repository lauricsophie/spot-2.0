import { logger } from "./logger.js";

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const defaultOptions: Required<Omit<RetryOptions, "onRetry">> = {
  maxAttempts: 3,
  delayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier } = { ...defaultOptions, ...options };

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn(
        { err: lastError, attempt, maxAttempts, context },
        `Attempt ${attempt}/${maxAttempts} failed`
      );

      options.onRetry?.(lastError, attempt);

      if (attempt < maxAttempts) {
        await sleep(currentDelay);
        currentDelay *= backoffMultiplier;
      }
    }
  }

  logger.error({ err: lastError, context }, `All ${maxAttempts} attempts failed`);
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
