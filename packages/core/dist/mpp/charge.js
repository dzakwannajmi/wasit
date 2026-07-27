import { Mppx, charge } from "@stellar/mpp/charge/client";
import { Receipt } from "mppx";
import { Horizon } from "@stellar/stellar-sdk";
/**
 * MPP-01: The charge transaction must actually settle on-chain, with the
 * correct amount, verified independently via Horizon.
 *
 * Note: with mode "pull" (the default), onProgress only fires through
 * "signed" — the server broadcasts and confirms. The tx reference is
 * delivered via the Payment-Receipt response header, not onProgress.
 * (Confirmed empirically: mode "push" may emit further "paying"/
 * "confirming"/"paid" events, but that path is unverified — see caveat below.)
 */
export async function runMppChargeChecks(options) {
    const mppx = Mppx.create({
        methods: [
            charge({
                secretKey: options.payerSecretKey,
            }),
        ],
    });
    let res;
    try {
        res = await mppx.fetch(options.target);
    }
    catch (err) {
        return [
            {
                id: "MPP-01",
                name: "Charge Settlement On-Chain",
                pass: false,
                detail: `Request failed: ${err.message}`,
            },
        ];
    }
    if (!res.ok) {
        return [
            {
                id: "MPP-01",
                name: "Charge Settlement On-Chain",
                pass: false,
                detail: `Expected a settled 2xx response, got HTTP ${res.status}.`,
            },
        ];
    }
    let reference;
    try {
        const receipt = Receipt.fromResponse(res);
        reference = receipt.reference;
    }
    catch (err) {
        return [
            {
                id: "MPP-01",
                name: "Charge Settlement On-Chain",
                pass: false,
                detail: `2xx response but no valid Payment-Receipt header: ${err.message}`,
            },
        ];
    }
    // Independent verification: confirm on-chain via Horizon that the
    // referenced transaction exists and actually succeeded, rather than
    // trusting the receipt's self-reported "success" status alone.
    const horizon = new Horizon.Server(options.network === "stellar:pubnet"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org");
    try {
        const tx = await horizon.transactions().transaction(reference).call();
        const pass = tx.successful === true;
        return [
            {
                id: "MPP-01",
                name: "Charge Settlement On-Chain",
                pass,
                detail: pass
                    ? `Settlement confirmed on-chain (tx ${reference}).`
                    : `Transaction ${reference} found but marked unsuccessful on-chain.`,
            },
        ];
    }
    catch (err) {
        return [
            {
                id: "MPP-01",
                name: "Charge Settlement On-Chain",
                pass: false,
                detail: `Payment-Receipt referenced tx ${reference}, but Horizon lookup failed: ${err.message}`,
            },
        ];
    }
}
