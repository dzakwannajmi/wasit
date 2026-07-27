/**
 * Error taxonomy for conformance checks.
 *
 * The distinction that matters to an operator is whether a check produced a
 * verdict about the target at all. A malformed response IS a verdict: the
 * service answered, and what it answered did not conform. An unreachable host,
 * a bad RPC endpoint, or a misconfigured run produce no verdict, and reporting
 * those as conformance failures tells an operator their service is broken when
 * it may be perfectly correct.
 *
 * Errors are classified where they are thrown, not where they are caught.
 * Third-party throw sites (the mppx challenge parser, the Stellar SDK) have no
 * documented error types, so sniffing at the catch site would be guesswork;
 * the call site knows what it was doing and wraps accordingly.
 */
/** Why a check could not produce a verdict about the target. */
export type CheckErrorKind = "unreachable" | "configuration" | "harness";
/** A check that did not run. Never a statement about the target's conformance. */
export interface CheckError {
    readonly kind: CheckErrorKind;
    readonly message: string;
    /** Transport-level code, when one was recoverable, e.g. "ECONNREFUSED". */
    readonly code?: string;
}
/** A check that ran: the target answered, and the answer was wrong. */
export interface MalformedResponseFinding {
    readonly kind: "malformed-response";
    readonly message: string;
}
export type ClassifiedError = CheckError | MalformedResponseFinding;
/**
 * The target was reached and replied, but the reply violates the spec.
 * This is a conformance finding, not an operational error.
 */
export declare class MalformedResponseError extends Error {
    constructor(message: string);
}
/** The run itself is misconfigured. Nothing can be concluded about the target. */
export declare class ConfigurationError extends Error {
    constructor(message: string);
}
/** No HTTP conversation took place: the connection never succeeded. */
export declare class TargetUnreachableError extends Error {
    readonly target: string;
    readonly code: string | undefined;
    /** The original throw, kept for diagnostics without relying on Error.cause. */
    readonly reason: unknown;
    constructor(target: string, reason: unknown);
}
/**
 * Rejects anything that is not an absolute HTTP(S) URL.
 *
 * Exported because the suite validates the target once up front: a bad URL is
 * wrong for every check, and reporting it per check buries the one real cause
 * under N identical copies.
 */
export declare function assertHttpUrl(target: string): void;
/**
 * Performs a request against the target, distinguishing "never connected"
 * from every other failure. Use this instead of bare `fetch` for anything
 * addressed at the service under test.
 */
export declare function fetchTarget(target: string, init?: Parameters<typeof fetch>[1]): Promise<Awaited<ReturnType<typeof fetch>>>;
/** Maps a thrown value onto the taxonomy. */
export declare function classifyCheckError(error: unknown): ClassifiedError;
