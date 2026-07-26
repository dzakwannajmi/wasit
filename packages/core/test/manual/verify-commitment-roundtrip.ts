/**
 * Round-trip check: sign a commitment, then verify it exactly as the server
 * does. Proves the helper is byte-compatible with @stellar/mpp before any
 * check touches HTTP.
 *
 * Run: npx tsx packages/core/test/manual/verify-commitment-roundtrip.ts
 */
import "dotenv/config";
import { StrKey } from "@stellar/stellar-sdk";
import { networkPassphrase, resolveRpcUrl } from "../../src/mpp/network.js";
import {
  commitmentKeypairFromHex,
  prepareCommitmentBytes,
  signChannelCommitment,
} from "../../src/mpp/channel-commitment.js";


async function main(): Promise<void> {
  const channelContract = process.env.CHANNEL_CONTRACT;
  const secretHex = process.env.COMMITMENT_SECRET_HEX;
  const pubkeyHex = process.env.COMMITMENT_PUBKEY_HEX;

  if (!channelContract || !secretHex || !pubkeyHex) {
    throw new Error("Missing CHANNEL_CONTRACT, COMMITMENT_SECRET_HEX or COMMITMENT_PUBKEY_HEX.");
  }

  const network = process.env.MPP_STELLAR_NETWORK ?? "stellar:testnet";
  const NETWORK_PASSPHRASE = networkPassphrase(network);
  const RPC_URL = resolveRpcUrl(network);

  const amount = 10_000n;
  const base = {
    channelContract,
    amount,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
  };

  const bytes = await prepareCommitmentBytes(base);
  const signatureHex = await signChannelCommitment({ ...base, commitmentSecretHex: secretHex });

  const derived = commitmentKeypairFromHex(secretHex);
  const derivedG = derived.publicKey();
  const expectedG = StrKey.encodeEd25519PublicKey(Buffer.from(pubkeyHex, "hex"));

  console.log("commitment bytes :", bytes.length, bytes.toString("hex"));
  console.log("signature hex    :", signatureHex);
  console.log("derived pubkey   :", derivedG);
  console.log("env pubkey       :", expectedG);
  console.log("pubkey match     :", derivedG === expectedG);
  console.log(
    "verify (server path):",
    derived.verify(bytes, Buffer.from(signatureHex, "hex")),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
