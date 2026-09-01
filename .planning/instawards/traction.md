# Outreach / traction log

Tracks every candidate contacted or considered for third-party validation
(Deliverable 2's outstanding evidence item), so this can be pasted directly
into the next SOW's traction section instead of reconstructed from GitHub
history. Update the status column as replies come in — don't rewrite the row,
just change the status and note.

## Contacted

| Candidate | What they run | Link | Status as of 2026-09-01 |
|---|---|---|---|
| RouteDock (winsznx/routedock) | MPP Charge (provider-a) and MPP Channel (provider-b), live on Cloudflare Workers | github.com/winsznx/routedock/issues/206 | Comment asking explicit permission to run non-destructive checks (`MPP-01`, `MPP-10`/`11`/`12`/`14`) posted; no reply yet. Note: issue #206 itself was an earlier upstream-SDK bug report unrelated to this ask — PR #241 fixed that separately and independently confirmed both upstream findings, which is evidence for the upstream report, not for this deliverable |
| yripper/stellarpay | x402 + MPP charge + MPP channel in one SDK, live demo on Railway | github.com/yripper/stellarpay | Self-test outreach issue sent; confirmed sent, issue number and reply status not yet re-verified |
| Stellar-Light/stellar-pay | x402 + MPP charge, live sandbox on Fly.io | github.com/Stellar-Light/stellar-pay/issues/3 | Self-test outreach issue sent, confirmed open, no reply yet |

## Candidates identified, not yet contacted

| Candidate | Why it's a fit | Link |
|---|---|---|
| Blockchain-Oracle/xlmtools | Stellar-native MCP server, 21 pay-per-call tools, uses `@stellar/mpp` (charge) and `mppx` in production, hosted live at api.xlmtools.com | github.com/Blockchain-Oracle/xlmtools |
| TKCollective/x402-research-skill | Stellar path already built but not yet mounted to a live route | github.com/TKCollective/x402-research-skill |

## Deprioritized (checked, not a good fit)

alienworld1/rever-ai mentions x402/MPP and lists `@stellar/mpp` as a dependency but has no substantive protocol handler code and no live endpoint — likely still prototype-stage. HuydZzz/agentforge returned 404, repo gone. ACTA-Team/brazil-regional-kit mentions x402 only as a listed feature with no clear implementation. mpprouter/rozo-mpprouter implements a custom Stellar payment flow that isn't actually the MPP spec, so running Wasit against it would just fail without being useful evidence either way.

## Next action

Follow up or send outreach to the two not-yet-contacted candidates above, and re-check the three open threads before the next SOW update — if none has converted to an actual run by then, fall back to a self-hosted reference service run under our own authorization, which the SOW explicitly allows as a substitute for the third-party requirement.
