#!/usr/bin/env node
/**
 * Verifies the packages as a user receives them, not as the repo builds
 * them.
 *
 * Everything else in CI runs against the working tree, where npm has
 * deduplicated the dependency graph across all three workspaces. That is
 * not the tree an installer gets: a clean install resolves each package's
 * own declared ranges, which can nest a second copy of a dependency that
 * the checkout collapsed into one. So a checkout can pass every test
 * while the published artefact is broken — which is exactly what
 * happened to 0.1.1, where `wasit checks` and `--json` were documented
 * but absent from the tarball.
 *
 * This packs the three workspaces, installs the tarballs into an empty
 * directory outside the repo, and drives the result the way a user
 * would: the CLI's own binary, and the MCP server over stdio.
 *
 * Run it before publishing. `npm run verify:clean-install`.
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const WORKSPACES = ["packages/core", "packages/cli", "packages/server"];

/** Reads a workspace's declared name and version straight from its manifest. */
function manifest(workspace) {
  return JSON.parse(readFileSync(join(REPO, workspace, "package.json"), "utf8"));
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    ...options,
  });
}

let failures = 0;
function check(label, condition, detail = "") {
  const mark = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`${mark}  ${label}${detail ? `\n      ${detail}` : ""}`);
}

const staging = mkdtempSync(join(tmpdir(), "wasit-clean-install-"));
try {
  // ---- pack exactly what `npm publish` would upload -----------------
  //
  // npm pack runs each package's own prepack script, so the server's
  // bundled copy of docs/CHECKS.md is produced here the same way it is
  // for a real publish. Packing is what makes `files` in package.json
  // load-bearing: anything not listed there simply will not exist below.
  console.log(`Packing into ${staging}\n`);
  const tarballs = WORKSPACES.map((workspace) => {
    const out = run("npm", ["pack", "-w", workspace, "--pack-destination", staging], {
      cwd: REPO,
    });
    return join(staging, out.trim().split("\n").pop().trim());
  });

  // ---- install them into an empty project --------------------------
  //
  // All three go in one npm install: the CLI and the server depend on
  // @wasit-dev/core by a range that is not on the registry until it is
  // published, so installed together the local tarball satisfies it and
  // the run does not silently test the previously published core.
  const project = join(staging, "consumer");
  run("mkdir", ["-p", project]);
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({ name: "wasit-clean-install-probe", private: true, type: "module" }, null, 2),
  );
  console.log("Installing the tarballs into an empty project...\n");
  run("npm", ["install", "--no-audit", "--no-fund", ...tarballs], { cwd: project });

  const bin = join(project, "node_modules", ".bin");
  const expected = Object.fromEntries(
    WORKSPACES.map((w) => {
      const m = manifest(w);
      return [m.name, m.version];
    }),
  );

  // ---- 1. the CLI is present and complete --------------------------
  const version = run(join(bin, "wasit"), ["--version"], { cwd: project }).trim();
  check(
    "wasit --version reports the version being published",
    version === expected["@wasit-dev/cli"],
    `got ${version}, expected ${expected["@wasit-dev/cli"]}`,
  );

  const catalogue = JSON.parse(run(join(bin, "wasit"), ["checks", "--json"], { cwd: project }));
  check(
    "wasit checks runs from the tarball and lists the full catalogue",
    Array.isArray(catalogue) && catalogue.length > 0,
    `${Array.isArray(catalogue) ? catalogue.length : 0} checks`,
  );

  // The repo's own docs/CHECKS.md is the source of truth for how many
  // checks exist; core's test suite already asserts the two agree. Here
  // the point is only that the published tarball carries all of them
  // rather than a subset — 0.1.1 shipped a catalogue-less core.
  const repoCatalogue = JSON.parse(
    run("node", [join(REPO, "packages/cli/dist/index.js"), "checks", "--json"], { cwd: REPO }),
  );
  check(
    "the tarball's catalogue matches the repo's",
    catalogue.length === repoCatalogue.length,
    `tarball ${catalogue.length}, repo ${repoCatalogue.length}`,
  );

  // ---- 2. what the install actually resolved ------------------------
  //
  // Reported, never failed on. @stellar/mpp's peer ranges sit two majors
  // behind the SDK this project uses, so a clean install nests an older
  // Stellar package that the checkout deduplicates away — the condition
  // tracked in https://github.com/wasit-dev/Wasit/issues/3, which only
  // upstream can resolve. Failing here would block every release over
  // something we cannot fix; printing it means nobody has to remember
  // that the checkout's tree is not the shipped one.
  reportStellarTree(project);
  reportAudit(project);

  // ---- 3. the MCP server answers tools/list over stdio --------------
  const tools = await listMcpTools(join(bin, "wasit-mcp"), project);
  check(
    "wasit-mcp completes an MCP handshake and answers tools/list",
    tools.names.length > 0,
    tools.names.join(", "),
  );
  check(
    "wasit-mcp reports the version being published",
    tools.serverVersion === expected["@wasit-dev/server"],
    `got ${tools.serverVersion}, expected ${expected["@wasit-dev/server"]}`,
  );
} finally {
  rmSync(staging, { recursive: true, force: true });
}

