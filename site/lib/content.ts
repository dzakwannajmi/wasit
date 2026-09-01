import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS_NAV, type DocNavGroup } from "./docs-nav";

/**
 * Reads a markdown file from the repo root (one level up from this Next.js
 * project, since `site/` is a separate Vercel project rooted inside the
 * monorepo). Requires Vercel's "Include source files outside of the Root
 * Directory" setting to be on for this to resolve at build time — see
 * .planning/landing-page.md for the deploy checklist.
 *
 * This keeps the docs pages reading the SAME files the CLI/MCP guides and
 * SECURITY.md already are, rather than a hand-copied duplicate that can
 * drift out of sync.
 */
export function readRepoDoc(relativePath: string): string {
  const fullPath = join(process.cwd(), "..", relativePath);
  return readFileSync(fullPath, "utf-8");
}

/**
 * Shifts every heading in a markdown string UP by `levels` (default 1) —
 * a file's own `## Section` becomes `# Section` once that section is
 * pulled out onto its own standalone docs page, and any `###` inside it
 * becomes a `##` that the page's own table of contents can pick up.
 * Floors at h1.
 */
export function promoteHeadings(markdown: string, levels = 1): string {
  return markdown.replace(/^(#{1,6})(\s+)/gm, (_match, hashes: string, space: string) => {
    const next = Math.max(hashes.length - levels, 1);
    return "#".repeat(next) + space;
  });
}

/**
 * Display-only cleanup for heading text (page <h1>s, a file's own title,
 * and the shadow labels in lib/docs-nav.ts): the " — " em dash reads
 * heavy as a title separator, so it's swapped for a plain hyphen here.
 * Only ever applied to a HEADING line — never to body prose, which stays
 * exactly as authored in the source file.
 */
export function cleanHeadingText(text: string): string {
  return text.replace(/\s+—\s+/g, " - ");
}

/**
 * One `##` section of a source file: its heading line through (not
 * including) the next `##` heading or end of file. Any `###`+
 * subheadings inside stay nested in `body` untouched.
 */
export type MdSection = { heading: string; body: string };

/**
 * Splits one repo markdown file into the group landing page it backs
 * (`title` + `preamble`: everything before the first `##`) and the list
 * of `##` sections that follow, in file order. This is the one place
 * that understands the *shape* of a source file; lib/docs-nav.ts only
 * has to agree on how many sections there are and what to call each one.
 */
export function splitDoc(markdown: string): { title: string; preamble: string; sections: MdSection[] } {
  const lines = markdown.split("\n");
  const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
  const title = titleMatch ? cleanHeadingText(titleMatch[1].trim()) : "";
  const bodyLines = titleMatch ? lines.slice(1) : lines;

  const sections: MdSection[] = [];
  const preambleLines: string[] = [];
  let current: MdSection | null = null;

  for (const line of bodyLines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (current) sections.push(current);
      const heading = cleanHeadingText(h2[1].trim());
      current = { heading, body: `## ${heading}\n` };
    } else if (current) {
      current.body += line + "\n";
    } else {
      preambleLines.push(line);
    }
  }
  if (current) sections.push(current);

  return { title, preamble: preambleLines.join("\n").trim(), sections };
}

/**
 * Strips inline markdown (code spans, bold, links) down to plain text —
 * for the odd spot a heading's text is needed outside the markdown
 * renderer, e.g. a page's <title>.
 */
