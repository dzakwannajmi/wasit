#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import {
  runMppChannelCloseCheck,
  runMppChannelCommitmentReplayCheck,
  runMppChannelDeployChecks,
  runMppChannelOrderingCheck,
  runMppChannelReplayCheck,
  runX402PaymentChecks,
  runX402ReadChecks,
  skipped,
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
 * conformance, but it is not a failure and must not fail the run.
 */
function report(results: CheckResult[]): number {
  for (const result of results) {
    const status = result.skipped ? "SKIP" : result.pass ? "PASS" : "FAIL";
    const flag = result.destructive ? "  [destructive]" : "";
    console.log(`${status}  ${result.id}  ${result.name}${flag}`);
    console.log(`      ${result.detail}\n`);
  }

  const failures = results.filter((r) => !r.pass && !r.skipped);
  const skips = results.filter((r) => r.skipped);
  const passes = results.filter((r) => r.pass);

  const summary = [`${passes.length} passed`];
  if (failures.length > 0) summary.push(`${failures.length} failed`);
  if (skips.length > 0) summary.push(`${skips.length} skipped`);
  console.log(`${summary.join(", ")}.`);

  return failures.length > 0 ? 1 : 0;
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
    "Channel contract for the deploy check (default: CHANNEL_CONTRACT)",
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

    const shared = {
      target: opts.target as string,
      commitmentSecretHex,
      network,
      ...(opts.rpcUrl ? { rpcUrl: opts.rpcUrl as string } : {}),
    };

    const results: CheckResult[] = [];

    // MPP-10 needs values only the channel's own operator knows, so it is
    // opt-in rather than a failure when they are absent.
    const deployChannel: string | undefined = opts.channel ?? process.env.CHANNEL_CONTRACT;
    const refundPeriod = Number(opts.expectRefundPeriod);
    const missing = [
      deployChannel ? null : "--channel",
      opts.expectToken ? null : "--expect-token",
      opts.expectFrom ? null : "--expect-from",
      opts.expectTo ? null : "--expect-to",
      Number.isInteger(refundPeriod) ? null : "--expect-refund-period",
    ].filter((entry): entry is string => entry !== null);

    if (deployChannel && missing.length === 0) {
      results.push(
        ...(await runMppChannelDeployChecks({
          channelContract: deployChannel,
          network,
          expected: {
            token: opts.expectToken as string,
            from: opts.expectFrom as string,
            to: opts.expectTo as string,
            refundWaitingPeriod: refundPeriod,
          },
        })),
      );
    } else {
      results.push(
        skipped(
          "MPP-10",
          "Channel Deploy",
          `expected on-chain parameters not supplied (${missing.join(", ")}).`,
        ),
      );
    }

    results.push(...(await runMppChannelOrderingCheck(shared)));
    results.push(...(await runMppChannelReplayCheck(shared)));
    results.push(...(await runMppChannelCommitmentReplayCheck(shared)));

    // Last: a close is terminal, so nothing may run against the channel after it.
    const destructiveChannel: string | undefined =
      opts.destructiveChannel ?? process.env.CHANNEL_CONTRACT_DISPOSABLE;
    results.push(
      ...(await runMppChannelCloseCheck({
        ...shared,
        allowDestructive: opts.allowDestructive === true,
        ...(destructiveChannel ? { expectedChannel: destructiveChannel } : {}),
      })),
    );

    process.exit(report(results));
  });

program.parse();
