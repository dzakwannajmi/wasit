/**
 * Manual commitment signing for the one-way-channel contract.
 *
 * The official client SDK always signs against its own local baseline, which
 * makes a fresh client single-use per channel. Conformance checks need to target
 * an explicit cumulative amount — including deliberately invalid ones — so this
 * module reproduces the server's own commitment-derivation path.
 *
 * Mirrors `verifyCommitmentSignature` in @stellar/mpp channel/server: simulate
 * `prepare_commitment(amount)` read-only, take the returned Bytes, and sign them
 * with the raw ed25519 commitment key. No transaction is submitted, no fee paid.
 */
import { Keypair } from "@stellar/stellar-sdk";
export declare class CommitmentSimulationError extends Error {
    readonly cause?: unknown;
    constructor(message: string, cause?: unknown);
}
export interface PrepareCommitmentParams {
    /** Channel contract address (C...). */
    readonly channelContract: string;
    /** Cumulative amount in base units. */
    readonly amount: bigint;
    readonly networkPassphrase: string;
    readonly rpcUrl: string;
    readonly simulationTimeoutMs?: number;
}
export interface SignChannelCommitmentParams extends PrepareCommitmentParams {
    /** Raw ed25519 seed as a 64-char hex string (NOT a Stellar S... secret). */
    readonly commitmentSecretHex: string;
}
/**
 * Builds a Keypair from the raw ed25519 seed used for channel commitments.
 * This is deliberately not a Stellar secret key: the contract verifies the
 * signature with `env.crypto().ed25519_verify`.
 */
export declare function commitmentKeypairFromHex(secretHex: string): Keypair;
/**
 * The exact amount the server will accept next, given the cumulative it
 * currently holds and the price of this request.
 *
 * Server rule (cumulativeMonotonicityError):
 *   commitmentAmount >  previousCumulative
 *   commitmentAmount >= previousCumulative + requestedAmount
 *
 * Since requestedAmount is always positive, the second condition subsumes the
 * first, and the minimum accepted value is their sum.
 */
export declare function nextValidCumulative(previousCumulative: bigint, requestedAmount: bigint): bigint;
/**
 * Simulates `prepare_commitment(amount)` and returns the bytes to be signed.
 */
export declare function prepareCommitmentBytes(params: PrepareCommitmentParams): Promise<Buffer>;
/**
 * Signs a channel commitment for an explicit cumulative amount.
 *
 * @returns The raw 64-byte ed25519 signature, hex-encoded, ready to be placed
 *   in the credential payload's `signature` field.
 */
export declare function signChannelCommitment(params: SignChannelCommitmentParams): Promise<string>;
