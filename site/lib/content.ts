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
 * Reduces a markdown string to plain search-index text: drops fenced
 * code blocks entirely (code tokens are noisy, low-signal matches for a
 * prose search box), strips heading hashes/list bullets/table pipes,
 * and reuses plainText()'s inline-markdown stripping for the rest. Used
 * only by lib/search-index.ts to build the docs search index — never
 * for anything rendered, so it doesn't need to preserve structure.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Pulls one named "##" section out of an arbitrary markdown file — heading
 * line through (not including) the next "##" or end of file. Unlike
 * splitDoc, this doesn't assume the file's own title sits on line 1
 * (README.md's does not: it opens with a centered <div> and badges), so
 * it's used for pulling a single well-known section out of a file that
 * isn't structured like the docs/guides/*.md files.
 */
export function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (startIndex === -1) return null;

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join("\n").trim() + "\n";
}

/**
 * The one page on the docs site that isn't sourced from a repo markdown
 * file — package links. Written as markdown so it renders through the
 * same pipeline (and picks up heading ids from rehype-slug) as
 * everything else.
 */
/**
 * "Quick Start" is hand-authored rather than pulled from a repo file: it's
 * the same two snippets already shown on the homepage (the CLI one-liner,
 * the Claude Code MCP registration), just given a full docs page with a
 * bit more context and links onward to the CLI/MCP guides.
 */
export const QUICK_START_MD = `# Quick Start

Two ways to run Wasit, depending on whether a person or an agent is driving.

## From a terminal

\`\`\`bash
# run once, no install
npx @wasit-dev/cli test --target https://your-service.example.com

# or install globally
npm install -g @wasit-dev/cli
wasit test --target https://your-service.example.com
\`\`\`

\`test\` runs the x402 checks. \`mpp-charge\` and \`mpp-channel\` run the MPP
checks — see the CLI Guide for every subcommand and flag.

## From Claude Code (MCP)

\`\`\`bash
claude mcp add --transport stdio wasit \\
  --env MPP_STELLAR_NETWORK=stellar:testnet \\
  --env STELLAR_PRIVATE_KEY=S... \\
  -- npx -y @wasit-dev/server
\`\`\`

This registers the MCP server so an agent can call Wasit's tools directly —
see the MCP Guide for what each tool checks, and Configuration for where
\`STELLAR_PRIVATE_KEY\` and the other environment values come from.
`;

export const INSTALL_MD = `# Install

Wasit ships as three npm packages — install only the ones you need.

| Package | What it is |
| --- | --- |
| [\`@wasit-dev/cli\`](https://www.npmjs.com/package/@wasit-dev/cli) | The \`wasit\` terminal command |
| [\`@wasit-dev/server\`](https://www.npmjs.com/package/@wasit-dev/server) | The MCP server, for Claude Code / Claude Desktop |
| [\`@wasit-dev/core\`](https://www.npmjs.com/package/@wasit-dev/core) | The check-suite library, if you're building on top of Wasit directly |

\`\`\`bash
# run once, no install
npx @wasit-dev/cli test --target https://your-service.example.com

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
  core: "docs/guides/core.md",
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
function getHowItWorksMarkdown(): string {
  const readme = readRepoDoc("README.md");
  const section = extractSection(readme, "How It Works");
  if (!section) {
    throw new Error(
      'docs: README.md has no "## How It Works" section anymore — update the Get Started group in lib/docs-nav.ts / lib/content.ts.'
    );
  }
  return promoteHeadings(section);
}

/**
 * "Why Wasit Exists" — the standalone article page at /why (see
 * app/why/page.tsx). Reuses README.md's own "## The Problem" section
 * verbatim, the same way getHowItWorksMarkdown() reuses "## How It
 * Works", so this page can't drift from the README's real explanation.
 *
 * The page supplies its own <h1> ("Why Wasit Exists"), so the section's
 * own "## The Problem" heading line is dropped rather than promoted —
 * unlike getHowItWorksMarkdown(), nothing here becomes a whole page
 * under its own extracted title. The body has no nested headings, so no
 * promoteHeadings() shift is needed. The two doc links inside it are
 * repo-relative (resolve on GitHub, not on this site), so they're
 * rewritten to real GitHub blob URLs; everything else — including the
 * one em dash in the body prose — stays exactly as authored in the
 * README, consistent with extractSection()'s own contract.
 */
export function getWhyItExistsMarkdown(): string {
  const readme = readRepoDoc("README.md");
  const section = extractSection(readme, "The Problem");
  if (!section) {
    throw new Error(
      'site: README.md has no "## The Problem" section anymore — update app/why/page.tsx / lib/content.ts.'
    );
  }

  const body = section
    .replace(/^##\s+The Problem\s*\n+/, "")
    .replace(
      /\(docs\/CHECKS\.md(#[^)]*)?\)/g,
      "(https://github.com/dzakwannajmi/wasit/blob/main/docs/CHECKS.md$1)"
    )
    .replace(
      /\(docs\/findings\/upstream-sdk\.md\)/g,
      "(https://github.com/dzakwannajmi/wasit/blob/main/docs/findings/upstream-sdk.md)"
    )
    .trim();

  return `${body}

