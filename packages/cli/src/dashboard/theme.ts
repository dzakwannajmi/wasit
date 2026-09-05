/**
 * Brand palette shared with the marketing site (frontend/app/globals.css),
 * so the dashboard reads as the same product as wasit.dev rather than a
 * generic Ink starter theme. The status colors match the exact traffic-light
 * dots the site already renders in its terminal-window mockup.
 *
 * Ink renders hex colors directly (via chalk); a terminal without truecolor
 * support falls back to its nearest ANSI color automatically.
 */
export const THEME = {
  /** frontend --accent */
  accent: "#7c3aed",
  /** frontend --muted */
  muted: "#a0a0a0",
  /** frontend .terminal-dot-green */
  success: "#28c840",
  /** frontend .terminal-dot-yellow */
  warning: "#febc2e",
  /** frontend .terminal-dot-red */
  danger: "#ff5f57",
} as const;
