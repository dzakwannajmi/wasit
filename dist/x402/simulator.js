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
    const hasPrice = payload.price !== undefined || payload.amount !== undefined;
    const hasNetwork = typeof payload.network === "string" && payload.network.length > 0;
    const hasPayTo = typeof payload.payTo === "string" && payload.payTo.length > 0;
    const pass = hasPrice && hasNetwork && hasPayTo;
    const missing = [!hasPrice && "price/amount", !hasNetwork && "network", !hasPayTo && "payTo"].filter(Boolean);
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
    if (payload === null || typeof payload.network !== "string") {
        return { id: "X402-05", name: "Network Identifier Valid", pass: false, detail: "No network field to check." };
    }
    const pass = /^stellar:(testnet|pubnet)$/.test(payload.network);
    return {
        id: "X402-05",
        name: "Network Identifier Valid",
        pass,
        detail: pass ? `Network identifier "${payload.network}" is valid.` : `"${payload.network}" does not match stellar:testnet or stellar:pubnet.`,
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
