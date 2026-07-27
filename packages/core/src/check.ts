/**
 * The result shape shared by every conformance check, across protocols.
 */

import { type CheckError, classifyCheckError } from "./errors.js";

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

/** Builds the result for a destructive check that was not opted into. */
export function skippedDestructive(
  id: string,
  name: string,
  reason: string,
): CheckResult {
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
export function errored(id: string, name: string, error: unknown): CheckResult {
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
export function skipped(id: string, name: string, reason: string): CheckResult {
  return {
    id,
    name,
    pass: false,
    skipped: true,
    skipReason: reason,
    detail: `Skipped: ${reason}`,
  };
}
