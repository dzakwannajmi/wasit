import Image from "next/image"
import Link from "next/link"
import { DocsSearch } from "./DocsSearch"

const GITHUB_URL = "https://github.com/wasit-dev/wasit"

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

/**
 * Full-width bar navbar (React Flow docs-style layout), spread edge to
 * edge with its own wide max-width rather than sharing the page's
 * 880px `.wrap` content column — see .navbar in globals.css for why
 * that column would otherwise bunch brand+links+actions toward the
 * center on anything wider than a laptop screen.
 *
 * Link labels mostly mirror the landing page's own section ids/
 * headings (see app/page.tsx) — keep the two in sync when either
 * changes. Two exceptions: #get-started has no nav link (it's reached
 * via the CTA buttons themselves), and "Quick start" points straight
 * at the docs page rather than an on-page section — the landing page
 * no longer has its own Quick Start block, since it just duplicated
 * that docs page.
 *
 * `variant` picks the brand lockup. /docs pages get the wordmark with
 * the DOCS badge (app/docs/layout.tsx passes it), so a reader landing
 * mid-documentation can tell at a glance which surface they are on —
 * the sidebar deliberately carries no brand of its own, so this bar is
 * the only place that can say it. Everywhere else gets the plain
 * wordmark. Passed as a prop rather than read from usePathname() to
 * keep Nav a server component; the layout already knows the answer.
 */
const BRAND = {
  site: { src: "/W-White.png", width: 387, height: 100 },
  // These numbers are not a display size — .brand-logo pins the height
  // and leaves width auto, so they only carry the intrinsic aspect
  // ratio. They must be re-derived whenever an asset is re-exported:
  // 4972x1284 and 5980x1484 respectively. Get them wrong and the
  // browser scales the mark to the ratio declared here, not the one in
  // the file.
  docs: { src: "/docs.png", width: 403, height: 100 },
} as const

export function Nav({ variant = "site" }: { variant?: keyof typeof BRAND } = {}) {
  const brand = BRAND[variant]

  return (
    <header className="site-header">
      <div className="navbar">
        <div className="navbar-left">
          <Link href="/" className="brand" aria-label="Wasit">
            <Image
              src={brand.src}
              alt={variant === "docs" ? "Wasit Docs" : "Wasit"}
              width={brand.width}
              height={brand.height}
              className="brand-logo"
              priority
            />
          </Link>
          <nav className="navlinks">
            <Link href="/#comparison">Why Wasit</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/docs/start/try-it">Quick start</Link>
          </nav>
        </div>

        <div className="navbar-right">
          <DocsSearch />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Wasit on GitHub"
            className="nav-icon-link"
          >
            <GitHubIcon />
          </a>
          <Link href="/docs/overview/wasit" className="navlinks-docs">
            Docs
          </Link>
        </div>
      </div>
    </header>
  )
}
