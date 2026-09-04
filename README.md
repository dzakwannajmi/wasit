<div align="center">

# Wasit

**Protocol-compliance testing for x402 and MPP on Stellar.**

Wasit runs the real payment flow against a live service and verifies settlement
on-chain. It is not a schema validator: a response can have every field in the
right place and still take money without settling it.

[![CI](https://github.com/wasit-dev/wasit/actions/workflows/ci.yml/badge.svg)](https://github.com/wasit-dev/wasit/actions/workflows/ci.yml)
[![Stellar](https://img.shields.io/badge/Stellar-Testnet-7c3aed)](https://stellar.org)
[![x402](https://img.shields.io/badge/Protocol-x402%20v2-0891b2)](https://x402.org)
[![MPP](https://img.shields.io/badge/Protocol-MPP-111827)](https://paymentauth.org)
[![MCP](https://img.shields.io/badge/Interface-CLI%20%2B%20MCP-16a34a)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)

[Website](https://usewasit.dev) ·
[Check Catalogue](docs/CHECKS.md) ·
[CLI Guide](docs/guides/cli.md) ·
[MCP Guide](docs/guides/mcp.md) ·
[Configuration](docs/guides/configuration.md) ·
[Design Notes](#design-notes)

</div>

---

## Table of Contents

- [How It Works](#how-it-works)
- [The Problem](#the-problem)
- [Status](#status)
- [Install](#install)
- [Building from source](#building-from-source)
- [Trying It](#trying-it)
- [Design Notes](#design-notes)
- [Roadmap](#roadmap)

---

## How It Works

Wasit talks to two things: the service under test, over HTTP, and the Stellar
network, over RPC. It never trusts the first about what happened on the second.

```mermaid
flowchart TB
    subgraph interfaces["Two front ends, one core"]
        CLI["wasit CLI"]
        MCP["wasit-mcp<br/>MCP server"]
    end

    CORE["@wasit-dev/core<br/>check suites"]

    subgraph target["The artifact under test"]
        SVC["Your running service"]
    end

    CHAIN["Stellar RPC<br/>settlement, contract events"]

    CLI --> CORE
    MCP --> CORE
    CORE -->|"1 . unpaid request"| SVC
    SVC -->|"2 . 402 + challenge"| CORE
    CORE -->|"3 . signed payment"| SVC
    SVC -->|"4 . 2xx + receipt"| CORE
    CORE -->|"5 . verify independently"| CHAIN

    style CHAIN stroke-width:2px
```

Step 5 is the point of the tool. The challenge in step 2 states what the service
wants paid; the receipt in step 4 states what it claims happened. Wasit compares
both against what the chain actually recorded — including the token contract's
own transfer event, not just the transaction it was asked to make.

The CLI and the MCP server are thin adapters over the same suite functions. They
cannot disagree about the same target, because there is only one implementation
of each check.

---

## The Problem

x402 and MPP have an official SDK. They have no independent conformance tester.

`stellar-anchor-tests` fills that role for the anchor ecosystem: an anchor
operator points it at their deployment and gets an answer about whether their
service actually implements the protocol. Nothing equivalent exists for the
agentic-payments stack, so "we support x402" is currently a claim nobody can
check.

That gap is not theoretical. Three concrete divergences turned up while building
this tool, all against official, current packages:

**The payment header has two names.** Stellar's own documentation uses
`PAYMENT-REQUIRED` in one place and `X-Payment` in another. A client written
from one page will not find the header emitted by a server written from the
other. `X402-02` deliberately accepts either, because refusing one would mean
failing services that followed official documentation — but a service cannot
know which convention its callers expect. This is a documentation defect
upstream, and it is exactly the kind of thing a conformance tester exists to
surface.

**A whole error taxonomy is unreachable.** In MPP channel mode, every rejection
— replay, non-monotonic commitment, bad signature, a channel already settling —
returns an identical HTTP 402 body. The SDK defines precise error types for each
of these and none are reachable, because of a class-hierarchy mismatch between
two packages. An operator debugging a rejected payment cannot tell which rule
they broke. See [docs/CHECKS.md](docs/CHECKS.md#note-on-error-granularity-week-2)
and the full write-up in [docs/findings/upstream-sdk.md](docs/findings/upstream-sdk.md).
Filed upstream as [stellar-mpp-sdk#66](https://github.com/stellar/stellar-mpp-sdk/issues/66);
independently confirmed by [RouteDock's fix](https://github.com/winsznx/routedock/pull/241)
for the same defect.

**A parameter named for one thing does another.** `feePayer.envelopeSigner`
reads like the account paying transaction fees. It is actually the account
providing authorisation, and the channel contract requires different accounts
for different operations. Getting it wrong produces a transaction that reaches
the chain and fails there, surfaced by the SDK as `[object Object]`. Filed
upstream as [stellar-mpp-sdk#67](https://github.com/stellar/stellar-mpp-sdk/issues/67).

Wasit exists so these are found by a tool, before they are found by a user.

---

## Status

| Area | Status |
|---|---|
| x402 read-only checks (`X402-01`–`05`) | Done, verified against a real facilitator |
| x402 payment checks (`X402-06`, `07`) | Done, settles on testnet |
| MPP charge mode (`MPP-01`) | Done, settlement verified from contract events |
| MPP channel mode (`MPP-10`–`14`) | Done, including destructive close |
| CLI | Done, three subcommands |
| MCP server | Done, three tools + one behind an opt-in |
| Error taxonomy and exit codes | Done |
| Testing against third-party services | Partial — 3 public repos tested without contacting the operator (see [evidence](docs/evidence/2026-08-15-third-party-run.md)); a run with explicit operator authorization hasn't happened yet |
| Upstream reports to SDK maintainers | Filed — [stellar-mpp-sdk#66](https://github.com/stellar/stellar-mpp-sdk/issues/66), [#67](https://github.com/stellar/stellar-mpp-sdk/issues/67) |
| Published to npm | Yes — `@wasit-dev/core`, `@wasit-dev/cli`, `@wasit-dev/server` |
| Mainnet | Out of scope — see [Design Notes](#design-notes) |

Thirteen checks are implemented and reachable from both front ends. Every one is
traced to a written spec clause in [docs/CHECKS.md](docs/CHECKS.md); a check that
cannot be traced is out of scope by construction.

---

## Install

Requires Node.js `>=24`.

```bash
# run it once, no install
npx @wasit-dev/cli test --target https://your-service.example/paid --read-only

# or keep it around
npm install -g @wasit-dev/cli
wasit test --target https://your-service.example/paid --read-only
```

That runs `X402-01` through `X402-05` against your own service. It costs
nothing, needs no keys, and settles no transaction. `wasit checks` lists every
check the tool can run, and `--json` on any run gives machine-readable output.

The checks that settle a real testnet payment — `X402-06`, `X402-07`, `MPP-01`,
and the channel suite — need a funded testnet account.
[docs/guides/configuration.md](docs/guides/configuration.md) explains each value
and where to get it. For the MCP server, see
[docs/guides/mcp.md](docs/guides/mcp.md).

## Building from source

Only needed to change Wasit itself, or to run the bundled fixture servers below.
Developed and verified on Node **v24.18.0**.

```bash
git clone https://github.com/wasit-dev/wasit.git
cd wasit
npm install
npm run build
cp .env.example .env
```

---

## Trying It

Three fixture servers are bundled — real servers built on the official SDKs, not
mocks. Testing against a mock would mean testing against our own assumptions;
one of the defects listed above was found precisely because the fixtures are
real.

Each runs in its own terminal:

```bash
npx tsx packages/core/test/fixtures/x402-real-server.ts      # :3001/protected
npx tsx packages/core/test/fixtures/mpp-charge-server.ts     # :3002/data
npx tsx packages/core/test/fixtures/mpp-channel-server.ts    # :3003/data
```

Then, from another terminal:

```bash
# x402 — read-only, free
node packages/cli/dist/index.js test --target http://localhost:3001/protected --read-only

# x402 — full flow, settles a real testnet payment
node packages/cli/dist/index.js test --target http://localhost:3001/protected

# MPP charge — settles a real testnet payment
node packages/cli/dist/index.js mpp-charge --target http://localhost:3002/data

# MPP channel — free; MPP-13 is skipped unless explicitly enabled
node packages/cli/dist/index.js mpp-channel --target http://localhost:3003/data
```

A passing run looks like this:

```
PASS  X402-01  402 Response Status
      Server responded with 402 as required.
...
PASS  X402-06  Signature Resubmit Accepted
      Valid payment accepted (HTTP 200).
PASS  X402-07  Invalid Signature Rejected
      Corrupted payment correctly rejected (HTTP 402).

7 passed.
```

A failing one distinguishes what broke from what was never tested:

```
FAIL  X402-01  402 Response Status
      Expected status 402, got 404.

SKIP  X402-02  Payment Header Present
      Skipped: the target answered 404 rather than 402, so it issued no
      payment challenge to inspect.
...
0 passed, 1 failed, 4 skipped.
```

For the MCP server, see [docs/guides/mcp.md](docs/guides/mcp.md).

---

## Design Notes

Four decisions shape everything else. Each has its own page.

**[The error model](docs/design/error-model.md)** — "your service is broken" and
"we never reached your service" are different claims, and a tool that conflates
them is worse than no tool. Wasit reports FAIL, ERROR, and SKIP separately, and
exits `0`/`1`/`2` accordingly. One broken challenge produces one finding, not
one per check that depended on it.

**[Destructive and costly checks](docs/design/destructive-checks.md)** — closing
a payment channel is permanent. Over MCP, the tool that can do it is not
registered at all unless a human starts the server with an explicit opt-in: an
agent cannot call what it cannot see. Checks that spend money without being
destructive are a separate category, disclosed rather than gated.

**[Scope boundary](docs/design/scope-boundary.md)** — Wasit tests running service
behaviour. It does not audit contract source or bytecode, and passing it is not a
security clearance. Knowing what a passing result does *not* mean is part of the
deliverable.

**Verify against compiled source, never against types.** Every API used here was
confirmed by reading the shipped `.js` in `node_modules` before any code was
written against it. Twice during development a documented behaviour turned out
to contradict the implementation, and both times the implementation was what
users actually experience. The revision notes in
[docs/CHECKS.md](docs/CHECKS.md) record where this changed a pass criterion.

---

## Roadmap

- Run the suite against a third-party service with the operator's explicit
  authorization — the existing evidence runs don't qualify, see Status above
- Expand the catalogue as the x402 and MPP specs stabilise
- Evidence documents under `docs/evidence/` for each verified run

Not planned: mainnet support, contract auditing, a hosted service.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
