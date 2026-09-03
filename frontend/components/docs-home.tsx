import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Rocket,
  Download,
  Workflow,
  SquareTerminal,
  Cable,
  Package,
  Settings2,
  ListChecks,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react"
import { DocsToc } from "@/components/docs-toc"

type DocCardData = {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

type DocSection = {
  id: string
  title: string
  cards: DocCardData[]
}

const SECTIONS: DocSection[] = [
  {
    id: "get-started",
    title: "Get Started",
    cards: [
      {
        href: "/docs/get-started/install",
        icon: Download,
        title: "Install",
        description: "Add the Wasit CLI or MCP server to your project.",
      },
      {
        href: "/docs/get-started/quick-start",
        icon: Rocket,
        title: "Quick Start",
        description: "Run your first x402 or MPP check in minutes.",
      },
      {
        href: "/docs/get-started/how-it-works",
        icon: Workflow,
        title: "How It Works",
        description: "The conceptual flow behind every check Wasit runs.",
      },
    ],
  },
  {
    id: "guides",
    title: "Guides",
    cards: [
      {
        href: "/docs/cli/overview",
        icon: SquareTerminal,
        title: "CLI Guide",
        description: "Every command, flag, and exit code for the wasit CLI.",
      },
      {
        href: "/docs/mcp/overview",
        icon: Cable,
        title: "MCP Guide",
        description: "Wire Wasit into Claude Code, Claude Desktop, or any MCP client.",
      },
      {
        href: "/docs/core/overview",
        icon: Package,
        title: "Core Guide",
        description: "The check-suite library the CLI and MCP server both run on — build your own tooling on top of it.",
      },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    cards: [
      {
        href: "/docs/configuration/overview",
        icon: Settings2,
        title: "Configuration",
        description: "Networks, testnet keys, and what each check needs to run.",
      },
      {
        href: "/docs/checks/overview",
        icon: ListChecks,
        title: "Check Catalogue",
        description: "Every compliance check Wasit runs, x402 and MPP alike.",
      },
      {
        href: "/docs/security/overview",
        icon: ShieldCheck,
        title: "Security Policy",
        description: "Testnet-only guarantees, authorization rules, and how to report a vulnerability.",
      },
    ],
  },
]

function DocCard({ href, icon: Icon, title, description }: DocCardData) {
  return (
    <Link href={href} className="docs-home-card">
      <Icon className="docs-home-card-icon" aria-hidden />
      <div className="docs-home-card-body">
        <div className="docs-home-card-title">{title}</div>
        <div className="docs-home-card-desc">{description}</div>
      </div>
      <ArrowUpRight className="docs-home-card-arrow" aria-hidden />
    </Link>
  )
}

/**
 * The /docs landing page — an overview, not an article. Mirrors the
 * shape of a typical docs homepage (a short intro, then every section
 * grouped under its own sub-heading as clickable cards) so a first-time
 * reader sees the whole shape of the docs before picking a page,
 * instead of landing straight on "Install" the way /docs used to
 * (see app/docs/page.tsx, which used to just redirect there).
 *
 * Each section heading is a real <h2 id="..."> so the right-hand
 * DocsToc works here exactly like it does on every markdown page — it
 * scans rendered headings in the DOM, not the markdown source.
 */
export function DocsHome() {
  return (
    <div className="flex items-start justify-center gap-12 px-6 py-10 md:px-10">
      <article id="docs-content" className="typeset typeset-docs w-full max-w-[68ch]">
        <h1>Wasit Documentation</h1>
        <p className="docs-home-lead">
          Everything you need to install Wasit and run your first x402 or MPP
          conformance check against a service on Stellar.
        </p>
        <div className="docs-home-cta">
          <Link href="/docs/get-started/quick-start" className="docs-home-cta-primary">
            Quick Start
          </Link>
          <Link href="/docs/get-started/install" className="docs-home-cta-secondary">
            Install
          </Link>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.id} className="docs-home-section">
            <h2 id={section.id}>{section.title}</h2>
            <div className="docs-home-grid">
              {section.cards.map((card) => (
                <DocCard key={card.href} {...card} />
              ))}
            </div>
          </section>
        ))}
      </article>
      <DocsToc contentSelector="#docs-content" className="sticky top-20 hidden w-56 shrink-0 xl:block" />
    </div>
  )
}
