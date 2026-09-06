import { redirect } from "next/navigation"

/**
 * /docs and Overview -> Wasit were two pages saying much the same thing:
 * one an index of cards, the other an orientation article. They are now
 * a single page — the sidebar's first entry, carrying the card index
 * beneath its prose — and this route sends readers there.
 *
 * A route redirect rather than a next.config one, so /docs stays a real
 * route: the sidebar, the breadcrumb and the pager all reason about
 * paths under /docs, and removing the segment entirely would leave the
 * nav's own root undefined.
 */
export default function DocsIndexPage() {
  redirect("/docs/overview/wasit")
}
