import "dotenv/config";

import { runMppChannelOrderingCheck, runMppChannelReplayCheck } from "../../src/mpp/channel.js";

// The channel under test is resolved from the target's own challenge, so this
// script no longer passes a channel address of its own: pointing it at the
// fixture is enough to say which channel it means.
const options = {
  target: "http://localhost:3003/data",
  commitmentSecretHex: process.env.COMMITMENT_SECRET_HEX!,
  network: process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet",
};

const orderingResults = await runMppChannelOrderingCheck(options);
const replayResults = await runMppChannelReplayCheck(options);

console.table([...orderingResults, ...replayResults]);
