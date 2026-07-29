# Security Policy

Wasit runs real payment flows against live services and signs with a real key.
That makes it a tool that can spend money, permanently close a payment channel,
and — if pointed at infrastructure you do not own — put load and unwanted
transactions on somebody else's service. This document states how it handles
keys, what it will and will not do on its own, and how to report a problem.

## Testnet only

Wasit is built and tested for Stellar testnet. Several checks settle real
transactions, and one permanently closes a payment channel.

Nothing in the tool prevents a `stellar:pubnet` network identifier from
parsing, but pubnet deliberately has no default RPC endpoint, so a pubnet run
has to be configured on purpose rather than reached by accident. **Do not do
this.** No check in the catalogue has been validated against mainnet
conditions, and the destructive check is irreversible wherever it runs.

## Authorization

**Only run Wasit against a service you own, or one whose operator has given you
explicit written permission to test.**

This is an operating policy, binding on the maintainer and on every user of the
tool. It is not a feature of the software, and it cannot be: no tool can
determine from a URL alone who owns the service behind it. The software will
not stop you from pointing it somewhere you should not. You are responsible for
where you point it.

The tool does enforce one narrower guard, described under *Destructive checks*
below, but that guard is about preventing an irreversible action taken by
mistake — not about establishing that you were authorised in the first place.

## Checks that spend money

Three checks settle or attempt real payments. Each call spends; repeated calls
spend repeatedly.

| Check | What it does |
|---|---|
| `X402-06` | Settles a valid x402 payment against the target |
| `X402-07` | Attempts a payment with a deliberately corrupted signature |
| `MPP-01` | Settles a full MPP charge-mode payment |

This is inherent to what they verify rather than an implementation choice: a
payment flow that was never exercised cannot be verified on-chain, and charge
mode has no dry run.

The default posture is the cheap one. `X402-06` and `X402-07` are skipped
entirely when no payer key is present, and `--read-only` (CLI) or
`readOnly: true` (MCP) restricts an x402 run to the free checks. `MPP-01` has
no read-only mode and always spends when it runs.

Over MCP these tools declare `idempotentHint: false` and say plainly in their
descriptions that each call spends, because an agent needs to know that before
deciding to retry on timeout or run a suite in a loop. An agent that retries a
spending check will drain the payer account, at which point every MPP check
fails for reasons that look nothing like the cause.

## Destructive checks

`MPP-13` closes a payment channel. The settlement is final, the channel can
never be reopened, and no later check can run against it.

It is skipped by default in both front ends. Running it requires two
independent things:

1. An explicit opt-in on the process — `--allow-destructive` on the CLI, or
   `WASIT_ALLOW_DESTRUCTIVE=1` / `--allow-destructive` when starting the MCP
   server.
2. A named channel the run is permitted to close, which must match the channel
   the target advertises in its own 402 challenge.

Neither alone is enough.

Over MCP the destructive path is a **separate tool**, registered only when the
opt-in is present at process start. Without it, `wasit_mpp_channel_test_with_close`
does not appear in `tools/list` at all. This is deliberate: an
`allowDestructive: true` parameter would be a boolean an agent could set for
itself, which is not human consent in any meaningful sense. An agent cannot
invoke a tool it cannot see.

## Key handling

Wasit signs with keys you supply. It needs them to do its job, and it does the
minimum with them.

- **Keys are read from the process environment only.** Never from a command
  argument, never from a config file committed to a repository.
- **Keys are never accepted as MCP tool arguments.** Every tool reads what it
  needs from the server's own environment, so an agent never handles a key and
  a key can never end up in a conversation transcript. A missing key returns an
  error naming the variable to set, not a prompt to supply one.
- **Keys are never logged, persisted, or transmitted anywhere except to the
  Stellar network as part of a signed transaction.** Check output reports
  public keys and transaction hashes; it does not report secrets.
- **`.env` is gitignored.** `.env.example` documents every variable by name
  with no values.

Use a dedicated testnet account with only as much balance as the run needs. Do
not reuse a key that has any other purpose.

## Reporting a vulnerability in Wasit

Report privately first. Do not open a public issue for a security problem.

Email **repmoonasci@gmail.com** with:

- What the problem is and what an attacker could do with it
- Steps to reproduce, ideally against the bundled fixture servers
- The versions involved (`@wasit/core`, Node, and the relevant SDK versions)

You should get an acknowledgement within 72 hours. If a fix is warranted, it
will be released before public discussion of the details, and you will be
credited unless you prefer otherwise.

Things that are in scope: key material leaking into output, logs, or MCP tool
arguments; a destructive check running without both required opt-ins; a check
that reports PASS without actually verifying what its pass criteria in
[CHECKS.md](CHECKS.md) claim.

Things that are not: the fact that some checks spend money, or that the tool
will run against a target you were not authorised to test. Both are documented
above and are properties of the tool working as designed.

## Findings about services Wasit tests

When Wasit finds a conformance defect in somebody else's service:

- The operator is told privately first, with enough detail to reproduce it.
- A reasonable window is given to respond before anything is published.
- Aggregate results may be published — how many services were tested and what
  classes of defect appeared — but **no individual service is named without its
  operator's written permission.**
- A defect that is exploitable, rather than merely non-conformant, is treated
  as a vulnerability disclosure rather than a test result, and is not published
  on a timetable of ours.

A FAIL from Wasit is a statement about a specific check against a specific
target at a specific moment. It is not a security assessment. See
[design/scope-boundary.md](design/scope-boundary.md) for what a passing result
does and does not mean.

## Findings in upstream SDKs

Defects found in the official SDKs during development are documented in
[findings/upstream-sdk.md](findings/upstream-sdk.md) and prepared for reporting to their maintainers. Those are protocol and developer-experience defects rather than
exploitable vulnerabilities; anything exploitable would go to the maintainers
privately and would not appear in that file until it was resolved.

## Supported versions

Wasit is pre-1.0 and unpublished. Only `main` is supported. There are no
backports, and check behaviour may change as the x402 and MPP specifications
stabilise — which is why every check in [CHECKS.md](CHECKS.md) records the
specification and SDK version it was verified against, and why every report
should record the same.