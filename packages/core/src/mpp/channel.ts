import { getChannelState } from "@stellar/mpp/channel/server";
import type { CheckResult } from "../check.js";
import { signChannelCommitment } from "./channel-commitment.js";
import {
  buildChannelCredential,
  fetchChannelChallenge,
  serializeChannelCredential,
  submitCredential,
} from "./channel-credential.js";
import { networkPassphrase, resolveRpcUrl } from "./network.js";

export interface MppChannelDeployCheckOptions {
  channelContract: string;
  network: string; // e.g. "stellar:testnet"
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
export async function runMppChannelDeployChecks(
  options: MppChannelDeployCheckOptions,
): Promise<CheckResult[]> {
  let state;
  try {
    state = await getChannelState({
      channel: options.channelContract,
      network: options.network as `${string}:${string}`,
    });
  } catch (err) {
    return [
      {
        id: "MPP-10",
        name: "Channel Deploy",
        pass: false,
        detail: `Channel state query failed for ${options.channelContract}: ${(err as Error).message}`,
      },
    ];
  }

  const mismatches: string[] = [];
  if (state.token !== options.expected.token) {
    mismatches.push(`token: expected ${options.expected.token}, got ${state.token}`);
  }
  if (state.from !== options.expected.from) {
    mismatches.push(`from: expected ${options.expected.from}, got ${state.from}`);
  }
  if (state.to !== options.expected.to) {
    mismatches.push(`to: expected ${options.expected.to}, got ${state.to}`);
  }
  if (state.refundWaitingPeriod !== options.expected.refundWaitingPeriod) {
    mismatches.push(
      `refundWaitingPeriod: expected ${options.expected.refundWaitingPeriod}, got ${state.refundWaitingPeriod}`,
    );
  }

  const pass = mismatches.length === 0;
  return [
    {
      id: "MPP-10",
      name: "Channel Deploy",
      pass,
      detail: pass
        ? `Channel ${options.channelContract} deployed and queryable — balance=${state.balance}, currentLedger=${state.currentLedger}.`
        : `Channel state mismatch: ${mismatches.join("; ")}.`,
    },
  ];
}

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

function failure(id: string, name: string, detail: string): CheckResult[] {
  return [{ id, name, pass: false, detail }];
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
export async function runMppChannelOrderingCheck(
  options: MppChannelCheckOptions,
): Promise<CheckResult[]> {
  const id = "MPP-11";
  const name = "Cumulative Commitment Ordering";
  const { target, commitmentSecretHex, network, rpcUrl } = options;

  try {
    const opening = await fetchChannelChallenge(target);
    const baseline = opening.cumulativeAmount + opening.requestedAmount;

    const { credential } = await buildChannelCredential({
      challenge: opening,
      amount: baseline,
      commitmentSecretHex,
      network,
      rpcUrl,
    });
    const accepted = await submitCredential(target, credential);
    if (accepted.status !== 200) {
      return failure(
        id,
        name,
        `Setup failed: a correctly advancing commitment (${baseline}) was not accepted — ` +
          `HTTP ${accepted.status}: ${accepted.body}`,
      );
    }

    // (a) Exactly equal to the cumulative the server now holds.
    const equalChallenge = await fetchChannelChallenge(target);
    const equal = await submitCredential(
      target,
      (
        await buildChannelCredential({
          challenge: equalChallenge,
          amount: baseline,
          commitmentSecretHex,
          network,
          rpcUrl,
        })
      ).credential,
    );
    if (equal.status !== 402) {
      return failure(
        id,
        name,
        `A commitment equal to the current cumulative (${baseline}) was not rejected — ` +
          `expected HTTP 402, got ${equal.status}: ${equal.body}`,
      );
    }

    // (b) Advances, but does not cover this request's price. Only meaningful
    // when the price exceeds one base unit; otherwise it collapses into (a).
    const shortChallenge = await fetchChannelChallenge(target);
    if (shortChallenge.requestedAmount <= 1n) {
      return [
        {
          id,
          name,
          pass: true,
          detail:
            `Non-advancing commitment correctly rejected (HTTP 402). ` +
            `Under-covering sub-case not probed: the request price is ` +
            `${shortChallenge.requestedAmount} base unit, too small to distinguish it.`,
        },
      ];
    }

    const shortAmount = baseline + shortChallenge.requestedAmount - 1n;
    const short = await submitCredential(
      target,
      (
        await buildChannelCredential({
          challenge: shortChallenge,
          amount: shortAmount,
          commitmentSecretHex,
          network,
          rpcUrl,
        })
      ).credential,
    );
    if (short.status !== 402) {
      return failure(
        id,
        name,
        `A commitment that advances but under-covers the request price ` +
          `(${shortAmount} vs required ${baseline + shortChallenge.requestedAmount}) ` +
          `was not rejected — expected HTTP 402, got ${short.status}: ${short.body}`,
      );
    }

    return [
      {
        id,
        name,
        pass: true,
        detail:
          `Both ordering rules enforced: a commitment equal to the cumulative ` +
          `(${baseline}) and one that under-covers the price (${shortAmount}) ` +
          `were each rejected with HTTP 402.`,
      },
    ];
  } catch (error) {
    return failure(id, name, `Check could not run: ${(error as Error).message}`);
  }
}

/**
 * MPP-12: Resubmitting an identical credential must be rejected.
 *
 * Targets the challenge replay guard specifically: the credential replayed is
 * byte-identical to one the server accepted moments earlier, so its signature
 * and amount are already proven valid and only the challenge-ID claim can
 * account for the rejection.
 */
export async function runMppChannelReplayCheck(
  options: MppChannelCheckOptions,
): Promise<CheckResult[]> {
  const id = "MPP-12";
  const name = "Challenge Replay Rejection";
  const { target, commitmentSecretHex, network, rpcUrl } = options;

  try {
    const opening = await fetchChannelChallenge(target);
    const amount = opening.cumulativeAmount + opening.requestedAmount;
    const { credential } = await buildChannelCredential({
      challenge: opening,
      amount,
      commitmentSecretHex,
      network,
      rpcUrl,
    });

    const first = await submitCredential(target, credential);
    if (first.status !== 200) {
      return failure(
        id,
        name,
        `Setup failed: a valid commitment (${amount}) was not accepted — ` +
          `HTTP ${first.status}: ${first.body}`,
      );
    }

    const replay = await submitCredential(target, credential);
    if (replay.status !== 402) {
      return failure(
        id,
        name,
        `An identical credential was accepted twice — expected HTTP 402 on replay, ` +
          `got ${replay.status}: ${replay.body}. This is a double-spend.`,
      );
    }

    return [
      {
        id,
        name,
        pass: true,
        detail: `Byte-identical credential correctly rejected on replay (HTTP 402).`,
      },
    ];
  } catch (error) {
    return failure(id, name, `Check could not run: ${(error as Error).message}`);
  }
}

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
export async function runMppChannelCommitmentReplayCheck(
  options: MppChannelCheckOptions,
): Promise<CheckResult[]> {
  const id = "MPP-14";
  const name = "Commitment Replay Rejection";
  const { target, commitmentSecretHex, network, rpcUrl } = options;

  try {
    const opening = await fetchChannelChallenge(target);
    const amount = opening.cumulativeAmount + opening.requestedAmount;

    const signature = await signChannelCommitment({
      channelContract: opening.channelContract,
      amount,
      commitmentSecretHex,
      networkPassphrase: networkPassphrase(network),
      rpcUrl: resolveRpcUrl(network, rpcUrl),
    });

    const first = await submitCredential(
      target,
      serializeChannelCredential({ challenge: opening, amount, signature }),
    );
    if (first.status !== 200) {
      return failure(
        id,
        name,
        `Setup failed: a valid commitment (${amount}) was not accepted — ` +
          `HTTP ${first.status}: ${first.body}`,
      );
    }

    // Fresh challenge, same commitment. The signature is still cryptographically
    // valid; only the cumulative rule can reject it.
    const fresh = await fetchChannelChallenge(target);
    const replay = await submitCredential(
      target,
      serializeChannelCredential({ challenge: fresh, amount, signature }),
    );
    if (replay.status !== 402) {
      return failure(
        id,
        name,
        `A captured commitment (${amount}) was redeemed a second time against a ` +
          `fresh challenge — expected HTTP 402, got ${replay.status}: ${replay.body}. ` +
          `This is a double-spend.`,
      );
    }

    return [
      {
        id,
        name,
        pass: true,
        detail:
          `Captured commitment (${amount}) correctly rejected when re-presented ` +
          `against a fresh challenge (HTTP 402).`,
      },
    ];
  } catch (error) {
    return failure(id, name, `Check could not run: ${(error as Error).message}`);
  }
}
