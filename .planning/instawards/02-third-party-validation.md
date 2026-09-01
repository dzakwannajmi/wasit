# Job 02 — Third-Party Validation

Status: 🟡 **IN PROGRESS** · Deliverable: **D2**'s open evidence item —
"at least one third-party ecosystem service tested with the operator's
explicit authorization"

## Goal
Get at least one team actively building x402/MPP on Stellar to either run
Wasit against their own service themselves, or explicitly authorize Wasit
being run against it, and capture the result.

## Model
Find developers actively integrating x402/MPP and suggest **they** run Wasit
against their **own** service. Self-testing needs no permission from anyone;
testing someone else's live service does. This avoids needing to chase
authorization for every candidate found.

## Acceptance criteria
- [ ] At least one third-party service has an actual Wasit run against it, with the operator's explicit authorization (self-test counts).
- [ ] Result captured as terminal output / report, named only with the operator's permission.
- [ ] Findings folded into a written aggregate document (see Job 04).

## Contacted

| Candidate | What they run | Link | Status as of 2026-09-01 |
|---|---|---|---|
| RouteDock (winsznx/routedock) | MPP Charge (provider-a) and MPP Channel (provider-b), live on Cloudflare Workers | github.com/winsznx/routedock/issues/206 | Comment asking explicit permission for non-destructive checks posted; no reply. Note: issue #206 itself is a separate, earlier upstream-SDK bug report (fixed by PR #241) — evidence for the upstream findings, not for this job |
| yripper/stellarpay | x402 + MPP charge + MPP channel in one SDK, live demo on Railway | github.com/yripper/stellarpay | Self-test outreach issue sent; confirmed sent, issue number and reply status not re-verified this session |
| Stellar-Light/stellar-pay | x402 + MPP charge, live sandbox on Fly.io | github.com/Stellar-Light/stellar-pay/issues/3 | Self-test outreach issue sent, confirmed open, no reply yet |

## Candidates identified, not yet contacted

| Candidate | Why it's a fit | Link |
|---|---|---|
| Blockchain-Oracle/xlmtools | Stellar-native MCP server, 21 pay-per-call tools, uses `@stellar/mpp` + `mppx` in production, hosted live at api.xlmtools.com | github.com/Blockchain-Oracle/xlmtools |
| TKCollective/x402-research-skill | Stellar path already built, not yet mounted to a live route | github.com/TKCollective/x402-research-skill |

## Deprioritized (checked, not a good fit)

alienworld1/rever-ai mentions x402/MPP and lists `@stellar/mpp` as a
dependency but has no substantive protocol handler code and no live
endpoint. HuydZzz/agentforge returned 404, repo gone.
ACTA-Team/brazil-regional-kit mentions x402 only as a listed feature with no
clear implementation. mpprouter/rozo-mpprouter implements a custom Stellar
payment flow that isn't actually the MPP spec, so running Wasit against it
wouldn't produce useful evidence either way.

## Fallback if nothing converts in time

The SOW explicitly allows a substitute: "the remainder self-hosted reference
services built from the official SDKs." If no outreach candidate has run
Wasit or replied by the time evidence needs to close out, stand up a
self-hosted reference service and run Wasit against it under our own
authorization — not as strong as independent third-party validation, but it
satisfies the letter of the requirement and keeps the timeline moving.

## Next action
Send outreach to the two not-yet-contacted candidates above; re-check the
three open threads before Job 04 starts; if none has converted by then,
trigger the fallback.
