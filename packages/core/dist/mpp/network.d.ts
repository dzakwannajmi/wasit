/**
 * Network resolution for MPP checks.
 *
 * Passphrases come from the SDK's own `Networks` constants rather than being
 * restated here, so they cannot drift. RPC endpoints are overridable because
 * the caller may target a private or self-hosted node.
 */
/** CAIP-2 network identifiers supported by the MPP checks. */
export type MppNetwork = "stellar:testnet" | "stellar:pubnet";
export declare class UnsupportedNetworkError extends Error {
    constructor(network: string);
}
export declare function isMppNetwork(value: string): value is MppNetwork;
export declare function assertMppNetwork(value: string): MppNetwork;
export declare function networkPassphrase(network: string): string;
/**
 * Resolves the RPC endpoint for a network.
 *
 * @param override - Explicit endpoint; always wins when provided.
 * @throws {UnsupportedNetworkError} If the network is unknown.
 * @throws {Error} If no default exists for the network and no override is given.
 */
export declare function resolveRpcUrl(network: string, override?: string): string;
