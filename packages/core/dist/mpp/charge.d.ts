import type { CheckResult } from "../x402/simulator.js";
export interface MppChargeCheckOptions {
    target: string;
    network: string;
    payerSecretKey: string;
}
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
export declare function runMppChargeChecks(options: MppChargeCheckOptions): Promise<CheckResult[]>;
