/**
 * CLI_VERSION is read from this package's own package.json at runtime (see
 * src/version.ts) rather than hand-copied, specifically so it cannot drift
 * from what actually gets published. This just checks the plumbing works.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CLI_VERSION } from "../../src/version.js";

describe("CLI_VERSION", () => {
  it("reads a real semver string from package.json", () => {
    assert.match(CLI_VERSION, /^\d+\.\d+\.\d+/);
  });
});
