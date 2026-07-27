/**
 * Prints the on-chain state of a channel.
 *
 * Usage: npx tsx packages/core/test/manual/channel-state.ts <C... | env var name>
 * Defaults to CHANNEL_CONTRACT.
 */
import "dotenv/config";
import { getChannelState } from "@stellar/mpp/channel/server";

async function main(): Promise<void> {
  const arg = process.argv[2] ?? "CHANNEL_CONTRACT";
  const channel = arg.startsWith("C") && arg.length > 40 ? arg : process.env[arg];
  if (!channel) throw new Error(`No channel address resolved from "${arg}".`);

  const network = (process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet") as
    | "stellar:testnet"
    | "stellar:pubnet";

  const state = await getChannelState({ channel, network });
  console.log(`channel                : ${channel}`);
  console.log(`balance                : ${state.balance}`);
  console.log(`closeEffectiveAtLedger : ${state.closeEffectiveAtLedger}`);
  console.log(`currentLedger          : ${state.currentLedger}`);
  console.log(`to / token             : ${state.to} / ${state.token}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
