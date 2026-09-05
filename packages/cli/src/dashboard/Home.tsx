import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { DashboardAction } from "./App.js";

interface HomeProps {
  readonly onSelectAction: (action: DashboardAction) => void;
  readonly onBrowseCatalogue: () => void;
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
  { label: "Quit", value: "quit" },
];

function isActionKind(value: string): value is DashboardAction["kind"] {
  return (ACTION_KINDS as readonly string[]).includes(value);
}

export function Home({ onSelectAction, onBrowseCatalogue }: HomeProps) {
  // Safe as a bare letter key here: this screen has no text field, so
  // nothing the user types could ever collide with "q".
  useInput((input) => {
    if (input === "q") {
      process.exit(0);
    }
  });

  const handleSelect = (item: Item): void => {
    if (item.value === "catalogue") {
      onBrowseCatalogue();
      return;
    }
    if (item.value === "quit") {
      process.exit(0);
      return;
    }
    if (isActionKind(item.value)) {
      onSelectAction({ kind: item.value });
    }
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        Wasit — x402 / MPP conformance tester
      </Text>
      <Text dimColor>Stellar Testnet · pick what to run · q to quit</Text>
      <Box marginTop={1}>
        <SelectInput items={ITEMS} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}
