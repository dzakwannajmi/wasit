/**
 * The result shape shared by every conformance check, across protocols.
 */
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
