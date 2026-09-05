import { useEffect, useState } from "react";

/**
 * Milliseconds since `startedAt`, re-read on a timer while `active`.
 *
 * The elapsed time has to live in state rather than being computed as
 * `Date.now() - startedAt` during render: a render that reads the clock
 * produces a different result every time it runs, which is exactly what
 * React assumes renders do not do. Once the run finishes the interval stops
 * and the last value is frozen, which is also the correct final total.
 */
export function useElapsedMs(active: boolean, startedAt: number, intervalMs = 100): number {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) return;
    setElapsedMs(Date.now() - startedAt);
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), intervalMs);
    return () => clearInterval(timer);
  }, [active, startedAt, intervalMs]);

  return elapsedMs;
}
