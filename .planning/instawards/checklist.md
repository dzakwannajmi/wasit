# Deliverables checklist

Status as of 2026-09-01. Source: `WASIT_SOW.docx` (accepted, funded 28 Aug
2026). Ratings are Present, Partial, or Missing — a deliverable is only
Present when every one of its evidence items in the SOW's own Evidence-of-
Completion table is satisfied.

## Deliverable 1 — x402 Protocol Compliance Validator (CLI) + CHECKS.md

| Evidence item (per SOW) | Status | Note |
|---|---|---|
| Public GitHub repo link | Present | github.com/dzakwannajmi/wasit |
| Published CHECKS.md, each check mapped to a spec clause + SDK version | Present | All 7 x402 checks (`X402-01`–`07`) documented in `docs/CHECKS.md` |
| Terminal recording / GIF of the validator running against a sample service | Missing | Not recorded yet |

**Verdict: Partial.** The validator itself works and is documented; the recording is the only gap.

## Deliverable 2 — MPP Charge and Channel Flow Simulator

| Evidence item (per SOW) | Status | Note |
|---|---|---|
| Captured MPP Charge and Channel test report output, including negative conformance results | Present | `MPP-01` (charge) and `MPP-10`/`11`/`12`/`13`/`14` (channel) implemented and verified; negative checks (`MPP-12`, `MPP-14`) confirmed rejecting as required |
| Short findings document reporting results in aggregate across real projects | Missing | `docs/findings/upstream-sdk.md` documents two upstream SDK defects found while building this deliverable, but that is not the aggregate results doc the SOW describes |
| At least one third-party ecosystem service tested with the operator's explicit authorization | Missing | Two outreach issues sent (yripper/stellarpay, Stellar-Light/stellar-pay) proposing operators self-test with Wasit against their own service; neither has run it or replied yet as of this date. RouteDock issue #206 also open, no reply |

**Verdict: Partial.** The simulator itself is done and correct; what's open is entirely the third-party validation requirement, which depends on someone else acting.

## Deliverable 3 — MCP Server wrapper (marked optional in the SOW, built anyway)

| Evidence item (per SOW) | Status | Note |
|---|---|---|
| MCP config | Present | `docs/guides/mcp.md` documents Claude Code and Claude Desktop setup against the published `@wasit-dev/server` npm package |
| Screen recording showing a check triggered from Claude Code via the MCP server | Missing | Not recorded yet |

**Verdict: Partial.** Went beyond the SOW's "optional" bar by also publishing to npm; the recording is the only gap.

## Overall — Completion summary doc

One-page plain-language summary plus a two-minute walkthrough video, meant as the primary artifact for the Chapter Lead's review. **Not started.**

## SOW Verification Checklist (Table 7 equivalent)

| Deliverable | Evidence Present | Evidence Partial | Evidence Missing | Comments |
|---|---|---|---|---|
| Deliverable 1 | | X | | Repo + CHECKS.md done; recording outstanding |
| Deliverable 2 | | X | | Implementation done; third-party authorized run outstanding |
| Deliverable 3 | | X | | Built + published to npm, beyond scope; recording outstanding |

## What's actually blocking full completion

Two things, and they're different in kind. The recordings (Deliverable 1, 3) and the completion summary video are entirely in our own control — no external dependency, just needs to be scheduled and done. The third-party authorized run (Deliverable 2) depends on someone else acting on an outreach message we don't control the timing of; if no operator responds before this needs to close out, the fallback is a self-hosted reference service run under our own explicit authorization, which the SOW allows as the non-third-party validations ("the remainder self-hosted reference services built from the official SDKs").
