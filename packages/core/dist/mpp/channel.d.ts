import type { CheckResult } from "../check.js";
export interface MppChannelDeployCheckOptions {
    channelContract: string;
    network: string;
    expected: {
        token: string;
        from: string;
        to: string;
        refundWaitingPeriod: number;
    };
}
/**
 * MPP-10: The channel contract deploys correctly — its address is valid
 * and its on-chain state is queryable, and matches the parameters it was
 * opened with (token, funder, recipient, refund waiting period).
 */
export declare function runMppChannelDeployChecks(options: MppChannelDeployCheckOptions): Promise<CheckResult[]>;
export interface MppChannelCheckOptions {
    /** URL of the paid resource on the target service. */
    target: string;
    /** Raw ed25519 commitment seed, hex. Must match the channel's commitment key. */
    commitmentSecretHex: string;
    /** CAIP-2 network id, e.g. "stellar:testnet". */
    network: string;
    /** Overrides the default RPC endpoint for the network. */
    rpcUrl?: string;
}
/**
 * MPP-11: A commitment that does not advance the cumulative must be rejected.
 *
 * The server applies two distinct rules (cumulativeMonotonicityError):
 *   (a) commitmentAmount >  previousCumulative
 *   (b) commitmentAmount >= previousCumulative + requestedAmount
 * Both are probed. Each probe fetches a FRESH challenge, so the challenge
 * replay guard — which runs earlier and returns the same HTTP 402 — cannot
 * fire and be mistaken for monotonicity enforcement.
 *
 * The check first advances the cumulative by exactly one request, which makes
 * it re-runnable against a channel with any prior history.
 */
export declare function runMppChannelOrderingCheck(options: MppChannelCheckOptions): Promise<CheckResult[]>;
/**
 * MPP-12: Resubmitting an identical credential must be rejected.
 *
 * Targets the challenge replay guard specifically: the credential replayed is
 * byte-identical to one the server accepted moments earlier, so its signature
 * and amount are already proven valid and only the challenge-ID claim can
 * account for the rejection.
 */
export declare function runMppChannelReplayCheck(options: MppChannelCheckOptions): Promise<CheckResult[]>;
/**
 * MPP-14: A captured commitment must not be redeemable against a new challenge.
 *
 * The realistic double-spend: an observer lifts a valid (amount, signature)
 * pair off the wire, requests a fresh challenge of their own, and re-presents
 * the captured commitment. The challenge replay guard cannot help — the
 * challenge ID is new — so only the cumulative rule stands between the attacker
 * and a second delivery. The official client cannot express this, because it
 * re-signs on every call.
 */
export declare function runMppChannelCommitmentReplayCheck(options: MppChannelCheckOptions): Promise<CheckResult[]>;
export interface MppChannelCloseCheckOptions extends MppChannelCheckOptions {
    /**
     * Contract address the operator intends to destroy. The check refuses to run
     * unless the target's challenge advertises exactly this channel, so pointing
     * a destructive run at the wrong service closes nothing.
     */
    expectedChannel?: string;
    allowDestructive?: boolean;
    closePollAttempts?: number;
    closePollDelayMs?: number;
}
export declare function runMppChannelCloseCheck(options: MppChannelCloseCheckOptions): Promise<CheckResult[]>;
