# @wasit-dev/cli

Protocol-compliance testing for **x402** and **MPP** on Stellar, from your terminal.

`wasit` runs the real payment flow against a live service and verifies the settlement independently — via Stellar RPC and the token contract's own on-chain transfer event, not by trusting the response the service returns. It is not a schema validator: a response can have every field in the right place and still take money without settling it.

**Testnet only.** Several checks settle real transactions — do not point this at pubnet or use production keys.

## Install

```bash
# run once, no install
npx @wasit-dev/cli test --target <your-service-url>

# or install globally
npm install -g @wasit-dev/cli
wasit test --target <your-service-url>
```

Requires Node.js `>=24`.

## Quick start

The default posture costs nothing — no keys required:

```bash
wasit test --target https://your-service.example.com/paid --read-only
```

That runs the read-only x402 checks (`X402-01`–`05`): whether the service issues a well-formed 402 challenge. Drop `--read-only` and set `STELLAR_PRIVATE_KEY` to also exercise the payment flow — `X402-06`/`07` settle a real testnet payment.

## Commands

### `wasit test` — x402

```bash
wasit test --target <url> [options]
```

| Option | Default | Notes |
|---|---|---|
| `--target <url>` | required | Must include the scheme |
| `--network <id>` | `stellar:testnet` | CAIP-2 network id |
| `--payer-key <key>` | `STELLAR_PRIVATE_KEY` | Testnet secret key, `S...` |
| `--method <verb>` | `GET` | HTTP method the paid endpoint uses |
| `--body <json>` | — | Request body; implies `Content-Type: application/json` |
| `--header <name:value>` | — | Extra request header, repeatable |
| `--read-only` | off | Restricts the run to `X402-01`–`05` (no payment) |

Without a payer key, the payment checks are skipped automatically. When they run: **`X402-06` settles a real payment, `X402-07` attempts one with a corrupted signature** — testnet funds move on every call.

### `wasit mpp-charge` — MPP, charge mode

```bash
wasit mpp-charge --target <url> [options]
```

| Option | Default | Notes |
|---|---|---|
| `--target <url>` | required | The paid resource |
| `--payer-key <key>` | `MPP_PAYER_SECRET` | Secret key, `S...` |
| `--network <id>` | `MPP_STELLAR_NETWORK` | CAIP-2 |
| `--rpc-url <url>` | testnet default | Required for pubnet |

**Every run settles a real payment.** Charge mode has no dry run — a settlement that never happened cannot be verified on-chain.

### `wasit mpp-channel` — MPP, channel mode

```bash
wasit mpp-channel --target <url> [options]
```

| Option | Default | Notes |
|---|---|---|
| `--target <url>` | required | The paid resource |
| `--commitment-key <hex>` | `COMMITMENT_SECRET_HEX` | Raw ed25519 seed, hex — not an `S...` key |
| `--network <id>` | `MPP_STELLAR_NETWORK` | CAIP-2 |
| `--rpc-url <url>` | testnet default | Soroban RPC |
| `--channel <address>` | `CHANNEL_CONTRACT` | Asserts the expected channel; a mismatch fails `MPP-10` |
| `--expect-token <address>` | — | `MPP-10` parameter check |
| `--expect-from <address>` | — | `MPP-10` parameter check |
| `--expect-to <address>` | — | `MPP-10` parameter check |
| `--expect-refund-period <ledgers>` | — | `MPP-10` parameter check |
| `--allow-destructive` | off | Enables `MPP-13` (closes the channel — permanent) |
| `--destructive-channel <address>` | `CHANNEL_CONTRACT_DISPOSABLE` | Channel `MPP-13` is permitted to close |

`MPP-10`–`12` and `MPP-14` cost nothing. `MPP-13` is skipped unless `--allow-destructive` and a named disposable channel are both given — it permanently ends a channel and cannot be undone.

`--channel` **asserts**, it does not select: the channel under test is resolved from the target's own 402 challenge, so every check in a run reports on the same contract. When `--channel` differs from what the target advertises, `MPP-10` fails and inspects nothing.

## Reading output

```
PASS  X402-01  402 Response Status
      Server responded with 402 as required.

FAIL  X402-01  402 Response Status
      Expected status 402, got 404.

SKIP  X402-02  Payment Header Present
      Skipped: the target answered 404 rather than 402, so it issued no
      payment challenge to inspect.

7 passed.
```

`PREFLIGHT` appears in place of the checks when the target URL or network identifier itself is invalid — both are wrong for every check in the suite, so it's reported once rather than repeated identically.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every check that ran conformed |
| `1` | At least one conformance failure |
| `2` | At least one check produced no verdict (unreachable target, bad config) |

A run with both a failure and an error exits `1` — a real finding outranks a missing one. Skipped checks never affect the exit code.

## Configuration

| Env var | Used by |
|---|---|
| `STELLAR_PRIVATE_KEY` | `test` (x402 payment checks) |
| `MPP_PAYER_SECRET` | `mpp-charge` |
| `MPP_STELLAR_NETWORK` | `mpp-charge`, `mpp-channel` |
| `COMMITMENT_SECRET_HEX` | `mpp-channel` |
| `CHANNEL_CONTRACT` | `mpp-channel` (optional assertion) |
| `CHANNEL_CONTRACT_DISPOSABLE` | `mpp-channel --allow-destructive` |

All keys are **testnet only**. `wasit` also reads a `.env` file in the current working directory — pass `--payer-key` / `--commitment-key` directly to override it for a single run.

## What's checked

Thirteen checks across x402 and MPP, each traced to a written spec clause — the full catalogue, with pass criteria and spec references, is in [`docs/CHECKS.md`](https://github.com/wasit-dev/wasit/blob/main/docs/CHECKS.md).

## Related

- [`@wasit-dev/core`](https://www.npmjs.com/package/@wasit-dev/core) — the check suite this CLI runs, if you're building your own tooling on top
- [`@wasit-dev/server`](https://www.npmjs.com/package/@wasit-dev/server) — the same checks as MCP tools, for Claude Code and other agents
- [Full documentation](https://github.com/wasit-dev/wasit) — CLI guide, MCP guide, configuration, design notes

## License

Apache-2.0 — see [LICENSE](https://github.com/wasit-dev/wasit/blob/main/LICENSE).
