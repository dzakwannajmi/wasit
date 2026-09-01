import type { ComponentPropsWithoutRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import { CodeBlock } from "@/components/code-block"
import { DocsToc } from "@/components/docs-toc"

// GFM tables can run wider than the reading column (the CLI flag tables,
// the check catalogue). Wrapping in .table-scroll lets them scroll
// horizontally instead of squeezing every column — see the matching
// rule in app/docs/docs.css.
function TableWrapper({ children, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="table-scroll">
      <table {...props}>{children}</table>
    </div>
  )
}

/**
 * The shared shell for every /docs page: one page's markdown, rendered
 * on its own (never concatenated with any other page anymore), plus its
 * own right-hand table of contents. Used by both app/docs/page.tsx
 * (Install) and app/docs/[...slug]/page.tsx (everything else).
 */
export function DocsArticle({ markdown }: { markdown: string }) {
  return (
    <div className="flex items-start justify-center gap-12 px-6 py-10 md:px-10">
      <article id="docs-content" className="typeset typeset-docs w-full max-w-[68ch]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
          components={{ pre: CodeBlock, table: TableWrapper }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
      <DocsToc contentSelector="#docs-content" className="sticky top-20 hidden w-56 shrink-0 xl:block" />
    </div>
  )
}
