# Third-Party Validation — Run 1

**Date:** 2026-08-15
**Wasit:** branch `main`, x402 read-only checks (`X402-01` … `X402-05`)
**Method:** every target cloned and run locally from source. No hosted service
was contacted. Payment checks (`X402-06`, `X402-07`) were not run — this pass
covers the challenge-shape checks only, which cost nothing and settle nothing.

## Summary

Four x402 repositories in the Stellar ecosystem were examined. Two expose a
Stellar-denominated paid endpoint that can be exercised; both conform. The
other two do not expose one at all, for different reasons.

| Repository | Commit | x402 package | Verdict |
|---|---|---|---|
| `Hoops-Finance/calypso-x402` | `e33d521` (2026-04-13) | `@x402/express@2.9.0` | **5/5 PASS** |
| `Andy00L/x402-autopilot` | `b9e88e2` (2026-04-12) | `@x402/express@latest` | **5/5 PASS** |
| `TKCollective/x402-research-skill` | `9c657fa0` (2026-08-09) | `@coinbase/x402@2.1.0`, `@x402/core@2.11.0` | No testable endpoint |
| `fxjrin/defi-copilot` | `e97879d` (2026-04-12) | `x402-stellar@0.2.0` | No testable endpoint |

## Results

### Hoops-Finance/calypso-x402 — 5/5 PASS

Paid endpoint: `POST /plan`, $0.01, `stellar:testnet`. Uses an in-process
facilitator rather than a remote one.

```
PASS  X402-01  402 Response Status
PASS  X402-02  Payment Header Present
PASS  X402-03  Header Payload Decodable
PASS  X402-04  Required Fields Present
PASS  X402-05  Network Identifier Valid
```

Challenge carried `x402Version: 2`, `amount: "100000"`, `network:
"stellar:testnet"`, and a `payTo` address, under the `PAYMENT-REQUIRED`
header.

Command:

```bash
wasit test --target http://localhost:9990/plan --method POST --body '{}' --read-only
```

### Andy00L/x402-autopilot — 5/5 PASS

Paid endpoint: `GET /prices`, $0.001, `stellar:testnet`. Four paywalled
services ship in this repository (ports 4001–4004); one was exercised, since
they share one resource-server construction.

```
PASS  X402-01  402 Response Status
PASS  X402-02  Payment Header Present
PASS  X402-03  Header Payload Decodable
PASS  X402-04  Required Fields Present
PASS  X402-05  Network Identifier Valid
```

Challenge carried `x402Version: 2`, `amount: "10000"`, `network:
"stellar:testnet"`, under the `PAYMENT-REQUIRED` header.

Note on provenance: this service reads its `payTo` from a `WEATHER_API_WALLET`
environment variable which the repository leaves blank for the operator to
fill. The address appearing in the challenge is therefore ours, not the
project's, and says nothing about the project.

Command:

```bash
wasit test --target http://localhost:4001/prices --read-only
```

### TKCollective/x402-research-skill — no testable endpoint

This is a live, commercially operated service (listed on Coinbase Bazaar) that
settles on Base, SKALE, and — per its own configuration — Stellar. Its Stellar
facilitator is constructed and registered, and three Stellar accept configs
exist (`stellarAcceptResearch`, `stellarAcceptDeep`, `stellarAcceptBatch`).

None of them is mounted on a route. A comment at `index.js:1045` states the
definitions are "preserved … for use on dedicated future routes". The Stellar
payment path is therefore built but not yet reachable over HTTP, so there is
nothing for the checks to address.

### fxjrin/defi-copilot — no testable endpoint

The x402 role here is the payer, not the payee: the MCP server acts as a
client, and a local facilitator (port 4022) exposes `/supported` and `/verify`.
The resource server at `src/server.ts` mounts no payment middleware and serves
only `/health` and `/`.

Worth recording: this implementation identifies its network as
`stellar-testnet`, not the CAIP-2 form `stellar:testnet` that `X402-05`
requires and that both testable services above emit. The string appears in the
facilitator's `/supported` response and in service metadata rather than in a
402 challenge, so no check observes it — but it is a divergence in the
ecosystem, in a package (`x402-stellar@0.2.0`) independent of the `@x402/*`
line.

## Observations

**The payment header name divergence is real in the field.** Both testable
services emit `PAYMENT-REQUIRED`. Stellar's own conceptual guide describes that
name while its working quickstart, built on `@x402/stellar`, reads `X-Payment`.
`X402-02` accepts either. Before this run the divergence was evidenced only by
Stellar's documentation contradicting itself; it now has two field
confirmations.

**A Stellar-denominated x402 endpoint is harder to find than the ecosystem's
surface suggests.** All four repositories advertise Stellar x402 support in
their READMEs, badges, or npm keywords. Two of the four have no reachable
Stellar-denominated paid endpoint. This is not a criticism of either project —
one is mid-migration, the other is a client by design — but it does mean the
count of *running* Stellar x402 services is lower than the count of projects
describing themselves as such.

**A resource server will not start when no facilitator answers.**
`@x402/core`'s `x402ResourceServer.initialize()` throws when it cannot load
supported payment kinds from any facilitator, so the service cannot serve
challenges at all — it fails at boot, not at payment time. Availability of an
x402 service is therefore coupled to availability of a third party. Not a spec
violation; an operational property worth knowing.

**A documented keyless fallback that cannot be taken.**
`x402-autopilot`'s `.env.example` states the data-source servers "fall back to
https://x402.org/facilitator (Coinbase) if OZ_FACILITATOR_URL is unset". The
URL does default correctly, but `createAuthHeaders` in `data-sources/src/shared.ts`
calls `env("OZ_API_KEY")` unconditionally and that helper throws when the
variable is empty — so the keyless path cannot actually be taken. Reported here
rather than upstream because it is a defect in a hackathon project rather than
in an SDK; if the maintainer wants it, the fix is to attach `createAuthHeaders`
only when the OpenZeppelin facilitator is in use.

## What this run found in Wasit itself

`runX402ReadChecks` issued a bare `GET` at every target. `calypso-x402`'s paid
endpoints are both `POST`, so the wrong verb drew a 404 and the run reported
that the service never answers 402 — a false finding about a conformant
service, which is the worst output a conformance tester can produce.

Our own fixture is a `GET`, so nothing we wrote ourselves would have exposed
this. It took third-party code. `--method`, `--body` and `--header` now thread
through the whole suite, and an unusable request shape is reported once through
`PREFLIGHT` as a configuration error rather than as a finding about the target.

## Reproducing

```bash
mkdir -p targets && cd targets
git clone https://github.com/Hoops-Finance/calypso-x402.git
git clone https://github.com/Andy00L/x402-autopilot.git
```

Each needs its own environment file; see the repositories' own instructions.
Both were run entirely on localhost against Stellar testnet, and no hosted
deployment belonging to either project was contacted.