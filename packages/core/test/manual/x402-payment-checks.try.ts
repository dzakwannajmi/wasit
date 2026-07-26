import "dotenv/config";
import { runX402PaymentChecks } from "../../src/x402/simulator.js";

const results = await runX402PaymentChecks({
  target: "http://localhost:3001/protected",
  network: "stellar:testnet",
  payerSecretKey: process.env.STELLAR_PRIVATE_KEY!,
});
console.table(results);
