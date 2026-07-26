/**
 * Manual probe: establishes a channel's cumulative via two legitimate
 * vouchers, then deliberately submits (a) a replayed credential and
 * (b) a stale/non-increasing credential from a fresh client baseline,
 * to observe the server's actual HTTP-level rejection behavior.
 */
import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import { Mppx, stellar } from "@stellar/mpp/channel/client";

const target = "http://localhost:3003/data";
const channelContract = process.env.CHANNEL_CONTRACT!;
const commitmentKey = Keypair.fromRawEd25519Seed(
  Buffer.from(process.env.COMMITMENT_SECRET_HEX!, "hex"),
);

function makeClient() {
  return Mppx.create({
    polyfill: false,
    methods: [
      stellar.channel({
        commitmentKey,
        allowedChannels: [channelContract],
      }),
    ],
  });
}

async function legitVoucher(client: ReturnType<typeof makeClient>, label: string) {
  const challengeRes = await client.rawFetch(target);
  console.log(`[${label}] challenge status:`, challengeRes.status);
  const credential = await client.createCredential(challengeRes);
  const res = await client.rawFetch(target, { headers: { Authorization: credential } });
  console.log(`[${label}] submit status:`, res.status);
  console.log(`[${label}] submit body:`, await res.text());
  return credential;
}

console.log("--- Step 1: first legit voucher (client A) ---");
const clientA = makeClient();
const credential1 = await legitVoucher(clientA, "A-req1");

console.log("\n--- Step 2: second legit voucher (client A, cumulative increases) ---");
await legitVoucher(clientA, "A-req2");

console.log("\n--- Step 3: MPP-12 probe — replay the FIRST credential again ---");
const replayRes = await clientA.rawFetch(target, { headers: { Authorization: credential1 } });
console.log("[replay] status:", replayRes.status);
console.log("[replay] body:", await replayRes.text());

console.log("\n--- Step 4: MPP-11 probe — fresh client (baseline 0), stale relative to server ---");
const clientB = makeClient();
const challengeResB = await clientB.rawFetch(target);
const credentialB = await clientB.createCredential(challengeResB);
const staleRes = await clientB.rawFetch(target, { headers: { Authorization: credentialB } });
console.log("[stale] status:", staleRes.status);
console.log("[stale] body:", await staleRes.text());
