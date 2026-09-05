import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { friendbotText, loadRoleOverview } from "../../src/dashboard/wallet-actions.js";

const ENV_KEYS = ["STELLAR_PRIVATE_KEY", "MPP_PAYER_SECRET", "COMMITMENT_SECRET_HEX"] as const;

describe("loadRoleOverview", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      const value = process.env[key];
      if (value !== undefined) saved[key] = value;
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value !== undefined) process.env[key] = value;
      delete saved[key];
    }
  });

  it("reports x402 as not configured when STELLAR_PRIVATE_KEY is unset", async () => {
    const overview = await loadRoleOverview("x402");
    assert.deepEqual(overview, { role: "x402", configured: false });
  });

  it("reports mpp-charge as not configured when MPP_PAYER_SECRET is unset", async () => {
    const overview = await loadRoleOverview("mpp-charge");
    assert.deepEqual(overview, { role: "mpp-charge", configured: false });
  });

  // mpp-channel never has an on-chain balance to fetch, so a configured
  // commitment key must never trigger a network call — this is what proves
  // that without needing a fake server.
  it("reports mpp-channel as configured with no status, never touching the network", async () => {
    process.env.COMMITMENT_SECRET_HEX = "deadbeef";
    const overview = await loadRoleOverview("mpp-channel");
    assert.deepEqual(overview, { role: "mpp-channel", configured: true });
  });

  it("reports a malformed key as that role's error instead of rejecting", async () => {
    // The whole dashboard used to die here: this rejection escaped as an
    // unhandled rejection, so the wallet screen sat on its loading spinner
    // until the process was killed. Resolving with an error keeps one bad
    // .env line from taking down the other roles with it.
    process.env.MPP_PAYER_SECRET = "SBROKEN";
    const overview = await loadRoleOverview("mpp-charge");

    assert.equal(overview.configured, true);
    assert.equal(overview.publicKey, undefined);
    assert.ok(overview.error?.includes("MPP_PAYER_SECRET"));
    assert.ok(!overview.error?.includes("SBROKEN"), "must not echo the rejected value");
  });

  it("never rejects, whatever any role's variable holds", async () => {
    process.env.STELLAR_PRIVATE_KEY = "GNOTASECRET";
    process.env.MPP_PAYER_SECRET = "";
    process.env.COMMITMENT_SECRET_HEX = "not-hex-either";

    const overviews = await Promise.all(
      (["x402", "mpp-charge", "mpp-channel"] as const).map((role) => loadRoleOverview(role)),
    );
    assert.equal(overviews.length, 3);
  });
});

describe("friendbotText", () => {
  it("does not claim a transfer for an account that was already funded", () => {
    // Friendbot treats "already exists" as success, so reporting a fixed
    // "Funded: 10,000 XLM." for both outcomes told the user about XLM that
    // never moved.
    assert.notEqual(friendbotText("funded"), friendbotText("already-funded"));
    assert.ok(!friendbotText("already-funded").includes("10,000"));
    assert.ok(friendbotText("funded").includes("10,000"));
  });
});
