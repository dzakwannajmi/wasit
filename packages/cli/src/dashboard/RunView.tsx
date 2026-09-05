import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  CHECK_CATALOGUE,
  checkStatus,
  summarize,
  type CheckResult,
  type ProtocolId,
} from "@wasit-dev/core";
import type { DashboardAction } from "./App.js";
import { runAction } from "./runners.js";

interface RunViewProps {
  readonly protocol: ProtocolId;
  readonly action: DashboardAction;
  readonly target: string;
  readonly onBack: () => void;
}

type EntryStatus = "pending" | "PASS" | "FAIL" | "ERROR" | "SKIP";

interface Entry {
  readonly id: string;
  readonly name: string;
  readonly status: EntryStatus;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function iconFor(status: EntryStatus, spinnerFrame: string): string {
  switch (status) {
    case "PASS":
      return "✓";
    case "FAIL":
      return "✗";
    case "ERROR":
      return "⨯";
    case "SKIP":
      return "⚠";
    default:
      return spinnerFrame;
  }
}

function colorFor(status: EntryStatus): string {
  switch (status) {
    case "PASS":
      return "green";
    case "FAIL":
      return "red";
    case "ERROR":
      return "magenta";
    case "SKIP":
      return "yellow";
    default:
      return "gray";
  }
}

// X402-06/07 need a real settled payment and are never touched by the
// read-only x402 action — listing them as "pending" would leave two rows
// spinning forever after the run has already finished.
const READ_ONLY_EXCLUDED_IDS = new Set(["X402-06", "X402-07"]);

export function RunView({ protocol, action, target, onBack }: RunViewProps) {
  const { exit } = useApp();

  const initialEntries = useMemo<Entry[]>(() => {
    const catalogueEntries = CHECK_CATALOGUE.filter((entry) => entry.protocol === protocol);
    const relevant =
      action.kind === "x402-read"
        ? catalogueEntries.filter((entry) => !READ_ONLY_EXCLUDED_IDS.has(entry.id))
        : catalogueEntries;
    return relevant.map((entry) => ({
      id: entry.id,
      name: entry.name,
      status: "pending" as const,
    }));
  }, [protocol, action.kind]);

  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [extra, setExtra] = useState<Entry[]>([]);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [summaryLine, setSummaryLine] = useState<string | undefined>(undefined);
  const [frameIndex, setFrameIndex] = useState(0);

  // Advances the spinner shown next to whichever check is currently running.
  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  // Kicks off the run exactly once. Ignored intentionally: initialEntries is
  // derived from `protocol`, which does not change once a run has started.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;

    const onResult = (result: CheckResult): void => {
      if (cancelled) return;
      const status = checkStatus(result);
      const isKnown = initialEntries.some((entry) => entry.id === result.id);

      if (isKnown) {
        setEntries((current) =>
          current.map((entry) => (entry.id === result.id ? { ...entry, status } : entry)),
        );
      } else {
        // Results outside the catalogue (e.g. PREFLIGHT) still need to be shown.
        setExtra((current) => [...current, { id: result.id, name: result.name, status }]);
      }
    };

    runAction(action, target, onResult)
      .then((results) => {
        if (cancelled) return;
        const summary = summarize(results);
        const parts = [`${summary.passed} passed`];
        if (summary.failed > 0) parts.push(`${summary.failed} failed`);
        if (summary.errored > 0) parts.push(`${summary.errored} could not run`);
        if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
        setSummaryLine(`${parts.join(", ")}.`);
        setDone(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useInput((input, key) => {
    if (input === "q") {
      process.exit(0);
      return;
    }
    if (!done) return;
    if (key.return) onBack();
    if (key.escape) exit();
  });

  const firstPendingIndex = entries.findIndex((entry) => entry.status === "pending");
  const spinnerFrame = SPINNER_FRAMES[frameIndex] ?? SPINNER_FRAMES[0];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        {target}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {extra.map((entry) => (
          <Text key={entry.id} color={colorFor(entry.status)}>
            {iconFor(entry.status, spinnerFrame)} {entry.id}  {entry.name}
          </Text>
        ))}
        {entries.map((entry, index) => {
          const isRunningNow = entry.status === "pending" && index === firstPendingIndex;
          const icon =
            entry.status === "pending" && !isRunningNow
              ? "·"
              : iconFor(entry.status, spinnerFrame);
          return (
            <Text
              key={entry.id}
              color={isRunningNow ? "cyan" : colorFor(entry.status)}
              dimColor={entry.status === "pending" && !isRunningNow}
            >
              {icon} {entry.id}  {entry.name}
            </Text>
          );
        })}
      </Box>

      {done && summaryLine !== undefined && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>{summaryLine}</Text>
          <Text dimColor>Enter to go back · q to quit</Text>
        </Box>
      )}

      {done && errorMessage !== undefined && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">Run failed: {errorMessage}</Text>
          <Text dimColor>Enter to go back · q to quit</Text>
        </Box>
      )}
    </Box>
  );
}
