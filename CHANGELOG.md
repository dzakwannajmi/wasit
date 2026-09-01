# Changelog

All notable changes to Wasit are recorded here. Versions follow [Semantic Versioning](https://semver.org/): patch releases are fixes, minor releases add checks or features without breaking existing usage, major releases break something.

## [0.1.0] — 2026-09-01

First public release. All three packages are now live on npm under the `@wasit-dev` organization.

| Package | Version | npm | What it is |
|---|---|---|---|
| `@wasit-dev/core` | 0.1.0 | https://www.npmjs.com/package/@wasit-dev/core | The check-suite library. x402 and MPP conformance logic, on-chain settlement verification, no CLI or MCP dependency of its own. |
| `@wasit-dev/cli` | 0.1.0 | https://www.npmjs.com/package/@wasit-dev/cli | The `wasit` command. Thin adapter over `@wasit-dev/core` for running checks from a terminal or CI. |
| `@wasit-dev/server` | 0.1.0 | https://www.npmjs.com/package/@wasit-dev/server | The `wasit-mcp` command. Exposes the same checks as MCP tools so an agent (Claude or otherwise) can run them directly. |

Anyone can now install and run Wasit without cloning the repository:

```bash
npm install -g @wasit-dev/cli
wasit test <target-url>
```

or wire the MCP server into an agent:

```bash
npx @wasit-dev/server
```

### What Wasit checks in this release

**x402.** Seven checks (`X402-01` through `X402-07`) covering the full flow: the 402 status itself, the payment header, its base64/JSON payload, the required fields inside that payload (version-aware, since v1 and v2 use different field names for price), the CAIP-2 network identifier, a real signed payment that must be accepted, and a deliberately corrupted signature that must be rejected. The two payment checks settle real testnet funds and are skipped automatically when no payer key is configured, or explicitly with `--read-only`.

**MPP, charge mode.** One check (`MPP-01`) that pays the target and then verifies the settlement independently on-chain, by reading the token contract's own CAP-46 `transfer` event via Stellar RPC rather than trusting the response the target returns. This catches a target whose response claims a payment succeeded when the on-chain event says otherwise.

**MPP, channel mode.** Five checks (`MPP-10`, `MPP-11`, `MPP-12`, `MPP-14`, and `MPP-13`). The first four are non-destructive: channel deployment and state, cumulative-commitment ordering, challenge replay rejection, and commitment replay rejection against a fresh challenge — the double-spend case the official client SDK cannot even express, since it always re-signs. `MPP-13` verifies that closing a channel actually settles on-chain and permanently ends the channel, so it is gated behind an explicit opt-in (`--allow-destructive` on the CLI, `WASIT_ALLOW_DESTRUCTIVE=1` on the MCP server) and refuses to run unless the operator names the exact channel being closed.

**Reporting.** Every run distinguishes four outcomes rather than a simple pass/fail: PASS, FAIL (the target answered and didn't conform), SKIP (a check that legitimately didn't apply, e.g. a destructive check that wasn't opted into), and ERROR (no verdict at all, because the target was unreachable or misconfigured — never treated as a finding about the target). CLI exit codes follow the same distinction: `0` clean, `1` at least one real conformance failure, `2` at least one check produced no verdict.

**Interfaces.** Both the CLI and the MCP server run the identical check code in `@wasit-dev/core`, so the two can never disagree about the same target. MCP exposes four tools: `wasit_x402_test`, `wasit_mpp_charge_test`, `wasit_mpp_channel_test` (non-destructive channel checks, with `MPP-13` reported as SKIP), and `wasit_mpp_channel_test_with_close` (registered only when destructive mode is explicitly enabled at server startup).

### Known gaps going into the next release

Two items from the original SOW scope are still open. A completion-summary/demo video has not been started. Third-party validation — at least one service outside this project actually running Wasit against itself with explicit authorization — is in progress via outreach to teams building on x402/MPP (RouteDock, stellarpay, stellar-pay), with no confirmed run back yet as of this release.

Two defects were found in the upstream `@stellar/mpp` SDK while building the channel-mode checks and were filed against `stellar/stellar-mpp-sdk`: issue #66 (channel-mode rejections collapse to one generic error instead of the SDK's own precise error taxonomy) and issue #67 (`feePayer.envelopeSigner` names the wrong concept and produces `[object Object]` on a mismatched key). Both are documented in `docs/findings/upstream-sdk.md`.
