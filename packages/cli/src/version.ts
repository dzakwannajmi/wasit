import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Read this package's own version at runtime so `wasit --version` and the
// dashboard's footer can never drift from what npm actually published.
// Resolved relative to the compiled file (dist/version.js), not the source
// layout, since only the compiled output ships to consumers.
const { version } = require("../package.json") as { version: string };

export const CLI_VERSION: string = version;
