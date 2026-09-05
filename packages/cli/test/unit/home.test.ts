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
import { describe, it } from "node:test";
import { createElement } from "react";
import { render } from "ink-testing-library";

import { Home } from "../../src/dashboard/Home.js";

describe("Home", () => {
  it("renders the title and every menu item", () => {
    const { lastFrame } = render(
      createElement(Home, { onSelectAction: () => {}, onBrowseCatalogue: () => {} }),
    );
    const frame = lastFrame();

    assert.ok(frame?.includes("Wasit"), "expected the title to render");
    assert.ok(frame?.includes("Run x402 test"), "expected the x402 menu item");
    assert.ok(frame?.includes("Run MPP channel test"), "expected the MPP channel menu item");
    assert.ok(frame?.includes("Run MPP charge test"), "expected the MPP charge menu item");
    assert.ok(frame?.includes("Browse check catalogue"), "expected the catalogue menu item");
    assert.ok(frame?.includes("Quit"), "expected the quit menu item");
  });
});
