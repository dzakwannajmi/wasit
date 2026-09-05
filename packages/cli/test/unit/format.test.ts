import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDuration } from "../../src/dashboard/format.js";

describe("formatDuration", () => {
  it("renders sub-second durations in whole milliseconds", () => {
    assert.equal(formatDuration(0), "0ms");
    assert.equal(formatDuration(999), "999ms");
  });

  it("renders one-second-and-above durations in seconds, one decimal place", () => {
    assert.equal(formatDuration(1000), "1.0s");
    assert.equal(formatDuration(2300), "2.3s");
    assert.equal(formatDuration(45000), "45.0s");
  });
});
