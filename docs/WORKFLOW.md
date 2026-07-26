# Development Workflow

How Najmi and Claude work together on this repo. Read this first if
context feels lost or a new session starts mid-project.

## 1. Per-feature loop

1. **Plan** — confirm which check(s) from `docs/CHECKS.md` this step
   implements. If it's a new check not yet catalogued, add it to
   `CHECKS.md` first (with spec reference) before writing code.
2. **Write** — Claude gives copy-paste terminal commands (heredoc/sed),
   never runs code in its own sandbox for this project.
3. **Run** — Najmi runs the command(s) locally, pastes back the real
   terminal output (or a screenshot if it's an editor error).
4. **Diagnose from real output only** — Claude never guesses whether
   something works; it waits for actual output/errors before claiming
   success.
5. **Fix and repeat** until the step is green.
6. **Commit** at each working milestone (not every single edit) —
   small enough to be a meaningful checkpoint, big enough to not spam
   history.

## 2. File organization rules

- Production code only in `src/`. Anything test/scratch goes in
  `test/`, split by kind (`test/fixtures/` for mock servers,
  `test/manual/` for run-it-yourself scripts, `test/unit/` for
  automated tests once those exist).
- Once a manual test has served its purpose, delete it or reduce it
  to the minimal final version — don't let scratch files pile up and
  confuse a reviewer about which one is current.
- Any secret, private key, or environment-specific address goes in
  `.env` and is read via `process.env`, never hardcoded in source.
  Pure protocol config (price, route path, network name) can stay as
  code constants — it's not sensitive.
- `.env` is always in `.gitignore`. Check this before every commit
  that touches config.

## 3. Escalating to Opus

Claude asks for a second opinion (produces a ready-to-paste prompt for
Opus, doesn't just push forward) when:
- The same error persists after 2 genuine fix attempts, or
- A design/architecture decision is ambiguous enough that guessing
  wrong would cost significant rework, or
- Claude is reasoning from an assumption about a package's API it
  hasn't actually verified (prefer checking via Raven first; escalate
  to Opus only if Raven doesn't resolve it either).

## 4. Turn budget

Every 20 conversation turns (counted from the start of active coding,
Fase 2 onward), Claude flags this explicitly, saves current progress
to memory, and prepares a continuation prompt so a fresh conversation
can pick up without re-reading the whole history.

## 5. Current phase tracker

Update this section as we move through the SOW's weekly plan — keep
it short, it's a pointer, not a log.

- [x] Fase 0 — monorepo scaffold, npm workspaces
- [x] Fase 1 — initial `CHECKS.md`
- [x] Fase 2 (partial) — x402 checks X402-01–X402-07 in `packages/core`, tested against a real facilitator
- [ ] `packages/cli` — wire `wasit test` command to the core checks
- [ ] `packages/core/src/mpp/` — MPP Charge (MPP-01) in progress; Channel checks (MPP-10..13) pending
- [ ] `packages/server` — MCP tool wrappers
