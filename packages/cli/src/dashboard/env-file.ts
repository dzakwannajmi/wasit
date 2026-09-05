import { chmodSync, existsSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Permissions for a file that holds secret keys: owner read/write only.
 * Node's default would be 0666 masked by the process umask, which on a
 * typical machine yields a world-readable 0644 — the wrong default for a
 * file whose entire purpose is to hold Stellar secrets.
 */
const ENV_FILE_MODE = 0o600;

/**
 * Sets one `KEY=value` line in `.env`, replacing an existing line for that
 * key or appending a new one — every other line, comment, and blank line is
 * left exactly as it was. Also sets `process.env[key]` in the same call, so
 * the running dashboard picks up the change immediately: `.env` is only
 * read once, at process startup, by `dotenv/config`.
 *
 * The write goes to a sibling temp file first and is then renamed into
 * place. A rename is atomic within a filesystem, so an interrupted write can
 * never leave a half-written `.env` — which for this file means losing keys
 * that may be the only copy in existence. The temp file is created at 0600
 * and the rename carries that mode onto the destination, so a `.env` that
 * was previously world-readable is tightened by the next write rather than
 * left as it was found.
 *
 * `path` is resolved to an absolute path and returned, because it defaults
 * to the process's current directory: whoever calls this should be able to
 * tell the user which `.env` was actually written, not just that one was.
 */
export function writeEnvValue(key: string, value: string, path = ".env"): string {
  // Follow a symlink to its target so the link is updated rather than
  // replaced by the rename below.
  const target = existsSync(path) ? realpathSync(resolve(path)) : resolve(path);

  const existing = existsSync(target) ? readFileSync(target, "utf8") : "";
  const lines = existing.length > 0 ? existing.split("\n") : [];
  // A literal prefix rather than a RegExp: the key is interpolated, and a
  // key carrying a regex metacharacter would otherwise match the wrong line
  // (or nothing at all) instead of being compared as the text it is.
  const prefix = `${key}=`;
  let replaced = false;

  const updated = lines.map((line) => {
    if (line.startsWith(prefix)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!replaced) {
    updated.push(`${key}=${value}`);
  }

  const content = updated.join("\n").replace(/\n*$/, "\n");
  const temp = `${target}.wasit-tmp`;
  try {
    writeFileSync(temp, content, { encoding: "utf8", mode: ENV_FILE_MODE });
    renameSync(temp, target);
  } catch (error) {
    // Never leave a temp file holding a secret behind on a failed write.
    if (existsSync(temp)) unlinkSync(temp);
    throw error;
  }

  // Belt and braces: a pre-existing file replaced by rename already carries
  // the temp file's mode, but an exotic filesystem may not honour it.
  chmodSync(target, ENV_FILE_MODE);

  process.env[key] = value;
  return target;
}
