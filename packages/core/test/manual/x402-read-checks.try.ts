import { runX402ReadChecks } from "../../src/x402/simulator.js";

const results = await runX402ReadChecks({ target: "http://localhost:4402" });
console.table(results);
