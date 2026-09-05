/**
 * Covers the one thing runners.ts must always get right offline: refusing to
 * run mpp-channel/mpp-charge before touching the network when the required
 * secret is missing. The success paths need a real target and a real key —
 * out of scope here, same "no keys, no target, no network" rule the rest of
 * this repo's unit tests follow.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { runAction } from "../../src/dashboard/runners.js";

const ENV_KEYS = ["COMMITMENT_SECRET_HEX", "MPP_PAYER_SECRET", "MPP_STELLAR_NETWORK"] as const;

describe("runAction", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

  // The real process env may already carry these from a loaded .env — clear
  // them for the duration of each test so the guard clauses are exercised
  // regardless of what's set on the machine running the suite.
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

  it("refuses mpp-channel without a commitment key, before touching the network", async () => {
    await assert.rejects(
      () => runAction({ kind: "mpp-channel" }, "https://example.com", () => {}),
      /COMMITMENT_SECRET_HEX/,
    );
  });

  it("refuses mpp-charge without a payer key, before touching the network", async () => {
    await assert.rejects(
      () => runAction({ kind: "mpp-charge" }, "https://example.com", () => {}),
      /MPP_PAYER_SECRET/,
    );
  });
});
