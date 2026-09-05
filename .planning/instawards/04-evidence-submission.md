# Job 04 — Evidence Submission Package

Status: ⬜ **TODO** (template below, partially fillable already) ·
Depends on: #1, #2, #3

## Goal
Compile everything into one document the Chapter Lead (Kenny) can review and
submit, mapping every SOW evidence item to live, verifiable proof — the same
role `EVIDENCE-SUBMISSION.md` plays in the reference layout this job board
was modeled on.

## Acceptance criteria
- [ ] Every row below has a real link, not a placeholder.
- [ ] All links checked live in the same session the doc is finalized.
- [ ] Any SOW deviation (there are none identified so far, unlike hosting-provider
      changes some other projects had) is called out explicitly if one turns up.
- [ ] Handed to Kenny for submission.

## Template (fill in as Jobs 1–3 close out)

### Deliverable 1 — x402 Protocol Compliance Validator (CLI) + CHECKS.md

| Evidence (per SOW) | Proof |
|---|---|
| Public GitHub repo | https://github.com/wasit-dev/wasit |
| Published CHECKS.md | https://github.com/wasit-dev/wasit/blob/main/docs/CHECKS.md |
| npm package | https://www.npmjs.com/package/@wasit-dev/cli |
| Terminal recording / GIF | _pending — Job 03_ |

### Deliverable 2 — MPP Charge and Channel Flow Simulator

| Evidence (per SOW) | Proof |
|---|---|
| Terminal output, incl. negative conformance results | https://github.com/wasit-dev/wasit/blob/main/docs/evidence/2026-09-05-full-settlement-run.md (self-hosted fixtures, real testnet settlement, incl. X402-07's negative/rejected-signature result) — **link is dead until the commit adding that file is pushed to `main`; verify it resolves before submitting** |
| Written findings document (aggregate, ≥3 real projects) | _pending — Job 02_ |
| ≥1 third-party service tested with explicit authorization | _pending — Job 02. Note the SOW's fallback covers "the remainder self-hosted reference services" — the remainder **after** a third-party run, not a replacement for it. The 2026-09-05 self-hosted run demonstrates that fallback works, and does not satisfy this row. If Job 02 does not convert, say so plainly in the completion summary rather than presenting the self-hosted run as meeting this line._ |

### Deliverable 3 — MCP Server wrapper

| Evidence (per SOW) | Proof |
|---|---|
| npm package | https://www.npmjs.com/package/@wasit-dev/server |
| MCP config | https://github.com/wasit-dev/wasit/blob/main/docs/guides/mcp.md |
| Screen recording (check triggered from Claude Code via MCP) | _pending — Job 03_ |

### Overall

| Evidence (per SOW) | Proof |
|---|---|
| Live website | https://usewasit.dev |
| One-page completion summary | _pending — write once Jobs 1–3 are closed_ |
| Two-minute walkthrough video | _pending — Job 03_ |

### Upstream contributions (supporting evidence, not a SOW line item)

| What | Proof |
|---|---|
| Upstream SDK defect report #1 | https://github.com/stellar/stellar-mpp-sdk/issues/66 |
| Upstream SDK defect report #2 | https://github.com/stellar/stellar-mpp-sdk/issues/67 |
| Upstream finding independently confirmed by a downstream project | RouteDock PR #241 (github.com/winsznx/routedock/pull/241) — **not** the D2 third-party-authorization item: RouteDock was tested without contacting its operator (see `docs/evidence/2026-08-15-third-party-run.md`) |

## Result
Not started — waiting on Jobs 2 and 3. Partial progress 2026-09-05: the D2
terminal-output evidence item now has a real link (full payment-settlement
run against self-hosted fixtures, see `docs/evidence/2026-09-05-full-settlement-run.md`).
The third-party-authorization item is unaffected by this and still depends on
Job 2.
