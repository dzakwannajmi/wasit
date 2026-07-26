/**
 * Runs MPP-11, MPP-12 and MPP-14 against the local channel fixture.
 *
 * Start the fixture first:
 *   npx tsx packages/core/test/fixtures/mpp-channel-server.ts
 *
 * Run twice in a row — every check must stay green on the second pass. That is
 * the property the manual commitment helper exists to provide.
 */
import "dotenv/config";
import {
  runMppChannelCommitmentReplayCheck,
  runMppChannelOrderingCheck,
  runMppChannelReplayCheck,
} from "../../src/mpp/channel.js";

async function main(): Promise<void> {
  const commitmentSecretHex = process.env.COMMITMENT_SECRET_HEX;
  if (!commitmentSecretHex) throw new Error("Missing COMMITMENT_SECRET_HEX.");

  const options = {
    target: "http://localhost:3003/data",
    commitmentSecretHex,
    network: process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet",
  };

  const results = [
    ...(await runMppChannelOrderingCheck(options)),
    ...(await runMppChannelReplayCheck(options)),
    ...(await runMppChannelCommitmentReplayCheck(options)),
  ];

  for (const result of results) {
    console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.id}  ${result.name}`);
    console.log(`      ${result.detail}\n`);
  }
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
