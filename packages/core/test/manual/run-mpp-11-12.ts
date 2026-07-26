import "dotenv/config";
import { runMppChannelOrderingCheck, runMppChannelReplayCheck } from "../../src/mpp/channel.js";

const orderingResults = await runMppChannelOrderingCheck({
  target: "http://localhost:3003/data",
  channelContract: process.env.CHANNEL_CONTRACT!,
  commitmentSecretHex: process.env.COMMITMENT_SECRET_HEX!,
});
const replayResults = await runMppChannelReplayCheck({
  target: "http://localhost:3003/data",
  channelContract: process.env.CHANNEL_CONTRACT!,
  commitmentSecretHex: process.env.COMMITMENT_SECRET_HEX!,
});

console.table([...orderingResults, ...replayResults]);
