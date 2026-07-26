# Wasit Check Catalogue

Every check below MUST reference a spec clause. If a check cannot be traced
back to a written clause of the spec, it is out of scope for Wasit by
construction.

Spec baseline in effect: x402 v2 (per latest commit of
`stellar/x402-stellar`, as of 2026-07-25). This version MUST be recorded
in every test report.

## x402

| ID | Check Name | Spec Reference | What It Checks | Pass Criteria |
|---|---|---|---|---|
| `X402-01` | 402 Response Status | x402 spec, HTTP semantics | An unpaid request must be answered with status code `402` | Response status is exactly `402`, not `401`/`403`/other |
| `X402-02` | Payment Header Present | x402 built-on-stellar guide | The 402 response must include a payment header | Either `PAYMENT-REQUIRED` or `X-Payment` header is present (both are checked — the spec itself is not yet consistent, see note in README) |
| `X402-03` | Header Payload Decodable | x402 spec §payment-required-object | The header value must be valid base64 that decodes to JSON | `atob()` + `JSON.parse()` succeed without error |
| `X402-04` | Required Fields Present | x402 spec §payment-required-object | The payload must include the core fields | `price`/`amount`, `network`, `payTo` are all present and non-empty |
| `X402-05` | Network Identifier Valid | x402 built-on-stellar guide | Network id format follows CAIP-2 | Matches the pattern `stellar:testnet` or `stellar:pubnet` |
| `X402-06` | Signature Resubmit Accepted | x402 spec §payment-flow | A resubmitted request with a valid signature must be accepted | Response is no longer 402; returns 2xx with the original resource |
| `X402-07` | Invalid Signature Rejected *(negative)* | x402 spec §payment-flow | A deliberately malformed signature must be REJECTED | Server still responds 402/4xx, not a false accept |

## MPP — Charge Mode

| ID | Check Name | Spec Reference | What It Checks | Pass Criteria |
|---|---|---|---|---|
| `MPP-01` | Charge Settlement On-Chain | MPP Charge Guide | The charge transaction actually settles on Stellar | Horizon lookup of the tx referenced in the `Payment-Receipt` response header confirms a successful transaction with the correct amount. Verified against `@stellar/mpp@0.7.1` — mode `"pull"` (default): `onProgress` only fires through `"signed"`, the settled tx reference comes from `Payment-Receipt`, not `onProgress`. |

## MPP — Channel Mode

| ID | Check Name | Spec Reference | What It Checks | Pass Criteria |
|---|---|---|---|---|
| `MPP-10` | Channel Deploy | MPP Channel Guide | The channel contract deploys correctly | Contract address is valid and its state is queryable |
| `MPP-11` | Cumulative Commitment Ordering | MPP Channel Guide §closing-the-channel | Each new commitment must exceed the previous one | Server rejects any commitment <= the last accepted one |
| `MPP-12` | Replay Rejection *(negative)* | MPP Channel Guide §closing-the-channel | A replayed commitment must be rejected | Server rejects, not accepts — testnet-only by default |
| `MPP-13` | Close Settlement | MPP Channel Guide §closing-the-channel | Closing with the highest commitment settles correctly | RPC verifies the final balance matches the last commitment |

---

**Status note:** this is an initial draft (Week 1). `MPP-*` checks will
be expanded in Week 2. `X402-02` deliberately checks both header names
because Stellar's own official documentation is not yet internally
consistent (`PAYMENT-REQUIRED` vs `X-Payment`) — see the problem
statement in the SOW.