console.log(`\n${failures === 0 ? "Clean install verified." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);

/**
 * Prints every resolved copy of the named packages, with the dependency
 * path that pulled each one in.
 */
function reportPaths(cwd, names) {
  let tree;
  try {
    tree = JSON.parse(
      execFileSync("npm", ["ls", "--all", "--json"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
    );
  } catch (error) {
    tree = error.stdout ? JSON.parse(error.stdout) : null;
  }
  if (!tree) return;

  const found = [];
  const walk = (node, path) => {
    for (const [name, dep] of Object.entries(node.dependencies ?? {})) {
      const here = [...path, `${name}@${dep.version ?? "?"}`];
      if (names.has(name) && dep.version) found.push(here);
      walk(dep, here);
    }
  };
  walk(tree, []);

  console.log("\nWhere the flagged packages come from:");
  const seen = new Set();
  for (const path of found.sort((a, b) => a.join().localeCompare(b.join()))) {
    const key = path.join(" > ");
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`        ${key}`);
  }
}

/**
 * Prints every @stellar/* package the clean install resolved, and flags
 * any name that resolved to more than one major at once. `npm ls` exits
 * non-zero on peer-range complaints, which is the normal state here, so
 * its output is read rather than its exit code.
 */
function reportStellarTree(cwd) {
  let tree;
  try {
    tree = JSON.parse(
      execFileSync("npm", ["ls", "--all", "--json"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
    );
  } catch (error) {
    tree = error.stdout ? JSON.parse(error.stdout) : null;
  }
  if (!tree) {
    console.log("NOTE  could not read the resolved dependency tree");
    return;
  }

  const versions = new Map();
  const walk = (node) => {
    for (const [name, dep] of Object.entries(node.dependencies ?? {})) {
      if (name.startsWith("@stellar/") && dep.version) {
        versions.set(name, (versions.get(name) ?? new Set()).add(dep.version));
      }
      walk(dep);
    }
  };
  walk(tree);

  console.log("\nResolved @stellar/* packages in the clean install:");
  let split = false;
  for (const [name, found] of [...versions].sort()) {
    const list = [...found].sort();
    const majors = new Set(list.map((v) => v.split(".")[0]));
    if (majors.size > 1) split = true;
    console.log(`      ${majors.size > 1 ? "!" : " "} ${name} ${list.join(", ")}`);
  }
  if (split) {
    console.log(
      "\nNOTE  a package resolved to more than one major at once. Expected until\n" +
        "      @stellar/mpp widens its peer ranges — see issues/3. The checkout\n" +
        "      does not show this; only a clean install does.",
    );
  }
}

/**
 * Reports npm's advisories for the clean install.
 *
 * Running `npm audit` in the repo answers a different question: the
 * checkout's tree carries dev dependencies a user never receives, and
 * deduplicates away the nested copies a user does. This is the only
 * place the shipped tree can actually be audited.
 *
 * Report-only, for the same reason as the tree above — the advisories
 * that matter here arrive through @stellar/mpp's own peer ranges, so
 * failing would block releases on something only upstream can fix.
 */
function reportAudit(cwd) {
  let report;
  try {
    report = JSON.parse(
      execFileSync("npm", ["audit", "--json"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
    );
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything, which is the
    // expected case; the JSON is still on stdout.
    report = error.stdout ? JSON.parse(error.stdout) : null;
  }
  if (!report) {
    console.log("NOTE  could not read npm audit for the clean install");
    return;
  }

  const advisories = Object.values(report.vulnerabilities ?? {});
  const totals = report.metadata?.vulnerabilities ?? {};
  const counted = ["critical", "high", "moderate", "low"]
    .filter((level) => totals[level])
    .map((level) => `${totals[level]} ${level}`)
    .join(", ");

  // Where each flagged package actually sits. The advisory list alone
  // cannot say whether a vulnerable copy arrived through the nested 15.x
  // SDK or would have come anyway through the 16.x one this project
  // declares — different problems, different owners.
  const flagged = new Set(
    advisories.map((entry) => entry.name).filter((name) => !name.startsWith("@wasit-dev/")),
  );
  if (flagged.size > 0) reportPaths(cwd, flagged);

  console.log("\nAdvisories in the clean install:");
  if (advisories.length === 0) {
    console.log("        none");
    return;
  }
  console.log(`        ${counted || `${advisories.length} total`}`);
  for (const entry of advisories.sort((a, b) => a.name.localeCompare(b.name))) {
    const pulledInBy = (entry.effects ?? []).filter((name) => name.startsWith("@stellar/"));
    const trace = pulledInBy.length > 0 ? `  <- ${pulledInBy.join(", ")}` : "";
    console.log(`        ${entry.severity.padEnd(8)} ${entry.name}${trace}`);

    // Only direct advisories carry the CVE; an entry whose `via` is just
    // package names is collateral, already explained by the one it names.
    for (const source of entry.via ?? []) {
      if (typeof source === "string") continue;
      console.log(`                 ${source.title}`);
      console.log(`                 affects ${source.range}  ·  ${source.url}`);
    }
  }
  console.log(
    "\nNOTE  advisories reaching this tree through @stellar/* are the cost of\n" +
      "      the peer ranges in issues/3, not of anything declared here.",
  );
}

/**
 * Drives the published MCP server the way a client does: initialize,
 * the initialized notification, then tools/list — over stdio, with no
 * keys set, since listing tools must never require credentials.
 */
async function listMcpTools(binary, cwd) {
  const child = spawn(binary, [], { cwd, stdio: ["pipe", "pipe", "inherit"] });
  const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);

  const replies = new Map();
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try {
        const message = JSON.parse(line);
        if (message.id !== undefined) replies.set(message.id, message);
      } catch {
        // Not JSON-RPC — the server is free to log to stdout.
      }
    }
  });

  const await_ = (id, ms = 20_000) =>
    new Promise((resolveReply, reject) => {
      const started = Date.now();
      const poll = setInterval(() => {
        if (replies.has(id)) {
          clearInterval(poll);
          resolveReply(replies.get(id));
        } else if (Date.now() - started > ms) {
          clearInterval(poll);
          reject(new Error(`MCP server did not answer request ${id} within ${ms}ms`));
        }
      }, 50);
    });

  try {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "wasit-clean-install-probe", version: "0" },
      },
    });
    const initialized = await await_(1);
    send({ jsonrpc: "2.0", method: "notifications/initialized" });

    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const listed = await await_(2);

    return {
      serverVersion: initialized.result?.serverInfo?.version,
      names: (listed.result?.tools ?? []).map((tool) => tool.name),
    };
  } finally {
    child.kill();
  }
}
