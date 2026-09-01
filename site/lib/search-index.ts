import { allDocSlugs, markdownToPlainText, resolveDocMarkdown } from "./content"
import { findNavPage } from "./docs-nav"

export type SearchEntry = {
  title: string
  group: string
  url: string
  content: string
}

/**
 * Builds the full docs search index server-side: every slug
 * allDocSlugs() enumerates, resolved to its markdown (same resolver the
 * page route itself uses, so the index can never list a page that
 * doesn't actually render) and reduced to plain text. Consumed by
 * app/docs/search-index.json/route.ts; re-run per request in dev
 * (cheap — the whole docs set is a few dozen short files) and once at
 * build time in production since the route is force-static.
 */
export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = []

  for (const slug of allDocSlugs()) {
    const resolved = resolveDocMarkdown(slug)
    if (!resolved) continue

    const nav = findNavPage(slug)
    const group = nav?.group?.title ?? nav?.page.title ?? "Docs"

    entries.push({
      title: resolved.title,
      group,
      url: `/docs/${slug.join("/")}`,
      content: markdownToPlainText(resolved.markdown),
    })
  }

  return entries
}
