#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import {
  checkStatus,
  runMppChannelSuite,
  runX402PaymentChecks,
  runX402ReadChecks,
  summarize,
  type CheckResult,
} from "@wasit/core";

const program = new Command();

program
  .name("wasit")
  .description("Protocol-compliance testing for x402 / MPP on Stellar")
  .version("0.1.0");

/**
 * Prints results and returns the process exit code.
 *
 * A skipped check carries `pass: false` so it can never be counted as
 * conformance, but it is not a failure and must not fail the run. An errored
 * check produced no verdict at all and is reported separately again.
 */
function report(results: CheckResult[]): number {
  for (const result of results) {
    const flag = result.destructive ? "  [destructive]" : "";
    console.log(`${checkStatus(result)}  ${result.id}  ${result.name}${flag}`);
    console.log(`      ${result.detail}\n`);
  }

  const counts = summarize(results);
  const line = [`${counts.passed} passed`];
  if (counts.failed > 0) line.push(`${counts.failed} failed`);
  if (counts.errored > 0) line.push(`${counts.errored} could not run`);
  if (counts.skipped > 0) line.push(`${counts.skipped} skipped`);
  console.log(`${line.join(", ")}.`);

  if (counts.errored > 0 && counts.failed === 0) {
    console.log(
      "\nNo verdict: some checks never reached the target or the run is " +
        "misconfigured. This is not a statement about the target's conformance.",
    );
  }

  return counts.exitCode;
}

program
  .command("test")
  .description("Run x402 compliance checks against a target service")
  .requiredOption("--target <url>", "URL of the service to test")
  .option("--network <network>", "Network identifier", "stellar:testnet")
  .option(
    "--payer-key <key>",
    "Testnet payer secret key (overrides STELLAR_PRIVATE_KEY from .env)",
  )
  .option("--read-only", "Skip payment checks (X402-06/07)", false)
  .action(async (opts) => {
    const results = await runX402ReadChecks({ target: opts.target });
    const payerKey: string | undefined = opts.payerKey ?? process.env.STELLAR_PRIVATE_KEY;

    if (opts.readOnly) {
      console.log("(--read-only set: skipping payment checks)\n");
    } else if (!payerKey) {
      console.log(
        "(no payer key: set STELLAR_PRIVATE_KEY in .env or pass --payer-key — skipping payment checks)\n",
      );
    } else {
      results.push(
        ...(await runX402PaymentChecks({
          target: opts.target,
          network: opts.network,
          payerSecretKey: payerKey,
        })),
      );
    }

    process.exit(report(results));
  });

program
  .command("mpp-channel")
  .description("Run MPP channel-mode compliance checks against a target service")
  .requiredOption("--target <url>", "URL of the paid resource to test")
  .option(
    "--commitment-key <hex>",
    "Raw ed25519 commitment seed, hex (default: COMMITMENT_SECRET_HEX)",
  )
  .option("--network <network>", "CAIP-2 network id (default: MPP_STELLAR_NETWORK)")
  .option("--rpc-url <url>", "Override the default Soroban RPC endpoint")
  .option(
    "--channel <address>",
    "Assert which channel the target bills through. Defaults to the channel " +
      "the target advertises; a mismatch fails MPP-10. (env: CHANNEL_CONTRACT)",
  )
  .option("--expect-token <address>", "MPP-10: expected token contract")
  .option("--expect-from <address>", "MPP-10: expected funder address")
  .option("--expect-to <address>", "MPP-10: expected recipient address")
  .option("--expect-refund-period <ledgers>", "MPP-10: expected refund waiting period")
  .option(
    "--allow-destructive",
    "Enable MPP-13. Closing settles on-chain and permanently ends the channel.",
    false,
  )
  .option(
    "--destructive-channel <address>",
    "Channel MPP-13 is permitted to close (default: CHANNEL_CONTRACT_DISPOSABLE)",
  )
  .action(async (opts) => {
    const commitmentSecretHex: string | undefined =
      opts.commitmentKey ?? process.env.COMMITMENT_SECRET_HEX;
    if (!commitmentSecretHex) {
      console.error(
        "No commitment key. Pass --commitment-key or set COMMITMENT_SECRET_HEX in .env.",
      );
      process.exit(1);
    }

    const network: string =
      opts.network ?? process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet";
    const channelOverride: string | undefined =
      opts.channel ?? process.env.CHANNEL_CONTRACT;
    const destructiveChannel: string | undefined =
      opts.destructiveChannel ?? process.env.CHANNEL_CONTRACT_DISPOSABLE;
    const refundWaitingPeriod = Number(opts.expectRefundPeriod);

    const results = await runMppChannelSuite({
      target: opts.target as string,
      commitmentSecretHex,
      network,
      allowDestructive: opts.allowDestructive === true,
      ...(opts.rpcUrl ? { rpcUrl: opts.rpcUrl as string } : {}),
      ...(channelOverride ? { channelOverride } : {}),
      ...(destructiveChannel ? { destructiveChannel } : {}),
      expected: {
        ...(opts.expectToken ? { token: opts.expectToken as string } : {}),
        ...(opts.expectFrom ? { from: opts.expectFrom as string } : {}),
        ...(opts.expectTo ? { to: opts.expectTo as string } : {}),
        ...(Number.isInteger(refundWaitingPeriod) ? { refundWaitingPeriod } : {}),
      },
    });

    process.exit(report(results));
  });

program.parse();
