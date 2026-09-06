import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Read this package's own version at runtime so the version an MCP
// client sees in the initialize handshake can never drift from what npm
// published. It was hardcoded "0.1.0" through two releases — a client
// reporting a bug against that string would have sent us looking at the
// wrong tag. Resolved relative to the compiled file (dist/version.js),
// not the source layout, since only dist/ ships.
const { version } = require("../package.json") as { version: string };

export const SERVER_VERSION: string = version;
