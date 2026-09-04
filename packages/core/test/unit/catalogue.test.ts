import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { CHECK_CATALOGUE, PROTOCOL_IDS } from "../../src/catalogue.js";

const CHECKS_MD = join(dirname(fileURLToPath(import.meta.url)), "../../../../docs/CHECKS.md");

/** Every check id that appears as a catalogue row in docs/CHECKS.md. */
function documentedIds(): Set<string> {
  const markdown = readFileSync(CHECKS_MD, "utf8");
  const ids = new Set<string>();
  // Catalogue rows open with the id in backticks: | `X402-01` | Check Name | ...
  for (const match of markdown.matchAll(/^\|\s*`([A-Z0-9-]+)`\s*\|/gm)) {
    ids.add(match[1]!);
  }
  return ids;
}

describe("check catalogue", () => {
  it("has a unique id for every entry", () => {
    const ids = CHECK_CATALOGUE.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("only uses known protocol ids", () => {
    for (const entry of CHECK_CATALOGUE) {
      assert.ok(
        PROTOCOL_IDS.includes(entry.protocol),
        `${entry.id} has unknown protocol "${entry.protocol}"`,
      );
    }
  });

  it("gives every entry a name, a spec reference and a summary", () => {
    for (const entry of CHECK_CATALOGUE) {
      assert.ok(entry.name.length > 0, `${entry.id} has no name`);
      assert.ok(entry.specRef.length > 0, `${entry.id} has no spec reference`);
      assert.ok(entry.summary.length > 0, `${entry.id} has no summary`);
    }
  });

  it("groups entries so that each protocol's checks are contiguous", () => {
    // `wasit checks` prints a protocol header whenever the protocol changes,
    // so an interleaved catalogue would print the same header twice.
    const seen = new Set<string>();
    let current: string | undefined;

    for (const entry of CHECK_CATALOGUE) {
      if (entry.protocol !== current) {
        assert.ok(!seen.has(entry.protocol), `${entry.protocol} appears in two separate blocks`);
        seen.add(entry.protocol);
        current = entry.protocol;
      }
    }
  });

  // The catalogue is kept in sync with docs/CHECKS.md by hand — its own
  // docstring says so, and until now nothing enforced it. PREFLIGHT is
  // deliberately absent from both sides of this comparison: CHECKS.md
  // documents it in prose, not as a catalogue row, because it is a
  // diagnostic emitted when the run is misconfigured rather than a check.
  it("documents every catalogued check in docs/CHECKS.md", () => {
    const documented = documentedIds();
    const undocumented = CHECK_CATALOGUE.map((entry) => entry.id).filter(
      (id) => !documented.has(id),
    );

    assert.deepEqual(undocumented, [], `catalogued but absent from CHECKS.md: ${undocumented.join(", ")}`);
  });

  it("catalogues every check documented in docs/CHECKS.md", () => {
    const catalogued = new Set(CHECK_CATALOGUE.map((entry) => entry.id));
    const missing = [...documentedIds()].filter((id) => !catalogued.has(id));

    assert.deepEqual(missing, [], `documented in CHECKS.md but not catalogued: ${missing.join(", ")}`);
  });
});
