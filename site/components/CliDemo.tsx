"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import "./CliDemo.css"

type ResultLine = {
  status: "PASS" | "FAIL"
  id: string
  name: string
  detail: string
  negative?: boolean
}

// Command and check IDs/detail text are pulled straight from the real
// implementation (packages/core/src/x402/simulator.ts and the CLI's
// own reporter, packages/cli/src/index.ts `report()`), not invented
// marketing copy — this is what `wasit test` actually prints against a
// service that passes every check. X402-07 is the one negative check
// in this run: it PASSES precisely because the target correctly
// rejected a corrupted payment signature, which is the "reject" path
// this animation exists to make visible instead of leaving as prose.
const COMMAND = "wasit test --target https://api.example.com/paid-endpoint"

const RESULTS: ResultLine[] = [
  {
    status: "PASS",
    id: "X402-01",
    name: "402 Response Status",
    detail: "Server responded with 402 as required.",
  },
  {
    status: "PASS",
    id: "X402-02",
    name: "Payment Header Present",
    detail: "Payment header found.",
  },
  {
    status: "PASS",
    id: "X402-03",
    name: "Header Payload Decodable",
    detail: "Header decoded to valid JSON.",
  },
  {
    status: "PASS",
    id: "X402-04",
    name: "Required Fields Present",
    detail: "All required v2 fields present.",
  },
  {
    status: "PASS",
    id: "X402-05",
    name: "Network Identifier Valid",
    detail: 'Network identifier "stellar:testnet" is valid.',
  },
  {
    status: "PASS",
    id: "X402-06",
    name: "Signature Resubmit Accepted",
    detail: "Valid payment accepted (HTTP 200).",
  },
  {
    status: "PASS",
    id: "X402-07",
    name: "Invalid Signature Rejected",
    detail: "Corrupted payment correctly rejected (HTTP 402).",
    negative: true,
  },
]

const SUMMARY = `${RESULTS.length} passed.`

type Line =
  | { kind: "status"; result: ResultLine }
  | { kind: "detail"; text: string }
  | { kind: "blank" }
  | { kind: "summary"; text: string }

const LINES: Line[] = RESULTS.flatMap((result): Line[] => [
  { kind: "status", result },
  { kind: "detail", text: result.detail },
  { kind: "blank" },
]).concat([{ kind: "summary", text: SUMMARY }])

const TYPE_MS = 28 // per character, command line
const LINE_MS = 130 // per revealed output line
const HOLD_MS = 2600 // pause once the run finishes, before clearing
const RESET_PAUSE_MS = 500 // pause on an empty prompt before retyping

/**
 * Ambient, looping recreation of a real `wasit test` run, typed and
 * streamed line by line instead of dropped in as static text. The
 * hero's .cmdbox above this (unchanged) already shows the copy-
 * pasteable install command; this continues from it to show what
 * actually comes back — including the one negative check (X402-07)
 * that only passes because the target's rejection worked.
 *
 * Initial render (server and pre-hydration client) shows the finished,
 * complete output with no motion at all — deterministic, so there is
 * no hydration mismatch, and it doubles as the correct fallback for a
 * prefers-reduced-motion reader or a crawler: the mount effect below
 * only clears and starts the type/stream loop when the browser does
 * NOT report a reduced-motion preference; otherwise the static final
 * state (this initial render) is simply left as-is, forever.
 */
export function CliDemo() {
  const [typed, setTyped] = useState(COMMAND)
  const [revealed, setRevealed] = useState(LINES.length)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const schedule = (fn: () => void, ms: number) => {
      timer = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
    }

    function typeCommand(index: number) {
      setTyped(COMMAND.slice(0, index))
      if (index < COMMAND.length) {
        schedule(() => typeCommand(index + 1), TYPE_MS)
      } else {
        schedule(() => revealLine(0), 320)
      }
    }

    function revealLine(index: number) {
      setRevealed(index + 1)
      if (index + 1 < LINES.length) {
        const justRevealedBlank = LINES[index].kind === "blank"
        schedule(() => revealLine(index + 1), justRevealedBlank ? 70 : LINE_MS)
      } else {
        schedule(resetRun, HOLD_MS)
      }
    }

    function resetRun() {
      setTyped("")
      setRevealed(0)
      schedule(() => typeCommand(0), RESET_PAUSE_MS)
    }

    // The reset (clearing typed/revealed back to empty) is deferred into
    // this scheduled callback rather than called synchronously here, so
    // the effect body itself never calls setState directly — same
    // exception pattern as docs-toc.tsx/mermaid-diagram.tsx/use-mobile.ts
    // (see eslint.config.mjs history): a setState from inside an
    // already-async callback is not what react-hooks/set-state-in-effect
    // is guarding against.
    schedule(resetRun, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const node = outputRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [revealed])

  const visibleLines = useMemo(() => LINES.slice(0, revealed), [revealed])
  const showCursor = typed.length < COMMAND.length

  return (
    <div
      className="cli-demo"
      role="img"
      aria-label="Example wasit test run against a paid endpoint: all seven x402 checks pass, including a check that a forged payment signature is correctly rejected with HTTP 402."
    >
      <div className="cli-demo-prompt mono" aria-hidden="true">
        <span className="cli-demo-prompt-glyph">$</span> {typed}
        {showCursor && <span className="cli-demo-cursor" />}
      </div>
      <div className="cli-demo-output mono" ref={outputRef} aria-hidden="true">
        {visibleLines.map((line, i) => {
          if (line.kind === "blank") {
            return <div key={i} className="cli-demo-blank" />
          }
          if (line.kind === "summary") {
            return (
              <div key={i} className="cli-demo-summary">
                {line.text}
              </div>
            )
          }
          if (line.kind === "detail") {
            return (
              <div key={i} className="cli-demo-detail">
                {line.text}
              </div>
            )
          }
          const { result } = line
          return (
            <div key={i} className="cli-demo-status">
              <span className={`cli-demo-badge cli-demo-badge--${result.status.toLowerCase()}`}>
                {result.status}
              </span>
              <span className="cli-demo-id">{result.id}</span>
              <span className="cli-demo-name">{result.name}</span>
              {result.negative && <span className="cli-demo-negative">reject test</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
