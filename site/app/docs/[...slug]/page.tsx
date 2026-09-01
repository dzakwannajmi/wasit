import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocsArticle } from "@/components/docs-article"
import { allDocSlugs, resolveDocMarkdown } from "@/lib/content"

type Params = { params: Promise<{ slug: string[] }> }

export function generateStaticParams() {
  return allDocSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const resolved = resolveDocMarkdown(slug)
  if (!resolved) return { title: "Docs — Wasit" }
  return { title: `${resolved.title} - Wasit Docs` }
}

export default async function DocsSlugPage({ params }: Params) {
  const { slug } = await params
  const resolved = resolveDocMarkdown(slug)
  if (!resolved) notFound()
  return <DocsArticle markdown={resolved.markdown} />
}
