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

Verified against `@stellar/mpp@0.7.1`, `mppx@0.8.14`, `@stellar/stellar-sdk@16.1.0`.

| ID | Check Name | Destructive | Spec Reference | What It Checks | Pass Criteria |
|---|---|---|---|---|---|
| `MPP-10` | Channel Deploy | no | MPP Channel Guide | The channel contract deploys correctly | Contract address is valid and its state is queryable via `getChannelState()`, matching the parameters it was opened with |
| `MPP-11` | Cumulative Commitment Ordering | no | MPP Channel Guide §closing-the-channel; `@stellar/mpp` channel server (`cumulativeMonotonicityError`) | Both ordering rules: a commitment must exceed the stored cumulative, and must cover the price of the current request | Two probes, each rejected with HTTP 402: one committing exactly the stored cumulative, one advancing but falling short of `cumulative + price`. Each probe uses a **fresh challenge**, so the earlier-running challenge replay guard cannot fire and be mistaken for ordering enforcement. The second probe is reported as not-probed when the price is 1 base unit, since it collapses into the first. |
| `MPP-12` | Challenge Replay Rejection *(negative)* | no | MPP Channel Guide §closing-the-channel; `@stellar/mpp` channel server (atomic compare-and-set on challenge ID) | A byte-identical credential resubmitted against the same challenge must be rejected | HTTP 402 on the second submission. Isolation: the replayed credential is identical to one the server accepted moments earlier, so its signature and amount are already proven valid and only the challenge-ID claim can explain the rejection. |
| `MPP-14` | Commitment Replay Rejection *(negative)* | no | MPP Channel Guide §closing-the-channel; `@stellar/mpp` channel server (`cumulativeMonotonicityError`) | A captured `(amount, signature)` pair must not be redeemable against a **new** challenge | HTTP 402 when a previously accepted commitment is re-presented under a fresh challenge. This is the realistic double-spend: the challenge replay guard cannot help because the challenge ID is new, so only the cumulative rule stands in the way. The official client SDK cannot express this probe — it re-signs on every call. |
| `MPP-13` | Close Settlement | **yes** | MPP Channel Guide §closing-the-channel | Closing with the highest commitment settles on-chain | Server accepts the `close` credential (HTTP 200), then RPC confirms settlement: `closeEffectiveAtLedger` moves from `null` to a ledger sequence, and the contract's `withdrawn` getter equals exactly the committed amount. The channel balance is **not** asserted — `close()` pays the commitment to the recipient and then auto-refunds the remainder to the funder, so a closed channel always ends at zero. `withdrawn` is written in the same call that transfers the payout, and that transfer is non-fallible, so a mismatch would have reverted the whole close. **Running this permanently ends the channel** — skipped unless destructive checks are explicitly enabled, and it refuses to run unless the operator names the channel and the target's challenge advertises that same address. |

---

**Revision note (Week 2, corrected):** `MPP-11`/`MPP-12` pass criteria were first written as "server rejects", then briefly revised to "zero balance delta / silent no-op" after reading only the `stellar-experimental/one-way-channel` on-chain contract source (which is genuinely a silent no-op for stale `settle`/`close` calls). That revision was corrected after reading the `@stellar/mpp` channel server implementation directly: the HTTP-facing server — the actual artifact Wasit tests — rejects stale/replayed commitments explicitly via `ChannelVerificationError`, before the on-chain contract is ever invoked. The contract's own no-op behavior only applies if the contract is called directly, bypassing the server, which is out of scope for Wasit.

**Status note:** this is an initial draft (Week 1). `MPP-*` checks will
be expanded in Week 2. `X402-02` deliberately checks both header names
because Stellar's own official documentation is not yet internally
consistent (`PAYMENT-REQUIRED` vs `X-Payment`) — see the problem
statement in the SOW.

**Note on error granularity (Week 2).** All channel-mode rejections return the
same HTTP 402 body: `{"type": ".../problems/verification-failed", "title":
"Verification Failed", ...}`. Replay, non-monotonic commitments, bad signatures
and a settling channel are indistinguishable from the response alone. Cause:
`@stellar/mpp` throws `ChannelVerificationError`, which extends `StellarMppError`
rather than mppx's `PaymentError`, so `mppx` rewraps every one of them into a
generic `VerificationFailedError`. mppx already defines precise types for this
family — `session/invalid-signature`, `session/signer-mismatch`,
`session/amount-exceeds-deposit`, `session/delta-too-small`,
`session/insufficient-balance`, `session/channel-finalized` — and none are
currently reachable from channel mode.

Wasit therefore isolates each rule by **construction** rather than by asserting
on the response type: every check is built so that exactly one rejection path
can fire, and the "Pass Criteria" column above records how. This is a gap in the
official SDK, not in any service under test, and is being reported upstream.

**Note on close authorisation (Week 2).** The channel contract's `close()` calls
`to.require_auth()` — the **recipient** must authorise the close, not the funder.
`@stellar/mpp` exposes this as `feePayer.envelopeSigner`, a name that implies fee
payment rather than authorisation; configuring it with the funder's key produces
a transaction that reaches the chain and fails there with an opaque
`scecInvalidAction`, which the SDK surfaces as `[object Object]`. By contrast,
`close_start()` requires `from.require_auth()` — the funder. Both details are
reported upstream.