export function plainText(markdown: string): string {
  return markdown
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/**
 * The one page on the docs site that isn't sourced from a repo markdown
 * file — package links. Written as markdown so it renders through the
 * same pipeline (and picks up heading ids from rehype-slug) as
 * everything else.
 */
export const INSTALL_MD = `# Install

Wasit ships as three npm packages — install only the ones you need.

| Package | What it is |
| --- | --- |
| [\`@wasit-dev/cli\`](https://www.npmjs.com/package/@wasit-dev/cli) | The \`wasit\` terminal command |
| [\`@wasit-dev/server\`](https://www.npmjs.com/package/@wasit-dev/server) | The MCP server, for Claude Code / Claude Desktop |
| [\`@wasit-dev/core\`](https://www.npmjs.com/package/@wasit-dev/core) | The check-suite library, if you're building on top of Wasit directly |

\`\`\`bash
# run once, no install
npx @wasit-dev/cli test https://your-service.example.com

# or install globally
npm install -g @wasit-dev/cli
\`\`\`
`;

/**
 * Which repo file backs each collapsible group in lib/docs-nav.ts, keyed
 * by that group's own first slug segment (e.g. "cli" for the group whose
 * pages all start ["cli", ...]).
 */
const GROUP_SOURCE_FILES: Record<string, string> = {
  cli: "docs/guides/cli.md",
  mcp: "docs/guides/mcp.md",
  configuration: "docs/guides/configuration.md",
  checks: "docs/CHECKS.md",
  security: "SECURITY.md",
};

function findGroup(key: string): DocNavGroup | undefined {
  return DOCS_NAV.find(
    (entry): entry is DocNavGroup => entry.kind === "group" && entry.pages[0]?.slug[0] === key
  );
}

/**
 * Fails the build loudly instead of silently mis-mapping pages: every
 * group in lib/docs-nav.ts must list exactly one "Overview" page plus
 * one page per "##" section actually present in its source file, in the
 * same order. Runs once, at module load.
 */
function assertDocsInSync(): void {
  for (const [key, sourceFile] of Object.entries(GROUP_SOURCE_FILES)) {
    const group = findGroup(key);
    if (!group) {
      throw new Error(`docs: no nav group found for source "${sourceFile}" (key "${key}")`);
    }

    const { sections } = splitDoc(readRepoDoc(sourceFile));
    const expected = group.pages.length - 1; // pages[0] is "Overview"
    if (sections.length !== expected) {
      throw new Error(
        `docs: ${sourceFile} has ${sections.length} "##" sections but lib/docs-nav.ts lists ${expected} ` +
          `pages for "${group.title}" — update DOCS_NAV to match.`
      );
    }
  }
}

assertDocsInSync();

/** Resolves one docs page's markdown from its URL slug (the segments
 *  after /docs). Returns null for anything generateStaticParams didn't
 *  enumerate — the route calls notFound() on that. */
export function resolveDocMarkdown(slug: string[]): { title: string; markdown: string } | null {
  if (slug.length === 0) return { title: "Install", markdown: INSTALL_MD };
  if (slug.length !== 2) return null;

  const [groupKey, pageSlug] = slug;
  const sourceFile = GROUP_SOURCE_FILES[groupKey];
  const group = findGroup(groupKey);
  if (!sourceFile || !group) return null;

  const { title, preamble, sections } = splitDoc(readRepoDoc(sourceFile));

  if (pageSlug === "overview") {
    return { title, markdown: `# ${title}\n\n${preamble}\n` };
  }

  // pages[0] is "Overview"; the rest line up 1:1 with `sections`, in file
  // order — that's the contract assertDocsInSync() checks above.
  const sectionPages = group.pages.slice(1);
  const index = sectionPages.findIndex((p) => p.slug[1] === pageSlug);
  if (index === -1 || !sections[index]) return null;

  return { title: plainText(sections[index].heading), markdown: promoteHeadings(sections[index].body) };
}

/**
 * Every slug generateStaticParams needs for /docs/[...slug] — every
 * group page. "Install" lives at /docs itself (app/docs/page.tsx), so
 * it's excluded here.
 */
export function allDocSlugs(): string[][] {
  return DOCS_NAV.flatMap((entry) => (entry.kind === "group" ? entry.pages : [entry.page]))
    .map((page) => page.slug)
    .filter((slug) => slug.length > 0);
}