## Who it's for

**Shipping a service.** Run Wasit against your own x402 or MPP endpoint before a customer finds the gap you missed.

**Building on top of one.** Wire Wasit's MCP tools into an agent so it checks a target's real conformance before trusting it.
`;
}

/**
 * "What Is Wasit" — the docs sidebar's own orientation page (see the
 * "about" link entry in lib/docs-nav.ts), for someone who opened /docs
 * without having read the README first. Reuses README.md's own opening
 * tagline (hand-copied here, since it sits before any "##" heading and
 * so can't be pulled with extractSection) plus its real "## Status"
 * table verbatim, the same way getWhyItExistsMarkdown() reuses "## The
 * Problem" — so the status this page shows can never say something the
 * README itself doesn't also say.
 *
 * The tagline paragraph is intentionally NOT hand-expanded beyond what
 * the README already claims — this page orients and links onward
 * (Quick Start, Why Wasit Exists, the Check Catalogue) rather than
 * re-explaining any of those in full, so there is exactly one place
 * each of those explanations lives.
 */
export function getAboutMarkdown(): string {
  const readme = readRepoDoc("README.md");
  const statusSection = extractSection(readme, "Status");
  if (!statusSection) {
    throw new Error(
      'docs: README.md has no "## Status" section anymore — update getAboutMarkdown() in lib/content.ts.'
    );
  }

  const status = statusSection
    .replace(
      /\(docs\/evidence\/([^)]+)\)/g,
      "(https://github.com/dzakwannajmi/wasit/blob/main/docs/evidence/$1)"
    )
    .replace(/\(#design-notes\)/g, "(https://github.com/dzakwannajmi/wasit#design-notes)")
    .replace(/\[docs\/CHECKS\.md\]\(docs\/CHECKS\.md\)/g, "[Check Catalogue](/docs/checks/overview)")
    .replace(/\n+---\s*$/, "")
    .trim();

  return `Wasit is an independent conformance tester for two agentic-payment
protocols on Stellar: **x402** and **MPP**. It runs the real payment flow
against a live service and verifies the settlement itself — by reading
Stellar RPC and the token contract's own transfer event — rather than
trusting whatever the service's response claims happened.

It is not a schema validator. A response can have every field in the right
place and still take money without settling it; that gap is exactly what
Wasit checks for.

## Why it exists

x402 and MPP ship an official SDK. Neither ships an independent way to check
that a service actually implements it — nothing plays the role
\`stellar-anchor-tests\` plays for the anchor ecosystem. "We support x402" is
currently a claim nobody can check from the outside.

[Why Wasit Exists](/why) has the full story, including three concrete
divergences between documentation and shipped SDK behavior that turned up
while building this tool.

## What you get

One check suite, two ways to run it:

- **[\`@wasit-dev/cli\`](https://www.npmjs.com/package/@wasit-dev/cli)** — the
  \`wasit\` terminal command, for a local run or a CI job.
- **[\`@wasit-dev/server\`](https://www.npmjs.com/package/@wasit-dev/server)**
  — the same checks as MCP tools, for Claude Code, Claude Desktop, or any
  other MCP-compatible agent.

Both are thin adapters over
[\`@wasit-dev/core\`](https://www.npmjs.com/package/@wasit-dev/core) — there is
only one implementation of each check, so a CLI run and an agent's run can
never disagree about the same target.

Thirteen checks across x402 and MPP are implemented, each traced to a written
spec clause in the [Check Catalogue](/docs/checks/overview).

${status}

## Where to go next

- **[Quick Start](/docs/get-started/quick-start)** — run your first check
- **[Why Wasit Exists](/why)** — the full motivation, including what was
  found wrong upstream
- **[Check Catalogue](/docs/checks/overview)** — every check's pass criteria
  and spec reference
`;
}

export function resolveDocMarkdown(slug: string[]): { title: string; markdown: string } | null {
  if (slug.length !== 2) return null;

  const [groupKey, pageSlug] = slug;

  if (groupKey === "about") {
    if (pageSlug === "overview") return { title: "What Is Wasit", markdown: getAboutMarkdown() };
    return null;
  }
  if (groupKey === "get-started") {
    if (pageSlug === "install") return { title: "Install", markdown: INSTALL_MD };
    if (pageSlug === "quick-start") return { title: "Quick Start", markdown: QUICK_START_MD };
    if (pageSlug === "how-it-works") return { title: "How It Works", markdown: getHowItWorksMarkdown() };
    return null;
  }
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
