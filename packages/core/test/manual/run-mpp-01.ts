import "dotenv/config";
import { runMppChargeChecks } from "../../src/mpp/charge.js";

const results = await runMppChargeChecks({
  target: "http://localhost:3002/data",
  network: process.env.MPP_STELLAR_NETWORK!,
  payerSecretKey: process.env.MPP_PAYER_SECRET!,
});

console.table(results);
