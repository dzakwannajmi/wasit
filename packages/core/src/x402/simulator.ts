import { errored, skipped, type CheckResult } from "../check.js";
import {
  MalformedResponseError,
  assertHttpUrl,
  fetchTarget,
} from "../errors.js";

export type { CheckResult };

export interface X402SimulatorOptions {
  target: string;
}

/**
 * The read-only checks, in catalogue order.
 *
 * Order is load-bearing: each check inspects something the previous one
 * produced, so when one fails the rest have nothing to inspect. They are
 * skipped rather than failed — a check that never ran is not a defect in the
 * target, and reporting one broken challenge as five separate findings tells
 * an operator their service is five times more broken than it is.
 */
const READ_CHECKS: ReadonlyArray<readonly [string, string]> = [
  ["X402-01", "402 Response Status"],
  ["X402-02", "Payment Header Present"],
  ["X402-03", "Header Payload Decodable"],
  ["X402-04", "Required Fields Present"],
  ["X402-05", "Network Identifier Valid"],
];

/** Skips every check after `id`, naming the one cause they all depend on. */
function skipAfter(id: string, reason: string): CheckResult[] {
  const index = READ_CHECKS.findIndex(([candidate]) => candidate === id);
  return READ_CHECKS.slice(index + 1).map(([checkId, name]) =>
    skipped(checkId, name, reason),
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/** x402 v2 nests the payment terms inside `accepts[]`, not at the top level. */
function firstAccept(payload: unknown): Record<string, unknown> | undefined {
  const accepts = asRecord(payload)?.["accepts"];
  return Array.isArray(accepts) ? asRecord(accepts[0]) : undefined;
}

/**
 * The field carrying the price, per protocol version.
 *
 * x402 v2 renamed `maxAmountRequired` to `amount` and dropped the embedded
 * resource object. Checking for whichever name happens to be present would
 * hide a real conformance failure: a service advertising `x402Version: 2`
 * while emitting the v1 field name is not conformant to the version it claims.
 */
const PRICE_FIELD: Readonly<Record<1 | 2, "maxAmountRequired" | "amount">> = {
  1: "maxAmountRequired",
  2: "amount",
};

function isSupportedVersion(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2;
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

/** X402-04: the challenge must carry price, network, and payTo. */
function checkRequiredFields(payload: unknown): CheckResult {
  const version = asRecord(payload)?.["x402Version"];
  const accept = firstAccept(payload);

  if (!isSupportedVersion(version)) {
    return {
      id: "X402-04",
      name: "Required Fields Present",
      pass: false,
      detail:
        `Challenge advertises x402Version ${JSON.stringify(version)}, which is ` +
        `neither 1 nor 2. The payment terms use different field names per ` +
        `version, so they cannot be checked against an unknown one.`,
    };
  }

  const expected = PRICE_FIELD[version];
  const wrongVersionField = version === 2 ? "maxAmountRequired" : "amount";

  // A v2 challenge carrying the v1 field name is a specific, actionable
  // failure — say which name was found and which one the version requires,
  // rather than reporting the price as simply absent.
  if (!nonEmptyString(accept?.[expected]) && accept?.[wrongVersionField] !== undefined) {
    return {
      id: "X402-04",
      name: "Required Fields Present",
      pass: false,
      detail:
        `Challenge advertises x402Version ${version} but carries ` +
        `\`${wrongVersionField}\`, which is the v${version === 2 ? 1 : 2} field ` +
        `name. v${version} requires \`${expected}\`.`,
    };
  }

  const missing = [
    nonEmptyString(accept?.[expected]) ? null : expected,
    nonEmptyString(accept?.["network"]) ? null : "network",
    nonEmptyString(accept?.["payTo"]) ? null : "payTo",
  ].filter((entry): entry is string => entry !== null);

  return {
    id: "X402-04",
    name: "Required Fields Present",
    pass: missing.length === 0,
    detail:
      missing.length === 0
        ? `All required v${version} fields present.`
        : `Missing: ${missing.join(", ")}.`,
  };
}

/** X402-05: the network identifier must be CAIP-2. */
function checkNetworkIdentifier(payload: unknown): CheckResult {
  const network = firstAccept(payload)?.["network"];

  // Absent is X402-04's finding, not a second one: report it there only.
  if (typeof network !== "string" || network.length === 0) {
    return skipped(
      "X402-05",
      "Network Identifier Valid",
      "the challenge carries no network field to validate (see X402-04).",
    );
  }

  const pass = /^stellar:(testnet|pubnet)$/.test(network);
  return {
    id: "X402-05",
    name: "Network Identifier Valid",
    pass,
    detail: pass
      ? `Network identifier "${network}" is valid.`
      : `"${network}" does not match stellar:testnet or stellar:pubnet.`,
  };
}

/**
 * Runs X402-01 through X402-05 against a target.
 *
 * Stops at the first failure whose consequence is that nothing downstream can
 * be evaluated, so one broken challenge produces one finding.
 */
export async function runX402ReadChecks(
  options: X402SimulatorOptions,
): Promise<CheckResult[]> {
  const { target } = options;

  // A bad URL is wrong for every check, so it is reported once rather than
  // five times over.
  try {
    assertHttpUrl(target);
  } catch (error) {
    return [errored("PREFLIGHT", "Run Preflight", error)];
  }

  let response: Response;
  try {
    response = await fetchTarget(target);
  } catch (error) {
    return [
      errored("X402-01", "402 Response Status", error),
      ...skipAfter(
        "X402-01",
        "the target was never reached, so it issued no challenge to inspect.",
      ),
    ];
  }

  const statusPass = response.status === 402;
  const r1: CheckResult = {
    id: "X402-01",
    name: "402 Response Status",
    pass: statusPass,
    detail: statusPass
      ? "Server responded with 402 as required."
      : `Expected status 402, got ${response.status}.`,
  };

  if (!statusPass) {
    return [
      r1,
      ...skipAfter(
        "X402-01",
        `the target answered ${response.status} rather than 402, so it issued ` +
          `no payment challenge to inspect.`,
      ),
    ];
  }

  // Both names are checked because Stellar's own documentation is not yet
  // internally consistent — see docs/CHECKS.md.
  const headerValue =
    response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-Payment");

  const r2: CheckResult = {
    id: "X402-02",
    name: "Payment Header Present",
    pass: headerValue !== null,
    detail:
      headerValue !== null
        ? "Payment header found."
        : "Neither PAYMENT-REQUIRED nor X-Payment header was present.",
  };

  if (headerValue === null) {
    return [
      r1,
      r2,
      ...skipAfter(
        "X402-02",
        "the 402 response carried no payment header, so there is no payload " +
          "to decode or inspect.",
      ),
    ];
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(headerValue, "base64").toString("utf-8"));
  } catch (error) {
    return [
      r1,
      r2,
      {
        id: "X402-03",
        name: "Header Payload Decodable",
        pass: false,
        detail: `Failed to decode/parse: ${(error as Error).message}`,
      },
      ...skipAfter(
        "X402-03",
        "the payment header did not decode to JSON, so no payload was " +
          "available to inspect.",
      ),
    ];
  }

  const r3: CheckResult = {
    id: "X402-03",
    name: "Header Payload Decodable",
    pass: true,
    detail: "Header decoded to valid JSON.",
  };

  return [r3, r2, r1].reverse().concat([
    checkRequiredFields(payload),
    checkNetworkIdentifier(payload),
  ]);
}

import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme as ExactStellarClientScheme } from "@x402/stellar/exact/client";

export interface X402PaymentCheckOptions {
  readonly target: string;
  readonly network: string;
  readonly payerSecretKey: string;
}

function buildX402Client(network: string, payerSecretKey: string) {
  const signer = createEd25519Signer(payerSecretKey, network as `${string}:${string}`);
  const client = new x402Client().register(
    "stellar:*",
    new ExactStellarClientScheme(signer),
  );
  return { client, httpClient: new x402HTTPClient(client) };
}

/**
 * Reads the challenge and produces a signed payment payload for it.
 *
 * Shared by both payment checks so each one starts from a challenge the
 * target issued just now, rather than reusing a stale one.
 */
async function preparePayment(options: X402PaymentCheckOptions) {
  const { client, httpClient } = buildX402Client(
    options.network,
    options.payerSecretKey,
  );

  const challenge = await fetchTarget(options.target);

  let paymentRequired;
  try {
    paymentRequired = httpClient.getPaymentRequiredResponse((name) =>
      challenge.headers.get(name),
    );
  } catch (error) {
    throw new MalformedResponseError(
      `The challenge could not be read as x402 payment requirements: ` +
        `${(error as Error).message}`,
    );
  }

  const paymentPayload = await client.createPaymentPayload(paymentRequired);
  return { httpClient, paymentPayload };
}

/** X402-06: a valid payment must be accepted. Settles on-chain. */
async function checkSignatureAccepted(
  options: X402PaymentCheckOptions,
): Promise<CheckResult> {
  const { httpClient, paymentPayload } = await preparePayment(options);
  const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);
  const paid = await fetchTarget(options.target, { headers });

  const pass = paid.status >= 200 && paid.status < 300;
  return {
    id: "X402-06",
    name: "Signature Resubmit Accepted",
    pass,
    detail: pass
      ? `Valid payment accepted (HTTP ${paid.status}).`
      : `Expected 2xx after a valid payment, got ${paid.status}.`,
  };
}

