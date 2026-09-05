import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Asset, Keypair } from "@stellar/stellar-sdk";

import {
  TESTNET_USDC_ISSUER,
  describeTransactionError,
  generateCommitmentKey,
  generateTestnetWallet,
  publicKeyFromSecret,
  sendUsdcFromDistributor,
  testnetUsdcAsset,
} from "../../src/wallet.js";
import { ConfigurationError } from "../../src/errors.js";

// Only the local, network-free surface is covered here — Friendbot, Horizon
// lookups and trustline/payment submission all need a real testnet, same
// "no keys, no target, no network" rule the rest of this suite follows.

describe("generateTestnetWallet", () => {
  it("returns a keypair whose public key matches its own secret", () => {
    const wallet = generateTestnetWallet();
    assert.equal(Keypair.fromSecret(wallet.secretKey).publicKey(), wallet.publicKey);
  });

  it("never repeats a keypair across calls", () => {
    const first = generateTestnetWallet();
    const second = generateTestnetWallet();
    assert.notEqual(first.secretKey, second.secretKey);
  });
});

describe("publicKeyFromSecret", () => {
  it("derives the same public key generateTestnetWallet already returned", () => {
    const wallet = generateTestnetWallet();
    assert.equal(publicKeyFromSecret(wallet.secretKey), wallet.publicKey);
  });
});

describe("generateCommitmentKey", () => {
  it("returns a 64-character hex seed and a matching hex public key", () => {
    const key = generateCommitmentKey();
    assert.match(key.secretHex, /^[0-9a-f]{64}$/);
    assert.match(key.publicKeyHex, /^[0-9a-f]{64}$/);
  });

  it("never repeats a seed across calls", () => {
    const first = generateCommitmentKey();
    const second = generateCommitmentKey();
    assert.notEqual(first.secretHex, second.secretHex);
  });
});

describe("testnetUsdcAsset", () => {
  it("is Circle's documented testnet USDC issuer, not a pubnet address", () => {
    const asset = testnetUsdcAsset();
    assert.ok(asset.equals(new Asset("USDC", TESTNET_USDC_ISSUER)));
  });
});

describe("describeTransactionError", () => {
  it("falls back to the plain message for a non-Horizon error", () => {
    assert.equal(describeTransactionError(new Error("boom")), "boom");
  });

  it("stringifies a thrown non-Error value", () => {
    assert.equal(describeTransactionError("not an Error object"), "not an Error object");
  });
});

describe("publicKeyFromSecret on a malformed key", () => {
  // The three ways a .env key is actually wrong in practice: a truncated
  // paste, a public key in a secret's slot, and a raw hex commitment seed
  // in a role that wants a Stellar S... string.
  const BAD_SECRETS = [
    "SBROKEN",
    generateTestnetWallet().publicKey,
    generateCommitmentKey().secretHex,
  ];

  it("throws a ConfigurationError rather than the SDK's raw error", () => {
    for (const bad of BAD_SECRETS) {
      assert.throws(() => publicKeyFromSecret(bad), ConfigurationError);
    }
  });

  it("names the variable to fix when one is given", () => {
    assert.throws(
      () => publicKeyFromSecret("SBROKEN", "MPP_PAYER_SECRET"),
      (error: unknown) =>
        error instanceof ConfigurationError && error.message.includes("MPP_PAYER_SECRET"),
    );
  });

  it("never puts the rejected value in the message", () => {
    // This message reaches logs, saved JSON runs and terminal recordings, so
    // echoing the input back would turn a typo into a disclosure whenever
    // the value was a real key that merely failed validation.
    for (const bad of BAD_SECRETS) {
      assert.throws(
        () => publicKeyFromSecret(bad, "MPP_PAYER_SECRET"),
        (error: unknown) => error instanceof Error && !error.message.includes(bad),
      );
    }
  });
});

describe("sendUsdcFromDistributor argument validation", () => {
  const distributor = generateTestnetWallet();
  const destination = generateTestnetWallet().publicKey;

  it("rejects a malformed distributor key before touching the network", async () => {
    await assert.rejects(
      () => sendUsdcFromDistributor("SBROKEN", destination, "50"),
      ConfigurationError,
    );
  });

  it("rejects an unusable amount before touching the network", async () => {
    for (const amount of ["", "0", "-5", "abc", "1.12345678"]) {
      await assert.rejects(
        () => sendUsdcFromDistributor(distributor.secretKey, destination, amount),
        ConfigurationError,
        `expected "${amount}" to be rejected`,
      );
    }
  });
});
