/**
 * One smoke test proving the whole new toolchain actually works end to end:
 * ink-testing-library renders a real component, and the result contains
 * what a person looks for. Deliberately avoids JSX syntax here — the test
 * runner (tsx/esbuild) transforms it differently than tsc does for the
 * actual build, and createElement() sidesteps that gap entirely rather than
 * depending on the two tools agreeing on a JSX runtime mode. Not a
 * substitute for trying the dashboard by hand — Ink's live re-renders and
 * keyboard input are exactly the part a static render doesn't exercise.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { render } from "ink-testing-library";

import { Home } from "../../src/dashboard/Home.js";
import { CLI_VERSION } from "../../src/version.js";

const ENV_KEYS = ["STELLAR_PRIVATE_KEY", "COMMITMENT_SECRET_HEX", "MPP_PAYER_SECRET"] as const;

describe("Home", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

  // The wordmark and welcome box render regardless of env state, but the
  // Environment panel's checkmarks depend on it — pin it so this test
  // doesn't flip based on what's already in the shell running it.
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

  it("renders the wordmark, welcome box, and every menu item", () => {
    const { lastFrame } = render(
      createElement(Home, {
        onSelectAction: () => {},
        onBrowseCatalogue: () => {},
        onOpenWallet: () => {},
      }),
    );
    const frame = lastFrame();

    assert.ok(frame !== undefined && frame.length > 0, "expected a non-empty frame");
    assert.ok(frame?.includes("Welcome to Wasit"), "expected the welcome line to render");
    assert.ok(
      frame?.includes("x402 / MPP conformance tester"),
      "expected the tagline to render",
    );
    assert.ok(frame?.includes("Tips"), "expected the tips column to render");
    assert.ok(frame?.includes("COMMITMENT_SECRET_HEX"), "expected the environment column to render");
    assert.ok(frame?.includes(`v${CLI_VERSION}`), "expected the version footer to render");
    assert.ok(frame?.includes("Run x402 test"), "expected the x402 menu item");
    assert.ok(frame?.includes("Run MPP channel test"), "expected the MPP channel menu item");
    assert.ok(frame?.includes("Run MPP charge test"), "expected the MPP charge menu item");
    assert.ok(frame?.includes("Browse check catalogue"), "expected the catalogue menu item");
    assert.ok(frame?.includes("Manage testnet wallets"), "expected the wallet menu item");
    assert.ok(frame?.includes("Quit"), "expected the quit menu item");
  });
});
