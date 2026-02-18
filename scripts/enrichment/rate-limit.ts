/**
 * Rate limiter for AI API calls: enforces minimum delay between requests
 * and optional batch pause after N requests so API limits (RPM) are respected.
 */

export interface AIRateLimiterOptions {
  /** Minimum gap in ms between any two AI requests (default 1200). */
  delayBetweenRequestsMs?: number;
  /** After this many AI requests, apply an extra pause (0 = disabled). */
  batchSize?: number;
  /** Length of the batch pause in ms (e.g. 60_000 for 1 minute). */
  batchPauseMs?: number;
  /** Called when a batch pause runs (for logging). */
  onBatchPause?: (requestCount: number) => void;
}

const DEFAULT_DELAY_MS = 1200;
const DEFAULT_BATCH_PAUSE_MS = 60_000;

export function createAIRateLimiter(options: AIRateLimiterOptions = {}): {
  waitForAIRateLimit: () => Promise<void>;
} {
  const delayMs = Math.max(0, options.delayBetweenRequestsMs ?? DEFAULT_DELAY_MS);
  const batchSize = Math.max(0, options.batchSize ?? 0);
  const batchPauseMs = Math.max(0, options.batchPauseMs ?? DEFAULT_BATCH_PAUSE_MS);
  const onBatchPause = options.onBatchPause;

  let lastCallTime = 0;
  let requestCount = 0;

  async function waitForAIRateLimit(): Promise<void> {
    const now = Date.now();

    if (batchSize > 0) {
      requestCount++;
      if (requestCount > 1 && (requestCount - 1) % batchSize === 0) {
        if (onBatchPause) onBatchPause(requestCount - 1);
        await sleep(batchPauseMs);
      }
    }

    const elapsed = now - lastCallTime;
    if (lastCallTime > 0 && elapsed < delayMs) {
      await sleep(delayMs - elapsed);
    }
    lastCallTime = Date.now();
  }

  return { waitForAIRateLimit };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
