/**
 * Manual credential construction for MPP channel mode.
 *
 * The official client always signs `localBaseline + price`, and that baseline
 * starts at zero for a fresh client. This makes it single-use per channel: once
 * any voucher lands, the server's cumulative has moved past anything a fresh
 * client will offer. Conformance checks must be re-runnable against a channel
 * with arbitrary prior history, and must be able to submit deliberately invalid
 * amounts, so they assemble credentials directly.
 */
import { Challenge } from "mppx";
import { MalformedResponseError } from "../errors.js";
export type ChannelAction = "voucher" | "close";
export declare class ChannelChallengeError extends MalformedResponseError {
    constructor(message: string);
}
/** The channel-specific fields Wasit reads out of a 402 challenge. */
export interface ChannelChallenge {
    /** The raw challenge, needed verbatim when serialising a credential. */
    readonly challenge: Challenge.Challenge;
    /** Channel contract the server expects to be paid through. */
    readonly channelContract: string;
    /** Price of this single request, in base units. */
    readonly requestedAmount: bigint;
    /**
     * Cumulative the server claims to hold. Self-reported by the target, so a
     * dishonest server could skew any amount derived from it. Used only to
     * construct probe amounts, never as the thing being asserted.
     */
    readonly cumulativeAmount: bigint;
}
/**
 * Requests the resource unpaid and parses the resulting 402 challenge.
 *
 * Every probe must call this fresh. The server claims a challenge ID on first
 * use via an atomic compare-and-set, so reusing a challenge triggers replay
 * rejection before any commitment logic runs — which would silently mask the
 * rule a check is trying to exercise.
 */
export declare function fetchChannelChallenge(target: string): Promise<ChannelChallenge>;
/**
 * Serialises an already-signed commitment into an Authorization header value.
 *
 * Kept separate from signing so a check can re-present a captured
 * (amount, signature) pair against a *different* challenge — the commitment
 * replay vector, which the official client cannot express because it always
 * re-signs.
 */
export declare function serializeChannelCredential(parameters: {
    readonly challenge: ChannelChallenge;
    readonly amount: bigint;
    readonly signature: string;
    readonly action?: ChannelAction;
}): string;
export interface BuildChannelCredentialParams {
    readonly challenge: ChannelChallenge;
    /** Absolute cumulative amount to commit to, in base units. */
    readonly amount: bigint;
    readonly commitmentSecretHex: string;
    readonly network: string;
    readonly rpcUrl?: string;
    readonly action?: ChannelAction;
}
/** Signs `amount` for this challenge's channel and serialises the credential. */
export declare function buildChannelCredential(parameters: BuildChannelCredentialParams): Promise<{
    credential: string;
    signature: string;
}>;
export interface SubmissionResult {
    readonly status: number;
    readonly body: string;
}
/** Submits a credential and captures both status and body for diagnostics. */
export declare function submitCredential(target: string, credential: string): Promise<SubmissionResult>;
