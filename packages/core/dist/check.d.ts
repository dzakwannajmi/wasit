/**
 * The result shape shared by every conformance check, across protocols.
 */
import { type CheckError } from "./errors.js";
export interface CheckResult {
    /** Stable catalogue identifier, e.g. "MPP-11". Must match docs/CHECKS.md. */
    id: string;
    name: string;
    /** False when the check ran and the target did not conform. */
    pass: boolean;
    detail: string;
    /**
     * True when the check did not run. A skipped check is neither a pass nor a
     * failure: `pass` is false so it can never be counted as conformance, and
     * reporters must render it separately rather than as a defect.
     */
    skipped?: boolean;
    /** Why the check was skipped. Required whenever `skipped` is true. */
    skipReason?: string;
    /**
     * True when running this check permanently alters the target's state.
     * Destructive checks are skipped unless the operator explicitly opts in,
     * and may only be run against a target the operator owns or is authorised
     * to test. See docs/CHECKS.md and SECURITY.md.
     */
    destructive?: boolean;
    /**
     * Set when the check produced no verdict about the target — it could not
     * connect, or the run is misconfigured, or the harness itself failed.
     * `pass` is false so an errored check can never be counted as conformance,
     * but reporters must not present it as a defect in the target.
     */
    error?: CheckError;
}
/** How a single result should be rendered and counted. */
export type CheckStatus = "PASS" | "FAIL" | "ERROR" | "SKIP";
/**
 * Classifies one result.
 *
 * Order matters: a skipped check never ran, and an errored check produced no
 * verdict, so both are decided before `pass` is consulted at all.
 */
export declare function checkStatus(result: CheckResult): CheckStatus;
export interface RunSummary {
    readonly passed: number;
    readonly failed: number;
    readonly errored: number;
    readonly skipped: number;
    /** 0 = everything conformed, 1 = conformance failure, 2 = no verdict. */
    readonly exitCode: 0 | 1 | 2;
}
/**
 * Reduces a run to its counts and outcome.
 *
 * Lives in core rather than in a front end so the CLI's exit code and the MCP
 * server's reported outcome can never disagree about the same results.
 */
export declare function summarize(results: CheckResult[]): RunSummary;
/** Builds the result for a destructive check that was not opted into. */
export declare function skippedDestructive(id: string, name: string, reason: string): CheckResult;
/**
 * Builds the result for a check that threw.
 *
 * A malformed response becomes an ordinary failure — the target answered and
 * the answer was wrong. Everything else becomes an errored result, which is
 * reported and exit-coded separately from conformance failures.
 */
export declare function errored(id: string, name: string, error: unknown): CheckResult;
/** Builds the result for a check that was not run, for a non-destructive reason. */
export declare function skipped(id: string, name: string, reason: string): CheckResult;
