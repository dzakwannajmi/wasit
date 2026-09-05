/**
 * Bridges the dashboard's wallet screen to `@wasit-dev/core`'s wallet
 * primitives — the same relationship runners.ts has to the check suites.
 *
 * Everything the wallet screen needs from core comes through this module,
 * including plain constants: the screen importing some things from here and
 * others straight from core is how a "the dashboard only talks to core via
 * the bridge" rule quietly stops being true.
 */

import {
  createUsdcTrustline,
  fundWithFriendbot,
  generateCommitmentKey,
  generateTestnetWallet,
  getTestnetWalletStatus,
  publicKeyFromSecret,
  sendUsdcFromDistributor,
  TESTNET_USDC_ISSUER,
  type FriendbotOutcome,
  type GeneratedCommitmentKey,
  type GeneratedWallet,
  type WalletStatus,
} from "@wasit-dev/core";

export type WalletRole = "x402" | "mpp-charge" | "mpp-channel";

export const WALLET_ROLES: readonly WalletRole[] = ["x402", "mpp-charge", "mpp-channel"];

/** Which .env variable holds each role's key. */
export const ROLE_ENV_VAR: Record<WalletRole, string> = {
  x402: "STELLAR_PRIVATE_KEY",
  "mpp-charge": "MPP_PAYER_SECRET",
  "mpp-channel": "COMMITMENT_SECRET_HEX",
};

export const ROLE_LABEL: Record<WalletRole, string> = {
  x402: "x402 payer",
  "mpp-charge": "MPP charge payer",
  "mpp-channel": "MPP channel commitment key",
};

export interface RoleOverview {
  readonly role: WalletRole;
  readonly configured: boolean;
  readonly publicKey?: string;
  /** Undefined for mpp-channel: a signing key, not a funded account. */
  readonly status?: WalletStatus;
  readonly error?: string;
}

/** Core classifies its own failures, so rendering the message is enough. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Says what Friendbot actually did, rather than always claiming a transfer. */
export function friendbotText(outcome: FriendbotOutcome): string {
  return outcome === "funded"
    ? "Funded: 10,000 XLM."
    : "Already funded — Friendbot left the existing balance alone.";
}

/**
 * What the wallet screen shows for one role. mpp-channel never has a
 * status to fetch — it only ever signs commitment bytes off-chain (see
 * mpp/channel-commitment.ts) and has no balance of its own.
 *
 * This never rejects. Deriving the public key is inside the try for the same
 * reason the Horizon call is: a malformed key in .env is one role's problem,
 * and letting it escape as a rejected promise took down the whole dashboard
 * — the screen has no way to render an exception, so it simply stopped on
 * its loading spinner.
 */
export async function loadRoleOverview(role: WalletRole): Promise<RoleOverview> {
  const secret = process.env[ROLE_ENV_VAR[role]];
  if (!secret) return { role, configured: false };
  if (role === "mpp-channel") return { role, configured: true };

  try {
    const publicKey = publicKeyFromSecret(secret, ROLE_ENV_VAR[role]);
    try {
      const status = await getTestnetWalletStatus(publicKey);
      return { role, configured: true, publicKey, status };
    } catch (error) {
      return { role, configured: true, publicKey, error: describeError(error) };
    }
  } catch (error) {
    return { role, configured: true, error: describeError(error) };
  }
}

export {
  createUsdcTrustline,
  fundWithFriendbot,
  generateCommitmentKey,
  generateTestnetWallet,
  sendUsdcFromDistributor,
  TESTNET_USDC_ISSUER,
};
export type { FriendbotOutcome, GeneratedCommitmentKey, GeneratedWallet, WalletStatus };
