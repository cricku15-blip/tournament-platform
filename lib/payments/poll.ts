export type PollOutcome = "done" | "pending";

export interface PollOptions {
  /** Return true when the thing we're waiting for has happened. */
  check: () => Promise<boolean>;
  intervalMs?: number;
  /** After this long, back off exponentially. */
  backoffAfterMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  signal?: AbortSignal;
}

/** Polls every 2 s for up to 60 s (backing off after 20 s). Timing out is "pending", never a failure. */
export async function pollUntil(o: PollOptions): Promise<PollOutcome> {
  const interval = o.intervalMs ?? 2000;
  const backoffAfter = o.backoffAfterMs ?? 20000;
  const timeout = o.timeoutMs ?? 60000;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;
  const start = now();
  let wait = interval;
  while (now() - start < timeout) {
    if (o.signal?.aborted) return "pending";
    try {
      if (await o.check()) return "done";
    } catch {
      // A failed status read is not a failed payment; keep waiting.
    }
    await sleep(wait);
    if (now() - start >= backoffAfter) wait = Math.min(wait * 1.5, 8000);
  }
  return "pending";
}
