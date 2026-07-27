/**
 * The result shape shared by every conformance check, across protocols.
 */

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
