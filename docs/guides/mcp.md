# MCP Guide

The MCP server exposes the same check suites as the CLI over the Model Context
Protocol, so an agent can run a conformance check and read the result as
structured data.

Transport is stdio. The binary is `wasit-mcp`; until it is published, clients
launch `packages/server/dist/index.js` directly.

## Client configuration

```json
{
  "mcpServers": {
    "wasit": {
      "command": "node",
      "args": ["/absolute/path/to/wasit/packages/server/dist/index.js"],
      "env": {
        "MPP_STELLAR_NETWORK": "stellar:testnet",
        "STELLAR_PRIVATE_KEY": "S...",
        "MPP_PAYER_SECRET": "S...",
        "COMMITMENT_SECRET_HEX": "...",
        "WASIT_CHECKS_PATH": "/absolute/path/to/wasit/docs/CHECKS.md"
      }
    }
  }
}
```

Use absolute paths throughout. An MCP client launches the server from a working
directory you do not control.

`WASIT_CHECKS_PATH` is not optional in practice. The server locates the check
catalogue by walking up from its own file, which works from a shell in the repo
and often fails when a client launches it from elsewhere. Without it the
catalogue resource is silently absent — the server still runs, but an agent
loses the ability to read what a check actually asserts.

## Tools

| Tool | Checks | Cost |
|---|---|---|
| `wasit_x402_test` | `X402-01`–`07` | `06`/`07` settle real payments |
| `wasit_mpp_charge_test` | `MPP-01` | Settles a real payment every call |
| `wasit_mpp_channel_test` | `MPP-10`–`12`, `14` | Free |
| `wasit_mpp_channel_test_with_close` | + `MPP-13` | **Destroys a channel** |

The fourth is registered **only** when the server is started with
`WASIT_ALLOW_DESTRUCTIVE=1` or `--allow-destructive`. Without that opt-in it
does not appear in `tools/list` at all.

Verify which tools a configuration exposes:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | node packages/server/dist/index.js \
  | python3 -c "import sys,json; print([t['name'] for t in json.load(sys.stdin)['result']['tools']])"
```

## Resource

`wasit://checks` serves `docs/CHECKS.md` — the authority on what each check
asserts. An agent should read it before interpreting a result rather than
inferring pass criteria from a check's name.

## Secrets are never tool arguments

Signing keys are read from the server process environment. No tool accepts one
as an argument, so an agent never handles a key, and a key cannot end up in a
transcript. A missing key returns an error result explaining which variable to
set.

## Results

Every tool returns both prose and `structuredContent`:

```json
{
  "outcome": "conformant",
  "passed": 5, "failed": 0, "errored": 0, "skipped": 1,
  "results": [
    { "id": "MPP-11", "name": "...", "status": "PASS",
      "detail": "...", "destructive": false }
  ]
}
```

`outcome` is a name, not an exit code — an integer means nothing to an agent,
and `no-verdict` must never be read as `conformant`. When any check errored, the
prose channel carries an explicit caveat that no statement was made about the
target's conformance.

## Why the destructive tool is a separate tool

`MPP-13` closes a payment channel. The settlement is final, the channel cannot
be reopened, and no later check can run against it.

An `allowDestructive: true` parameter would be a boolean an agent could set for
itself, which is not human consent in any meaningful sense. Registration-time
gating is stronger: the tool does not exist unless a person started the process
intending it to. When it does exist it still requires `destructiveChannel`
naming the channel it may close, and still refuses if the target's challenge
advertises a different address.

The reasoning is in
[../design/destructive-checks.md](../design/destructive-checks.md).
