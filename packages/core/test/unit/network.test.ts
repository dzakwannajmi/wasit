import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Networks } from "@stellar/stellar-sdk";

import { ConfigurationError, classifyCheckError } from "../../src/errors.js";
import {
  UnsupportedNetworkError,
  assertMppNetwork,
  isMppNetwork,
  networkPassphrase,
  resolveRpcUrl,
} from "../../src/mpp/network.js";

describe("network identifiers", () => {
  it("accepts exactly the two supported CAIP-2 identifiers", () => {
    assert.equal(isMppNetwork("stellar:testnet"), true);
    assert.equal(isMppNetwork("stellar:pubnet"), true);
  });

  it("rejects near-misses rather than guessing what was meant", () => {
    assert.equal(isMppNetwork("stellar:mainnet"), false);
    assert.equal(isMppNetwork("stellar:futurenet"), false);
    assert.equal(isMppNetwork("testnet"), false);
    assert.equal(isMppNetwork("STELLAR:TESTNET"), false);
    assert.equal(isMppNetwork(""), false);
  });

  it("throws UnsupportedNetworkError on an unknown network", () => {
    assert.throws(() => assertMppNetwork("stellar:futurenet"), UnsupportedNetworkError);
  });

  it("returns the network unchanged when it is supported", () => {
    assert.equal(assertMppNetwork("stellar:testnet"), "stellar:testnet");
  });

  // UnsupportedNetworkError extends ConfigurationError, so a bad --network is
  // reported as a misconfigured run rather than as a harness bug.
  it("classifies an unsupported network as configuration, not harness", () => {
    let thrown: unknown;
    try {
      assertMppNetwork("nope");
    } catch (error) {
      thrown = error;
    }

    assert.ok(thrown instanceof ConfigurationError);
    assert.equal(classifyCheckError(thrown).kind, "configuration");
  });
});

describe("networkPassphrase", () => {
  // Restating the passphrases here would let them drift from the SDK, which
  // is the whole reason network.ts reads them from Networks.
  it("returns the SDK's own constants", () => {
    assert.equal(networkPassphrase("stellar:testnet"), Networks.TESTNET);
    assert.equal(networkPassphrase("stellar:pubnet"), Networks.PUBLIC);
  });

  it("refuses an unsupported network", () => {
    assert.throws(() => networkPassphrase("stellar:futurenet"), UnsupportedNetworkError);
  });
});

describe("resolveRpcUrl", () => {
  it("prefers an explicit override on every network", () => {
    assert.equal(
      resolveRpcUrl("stellar:testnet", "https://rpc.internal/x"),
      "https://rpc.internal/x",
    );
    assert.equal(
      resolveRpcUrl("stellar:pubnet", "https://rpc.internal/x"),
      "https://rpc.internal/x",
    );
  });

  it("falls back to the public endpoint on testnet", () => {
    assert.equal(resolveRpcUrl("stellar:testnet"), "https://soroban-testnet.stellar.org");
  });

  // Safety property: a pubnet run must never be silently pointed at somebody
  // else's node, so there is deliberately no default endpoint for it.
  it("refuses pubnet without an explicit endpoint", () => {
    assert.throws(() => resolveRpcUrl("stellar:pubnet"), ConfigurationError);
  });

  it("validates the network before considering the override", () => {
    assert.throws(
      () => resolveRpcUrl("stellar:futurenet", "https://rpc.internal/x"),
      UnsupportedNetworkError,
    );
  });
});
