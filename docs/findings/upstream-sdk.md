# Upstream Findings

Two defects found in `@stellar/mpp` while building Wasit's MPP channel-mode
checks. Both are reproducible against current, published versions. This document
is the canonical write-up; the GitHub issues filed against
[`stellar/stellar-mpp-sdk`](https://github.com/stellar/stellar-mpp-sdk) are
summaries that link back here.

Neither is a defect in any service under test. Both are in the official SDK.

## Versions

| Package | Version | Notes |
|---|---|---|
| `@stellar/mpp` | 0.7.1 | Latest published at time of testing |
| `mppx` | 0.8.14 | Latest published; maintained by [wevm](https://github.com/wevm/mppx) |
| `@stellar/stellar-sdk` | 16.1.0 | |
| Node.js | 24.18.0 | |

Both findings originate in `@stellar/mpp`. `mppx` appears in the first finding
as the package whose types are unreachable, not as the package at fault.

---

## Finding 1 — Channel-mode errors collapse to a single generic type

**Status:** not filed yet
**Severity:** moderate — no security impact, significant debuggability impact

### Summary

`mppx` defines a precise error taxonomy for payment-session failures. In channel
mode, none of it is reachable. Every rejection returns an identical HTTP 402
body, so a client cannot tell a replayed credential from a bad signature from a
channel that is already settling.

### Cause

`ChannelVerificationError` extends `StellarMppError` rather than `mppx`'s
`PaymentError`. Because `mppx/server/Mppx.js` recognises failures by their
relationship to `PaymentError`, every channel-mode rejection falls through its
type dispatch and is rewrapped as a generic `VerificationFailedError`.

The precise types exist and are simply never constructed:

- `session/invalid-signature`
- `session/signer-mismatch`
- `session/amount-exceeds-deposit`
- `session/delta-too-small`
- `session/insufficient-balance`
- `session/channel-finalized`

### Observed behaviour

Every one of these distinct conditions produces the same response:

```json
{
  "type": "https://paymentauth.org/problems/verification-failed",
  "title": "Verification Failed",
  "status": 402
}
```

- a credential replayed against the same challenge
- a commitment equal to or below the stored cumulative
- a commitment that advances but does not cover the current price
- a commitment carrying an invalid signature
- a channel already in the process of settling

### Impact

An operator debugging a rejected payment cannot determine which rule they broke.
The information needed to tell them exists inside the SDK at the point of
rejection and is discarded before it reaches HTTP.

For conformance testing specifically, it means a tester cannot assert on the
response type to establish which rule fired. Wasit works around this by
isolating each rule *by construction* — every check is built so that exactly one
rejection path can possibly fire, and the isolation argument is recorded in each
check's pass criteria. That is a workaround, not a fix, and it constrains what
any client can diagnose.

### Reproduction

1. Stand up an MPP channel-mode server using `@stellar/mpp` and `mppx`.
2. Submit a valid channel credential; observe HTTP 200.
3. Resubmit the byte-identical credential against the same challenge — HTTP 402.
4. Submit a fresh challenge with a commitment below the stored cumulative —
   HTTP 402.
5. Submit a fresh challenge with a deliberately corrupted signature — HTTP 402.

Compare the three 402 bodies. They are identical.

### Possible fixes

Two directions, both plausible; the maintainers are better placed to choose:

- Have `ChannelVerificationError` extend `mppx`'s `PaymentError` so the existing
  dispatch reaches it.
- Map channel verification failures onto the specific `session/*` types at the
  throw site, where the cause is still known.

Neither has been implemented or tested by us.

---

## Finding 2 — `feePayer.envelopeSigner` is the authoriser, not the fee payer

**Status:** not filed yet
**Severity:** moderate — misleading name plus an opaque failure

### Summary

The parameter named `feePayer.envelopeSigner` supplies the account that
*authorises* a channel operation, not the account that pays transaction fees.
Different operations require different accounts, and supplying the wrong one
produces a failure that the SDK renders as `[object Object]`.

### Details

The channel contract's authorisation requirements are asymmetric:

| Operation | Requires |
|---|---|
| `close()` | `to.require_auth()` — the **recipient** |
| `close_start()` | `from.require_auth()` — the **funder** |

The SDK surfaces this as `feePayer.envelopeSigner`. The name reads as fee
payment, which is a different concern entirely, and it gives no hint that the
correct value changes between operations.

### Observed behaviour

Configuring `close()` with the funder's key produces a transaction that is built
successfully, submitted successfully, reaches the chain, and fails there with
`scecInvalidAction`. The SDK surfaces that failure as:

```
[object Object]
```

No account address, no operation name, no indication that authorisation was the
problem.

### Impact

The two defects compound. A developer who supplies the wrong key gets a string
that identifies nothing, from a parameter whose name points at the wrong
concept. Diagnosing it requires reading the on-chain contract's
`require_auth()` calls — which is not a reasonable expectation for an SDK
consumer.

### Reproduction

1. Open a channel with distinct `from` and `to` accounts.
2. Call `close()` with `feePayer.envelopeSigner` set to the funder's key.
3. Observe the transaction reach the chain and fail.
4. Observe the SDK's error message.

### Possible fixes

Three, roughly independent:

- Rename the parameter to reflect authorisation rather than fee payment, or
  document the asymmetry at the call site.
- Serialise the underlying error rather than string-coercing an object.
- Fail earlier: the required authoriser is knowable before submission, so a
  mismatch could be caught before a transaction is built.

---

## Explicitly not findings

Recorded so the list above is not read as broader than it is.

**The x402 `maxAmountRequired` → `amount` rename.** x402 v2 renamed the price
field and dropped the embedded resource object. This initially looked like a
divergence between the SDK and the spec; it is not. The change is deliberate,
versioned, and documented in `@x402/core`'s own schema definitions. Wasit's
check was wrong, and was corrected to read `x402Version` and require the field
name that version defines.

**`PAYMENT-REQUIRED` vs `X-Payment`.** Stellar's documentation uses both names
for the payment header in different places. This is real, and Wasit accepts
either as a result — but it is a documentation inconsistency rather than an SDK
defect, so it belongs in a different report than these two.