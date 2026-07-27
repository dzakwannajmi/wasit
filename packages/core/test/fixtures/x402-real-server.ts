import "dotenv/config";
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

const PORT = 3001;
const ROUTE_PATH = "/protected";
const PRICE = "$0.01";
const NETWORK = "stellar:testnet";
const FACILITATOR_URL = "https://www.x402.org/facilitator";
const PAY_TO = process.env.STELLAR_PAYEE_ADDRESS;
if (!PAY_TO) throw new Error("STELLAR_PAYEE_ADDRESS is not set in .env");

const app = express();

app.use(
  paymentMiddlewareFromConfig(
    {
      [`GET ${ROUTE_PATH}`]: {
        accepts: { scheme: "exact", price: PRICE, network: NETWORK, payTo: PAY_TO },
      },
    },
    new HTTPFacilitatorClient({ url: FACILITATOR_URL }),
    [{ network: NETWORK, server: new ExactStellarScheme() }],
  ),
);

app.get(ROUTE_PATH, (_, res) => res.json({ secret: "wasit test resource" }));

app.listen(PORT, () => console.log(`Test x402 server on http://localhost:${PORT}${ROUTE_PATH}`));
