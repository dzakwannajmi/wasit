"use client"

import * as React from "react"
import type { CSSProperties } from "react"
import "./docs-toc.css"

type Heading = { id: string; text: string; level: 2 | 3 }
type Falloff = "linear" | "smooth" | "sharp"

const FALLOFF_CURVES: Record<Falloff, (p: number) => number> = {
  linear: (p) => p,
  smooth: (p) => p * p * (3 - 2 * p),
  sharp: (p) => p * p * p,
}

/**
 * The right-hand "on this page" rail — a Word-style table of contents
 * scoped to whatever page is currently rendered inside `contentSelector`.
 * Unlike the left sidebar (a fixed site map), this one is rebuilt from
 * the actual rendered h2/h3 elements every time the page changes, so it
 * can never drift from the content. Returns null on a page with no
 * subheadings — nothing to jump to. Used on every /docs page and on
 * /legal/terms and /legal/privacy.
 *
 * Visually this is Wasit's own take on reactbits.dev's "Line Sidebar"
 * (https://reactbits.dev/components/line-sidebar): a marker line beside
 * each item that grows and tints toward --accent as the pointer nears
 * it, all driven by one rAF loop (ported from that component) so color,
 * shift and scale animate through the same value instead of staggering
 * across separate CSS transitions. Rebuilt from scratch in plain CSS —
 * no Tailwind, no framer-motion — so the exact same component renders
 * identically under /docs (where Tailwind is loaded) and on plain-CSS
 * pages like /legal/terms and /legal/privacy. The scroll-spy (headings
 * scan + IntersectionObserver + click-to-jump) is this component's own
 * addition on top of reactbits' click-only original.
 */
export function DocsToc({ contentSelector, className }: { contentSelector: string; className?: string }) {
  const [headings, setHeadings] = React.useState<Heading[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const listRef = React.useRef<HTMLUListElement>(null)
  const itemRefs = React.useRef<(HTMLLIElement | null)[]>([])
  const targetsRef = React.useRef<number[]>([])
  const currentRef = React.useRef<number[]>([])
  const rafRef = React.useRef<number | null>(null)
  const lastRef = React.useRef(0)
  const activeIndexRef = React.useRef<number | null>(null)

  const falloff: Falloff = "smooth"
  const proximityRadius = 90
  const smoothing = 120

  // Single rAF loop that eases every item's --effect toward its target
  // using frame-rate independent exponential smoothing, so the pointer-
  // proximity glow and the active-item highlight animate through the
  // same continuously-updating value instead of staggering. Built once,
  // inside an effect (not during render — React 19's hooks lint forbids
  // writing a ref while rendering) as a locally-scoped named function so
  // it can recurse via requestAnimationFrame(runFrame) directly; nothing
  // it closes over (the refs, `smoothing`) ever changes, so it never
  // needs rebuilding.
  const runFrameRef = React.useRef<((now: number) => void) | null>(null)

  React.useEffect(() => {
    function runFrame(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      const tau = Math.max(smoothing, 1) / 1000
      const k = 1 - Math.exp(-dt / tau)

      let moving = false
      const items = itemRefs.current
      for (let i = 0; i < items.length; i++) {
        const el = items[i]
        if (!el) continue
        const target = Math.max(targetsRef.current[i] || 0, activeIndexRef.current === i ? 1 : 0)
        const cur = currentRef.current[i] || 0
        const next = cur + (target - cur) * k
        const settled = Math.abs(target - next) < 0.0015
        const value = settled ? target : next
        currentRef.current[i] = value
        el.style.setProperty("--effect", value.toFixed(4))
        if (!settled) moving = true
      }

      rafRef.current = moving ? requestAnimationFrame(runFrame) : null
    }
    runFrameRef.current = runFrame
  }, [])

  const startLoop = React.useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    if (!runFrameRef.current) return
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(runFrameRef.current)
  }, [])

  React.useEffect(() => {
    const root = document.querySelector(contentSelector)
    if (!root) return

    const found: Heading[] = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"))
      .filter((h) => h.id)
      .map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 }))

    // react-hooks/set-state-in-effect false positive: `found` can only be
    // known by reading the DOM (contentSelector's actual rendered h2/h3s),
    // which doesn't exist until after this component mounts — there is no
    // render-time value to derive it from, so this is exactly the
    // "reading from the DOM" exception the rule's own docs describe
    // (react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  React.useEffect(() => {
    activeIndexRef.current = activeId ? headings.findIndex((h) => h.id === activeId) : null
    startLoop()
  }, [activeId, headings, startLoop])

  React.useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    },
    []
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLUListElement>) => {
      const list = listRef.current
      if (!list) return
      const rect = list.getBoundingClientRect()
      const pointerY = e.clientY - rect.top
      const ease = FALLOFF_CURVES[falloff]
      const items = itemRefs.current
      for (let i = 0; i < items.length; i++) {
        const el = items[i]
        if (!el) continue
        const center = el.offsetTop + el.offsetHeight / 2
        const distance = Math.abs(pointerY - center)
        targetsRef.current[i] = ease(Math.max(0, 1 - distance / proximityRadius))
      }
      startLoop()
    },
    [startLoop]
  )

  const handlePointerLeave = React.useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0)
    startLoop()
  }, [startLoop])

  const jumpTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    history.replaceState(null, "", `#${id}`)
    setActiveId(id)
  }

  if (headings.length === 0) return null

  return (
    <nav
      aria-label="On this page"
      className={["line-toc", className].filter(Boolean).join(" ")}
      style={
        {
          "--accent-color": "var(--accent)",
          "--text-color": "var(--muted)",
          "--marker-color": "var(--border)",
        } as CSSProperties
      }
    >
      <div className="line-toc__label">On this page</div>
      <ul
        ref={listRef}
        className="line-toc__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {headings.map((h, i) => (
          <li
            key={h.id}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className={["line-toc__item", h.level === 3 ? "line-toc__item--sub" : ""].filter(Boolean).join(" ")}
            aria-current={activeId === h.id ? "true" : undefined}
          >
            <span className="line-toc__marker" aria-hidden="true" />
            <a href={`#${h.id}`} onClick={jumpTo(h.id)} className="line-toc__link">
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
