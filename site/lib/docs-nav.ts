import {
  Rocket,
  SquareTerminal,
  Cable,
  Package,
  Settings2,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

/**
 * The full site map for /docs, as plain data — no filesystem access, so
 * this is safe to import from both server components (routing, content
 * lookup) and client components (the sidebar, the breadcrumb). It only
 * describes *structure*: titles, icons, and slugs. The actual markdown
 * for each page is resolved separately, server-side only, in
 * lib/content.ts — which imports this file to know how many pages each
 * group needs and in what order (see assertDocsInSync there).
 *
 * Every group's pages[0] is a synthetic "Overview" page (the source
 * file's own intro, before its first "##"); pages[1..] mirror that
 * file's "##" sections in file order. Titles here are a cosmetic shadow
 * of each file's real heading text (run through the same em-dash cleanup
 * as lib/content.ts's cleanHeadingText) — keep them in sync by eye; a
 * mismatch is a stale sidebar label, not a broken page (assertDocsInSync
 * only checks *counts*).
 *
 * "Get Started" is the one exception: its three pages are hand-authored
 * or pulled from a single named section of a file (see lib/content.ts's
 * resolveDocMarkdown and getHowItWorksMarkdown), not a whole file split
 * by "##", so it's exempt from assertDocsInSync's count check.
 */

export type DocNavPage = { title: string; slug: string[] }

export type DocNavGroup = {
  kind: "group"
  title: string
  icon: LucideIcon
  pages: DocNavPage[]
}

export type DocNavLink = {
  kind: "link"
  title: string
  icon: LucideIcon
  page: DocNavPage
}

export type DocNavEntry = DocNavGroup | DocNavLink

export const DOCS_NAV: DocNavEntry[] = [
  {
    kind: "group",
    title: "Get Started",
    icon: Rocket,
    pages: [
      { title: "Install", slug: ["get-started", "install"] },
      { title: "Quick Start", slug: ["get-started", "quick-start"] },
      { title: "How It Works", slug: ["get-started", "how-it-works"] },
    ],
  },
  {
    kind: "group",
    title: "CLI Guide",
    icon: SquareTerminal,
    pages: [
      { title: "Overview", slug: ["cli", "overview"] },
      { title: "Exit codes", slug: ["cli", "exit-codes"] },
      { title: "x402 (Test)", slug: ["cli", "test-x402"] },
      { title: "MPP Charge Mode", slug: ["cli", "mpp-charge"] },
      { title: "MPP Channel Mode", slug: ["cli", "mpp-channel"] },
      { title: "Reading output", slug: ["cli", "reading-output"] },
    ],
  },
  {
    kind: "group",
    title: "MCP Guide",
    icon: Cable,
    pages: [
      { title: "Overview", slug: ["mcp", "overview"] },
      { title: "Claude Code & Claude Desktop", slug: ["mcp", "claude-code"] },
      { title: "Manual / other clients", slug: ["mcp", "other-clients"] },
      { title: "Tools", slug: ["mcp", "tools"] },
      { title: "Resource", slug: ["mcp", "resource"] },
      { title: "Secrets are never tool arguments", slug: ["mcp", "secrets"] },
      { title: "Results", slug: ["mcp", "results"] },
      { title: "Why the destructive tool is a separate tool", slug: ["mcp", "destructive-tool"] },
    ],
  },
  {
    kind: "group",
    title: "Core Guide",
    icon: Package,
    pages: [
      { title: "Overview", slug: ["core", "overview"] },
      { title: "Install & usage", slug: ["core", "usage"] },
      { title: "x402 checks", slug: ["core", "x402"] },
      { title: "MPP charge mode", slug: ["core", "mpp-charge"] },
      { title: "MPP channel mode", slug: ["core", "mpp-channel"] },
      { title: "Reporting & result shapes", slug: ["core", "reporting"] },
      { title: "Design notes", slug: ["core", "design"] },
    ],
  },
  {
    kind: "group",
    title: "Configuration",
    icon: Settings2,
    pages: [
      { title: "Overview", slug: ["configuration", "overview"] },
      { title: "What each check needs", slug: ["configuration", "check-requirements"] },
      { title: "Networks", slug: ["configuration", "networks"] },
      { title: "Getting testnet keys", slug: ["configuration", "testnet-keys"] },
      { title: "The disposable channel", slug: ["configuration", "disposable-channel"] },
    ],
  },
  {
    kind: "group",
    title: "Wasit Check Catalogue",
    icon: ListChecks,
    pages: [
      { title: "Overview", slug: ["checks", "overview"] },
      { title: "x402", slug: ["checks", "x402"] },
      { title: "MPP - Charge Mode", slug: ["checks", "mpp-charge-mode"] },
      { title: "MPP - Channel Mode", slug: ["checks", "mpp-channel-mode"] },
    ],
  },
  {
    kind: "group",
    title: "Security Policy",
    icon: ShieldCheck,
    pages: [
      { title: "Overview", slug: ["security", "overview"] },
      { title: "Testnet only", slug: ["security", "testnet-only"] },
      { title: "Authorization", slug: ["security", "authorization"] },
      { title: "Checks that spend money", slug: ["security", "spend-money"] },
      { title: "Destructive checks", slug: ["security", "destructive-checks"] },
      { title: "Key handling", slug: ["security", "key-handling"] },
      { title: "Reporting a vulnerability in Wasit", slug: ["security", "vulnerability-reporting"] },
      { title: "Findings about services Wasit tests", slug: ["security", "service-findings"] },
      { title: "Findings in upstream SDKs", slug: ["security", "sdk-findings"] },
      { title: "Supported versions", slug: ["security", "supported-versions"] },
    ],
  },
]

export function findNavPage(slug: string[]): { page: DocNavPage; group?: DocNavGroup } | undefined {
  const key = slug.join("/")
  for (const entry of DOCS_NAV) {
    if (entry.kind === "link" && entry.page.slug.join("/") === key) {
      return { page: entry.page }
    }
    if (entry.kind === "group") {
      const page = entry.pages.find((p) => p.slug.join("/") === key)
      if (page) return { page, group: entry }
    }
  }
  return undefined
}
