import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderWordmark } from "../../src/dashboard/banner.js";

describe("renderWordmark", () => {
  it("renders at least one line of plain-string output", () => {
    const lines = renderWordmark("WASIT");
    assert.ok(lines.length > 0, "expected at least one line");
    assert.ok(
      lines.every((line) => typeof line === "string"),
      "expected every line to be a string",
    );
  });
});
