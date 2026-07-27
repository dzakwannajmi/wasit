/**
 * Network resolution for MPP checks.
 *
 * Passphrases come from the SDK's own `Networks` constants rather than being
 * restated here, so they cannot drift. RPC endpoints are overridable because
 * the caller may target a private or self-hosted node.
 */
import { Networks } from "@stellar/stellar-sdk";
export class UnsupportedNetworkError extends Error {
    constructor(network) {
        super(`Unsupported network "${network}". Expected "stellar:testnet" or "stellar:pubnet".`);
        this.name = "UnsupportedNetworkError";
    }
}
const PASSPHRASES = {
    "stellar:testnet": Networks.TESTNET,
    "stellar:pubnet": Networks.PUBLIC,
};
/**
 * Default public RPC endpoints. Only testnet has a well-known free endpoint;
 * pubnet deliberately has none, so mainnet runs must pass `rpcUrl` explicitly
 * rather than silently pointing at a third-party node.
 */
const DEFAULT_RPC_URLS = {
    "stellar:testnet": "https://soroban-testnet.stellar.org",
};
export function isMppNetwork(value) {
    return value === "stellar:testnet" || value === "stellar:pubnet";
}
export function assertMppNetwork(value) {
    if (!isMppNetwork(value))
        throw new UnsupportedNetworkError(value);
    return value;
}
export function networkPassphrase(network) {
    return PASSPHRASES[assertMppNetwork(network)];
}
/**
 * Resolves the RPC endpoint for a network.
 *
 * @param override - Explicit endpoint; always wins when provided.
 * @throws {UnsupportedNetworkError} If the network is unknown.
 * @throws {Error} If no default exists for the network and no override is given.
 */
export function resolveRpcUrl(network, override) {
    const resolved = assertMppNetwork(network);
    if (override)
        return override;
    const fallback = DEFAULT_RPC_URLS[resolved];
    if (!fallback) {
        throw new Error(`No default RPC endpoint for ${resolved}. Pass an explicit rpcUrl.`);
    }
    return fallback;
}
