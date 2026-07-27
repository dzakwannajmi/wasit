/**
 * The result shape shared by every conformance check, across protocols.
 */
import { classifyCheckError } from "./errors.js";
/** Builds the result for a destructive check that was not opted into. */
export function skippedDestructive(id, name, reason) {
    return {
        id,
        name,
        pass: false,
        skipped: true,
        destructive: true,
        skipReason: reason,
        detail: `Skipped (destructive): ${reason}`,
    };
}
/**
 * Builds the result for a check that threw.
 *
 * A malformed response becomes an ordinary failure — the target answered and
 * the answer was wrong. Everything else becomes an errored result, which is
 * reported and exit-coded separately from conformance failures.
 */
export function errored(id, name, error) {
    const classified = classifyCheckError(error);
    if (classified.kind === "malformed-response") {
        return {
            id,
            name,
            pass: false,
            detail: `Connected, but the response did not conform: ${classified.message}`,
        };
    }
    return {
        id,
        name,
        pass: false,
        error: classified,
        detail: `Check could not run (${classified.kind}): ${classified.message}`,
    };
}
/** Builds the result for a check that was not run, for a non-destructive reason. */
export function skipped(id, name, reason) {
    return {
        id,
        name,
        pass: false,
        skipped: true,
        skipReason: reason,
        detail: `Skipped: ${reason}`,
    };
}
