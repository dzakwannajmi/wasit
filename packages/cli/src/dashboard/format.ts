/**
 * Renders a duration for a person glancing at a running check, not for
 * machine parsing — millisecond precision below 1s (where it's the only
 * signal something is happening), one decimal of seconds above it.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
