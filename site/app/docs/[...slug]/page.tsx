import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocsArticle } from "@/components/docs-article"
import { allDocSlugs, resolveDocMarkdown } from "@/lib/content"

type Params = { params: Promise<{ slug: string[] }> }

export function generateStaticParams() {
  return allDocSlugs().map((slug) => ({ slug }))
}

export function generateMetadata(): Metadata {
  // Every page on the site shares one short tab title ("Wasit") rather
  // than a per-page one — see app/layout.tsx, app/why/page.tsx, and
  // app/docs/page.tsx for the same choice. Kept as its own function
  // (rather than just relying on the root layout's default) so a
  // future per-page title is a one-line change here, not a new export.
  return { title: "Wasit" }
}

export default async function DocsSlugPage({ params }: Params) {
  const { slug } = await params
  const resolved = resolveDocMarkdown(slug)
  if (!resolved) notFound()
  return <DocsArticle markdown={resolved.markdown} />
}
