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
import { Challenge, Credential } from "mppx";
import { MalformedResponseError, fetchTarget } from "../errors.js";
import { signChannelCommitment } from "./channel-commitment.js";
import { networkPassphrase, resolveRpcUrl } from "./network.js";
export class ChannelChallengeError extends MalformedResponseError {
    constructor(message) {
        super(message);
        this.name = "ChannelChallengeError";
    }
}
function asRecord(value) {
    return typeof value === "object" && value !== null
        ? value
        : undefined;
}
function readString(source, key) {
    const value = source[key];
    return typeof value === "string" ? value : undefined;
}
/**
 * Requests the resource unpaid and parses the resulting 402 challenge.
 *
 * Every probe must call this fresh. The server claims a challenge ID on first
 * use via an atomic compare-and-set, so reusing a challenge triggers replay
 * rejection before any commitment logic runs — which would silently mask the
 * rule a check is trying to exercise.
 */
export async function fetchChannelChallenge(target) {
    const response = await fetchTarget(target);
    if (response.status !== 402) {
        throw new ChannelChallengeError(`Expected HTTP 402 with a payment challenge, got ${response.status}.`);
    }
    let challenge;
    try {
        challenge = Challenge.fromResponse(response);
    }
    catch (error) {
        throw new ChannelChallengeError(`Challenge could not be parsed from the WWW-Authenticate header: ` +
            `${error.message}`);
    }
    const request = asRecord(challenge.request);
    if (!request) {
        throw new ChannelChallengeError("Challenge carries no request object.");
    }
    const channelContract = readString(request, "channel");
    const requested = readString(request, "amount");
    if (!channelContract || !requested) {
        throw new ChannelChallengeError("Challenge request is missing `channel` or `amount`.");
    }
    // Absent on a channel that has not yet taken a voucher. Zero is the server's
    // own starting cumulative, so it is the correct reading of "not present".
    const methodDetails = asRecord(request["methodDetails"]);
    const cumulativeRaw = methodDetails
        ? readString(methodDetails, "cumulativeAmount")
        : undefined;
    try {
        return {
            challenge,
            channelContract,
            requestedAmount: BigInt(requested),
            cumulativeAmount: BigInt(cumulativeRaw ?? "0"),
        };
    }
    catch {
        throw new ChannelChallengeError(`Challenge carries non-numeric amounts (amount="${requested}", ` +
            `cumulativeAmount="${cumulativeRaw ?? "0"}").`);
    }
}
/**
 * Serialises an already-signed commitment into an Authorization header value.
 *
 * Kept separate from signing so a check can re-present a captured
 * (amount, signature) pair against a *different* challenge — the commitment
 * replay vector, which the official client cannot express because it always
 * re-signs.
 */
export function serializeChannelCredential(parameters) {
    const { challenge, amount, signature, action = "voucher" } = parameters;
    return Credential.serialize(Credential.from({
        challenge: challenge.challenge,
        payload: { action, amount: amount.toString(), signature },
    }));
}
/** Signs `amount` for this challenge's channel and serialises the credential. */
export async function buildChannelCredential(parameters) {
    const { challenge, amount, commitmentSecretHex, network, rpcUrl, action } = parameters;
    const signature = await signChannelCommitment({
        channelContract: challenge.channelContract,
        amount,
        commitmentSecretHex,
        networkPassphrase: networkPassphrase(network),
        rpcUrl: resolveRpcUrl(network, rpcUrl),
    });
    return {
        signature,
        credential: serializeChannelCredential({ challenge, amount, signature, action }),
    };
}
/** Submits a credential and captures both status and body for diagnostics. */
export async function submitCredential(target, credential) {
    const response = await fetchTarget(target, {
        headers: { Authorization: credential },
    });
    return { status: response.status, body: await response.text() };
}