/**
 * X402-07 (negative): a corrupted signature must be rejected.
 *
 * This check previously treated *any* thrown error as proof of rejection,
 * which meant an unreachable target made a security check pass. A rejection
 * is only established by the target answering non-200; anything that prevents
 * an answer produces no verdict and is reported as such.
 */
async function checkInvalidSignatureRejected(
  options: X402PaymentCheckOptions,
): Promise<CheckResult> {
  const { httpClient, paymentPayload } = await preparePayment(options);

  // Corrupt the signed transaction after signing, so the payload is
  // well-formed everywhere except the signature it carries.
  const corrupted = {
    ...paymentPayload,
    payload: {
      ...paymentPayload.payload,
      transaction:
        (paymentPayload.payload.transaction as string).slice(0, -8) + "AAAAAAAA",
    },
  };

  const headers = httpClient.encodePaymentSignatureHeader(corrupted);
  const response = await fetchTarget(options.target, { headers });

  const pass = response.status !== 200;
  return {
    id: "X402-07",
    name: "Invalid Signature Rejected",
    pass,
    detail: pass
      ? `Corrupted payment correctly rejected (HTTP ${response.status}).`
      : `Corrupted payment was accepted with HTTP 200 — security-relevant failure.`,
  };
}

/**
 * Runs X402-06 and X402-07 against a target.
 *
 * Both settle real payments when the target accepts them; see docs/CHECKS.md.
 */
export async function runX402PaymentChecks(
  options: X402PaymentCheckOptions,
): Promise<CheckResult[]> {
  try {
    assertHttpUrl(options.target);
  } catch (error) {
    return [errored("PREFLIGHT", "Run Preflight", error)];
  }

  const results: CheckResult[] = [];

  let accepted: CheckResult;
  try {
    accepted = await checkSignatureAccepted(options);
  } catch (error) {
    accepted = errored("X402-06", "Signature Resubmit Accepted", error);
  }
  results.push(accepted);

  // If the payment flow could not be exercised at all, a corrupted variant of
  // it cannot be either — and must not be reported as a passing rejection.
  if (accepted.error !== undefined) {
    results.push(
      skipped(
        "X402-07",
        "Invalid Signature Rejected",
        `the payment flow could not be exercised (${accepted.error.kind}), so ` +
          `a corrupted signature cannot be tested against it.`,
      ),
    );
    return results;
  }

  try {
    results.push(await checkInvalidSignatureRejected(options));
  } catch (error) {
    results.push(errored("X402-07", "Invalid Signature Rejected", error));
  }

  return results;
}
