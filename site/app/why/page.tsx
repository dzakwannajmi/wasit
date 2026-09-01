import type { Metadata } from "next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import { Nav } from "@/components/Nav"
import { Footer } from "@/components/Footer"
import { getWhyItExistsMarkdown } from "@/lib/content"

export const metadata: Metadata = {
  title: "Why Wasit Exists - Wasit",
  description:
    "x402 and MPP ship an SDK but no independent way to check a service actually implements it. Three real divergences that turned up while building Wasit.",
}

/**
 * Standalone article page, not a /docs page: no sidebar, no table of
 * contents, no Tailwind (that's only loaded inside /docs via
 * app/docs/docs.css). Just the .typeset primitive already vendored at
 * app/typeset.css and loaded site-wide from globals.css, used exactly
 * the way shadcn's own typeset article reference uses it.
 */
export default function WhyPage() {
  const markdown = getWhyItExistsMarkdown()

  return (
    <>
      <Nav />
      <div className="wrap article-wrap">
        <article className="typeset">
          <h1>Why Wasit Exists</h1>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
      <Footer />
    </>
  )
}
