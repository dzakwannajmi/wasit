/**
 * Orchestration for MPP charge mode.
 *
 * Thin, but it exists for the same reason `suite.ts` does: the CLI and the MCP
 * server must classify failures identically. `runMppChargeChecks` throws so it
 * can distinguish an unreachable target from a non-conformant one; this maps
 * those throws onto the catalogue's reporting semantics exactly once.
 */

import { errored, type CheckResult } from "../check.js";
import { runMppChargeChecks, type MppChargeCheckOptions } from "./charge.js";

export interface MppChargeSuiteOptions extends MppChargeCheckOptions {
  /**
   * Called once per check as soon as its result is known, in addition to it
   * being included in the returned array — lets a caller render progress
   * live instead of waiting for the whole suite to finish. Optional and has
   * no effect on what is returned. MPP-01 is a single check, so this fires
   * exactly once, but the contract matches the other suites so a caller can
   * treat all of them the same way.
   */
  readonly onResult?: (result: CheckResult) => void;
}

export async function runMppChargeSuite(
  options: MppChargeSuiteOptions,
): Promise<CheckResult[]> {
  let results: CheckResult[];
  try {
    results = await runMppChargeChecks(options);
  } catch (error) {
    results = [errored("MPP-01", "Charge Settlement On-Chain", error)];
  }
  for (const result of results) options.onResult?.(result);
  return results;
}
