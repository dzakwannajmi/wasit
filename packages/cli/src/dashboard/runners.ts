/**
 * Bridges a dashboard menu selection to the corresponding core suite.
 *
 * Deliberately narrower than the direct CLI subcommands: no destructive
 * MPP-13 (channel close stays skipped, same as the CLI's own default), and
 * the x402 action runs read-only checks only (X402-01..05). Settling a real
 * payment from a menu selection with no flag to review first is not a safe
 * default for an interactive picker — `wasit test --payer-key ...` still
 * covers that directly. MPP-01 (charge mode) has no read-only mode at all,
 * so that action is gated behind an explicit confirmation step in the form
 * screen before this ever runs.
 */

import {
  runMppChannelSuite,
  runMppChargeSuite,
  runX402ReadChecks,
  type CheckResult,
} from "@wasit-dev/core";
import type { DashboardAction } from "./App.js";

export async function runAction(
  action: DashboardAction,
  target: string,
  onResult: (result: CheckResult) => void,
): Promise<CheckResult[]> {
  switch (action.kind) {
    case "x402-read":
      return runX402ReadChecks({ target, onResult });

    case "mpp-channel": {
      const commitmentSecretHex = process.env.COMMITMENT_SECRET_HEX;
      if (!commitmentSecretHex) {
        throw new Error(
          "No commitment key. Set COMMITMENT_SECRET_HEX in .env, or run " +
            "`wasit mpp-channel --commitment-key ...` directly.",
        );
      }
      return runMppChannelSuite({
        target,
        commitmentSecretHex,
        network: process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet",
        onResult,
      });
    }

    case "mpp-charge": {
      const payerSecretKey = process.env.MPP_PAYER_SECRET;
      if (!payerSecretKey) {
        throw new Error(
          "No payer key. Set MPP_PAYER_SECRET in .env, or run " +
            "`wasit mpp-charge --payer-key ...` directly.",
        );
      }
      return runMppChargeSuite({
        target,
        payerSecretKey,
        network: process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet",
        onResult,
      });
    }
  }
}
