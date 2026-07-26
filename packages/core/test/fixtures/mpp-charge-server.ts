/**
 * Real MPP Charge-mode server, used as the test target for MPP-01.
 * Mirrors the pattern of x402-real-server.ts: a minimal Node HTTP server
 * wired to the actual @stellar/mpp charge handler, settling real SAC
 * transfers on Stellar testnet — no mocks.
 *
 * Note: mppx has no Express middleware. Mppx.toNodeListener() wraps the
 * charge handler into a plain (req, res) => Promise Node HTTP listener,
 * per the official JSDoc example in mppx/dist/server/Mppx.d.ts.
 *
 * Run: npx tsx packages/core/test/fixtures/mpp-charge-server.ts
 */
import "dotenv/config";
import http from "node:http";
import { Mppx, Store, charge } from "@stellar/mpp/charge/server";
import { USDC_TESTNET_ADDRESS } from "@x402/stellar";

const PORT = 3002;

const network = process.env.MPP_STELLAR_NETWORK;
const recipient = process.env.MPP_RECIPIENT;
const secretKey = process.env.MPP_SECRET_KEY;

if (!network || !recipient || !secretKey) {
  throw new Error(
    "Missing required env vars: MPP_STELLAR_NETWORK, MPP_RECIPIENT, MPP_SECRET_KEY. Check .env.",
  );
}

const mppx = Mppx.create({
  secretKey,
  methods: [
    charge({
      recipient,
      currency: USDC_TESTNET_ADDRESS, // SAC contract address (C...), not classic asset code
      network: network as `${string}:${string}`,
      // Store.memory() is dev-only: single-process, non-persistent.
      // Do NOT use in production — see @stellar/mpp Charge.Parameters.store docs.
      store: Store.memory(),
    }),
  ],
});

const server = http.createServer(async (req, res) => {
  if (req.url !== "/data" || req.method !== "GET") {
    res.writeHead(404).end();
    return;
  }

  const result = await Mppx.toNodeListener(
    mppx.charge({
      amount: "0.001",
      currency: USDC_TESTNET_ADDRESS,
      recipient,
    }),
  )(req, res);

  if (result.status === 402) {
    // toNodeListener already wrote the 402 challenge response and ended it.
    return;
  }

  // status === 200: payment verified. toNodeListener already set the
  // Payment-Receipt header; we still need to write the actual body.
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ result: "paid content", price: "$0.001 USDC" }));
});

server.listen(PORT, () => {
  console.log(`MPP charge test server listening on http://localhost:${PORT}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Network:   ${network}`);
});
