import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getAdjacentDocPages, type FlatDocPage } from "@/lib/docs-nav"

function pageHref(slug: string[]): string {
  return `/docs/${slug.join("/")}`
}

function PagerCard({ entry, direction }: { entry: FlatDocPage; direction: "prev" | "next" }) {
  const isPrev = direction === "prev"
  return (
    <Link
      href={pageHref(entry.page.slug)}
      className="docs-pager-card"
      data-direction={direction}
      aria-label={`${isPrev ? "Previous" : "Next"}: ${entry.page.title}`}
    >
      {isPrev && <ChevronLeft className="docs-pager-arrow" aria-hidden="true" />}
      <span className="docs-pager-text">
        <span className="docs-pager-label">{isPrev ? "Previous" : "Next"}</span>
        <span className="docs-pager-title">
          {entry.groupTitle ? `${entry.groupTitle} · ${entry.page.title}` : entry.page.title}
        </span>
      </span>
      {!isPrev && <ChevronRight className="docs-pager-arrow" aria-hidden="true" />}
    </Link>
  )
}

/**
 * Bottom-of-article prev/next navigation, in DOCS_NAV's flattened
 * reading order (see lib/docs-nav.ts's flatDocPages/getAdjacentDocPages).
 * Renders nothing on a page with neither neighbor (there isn't one —
 * DOCS_NAV always has 2+ pages — but stays defensive); on the very
 * first or last page in the whole nav, only one card renders and the
 * `justify-content` on .docs-pager pushes it to the correct side.
 */
export function DocsPager({ slug }: { slug: string[] }) {
  const { prev, next } = getAdjacentDocPages(slug)
  if (!prev && !next) return null

  return (
    <nav className="docs-pager" aria-label="Docs pages">
      {prev ? <PagerCard entry={prev} direction="prev" /> : <span />}
      {next && <PagerCard entry={next} direction="next" />}
    </nav>
  )
}
