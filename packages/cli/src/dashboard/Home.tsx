import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { DashboardAction } from "./App.js";
import { THEME } from "./theme.js";
import { CLI_VERSION } from "../version.js";
import { renderWordmark } from "./banner.js";
import { getEnvironmentStatus } from "./environment.js";

interface HomeProps {
  readonly onSelectAction: (action: DashboardAction) => void;
  readonly onBrowseCatalogue: () => void;
  readonly onOpenWallet: () => void;
}

interface Item {
  readonly label: string;
  readonly value: string;
}

const ACTION_KINDS = ["x402-read", "mpp-channel", "mpp-charge"] as const;

const ITEMS: Item[] = [
  { label: "Run x402 test (read-only checks)", value: "x402-read" },
  { label: "Run MPP channel test (non-destructive)", value: "mpp-channel" },
  { label: "Run MPP charge test (settles a real testnet payment)", value: "mpp-charge" },
  { label: "Browse check catalogue", value: "catalogue" },
  { label: "Manage testnet wallets", value: "wallet" },
  { label: "Quit", value: "quit" },
];

// Computed once at module load, not per render: it's ASCII art of a fixed
// string, not something that ever changes while the process is running.
const WORDMARK_LINES = renderWordmark("WASIT");

function isActionKind(value: string): value is DashboardAction["kind"] {
  return (ACTION_KINDS as readonly string[]).includes(value);
}

export function Home({ onSelectAction, onBrowseCatalogue, onOpenWallet }: HomeProps) {
  // Ink's own exit, not process.exit: it unmounts the tree and restores the
  // terminal (cursor, raw mode) before the process ends, which a bare
  // process.exit skips — leaving a hidden cursor behind on quit.
  const { exit } = useApp();

  // Safe as a bare letter key here: this screen has no text field, so
  // nothing the user types could ever collide with "q".
  useInput((input) => {
    if (input === "q") {
      exit();
    }
  });

  const handleSelect = (item: Item): void => {
    if (item.value === "catalogue") {
      onBrowseCatalogue();
      return;
    }
    if (item.value === "wallet") {
      onOpenWallet();
      return;
    }
    if (item.value === "quit") {
      exit();
      return;
    }
    if (isActionKind(item.value)) {
      onSelectAction({ kind: item.value });
    }
  };

  const environment = getEnvironmentStatus();

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        {WORDMARK_LINES.map((line, index) => (
          <Text key={index} color={THEME.accent}>
            {line}
          </Text>
        ))}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={THEME.accent}
        paddingX={2}
        paddingY={1}
      >
        <Text bold>Welcome to Wasit</Text>
        <Text dimColor>x402 / MPP compliance tester · Stellar Testnet</Text>

        <Box marginTop={1} flexDirection="row" gap={4}>
          <Box flexDirection="column">
            <Text bold color={THEME.accent}>
              Tips
            </Text>
            <Text dimColor>↑↓ + Enter to pick an action</Text>
            <Text dimColor>Esc to go back · Ctrl+C to quit anywhere</Text>
            <Text dimColor>docs/CHECKS.md has every check's pass criteria</Text>
          </Box>

          <Box flexDirection="column">
            <Text bold color={THEME.accent}>
              Environment
            </Text>
            {environment.map((status) => (
              <Text key={status.label} color={status.ready ? THEME.success : THEME.muted}>
                {status.ready ? "✓" : "·"} {status.label}
              </Text>
            ))}
          </Box>
        </Box>

        <Box marginTop={1}>
          <SelectInput items={ITEMS} onSelect={handleSelect} />
        </Box>

        <Box marginTop={1}>
          <Text dimColor>v{CLI_VERSION} · q to quit</Text>
        </Box>
      </Box>
    </Box>
  );
}
