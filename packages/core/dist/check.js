/**
 * The result shape shared by every conformance check, across protocols.
 */
import { classifyCheckError } from "./errors.js";
/**
 * Classifies one result.
 *
 * Order matters: a skipped check never ran, and an errored check produced no
 * verdict, so both are decided before `pass` is consulted at all.
 */
export function checkStatus(result) {
    if (result.skipped)
        return "SKIP";
    if (result.error !== undefined)
        return "ERROR";
    return result.pass ? "PASS" : "FAIL";
}
/**
 * Reduces a run to its counts and outcome.
 *
 * Lives in core rather than in a front end so the CLI's exit code and the MCP
 * server's reported outcome can never disagree about the same results.
 */
export function summarize(results) {
    let passed = 0;
    let failed = 0;
    let errored = 0;
    let skipped = 0;
    for (const result of results) {
        switch (checkStatus(result)) {
            case "PASS":
                passed += 1;
                break;
            case "FAIL":
                failed += 1;
                break;
            case "ERROR":
                errored += 1;
                break;
            case "SKIP":
                skipped += 1;
                break;
        }
    }
    // A real finding outranks a missing one, so a run with both exits 1.
    const exitCode = failed > 0 ? 1 : errored > 0 ? 2 : 0;
    return { passed, failed, errored, skipped, exitCode };
}
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
