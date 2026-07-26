/**
 * Network resolution for MPP checks.
 *
 * Passphrases come from the SDK's own `Networks` constants rather than being
 * restated here, so they cannot drift. RPC endpoints are overridable because
 * the caller may target a private or self-hosted node.
 */

import { Networks } from "@stellar/stellar-sdk";

/** CAIP-2 network identifiers supported by the MPP checks. */
export type MppNetwork = "stellar:testnet" | "stellar:pubnet";

export class UnsupportedNetworkError extends Error {
  public constructor(network: string) {
    super(
      `Unsupported network "${network}". Expected "stellar:testnet" or "stellar:pubnet".`,
    );
    this.name = "UnsupportedNetworkError";
  }
}

const PASSPHRASES: Record<MppNetwork, string> = {
  "stellar:testnet": Networks.TESTNET,
  "stellar:pubnet": Networks.PUBLIC,
};

/**
 * Default public RPC endpoints. Only testnet has a well-known free endpoint;
 * pubnet deliberately has none, so mainnet runs must pass `rpcUrl` explicitly
 * rather than silently pointing at a third-party node.
 */
const DEFAULT_RPC_URLS: Partial<Record<MppNetwork, string>> = {
  "stellar:testnet": "https://soroban-testnet.stellar.org",
};

export function isMppNetwork(value: string): value is MppNetwork {
  return value === "stellar:testnet" || value === "stellar:pubnet";
}

export function assertMppNetwork(value: string): MppNetwork {
  if (!isMppNetwork(value)) throw new UnsupportedNetworkError(value);
  return value;
}

export function networkPassphrase(network: string): string {
  return PASSPHRASES[assertMppNetwork(network)];
}

/**
 * Resolves the RPC endpoint for a network.
 *
 * @param override - Explicit endpoint; always wins when provided.
 * @throws {UnsupportedNetworkError} If the network is unknown.
 * @throws {Error} If no default exists for the network and no override is given.
 */
export function resolveRpcUrl(network: string, override?: string): string {
  const resolved = assertMppNetwork(network);
  if (override) return override;

  const fallback = DEFAULT_RPC_URLS[resolved];
  if (!fallback) {
    throw new Error(
      `No default RPC endpoint for ${resolved}. Pass an explicit rpcUrl.`,
    );
  }
  return fallback;
}
