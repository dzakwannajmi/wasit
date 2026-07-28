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

export type MppChargeSuiteOptions = MppChargeCheckOptions;

export async function runMppChargeSuite(
  options: MppChargeSuiteOptions,
): Promise<CheckResult[]> {
  try {
    return await runMppChargeChecks(options);
  } catch (error) {
    return [errored("MPP-01", "Charge Settlement On-Chain", error)];
  }
}
