/**
 * Orchestration for the MPP channel-mode suite.
 *
 * This lives in core rather than in a front end so that the CLI and the MCP
 * server run the same checks, in the same order, under the same guards. A
 * second front end reimplementing this is how the two would silently drift.
 */
import { type CheckResult } from "../check.js";
/** On-chain parameters MPP-10 asserts. Only the channel's operator knows these. */
export interface ChannelDeployExpectations {
    readonly token: string;
    readonly from: string;
    readonly to: string;
    readonly refundWaitingPeriod: number;
}
export interface MppChannelSuiteOptions {
    readonly target: string;
    readonly commitmentSecretHex: string;
    readonly network: string;
    readonly rpcUrl?: string;
    /**
     * Asserts which channel MPP-10 should inspect. The target is authoritative:
     * when it advertises a different channel the run fails rather than reporting
     * on two contracts at once.
     */
    readonly channelOverride?: string;
    readonly expected?: Partial<ChannelDeployExpectations>;
    readonly allowDestructive?: boolean;
    readonly destructiveChannel?: string;
}
/**
 * Runs MPP-10 through MPP-14 against a target.
 *
 * The channel under test is resolved once, from the target's own challenge,
 * so every check in the run reports on the same contract. MPP-13 runs last
 * because a close is terminal.
 */
export declare function runMppChannelSuite(options: MppChannelSuiteOptions): Promise<CheckResult[]>;
