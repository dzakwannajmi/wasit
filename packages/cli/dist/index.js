#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { runX402ReadChecks, runX402PaymentChecks } from "@wasit/core";
const program = new Command();
program
    .name("wasit")
    .description("Protocol-compliance testing for x402 / MPP on Stellar")
    .version("0.1.0");
program
    .command("test")
    .description("Run x402 compliance checks against a target service")
    .requiredOption("--target <url>", "URL of the service to test")
    .option("--network <network>", "Network identifier", "stellar:testnet")
    .option("--payer-key <key>", "Testnet payer secret key (overrides STELLAR_PRIVATE_KEY from .env)")
    .option("--read-only", "Skip payment checks (X402-06/07), only check response format", false)
    .action(async (opts) => {
    const readResults = await runX402ReadChecks({ target: opts.target });
    let paymentResults = [];
    const payerKey = opts.payerKey ?? process.env.STELLAR_PRIVATE_KEY;
    if (opts.readOnly) {
        console.log("(--read-only set: skipping payment checks)");
    }
    else if (!payerKey) {
        console.log("(no payer key found — set STELLAR_PRIVATE_KEY in .env or pass --payer-key — skipping payment checks)");
    }
    else {
        paymentResults = await runX402PaymentChecks({
            target: opts.target,
            network: opts.network,
            payerSecretKey: payerKey,
        });
    }
    const allResults = [...readResults, ...paymentResults];
    console.table(allResults);
    const failed = allResults.filter((r) => !r.pass);
    if (failed.length > 0) {
        console.error(`\n${failed.length} check(s) failed.`);
        process.exit(1);
    }
    else {
        console.log(`\nAll ${allResults.length} checks passed.`);
    }
});
program.parse();
