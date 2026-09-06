# The Error Model

A protocol-compliance tester makes claims about someone else's service. The most
damaging thing it can do is make a claim it has no basis for.

"Your service returned the wrong status code" and "we could not reach your
service" are different statements. Reporting the second as the first tells an
operator their service is broken when it may be perfectly correct, and they will
spend real time chasing it. So the two are reported separately, and the
distinction runs all the way down to the exit code.

## Four statuses

**PASS** — the check ran and the target conformed.

**FAIL** — the check ran and the target did not conform. The service answered,
and what it answered violated the spec: wrong status, unparseable challenge,
missing fields, a settlement that moved the wrong amount. This is a statement
about the target.

**ERROR** — no verdict was produced. Sub-classified as `unreachable` (no HTTP
conversation took place), `configuration` (the run is set up wrongly), or
`harness` (Wasit or a dependency failed). **An ERROR is never a statement about
the target's conformance.**

**SKIP** — the check did not run, for a stated reason: a destructive check
without opt-in, missing expected parameters, or a dependency on an earlier check
that failed.

## Exit codes

| Code | Condition |
|---|---|
| `0` | Everything that ran conformed |
| `1` | At least one conformance failure |
| `2` | At least one check produced no verdict |

Both present exits `1` — a real finding outranks a missing one. Skips never
affect the code.

## Errors are classified where they are thrown

Third-party throw sites have no documented error types. Node's `fetch` reports
every transport failure as `TypeError: fetch failed` and hangs the real code off
`.cause`; the mppx challenge parser and the Stellar SDK throw plain errors.
Sniffing at the catch site would be guesswork.

So the call site wraps instead: it knows what it was attempting, and throws
`TargetUnreachableError`, `ConfigurationError`, or `MalformedResponseError`
accordingly. `fetchTarget()` replaces bare `fetch` for anything addressed at the
service under test, so a connection failure can never be mistaken for a bad
response.

A malformed response is deliberately **not** an error. The target answered; the
answer was wrong. That is a finding.

## Cascading failures

The read-only x402 checks inspect progressively deeper parts of one challenge:
the status, then the header, then its payload, then the fields inside it. When
one fails, the ones after it have nothing left to inspect.

Reporting those as failures produced five findings from one cause. A target
answering 404 is not five times broken. They are now skipped, each naming the
cause it depended on. The same applies to the payment checks: when `X402-06`
cannot exercise the payment flow at all, `X402-07` is skipped rather than
credited with a rejection it never observed.

That last case was a live bug. `X402-07` treated any thrown error as proof that
a corrupted signature had been rejected — so an unreachable host made a security
check pass.

## PREFLIGHT

An invalid target URL or network identifier is wrong for every check in a suite.
Reporting it per check buries one real cause under N identical copies, so it is
emitted once as `PREFLIGHT` and no check runs.

`PREFLIGHT` is not a check. It has no spec reference and no row in the
catalogue.
