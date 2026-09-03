// Dependency-free "poor man's" syntax highlighter for docs code blocks
// (components/code-block.tsx). Not a real per-language grammar/parser —
// a single-pass regex tokenizer good enough to color the handful of
// things that actually show up in this repo's docs: shell commands
// (npx/npm/wasit/claude/git...), CLI flags (--target, -g), strings,
// numbers, comments, and a short list of TS/JS keywords. Deliberately
// small rather than pulling in a real highlighter (shiki, Prism, ...)
// as a new dependency.
//
// Safety: the input is escaped for HTML FIRST, then the token regex
// runs on the already-escaped string — every token pattern here only
// matches plain ASCII (quotes, #, //, digits, word characters, -), none
// of which `escapeHtml` touches, so escaping first and tokenizing
// second can never re-open an entity or double-escape one.

const KEYWORDS = new Set([
  "const", "let", "var", "function", "async", "await", "return",
  "if", "else", "for", "while", "import", "export", "from", "default",
  "interface", "type", "class", "extends", "implements", "new",
  "try", "catch", "finally", "throw", "typeof", "true", "false",
  "null", "undefined", "in", "of", "as",
])

const COMMANDS = new Set([
  "npx", "npm", "wasit", "claude", "git", "curl", "node", "yarn",
  "pnpm", "cd", "sudo", "echo",
])

const SHELL_LANGS = new Set(["bash", "sh", "shell", "zsh", "console", "text", ""])

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function tokenRegex(lang: string): RegExp {
  const isJson = lang === "json"
  const isShellLike = SHELL_LANGS.has(lang)
  const parts: string[] = []
  if (!isJson) {
    // Shell only ever comments with `#` — a bare `//` shows up
    // constantly there as part of a URL (https://...), so treating it
    // as a comment marker breaks every command that includes one.
    parts.push(isShellLike ? String.raw`(?<comment>#[^\n]*)` : String.raw`(?<comment>\/\/[^\n]*)`)
  }
  parts.push(String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`)
  parts.push(String.raw`(?<number>\b\d+(?:\.\d+)?\b)`)
  parts.push(String.raw`(?<flag>--?[A-Za-z][\w-]*)`)
  parts.push(String.raw`(?<word>[A-Za-z_$][\w$-]*)`)
  return new RegExp(parts.join("|"), "g")
}

/**
 * Returns HTML-safe markup with `<span class="tok-*">` wraps around
 * comments/strings/numbers/flags/keywords/known commands. Everything
 * else (braces, operators, whitespace) passes through escaped but
 * uncolored.
 */
export function highlightCode(code: string, lang: string): string {
  const re = tokenRegex(lang)
  const escaped = escapeHtml(code)
  return escaped.replace(re, (...args) => {
    const groups = args[args.length - 1] as {
      comment?: string
      string?: string
      number?: string
      flag?: string
      word?: string
    }
    const match = args[0] as string
    if (groups.comment) return `<span class="tok-comment">${groups.comment}</span>`
    if (groups.string) return `<span class="tok-string">${groups.string}</span>`
    if (groups.number) return `<span class="tok-number">${groups.number}</span>`
    if (groups.flag) return `<span class="tok-flag">${groups.flag}</span>`
    if (groups.word) {
      const w = groups.word
      if (KEYWORDS.has(w)) return `<span class="tok-keyword">${w}</span>`
      if (COMMANDS.has(w)) return `<span class="tok-command">${w}</span>`
      return w
    }
    return match
  })
}
