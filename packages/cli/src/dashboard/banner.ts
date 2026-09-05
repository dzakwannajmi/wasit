import cfonts from "cfonts";

// Node's ESM/CJS interop only guarantees the default import (the whole
// module.exports object) for a CommonJS package — cfonts assigns its
// exports via `module.exports = exports = {...}`, a pattern the runtime
// loader does not always statically detect as named exports, even though
// cfonts' own .d.ts declares one. `import { render } from "cfonts"` threw
// "does not provide an export named 'render'" at runtime for exactly this
// reason, despite type-checking fine. The default import always works.
const cfontsRender = cfonts.render;

/**
 * Renders `text` as block-letter ASCII art, uncolored — `colors: ["system"]`
 * tells cfonts not to wrap the output in its own ANSI codes, so the caller
 * (Ink) applies color per line instead of fighting embedded escape codes.
 * `spaceless` drops cfonts' own blank padding lines; the caller controls
 * spacing with its own layout instead.
 *
 * Returns the input as a single line, unchanged, if cfonts fails to render
 * it (an unsupported character, for instance) — a missing wordmark is a
 * cosmetic problem the dashboard should never crash over.
 */
export function renderWordmark(text: string): readonly string[] {
  const result = cfontsRender(text, {
    font: "block",
    colors: ["system"],
    background: "transparent",
    spaceless: true,
  });
  if (result === false) {
    return [text];
  }
  return result.array;
}
