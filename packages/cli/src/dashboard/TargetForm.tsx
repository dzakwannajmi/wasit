import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { DashboardAction } from "./App.js";

interface TargetFormProps {
  readonly action: DashboardAction;
  readonly onSubmit: (target: string) => void;
  readonly onCancel: () => void;
}

const ACTION_LABEL: Record<DashboardAction["kind"], string> = {
  "x402-read": "x402 read-only checks (X402-01..05)",
  "mpp-channel": "MPP channel checks (MPP-10, 11, 12, 14 — non-destructive)",
  "mpp-charge": "MPP-01 charge settlement",
};

function isValidUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function TargetForm({ action, onSubmit, onCancel }: TargetFormProps) {
  const [target, setTarget] = useState("");
  const [confirmedTarget, setConfirmedTarget] = useState("");
  const [step, setStep] = useState<"url" | "confirm">("url");
  const [error, setError] = useState<string | undefined>(undefined);

  const handleUrlSubmit = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError("Target URL cannot be empty.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError(`"${trimmed}" is not a valid URL.`);
      return;
    }
    setError(undefined);
    setConfirmedTarget(trimmed);
    if (action.kind === "mpp-charge") {
      setStep("confirm");
    } else {
      onSubmit(trimmed);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (step !== "confirm") return;
    if (key.return || input.toLowerCase() === "y") {
      onSubmit(confirmedTarget);
    } else if (input.toLowerCase() === "n") {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        {ACTION_LABEL[action.kind]}
      </Text>

      {step === "url" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Target URL:</Text>
          <TextInput value={target} onChange={setTarget} onSubmit={handleUrlSubmit} />
          {error !== undefined && <Text color="red">{error}</Text>}
          <Text dimColor>Enter to continue · Esc to go back</Text>
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">
            This settles a real payment on Stellar Testnet against {confirmedTarget}.
          </Text>
          <Text>Continue? (Y/n)</Text>
        </Box>
      )}
    </Box>
  );
}
