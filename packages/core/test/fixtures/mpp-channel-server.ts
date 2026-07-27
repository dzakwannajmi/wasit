/**
 * Real MPP Channel-mode server, used as the test target for MPP-11/12/13.
 * Same toNodeListener pattern as mpp-charge-server.ts (no Express middleware).
 *
 * Run: npx tsx packages/core/test/fixtures/mpp-channel-server.ts
 */
import "dotenv/config";
import http from "node:http";
import { Mppx, Store, stellar } from "@stellar/mpp/channel/server";
import { StrKey } from "@stellar/stellar-sdk";

const PORT = 3003;

const network = process.env.MPP_STELLAR_NETWORK;
const channelContract = process.env.CHANNEL_CONTRACT;
const recipient = process.env.MPP_RECIPIENT;
const commitmentPubkeyHex = process.env.COMMITMENT_PUBKEY_HEX;
const secretKey = process.env.MPP_SECRET_KEY;
// Required for the close action. The channel contract calls `to.require_auth()`,
// so the close transaction must be sourced and signed by the RECIPIENT — not by
// the funder. Signing with the funder key reaches the chain and fails there.
const recipientSecret = process.env.MPP_RECIPIENT_SECRET;

if (
  !network ||
  !channelContract ||
  !recipient ||
  !commitmentPubkeyHex ||
  !secretKey ||
  !recipientSecret
) {
  throw new Error(
    "Missing required env vars: MPP_STELLAR_NETWORK, CHANNEL_CONTRACT, MPP_RECIPIENT, " +
      "COMMITMENT_PUBKEY_HEX, MPP_SECRET_KEY, MPP_RECIPIENT_SECRET.",
  );
}

const commitmentPublicKeyG = StrKey.encodeEd25519PublicKey(Buffer.from(commitmentPubkeyHex, "hex"));

const mppx = Mppx.create({
  secretKey,
  methods: [
    stellar.channel({
      channel: channelContract,
      commitmentKey: commitmentPublicKeyG,
      store: Store.memory(),
      feePayer: { envelopeSigner: recipientSecret },
      // Channel-mode rejections all surface as the same generic 402 body, so
      // without server-side logging a failure is undiagnosable from the client.
      logger: {
        debug: (msg: string, ...args: unknown[]) => console.log("[debug]", msg, ...args),
        info: (msg: string, ...args: unknown[]) => console.log("[info ]", msg, ...args),
        warn: (msg: string, ...args: unknown[]) => console.warn("[warn ]", msg, ...args),
        error: (msg: string, ...args: unknown[]) => console.error("[error]", msg, ...args),
      },
      network: network as `${string}:${string}`,
      recipient,
      currency: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    }),
  ],
});

const server = http.createServer(async (req, res) => {
  if (req.url !== "/data" || req.method !== "GET") {
    res.writeHead(404).end();
    return;
  }

  let result;
  try {
    result = await Mppx.toNodeListener(mppx.channel({ amount: "0.001" }))(req, res);
  } catch (err) {
    // Surface ChannelVerificationError (and similar) as a visible HTTP error
    // instead of letting the connection hang or crash the process, so a
    // client probing rejection behavior gets a real response to inspect.
    console.error("[channel] verify error:", (err as Error).message);
    if (!res.headersSent) {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return;
  }

  if (result.status === 402) return;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ result: "paid content via channel" }));
});

server.listen(PORT, () => {
  console.log(`MPP channel test server listening on http://localhost:${PORT}`);
  console.log(`Channel: ${channelContract}`);
  console.log(`Network: ${network}`);
});
