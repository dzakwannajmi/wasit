import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { writeEnvValue } from "../../src/dashboard/env-file.js";

describe("writeEnvValue", () => {
  let dir: string;
  let envPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "wasit-env-file-test-"));
    envPath = join(dir, ".env");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.WASIT_TEST_KEY;
    delete process.env.WASIT_TEST_OTHER;
  });

  it("creates the file when it does not exist yet", () => {
    writeEnvValue("WASIT_TEST_KEY", "abc123", envPath);
    assert.equal(readFileSync(envPath, "utf8"), "WASIT_TEST_KEY=abc123\n");
    assert.equal(process.env.WASIT_TEST_KEY, "abc123");
  });

  it("replaces an existing line for the key, leaving every other line untouched", () => {
    writeEnvValue("WASIT_TEST_KEY", "old", envPath);
    writeEnvValue("WASIT_TEST_OTHER", "kept", envPath);
    writeEnvValue("WASIT_TEST_KEY", "new", envPath);

    const content = readFileSync(envPath, "utf8");
    assert.match(content, /^WASIT_TEST_KEY=new$/m);
    assert.match(content, /^WASIT_TEST_OTHER=kept$/m);
    assert.equal(content.match(/WASIT_TEST_KEY=/g)?.length, 1, "expected exactly one line for the key");
  });

  it("appends a new key without disturbing an unrelated existing line", () => {
    writeEnvValue("WASIT_TEST_OTHER", "kept", envPath);
    writeEnvValue("WASIT_TEST_KEY", "abc123", envPath);

    const content = readFileSync(envPath, "utf8");
    assert.match(content, /^WASIT_TEST_OTHER=kept$/m);
    assert.match(content, /^WASIT_TEST_KEY=abc123$/m);
  });

  it("sets process.env so the running process sees the change immediately", () => {
    writeEnvValue("WASIT_TEST_KEY", "live-value", envPath);
    assert.equal(process.env.WASIT_TEST_KEY, "live-value");
  });

  it("creates the file readable only by its owner", () => {
    // This file holds Stellar secret keys. Node's default would be 0666
    // masked by the umask, which on a typical machine is a world-readable
    // 0644.
    writeEnvValue("WASIT_TEST_KEY", "abc123", envPath);
    assert.equal(statSync(envPath).mode & 0o777, 0o600);
  });

  it("tightens an existing world-readable file", () => {
    writeFileSync(envPath, "WASIT_TEST_OTHER=keep\n", "utf8");
    chmodSync(envPath, 0o644);

    writeEnvValue("WASIT_TEST_KEY", "abc123", envPath);

    assert.equal(statSync(envPath).mode & 0o777, 0o600);
    assert.ok(readFileSync(envPath, "utf8").includes("WASIT_TEST_OTHER=keep"));
  });

  it("returns the absolute path it actually wrote", () => {
    // The default is relative to the process's directory, so the caller
    // cannot otherwise tell the user which .env was touched.
    const written = writeEnvValue("WASIT_TEST_KEY", "abc123", envPath);
    assert.equal(written, envPath);
  });

  it("matches the key literally rather than as a pattern", () => {
    // The key used to be interpolated straight into a RegExp; a metacharacter
    // in it would match the wrong line, or none at all.
    writeFileSync(envPath, "WASIT_TEST_KEY=original\nWASIT.TEST.KEY=unrelated\n", "utf8");

    writeEnvValue("WASIT_TEST_KEY", "replaced", envPath);

    const content = readFileSync(envPath, "utf8");
    assert.ok(content.includes("WASIT_TEST_KEY=replaced"));
    assert.ok(content.includes("WASIT.TEST.KEY=unrelated"), "must not rewrite a look-alike line");
  });

  it("leaves no temp file behind", () => {
    writeEnvValue("WASIT_TEST_KEY", "abc123", envPath);
    assert.throws(() => statSync(`${envPath}.wasit-tmp`));
  });
});
