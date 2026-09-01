"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type Heading = { id: string; text: string; level: 2 | 3 }

/**
 * The right-hand "on this page" rail — a Word-style table of contents
 * scoped to whatever page is currently rendered inside `contentSelector`.
 * Unlike the left sidebar (a fixed site map), this one is rebuilt from
 * the actual rendered h2/h3 elements every time the page changes, so it
 * can never drift from the content. Returns null on a page with no
 * subheadings — nothing to jump to.
 */
export function DocsToc({ contentSelector, className }: { contentSelector: string; className?: string }) {
  const [headings, setHeadings] = React.useState<Heading[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const root = document.querySelector(contentSelector)
    if (!root) return

    const found: Heading[] = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"))
      .filter((h) => h.id)
      .map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 }))

    setHeadings(found)
    setActiveId(found[0]?.id ?? null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    )
    found.forEach((h) => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [contentSelector])

  const jumpTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    history.replaceState(null, "", `#${id}`)
  }

  if (headings.length === 0) return null

  return (
    <nav aria-label="On this page" className={cn("space-y-3", className)}>
      <div className="font-mono text-xs uppercase tracking-wider text-sidebar-foreground/50">
        On this page
      </div>
      <ul className="space-y-2">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={jumpTo(h.id)}
              className={cn(
                "block border-l-2 py-0.5 text-sm leading-snug transition-colors",
                h.level === 3 ? "pl-6" : "pl-3",
                activeId === h.id
                  ? "border-l-foreground font-medium text-foreground"
                  : "border-l-transparent text-sidebar-foreground/60 hover:text-foreground"
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
