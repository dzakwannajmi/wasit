# CLI Guide

The `wasit` binary is a thin adapter over `@wasit-dev/core`. Every check it runs is
the same code the MCP server runs, so the two cannot disagree about the same
target.

Install and run it directly with npx (no local install needed), or install
globally for a shorter `wasit` command:

```bash
npx @wasit-dev/cli <subcommand> [options]
# or: npm install -g @wasit-dev/cli && wasit <subcommand> [options]
```

Every subcommand also has its own `--help`, with worked examples and cost
notes: `wasit <subcommand> --help`.

## Interactive mode

Running `wasit` with no subcommand at all, in a real terminal, opens a small
menu instead of printing help:

```bash
wasit
```

Pick x402 (read-only checks), MPP channel (non-destructive checks), MPP
charge, or browse the check catalogue, then type a target URL. Each action
reuses the same environment-variable defaults as the matching subcommand
below — a missing key is reported in the menu rather than the run failing
silently partway through.

This is deliberately narrower than the subcommands themselves: no
`X402-06`/`07` payment checks, no `--allow-destructive`, no header/method/body
overrides, no `--json`. Anything past "run the safe default checks and read
the result" still goes through the direct subcommand — `wasit test
--payer-key ...`, `wasit mpp-channel --allow-destructive ...`, and so on. MPP
charge always settles a real payment (it has no read-only mode), so picking it
asks for an explicit confirmation before anything runs.

Keys: arrows + Enter to move and select, Esc to go back, `q` to quit from any
screen without a text field, Ctrl+C to quit immediately from anywhere,
including mid-keystroke while typing a target URL.

Piping `wasit` into something else, or running it in CI, does not open the
menu — it falls back to printing help, exactly as before this existed.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every check that ran conformed |
| `1` | At least one conformance failure |
| `2` | At least one check produced no verdict |

A run with both a failure and an error exits `1`: a real finding outranks a
missing one. Skipped checks never affect the exit code — a skipped check is
neither a pass nor a defect.

## Check Catalogue

```bash
wasit checks [--protocol x402|mpp-charge|mpp-channel] [--json]
```

Lists every check by ID without needing to open this doc or CHECKS.md: name,
which protocol/subcommand runs it, and whether it is negative (only passes if
the target correctly *rejects* something), destructive, or settles real funds.
This is a quick reference, not a replacement for [CHECKS.md](../CHECKS.md) —
full pass criteria, spec citations, and revision notes only live there.

## x402 (Test)

```bash
wasit test --target <url> [options]
```

| Option | Default | Notes |
|---|---|---|
| `--target <url>` | required | Must include the scheme |
| `--network <id>` | `stellar:testnet` | CAIP-2 |
| `--payer-key <key>` | `STELLAR_PRIVATE_KEY` | Secret key, `S...` |
| `--read-only` | off | Restricts the run to `X402-01`–`05` |
| `--json` | off | Machine-readable output (see below) instead of formatted text |

Without a payer key the payment checks are skipped automatically, so the default
posture costs nothing. When they do run, **`X402-06` settles a real payment and
`X402-07` attempts one.**

## MPP Charge Mode

```bash
wasit mpp-charge --target <url> [options]
```

| Option | Default | Notes |
|---|---|---|
| `--target <url>` | required | The paid resource |
| `--payer-key <key>` | `MPP_PAYER_SECRET` | Secret key, `S...` |
| `--network <id>` | `MPP_STELLAR_NETWORK` | CAIP-2 |
| `--rpc-url <url>` | testnet default | Required for pubnet |
| `--json` | off | Machine-readable output (see below) instead of formatted text |

**Every run settles a real payment.** There is no read-only mode: charge mode
has no dry run, and a settlement that never happened cannot be verified
on-chain.

## MPP Channel Mode

```bash
wasit mpp-channel --target <url> [options]
```

| Option | Default | Notes |
|---|---|---|
| `--target <url>` | required | The paid resource |
| `--commitment-key <hex>` | `COMMITMENT_SECRET_HEX` | Raw ed25519 seed, hex |
| `--network <id>` | `MPP_STELLAR_NETWORK` | CAIP-2 |
| `--rpc-url <url>` | testnet default | Soroban RPC |
| `--channel <address>` | `CHANNEL_CONTRACT` | An assertion — see below |
| `--expect-token <address>` | — | `MPP-10` |
| `--expect-from <address>` | — | `MPP-10` |
| `--expect-to <address>` | — | `MPP-10` |
| `--expect-refund-period <n>` | — | `MPP-10`, in ledgers |
| `--allow-destructive` | off | Enables `MPP-13` |
| `--destructive-channel <addr>` | `CHANNEL_CONTRACT_DISPOSABLE` | Channel `MPP-13` may close |
| `--json` | off | Machine-readable output (see below) instead of formatted text |

`MPP-10`–`12` and `MPP-14` cost nothing. `MPP-13` closes a channel permanently
and is skipped unless both `--allow-destructive` and a named channel are given.

### `--channel` asserts, it does not select

The channel under test is resolved from the target's own 402 challenge, so every
check in a run reports on the same contract. `--channel` states which address
you *expect* that to be. When the two differ, `MPP-10` fails and inspects
nothing — a run that reported on both would be reporting on two contracts at
once.

### The `--expect-*` flags

`MPP-10` verifies the channel's on-chain parameters against what you say they
should be. Only the channel's operator knows these, so without all four the
check is skipped rather than guessed at.

## Reading output

```
PASS  MPP-11  Cumulative Commitment Ordering
      Both ordering rules enforced: ...

SKIP  MPP-13  Close Settlement  [destructive]
      Skipped (destructive): closing settles the channel on-chain and
      permanently ends it.
```

`PREFLIGHT` appears in place of the checks when the target URL or network
identifier is invalid. Both are wrong for every check in the suite, so they are
reported once rather than repeated identically.

See [../design/error-model.md](../design/error-model.md) for what each status
means.

### `--json`

```bash
wasit test --target https://api.example.com/paid-endpoint --read-only --json
```

```json
{
  "outcome": "conformant",
  "passed": 5,
  "failed": 0,
  "errored": 0,
  "skipped": 0,
  "results": [
    { "id": "X402-01", "name": "402 Response Status", "status": "PASS", "detail": "...", "destructive": false }
  ]
}
```

Any advisory line that would normally print above the results (missing payer
key, `--read-only` set, a payment-cost warning) is written to stderr instead of
stdout when `--json` is set, so stdout stays parseable — safe to pipe into
`jq` or capture directly in a CI step. `outcome` mirrors the exit code
(`conformant` / `non-conformant` / `no-verdict`) but is readable without
looking one up, and is the exact same shape the MCP server returns as
`structuredContent` for the same run — both front ends call the same
`toStructuredRun()` in `@wasit-dev/core`, so they can never disagree about how
one is reported.
