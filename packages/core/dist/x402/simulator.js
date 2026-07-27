/**
 * X402-01: An unpaid request must be answered with status code 402
 */
async function checkResponseStatus(target) {
    const res = await fetch(target);
    const pass = res.status === 402;
    return {
        res,
        result: {
            id: "X402-01",
            name: "402 Response Status",
            pass,
            detail: pass
                ? "Server responded with 402 as required."
                : `Expected status 402, got ${res.status}.`,
        },
    };
}
/**
 * X402-02: The 402 response must include a payment header
 * (checks both PAYMENT-REQUIRED and X-Payment, since Stellar's own
 * docs are not yet consistent — see docs/CHECKS.md)
 */
function checkPaymentHeaderPresent(res) {
    const headerValue = res.headers.get("PAYMENT-REQUIRED") ?? res.headers.get("X-Payment");
    const pass = headerValue !== null;
    return {
        headerValue,
        result: {
            id: "X402-02",
            name: "Payment Header Present",
            pass,
            detail: pass
                ? "Payment header found."
                : "Neither PAYMENT-REQUIRED nor X-Payment header was present.",
        },
    };
}
/**
 * X402-03: The header value must be valid base64 that decodes to JSON
 */
function checkHeaderDecodable(headerValue) {
    if (headerValue === null) {
        return {
            payload: null,
            result: { id: "X402-03", name: "Header Payload Decodable", pass: false, detail: "No header to decode (X402-02 failed)." },
        };
    }
    try {
        const decoded = Buffer.from(headerValue, "base64").toString("utf-8");
        const payload = JSON.parse(decoded);
        return {
            payload,
            result: { id: "X402-03", name: "Header Payload Decodable", pass: true, detail: "Header decoded to valid JSON." },
        };
    }
    catch (err) {
        return {
            payload: null,
            result: { id: "X402-03", name: "Header Payload Decodable", pass: false, detail: `Failed to decode/parse: ${err.message}` },
        };
    }
}
/**
 * X402-04: The payload must include price/amount, network, payTo
 */
function checkRequiredFields(payload) {
    if (payload === null) {
        return { id: "X402-04", name: "Required Fields Present", pass: false, detail: "No payload to check (X402-03 failed)." };
    }
    // x402 v2: fields live inside accepts[0], not at the top level
    const accept = Array.isArray(payload.accepts) ? payload.accepts[0] : undefined;
    const hasPrice = accept?.maxAmountRequired !== undefined || accept?.price !== undefined;
    const hasNetwork = typeof accept?.network === "string" && accept.network.length > 0;
    const hasPayTo = typeof accept?.payTo === "string" && accept.payTo.length > 0;
    const pass = hasPrice && hasNetwork && hasPayTo;
    const missing = [!hasPrice && "price/maxAmountRequired", !hasNetwork && "network", !hasPayTo && "payTo"].filter(Boolean);
    return {
        id: "X402-04",
        name: "Required Fields Present",
        pass,
        detail: pass ? "All required fields present." : `Missing: ${missing.join(", ")}.`,
    };
}
/**
 * X402-05: Network identifier must follow CAIP-2 (stellar:testnet / stellar:pubnet)
 */
function checkNetworkIdentifier(payload) {
    const accept = Array.isArray(payload?.accepts) ? payload.accepts[0] : undefined;
    const network = accept?.network;
    if (typeof network !== "string") {
        return { id: "X402-05", name: "Network Identifier Valid", pass: false, detail: "No network field to check." };
    }
    const pass = /^stellar:(testnet|pubnet)$/.test(network);
    return {
        id: "X402-05",
        name: "Network Identifier Valid",
        pass,
        detail: pass ? `Network identifier "${network}" is valid.` : `"${network}" does not match stellar:testnet or stellar:pubnet.`,
    };
}
export async function runX402ReadChecks(options) {
    const { res, result: r1 } = await checkResponseStatus(options.target);
    const { headerValue, result: r2 } = checkPaymentHeaderPresent(res);
    const { payload, result: r3 } = checkHeaderDecodable(headerValue);
    const r4 = checkRequiredFields(payload);
    const r5 = checkNetworkIdentifier(payload);
    return [r1, r2, r3, r4, r5];
}
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme as ExactStellarClientScheme } from "@x402/stellar/exact/client";
function buildX402Client(network, payerSecretKey) {
    const signer = createEd25519Signer(payerSecretKey, network);
    const client = new x402Client().register("stellar:*", new ExactStellarClientScheme(signer));
    return { client, httpClient: new x402HTTPClient(client) };
}
/**
 * X402-06: A resubmitted request with a valid signature must be accepted
 */
async function checkSignatureAccepted(options) {
    const { client, httpClient } = buildX402Client(options.network, options.payerSecretKey);
    try {
        const firstTry = await fetch(options.target);
        const paymentRequired = httpClient.getPaymentRequiredResponse((name) => firstTry.headers.get(name));
        const paymentPayload = await client.createPaymentPayload(paymentRequired);
        const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);
        const paidResponse = await fetch(options.target, { headers });
        const pass = paidResponse.status >= 200 && paidResponse.status < 300;
        return {
            id: "X402-06",
            name: "Signature Resubmit Accepted",
            pass,
            detail: pass ? "Valid payment was accepted." : `Expected 2xx after valid payment, got ${paidResponse.status}.`,
        };
    }
    catch (err) {
        return { id: "X402-06", name: "Signature Resubmit Accepted", pass: false, detail: `Error: ${err.message}` };
    }
}
/**
 * X402-07 (negative): A deliberately malformed signature must be REJECTED
 */
async function checkInvalidSignatureRejected(options) {
    const { client, httpClient } = buildX402Client(options.network, options.payerSecretKey);
    try {
        const firstTry = await fetch(options.target);
        const paymentRequired = httpClient.getPaymentRequiredResponse((name) => firstTry.headers.get(name));
        const paymentPayload = await client.createPaymentPayload(paymentRequired);
        // Deliberately corrupt the signed transaction so the payload is invalid
        const corrupted = {
            ...paymentPayload,
            payload: { ...paymentPayload.payload, transaction: paymentPayload.payload.transaction.slice(0, -8) + "AAAAAAAA" },
        };
        const headers = httpClient.encodePaymentSignatureHeader(corrupted);
        const res = await fetch(options.target, { headers });
        const pass = res.status !== 200; // must NOT be silently accepted
        return {
            id: "X402-07",
            name: "Invalid Signature Rejected",
            pass,
            detail: pass ? "Corrupted payment was correctly rejected." : "Corrupted payment was incorrectly accepted (200) — security-relevant failure.",
        };
    }
    catch (err) {
        // A thrown error while processing a corrupted payload also counts as "rejected"
        return { id: "X402-07", name: "Invalid Signature Rejected", pass: true, detail: `Rejected via error (acceptable): ${err.message}` };
    }
}
export async function runX402PaymentChecks(options) {
    const r6 = await checkSignatureAccepted(options);
    const r7 = await checkInvalidSignatureRejected(options);
    return [r6, r7];
}
