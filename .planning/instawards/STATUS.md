# Wasit Instawards — Master Status

> **READ THIS FIRST** at the start of every chat about the Instaward. Single
> source of truth for the engagement. Update it at the END of every chat.

Last updated: 2026-09-01 (npm publish done for all three packages; server
patched to 0.1.1 to fix the checks resource on npm-only installs; MCP setup
docs written; this job board created)

---

## What this is

Instawards is a Stellar Community Fund grant ($3,600 in XLM) for Wasit, an
open-source x402/MPP conformance tester for Stellar. The SOW is **accepted
and funded** (funds received 28 Aug 2026). Kenny (Chapter Lead) said the work
is not strictly bound to a 30-day window — maximize first, reconcile the SOW
to match what's actually built. This folder tracks what's left to *close out*
the Instaward and submit evidence.

Working style: **one chat = one job.** Each job has its own file here. At the
end of a chat touching a job, write the result into that file and update the
table below.

---

## Key facts & decisions (don't re-derive these)

| Thing | Value |
|---|---|
| Builder | Muhammad Dzakwan Najmi (repmoonasci@gmail.com) |
| Website | https://usewasit.dev |
| Ambassador Chapter | Stellar Chapter Ambassador Indonesia — Lead: Kenny Rivaldi |
| GitHub repo | https://github.com/wasit-dev/wasit (public) |
| SOW submitted / sprint start (draft text) | 29 Jul 2026 / 1 Aug 2026 — actual effective date is 28 Aug 2026 (funds received), day-count runs from there |
| npm org | `@wasit-dev` (created this engagement; `wasit` alone was unavailable) |
| Published packages | `@wasit-dev/core@0.1.0`, `@wasit-dev/cli@0.1.0`, `@wasit-dev/server@0.1.1` |
| Network | Stellar Testnet only (mainnet out of scope) |
| Repo layout | `packages/core` (check suites) · `packages/cli` (`wasit` command) · `packages/server` (`wasit-mcp` / MCP tools) |

---

## SOW deliverables (binding)

- **D1 — x402 CLI + CHECKS.md:** validator covering the full x402 flow, published check catalogue mapping every check to a spec clause. Evidence: repo link, CHECKS.md, terminal recording/GIF.
- **D2 — MPP Charge + Channel Simulator:** both payment modes, including negative conformance checks. Evidence: terminal output, written findings doc, **at least one third-party service tested with the operator's explicit authorization**.
- **D3 — MCP Server wrapper (marked optional, built anyway):** same checks callable as MCP tools from Claude Code or another agent. Evidence: MCP config, screen recording of a check triggered via MCP.
- **Overall:** one-page completion summary + two-minute walkthrough video, the primary artifact for the Chapter Lead's review.

---

## Job board

| # | Job | File | Status | Depends on |
|---|---|---|---|---|
| 0 | Repo foundation — CLI, CHECKS.md, MPP suite, MCP server, upstream SDK reports | `00-foundation.md` | ✅ **DONE** | — |
| 1 | Publish npm packages under `@wasit-dev` | `01-npm-publish.md` | ✅ **DONE** (core/cli 0.1.0, server 0.1.1) | #0 |
| 2 | Third-party validation (D2's open evidence item) | `02-third-party-validation.md` | 🟡 **IN PROGRESS** — outreach sent, no confirmed run yet | #0 |
| 3 | Recordings — D1 terminal GIF, D3 MCP screen recording, overall walkthrough video | `03-recordings.md` | ⬜ **TODO** | #1 |
| 4 | Evidence submission package | `04-evidence-submission.md` | ⬜ **TODO** (template ready, most links already fillable) | #1, #2, #3 |

Recommended order from here: **3 (recordings) → 2 keeps running in the background (depends on someone else replying) → 4 (evidence) once 3 is done and 2 has either converted or been substituted with a self-hosted run.**

---

## Open decisions needing the user

- If no outreach candidate (Job 2) confirms a run before evidence needs to be submitted, the SOW's own fallback applies: "the remainder self-hosted reference services built from the official SDKs" — decide whether to wait longer or run that fallback now.
- Demo video style/length and who's on camera (voice-over vs. silent screen capture) — not yet decided.

---

## Session log

| Date | Chat focus | Outcome |
|---|---|---|
| 2026-09-01 | npm publish + planning folder setup | Full npm-publish troubleshooting chain resolved (missing install, build order, 2FA, org scope, stale symlinks) — all three packages published live under `@wasit-dev`. Wrote `CHANGELOG.md`, rewrote `docs/guides/mcp.md` with concrete Claude Code (`claude mcp add`) and Claude Desktop (`claude_desktop_config.json`) steps verified against current docs. Found `wasit://checks` silently fails to resolve on an `npx`-only install (no local `docs/` present) — fixed by bundling `docs/CHECKS.md` into `packages/server` via a `prepack` script, published as `@wasit-dev/server@0.1.1`. Restructured this folder from a flat checklist into the job-board format below, modeled on a reference layout the user pointed to (orbit-protocol's `.planning/instawards/`). |
