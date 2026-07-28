# Destructive and Costly Checks

Two properties are easy to conflate and need separating.

**Destructive** — running it permanently changes the target's state in a way
that cannot be undone. Only `MPP-13` qualifies: closing a payment channel is
final, the channel can never be reopened, and no later check can run against it.

**Costly** — running it spends money without ending anything. `MPP-01`,
`X402-06`, and `X402-07` settle or attempt real payments. Nothing is destroyed,
the check can be run again, but the payer account is drained a little each time.

They warrant different treatment. Destructive gets a gate. Costly gets
disclosure.

## The gate

`MPP-13` is skipped by default in both front ends. Enabling it requires two
independent things:

1. An explicit opt-in on the process — `--allow-destructive` for the CLI,
   `WASIT_ALLOW_DESTRUCTIVE=1` or `--allow-destructive` for the MCP server.
2. A named channel the run is permitted to close, which must match the channel
   the target advertises in its own challenge.

Neither alone is enough. Naming a channel without the opt-in does nothing;
opting in without naming a channel closes nothing.

## Why MCP registers a separate tool

An `allowDestructive: true` parameter would be a boolean an LLM agent could set
for itself. That is not human consent — it is a field in a schema, and an agent
following an instruction to "test everything thoroughly" would set it.

So over MCP the destructive path is a **different tool**,
`wasit_mpp_channel_test_with_close`, registered only when the opt-in is present
at process start. Without it the tool is absent from `tools/list` entirely. An
agent cannot invoke a tool it cannot see, which is a stronger guarantee than any
argument it could guess.

The non-destructive tool still reports `MPP-13` as SKIP with its reason, rather
than omitting it. An agent should see that the check exists and why it did not
run — a shorter catalogue would look like the tool simply has fewer checks.

## Why costly checks are not gated

Gating `MPP-01` behind the same mechanism was considered and rejected. It would
mean the default configuration cannot exercise charge mode at all, which makes
the tool structurally incomplete for the protocol it claims to test. And the
failure mode is not comparable: a wrong `MPP-13` destroys something
irreplaceable, while a wrong `MPP-01` costs testnet funds that can be
re-friendbotted.

But the difference is worth stating precisely, because it cuts the other way
too: `MPP-13` can only be wrong once, while a costly check can be wrong
repeatedly. An agent retrying on timeout, or running a suite in a loop, will
settle a payment every iteration until the payer is empty — at which point the
whole MPP suite fails for reasons that look nothing like the cause.

So instead of a gate, disclosure everywhere it could matter: the CLI prints a
warning before running, the catalogue documents the cost, and the MCP tools
declare `idempotentHint: false` with descriptions that state plainly that
repeated calls spend repeatedly.

## Authorisation is not fee payment

Discovered while implementing `MPP-13`, and worth recording because the naming
actively misleads.

The channel contract's `close()` calls `to.require_auth()` — the **recipient**
must authorise a close, not the funder. `close_start()` calls
`from.require_auth()` — the funder. The SDK exposes this as
`feePayer.envelopeSigner`, which reads like the account paying transaction fees.

Configuring it with the funder's key for a close produces a transaction that
reaches the chain and fails there with `scecInvalidAction`, which the SDK
surfaces as `[object Object]`. Being reported upstream.
