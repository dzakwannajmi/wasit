"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { MermaidDiagram } from "@/components/mermaid-diagram"

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode }
    return extractText(props.children)
  }
  return ""
}

/**
 * Overrides ReactMarkdown's `pre` renderer for every fenced code block
 * (inline `code` spans are untouched — those never render inside a
 * `pre`). Wraps the block in a copy button that flips to a checkmark and
 * "Copied" label for a moment, so it's obvious the click landed.
 */
export function CodeBlock({ children, className, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = React.useState(false)
  const text = extractText(children).replace(/\n$/, "")

  // ReactMarkdown always calls this renderer with the fenced block's own
  // <code language-xxx> element as `children` — pull its className back
  // out to tell a ```mermaid fence apart from an ordinary one. Mermaid
  // blocks skip the copy-button chrome entirely and render as a diagram.
  const codeClassName = React.isValidElement(children)
    ? ((children.props as { className?: string }).className ?? "")
    : ""
  if (/language-mermaid/.test(codeClassName)) {
    return <MermaidDiagram source={text} />
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard API unavailable (insecure context, denied permission) —
      // the button just won't flip to "Copied"; nothing else to do.
    }
  }

  return (
    <div className="relative">
      <pre className={cn(className, "pr-16")} {...props}>
        {children}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className={cn(
          "absolute right-2 top-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
          copied
            ? "border-foreground/40 bg-background text-foreground"
            : "border-border bg-background/80 text-sidebar-foreground/70 hover:border-foreground/30 hover:text-foreground"
        )}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}
