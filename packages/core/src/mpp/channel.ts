import { getChannelState } from "@stellar/mpp/channel/server";
import type { CheckResult } from "../x402/simulator.js";

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
