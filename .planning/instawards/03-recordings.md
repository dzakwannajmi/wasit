# Job 03 — Recordings

Status: ⬜ **TODO** · Deliverable: **D1 + D3 + Overall** (evidence) ·
Depends on: #1 (npm publish, so the recordings show the real published
packages, not a local checkout)

## Goal
Produce the three recordings the SOW lists as evidence, all still missing.

## Required recordings

1. **D1 — x402 validator terminal recording / GIF.** Shows `wasit test
   <target>` running against a sample service and producing a pass/fail
   report. Can reuse `docs/evidence/2026-08-15-third-party-run.md`'s targets
   or a fresh run against a self-hosted reference service.
2. **D3 — MCP screen recording.** Shows a compliance check triggered
   directly from Claude Code via the MCP server (`docs/guides/mcp.md` has
   the exact `claude mcp add` command to set this up first).
3. **Overall — two-minute walkthrough video.** Plain-language summary of
   what Wasit is and does, feeding into the one-page completion summary in
   Job 04. This is the primary artifact the Chapter Lead reviews.

## Acceptance criteria
- [ ] D1 recording made, hosted somewhere linkable (GitHub, YouTube, Loom).
- [ ] D3 recording made, same.
- [ ] Overall walkthrough video made, under ~2 minutes as the SOW specifies.
- [ ] All three links recorded here and carried into `04-evidence-submission.md`.

## Notes
Use the already-published `@wasit-dev/cli` / `@wasit-dev/server` (via `npx`)
in the recordings rather than a local build — that's what a real user
installs, and it doubles as another live confirmation the npm packages work
end to end. Keep each recording short and focused on one thing; three short
clips are easier to review than one long one.

## Result
Not started.
