import "dotenv/config";
import { runMppChannelDeployChecks } from "../../src/mpp/channel.js";

const results = await runMppChannelDeployChecks({
  channelContract: process.env.CHANNEL_CONTRACT!,
  network: process.env.MPP_STELLAR_NETWORK!,
  expected: {
    token: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    from: process.env.MPP_PAYER_PUBLIC ?? "GDHQTUA2P5OO7EXSZ5MAUID4HUFM3H7XP6B5GJNQSRX3N675KCFNAFVK",
    to: process.env.MPP_RECIPIENT!,
    refundWaitingPeriod: 100,
  },
});

console.table(results);
