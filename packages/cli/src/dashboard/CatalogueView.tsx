import { Box, Text, useApp, useInput } from "ink";
import { CHECK_CATALOGUE, PROTOCOL_IDS, type ProtocolId } from "@wasit-dev/core";
import { THEME } from "./theme.js";

interface CatalogueViewProps {
  readonly onBack: () => void;
}

const COMMAND_BY_PROTOCOL: Record<ProtocolId, string> = {
  x402: "test",
  "mpp-charge": "mpp-charge",
  "mpp-channel": "mpp-channel",
};

export function CatalogueView({ onBack }: CatalogueViewProps) {
  const { exit } = useApp();

  // No text field on this screen, so "q" is safe as a bare letter key —
  // distinct from Enter/Esc, which go back to the menu instead of quitting.
  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }
    if (key.escape || key.return) onBack();
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={THEME.accent} paddingX={2} paddingY={1}>
      <Text bold color={THEME.accent}>
        Check catalogue
      </Text>

      {PROTOCOL_IDS.map((protocol) => (
        <Box key={protocol} flexDirection="column" marginTop={1}>
          <Text bold>
            {protocol} (wasit {COMMAND_BY_PROTOCOL[protocol]})
          </Text>
          {CHECK_CATALOGUE.filter((entry) => entry.protocol === protocol).map((entry) => (
            <Text key={entry.id}>
              {"  "}
              {entry.id} {entry.name}
            </Text>
          ))}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>Enter or Esc to go back · q to quit</Text>
      </Box>
    </Box>
  );
}
