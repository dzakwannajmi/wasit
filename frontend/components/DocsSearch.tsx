"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type SearchEntry = { title: string; group: string; url: string; content: string }
type Hit = { entry: SearchEntry; score: number; excerpt: string }

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="7" cy="7" r="5.25" />
      <path d="M11 11l3.5 3.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Scores one index entry against a query with no external search
 * library — the whole docs set is a few dozen short pages, so a plain
 * substring/occurrence scorer is enough and ships with zero added
 * dependencies. Title matches (exact > prefix > substring) outweigh
 * group-name and body matches; body occurrences are capped so one
 * word repeated fifty times in a long page can't out-rank an exact
 * title hit elsewhere. Returns null for a non-match rather than a
 * zero score, so callers can filter with a plain truthy check.
 */
function scoreEntry(entry: SearchEntry, query: string): Hit | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  const title = entry.title.toLowerCase()
  const group = entry.group.toLowerCase()
  const content = entry.content.toLowerCase()

  let score = 0
  if (title === q) score += 100
  else if (title.startsWith(q)) score += 60
  else if (title.includes(q)) score += 40
  if (group.includes(q)) score += 10

  const firstIndex = content.indexOf(q)
  if (firstIndex !== -1) {
    let occurrences = 0
    let pos = firstIndex
    while (pos !== -1 && occurrences < 10) {
      occurrences++
      pos = content.indexOf(q, pos + q.length)
    }
    score += Math.min(occurrences * 3, 24)
  }

  if (score === 0) return null

  let excerpt = entry.content.slice(0, 140).trim()
  if (firstIndex !== -1) {
    const start = Math.max(0, firstIndex - 50)
    const end = Math.min(entry.content.length, firstIndex + q.length + 70)
    excerpt =
      (start > 0 ? "…" : "") + entry.content.slice(start, end).trim() + (end < entry.content.length ? "…" : "")
  }

  return { entry, score, excerpt }
}

/**
 * Owns only the toggle/index-loading/keyboard-shortcut state. Query and
 * the active result index live in <SearchPanel> instead, which only
 * exists in the tree while `open` is true — mounting it fresh each open
 * is how it starts blank, rather than an effect resetting old state
 * (avoids react-hooks/set-state-in-effect: setState calls belong in
 * event handlers, not synchronously in an effect body).
 */
export function DocsSearch() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState<SearchEntry[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  // Global ⌘K / Ctrl+K toggle + Escape close, active on every page (not
  // just while the panel is open) so it behaves like a real command
  // palette rather than something you can only reach by clicking.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Lazy-load the index on first open rather than on every page load —
  // it's small, but there's no reason to fetch it for visitors who
  // never touch search. setIndex/setLoadError run inside the fetch's
  // async callbacks, not synchronously in the effect body, so this is
  // the supported pattern.
  useEffect(() => {
    if (!open || index || loadError) return
    let cancelled = false
    fetch("/docs/search-index")
      .then((res) => {
        if (!res.ok) throw new Error(`search index ${res.status}`)
        return res.json() as Promise<SearchEntry[]>
      })
      .then((data) => {
        if (!cancelled) setIndex(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, index, loadError])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <button type="button" className="nav-search" onClick={() => setOpen(true)} aria-label="Search docs">
        <SearchIcon />
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>

      {open && <SearchPanel index={index} loadError={loadError} onClose={() => setOpen(false)} />}
    </>
  )
}

function SearchPanel({
  index,
  loadError,
  onClose,
}: {
  index: SearchEntry[] | null
  loadError: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo<Hit[]>(() => {
    if (!index || !query.trim()) return []
    return index
      .map((entry) => scoreEntry(entry, query))
      .filter((hit): hit is Hit => hit !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [index, query])

  function handleQueryChange(value: string) {
    setQuery(value)
    setActiveIndex(0)
  }

  function go(url: string) {
    onClose()
    router.push(url)
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === "Enter" && results[activeIndex]) {
                go(results[activeIndex].entry.url)
              }
            }}
            placeholder="Search docs..."
            aria-label="Search documentation"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="search-esc">Esc</kbd>
        </div>

        <div className="search-results">
          {loadError && <p className="search-empty">Couldn&apos;t load the search index. Try reloading the page.</p>}
          {!loadError && !index && <p className="search-empty">Loading…</p>}
          {!loadError && index && !query.trim() && (
            <p className="search-empty">Type to search {index.length} docs pages.</p>
          )}
          {!loadError && index && query.trim() && results.length === 0 && (
            <p className="search-empty">No results for &ldquo;{query}&rdquo;.</p>
          )}
          {results.map((hit, i) => (
            <Link
              key={hit.entry.url}
              href={hit.entry.url}
              className={`search-result${i === activeIndex ? " is-active" : ""}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={onClose}
            >
              <span className="search-result-group">{hit.entry.group}</span>
              <span className="search-result-title">{hit.entry.title}</span>
              <span className="search-result-excerpt">{hit.excerpt}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
