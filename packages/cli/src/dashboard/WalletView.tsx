import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import { THEME } from "./theme.js";
import { useSpinnerFrame } from "./useSpinnerFrame.js";
import { writeEnvValue } from "./env-file.js";
import {
  ROLE_ENV_VAR,
  ROLE_LABEL,
  TESTNET_USDC_ISSUER,
  WALLET_ROLES,
  describeError,
  friendbotText,
  loadRoleOverview,
  generateTestnetWallet,
  generateCommitmentKey,
  fundWithFriendbot,
  createUsdcTrustline,
  sendUsdcFromDistributor,
  type RoleOverview,
  type WalletRole,
  type WalletStatus,
} from "./wallet-actions.js";

interface WalletViewProps {
  readonly onBack: () => void;
}

/** Only these two roles are funded Stellar accounts; mpp-channel never is. */
type FundableRole = "x402" | "mpp-charge";

const USDC_DISTRIBUTOR_AMOUNT = "50";

interface Item {
  readonly label: string;
  readonly value: string;
}

type Stage =
  | { readonly name: "loading" }
  | { readonly name: "overview" }
  | { readonly name: "manual-copy"; readonly lines: readonly string[] }
  | {
      readonly name: "confirm-write";
      readonly lines: readonly string[];
      readonly onConfirm: () => void;
    }
  | { readonly name: "running"; readonly label: string }
  | { readonly name: "result"; readonly ok: boolean; readonly lines: readonly string[] };

function formatBalanceLine(balance: { code: string; issuer?: string; balance: string }): string {
  const note = balance.issuer === TESTNET_USDC_ISSUER ? "  (Circle testnet USDC)" : "";
  return `    ${balance.code.padEnd(10)} ${balance.balance}${note}`;
}

function buildItems(overviews: readonly RoleOverview[]): Item[] {
  const items: Item[] = [];
  for (const overview of overviews) {
    const label = ROLE_LABEL[overview.role];
    items.push({ label: `${label} — create new key`, value: `create:${overview.role}` });
    if (overview.role !== "mpp-channel" && overview.configured && overview.publicKey) {
      items.push({ label: `${label} — fund with XLM`, value: `fund-xlm:${overview.role}` });
      items.push({ label: `${label} — fund with USDC`, value: `fund-usdc:${overview.role}` });
    }
  }
  items.push({ label: "Refresh", value: "refresh" });
  items.push({ label: "Back", value: "back" });
  return items;
}

export function WalletView({ onBack }: WalletViewProps) {
  const { exit } = useApp();
  const [overviews, setOverviews] = useState<readonly RoleOverview[]>([]);
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const spinnerFrame = useSpinnerFrame(stage.name === "loading" || stage.name === "running");

  // Guards every async completion below. Two things can make a late result
  // wrong: the screen was left (React would be asked to update an unmounted
  // component), or a newer refresh was started and this one's answer is
  // stale. Both are the same question — "is this still the live request?" —
  // so one monotonic id answers both.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback((): void => {
    const requestId = (requestIdRef.current += 1);
    setStage({ name: "loading" });
    Promise.all(WALLET_ROLES.map((role) => loadRoleOverview(role)))
      .then((loaded) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setOverviews(loaded);
        setStage({ name: "overview" });
      })
      .catch((error: unknown) => {
        // loadRoleOverview resolves even for a broken key, so reaching here
        // means something unforeseen. Showing it beats the previous
        // behavior, where the rejection escaped as an unhandled rejection
        // and killed the process from under Ink's renderer.
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setStage({
          name: "result",
          ok: false,
          lines: ["Could not load wallet status.", describeError(error)],
        });
      });
  }, []);

  // Loads the three roles' status once on entry; every later refresh (after
  // an action completes) goes through refresh() above instead.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const runTask = (label: string, task: () => Promise<string[]>): void => {
    const requestId = (requestIdRef.current += 1);
    setStage({ name: "running", label });
    task()
      .then((lines) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setStage({ name: "result", ok: true, lines });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setStage({ name: "result", ok: false, lines: [describeError(error)] });
      });
  };

  /**
   * Writes the generated lines to .env and reports where they went.
   *
   * This runs inside the keypress handler, so a throw here would escape into
   * Ink's input dispatch with nothing to catch it — a read-only directory or
   * a full disk would take the dashboard down rather than showing a message.
   * On success the absolute path is shown, since .env is resolved against
   * whichever directory `wasit` was started from and the user cannot
   * otherwise tell which file was touched.
   */
  const saveToEnv = (entries: ReadonlyArray<readonly [string, string]>): void => {
    try {
      let path = "";
      for (const [key, value] of entries) path = writeEnvValue(key, value);
      setStage({
        name: "result",
        ok: true,
        lines: [`Saved to ${path}`, "Press Enter to reload wallet status."],
      });
    } catch (error) {
      setStage({
        name: "result",
        ok: false,
        lines: [
          "Could not write .env — this key is not saved anywhere yet.",
          describeError(error),
          "",
          "Copy these into .env yourself before leaving this screen:",
          ...entries.map(([key, value]) => `${key}=${value}`),
        ],
      });
    }
  };

  const createKey = (role: WalletRole): void => {
    if (role === "mpp-channel") {
      const key = generateCommitmentKey();
      const lines = [
        `COMMITMENT_SECRET_HEX=${key.secretHex}`,
        `COMMITMENT_PUBKEY_HEX=${key.publicKeyHex}`,
      ];
      setStage({
        name: "confirm-write",
        lines,
        onConfirm: () =>
          saveToEnv([
            ["COMMITMENT_SECRET_HEX", key.secretHex],
            ["COMMITMENT_PUBKEY_HEX", key.publicKeyHex],
          ]),
      });
      return;
    }

    const generated = generateTestnetWallet();
    const lines =
      role === "x402"
        ? [`STELLAR_PRIVATE_KEY=${generated.secretKey}`]
        : [`MPP_PAYER_SECRET=${generated.secretKey}`, `MPP_PAYER_PUBLIC=${generated.publicKey}`];
    setStage({
      name: "confirm-write",
      lines,
      onConfirm: () =>
        saveToEnv(
          role === "x402"
            ? [["STELLAR_PRIVATE_KEY", generated.secretKey]]
            : [
                ["MPP_PAYER_SECRET", generated.secretKey],
                ["MPP_PAYER_PUBLIC", generated.publicKey],
              ],
        ),
    });
  };

  const fundXlm = (role: FundableRole, publicKey: string): void => {
    runTask(`Funding ${ROLE_LABEL[role]} with testnet XLM via Friendbot...`, async () => {
      return [friendbotText(await fundWithFriendbot(publicKey))];
    });
  };

  const fundUsdc = (
    role: FundableRole,
    publicKey: string,
    secret: string,
    status: WalletStatus | undefined,
  ): void => {
    runTask(`Setting up USDC for ${ROLE_LABEL[role]}...`, async () => {
      const lines: string[] = [];
      const xlmBalance = status?.balances.find((balance) => balance.code === "XLM");
      if (!status?.exists || Number(xlmBalance?.balance ?? "0") < 2) {
        lines.push(friendbotText(await fundWithFriendbot(publicKey)));
      }
      await createUsdcTrustline(secret, ROLE_ENV_VAR[role]);
      lines.push("Trustline created.");

      const distributorSecret = process.env.WASIT_USDC_DISTRIBUTOR_SECRET;
      if (!distributorSecret) {
        lines.push(
          "",
          "No USDC balance yet. There is no scriptable USDC faucet for Stellar —",
          `visit https://faucet.circle.com (Stellar Testnet, paste ${publicKey}),`,
          "or set WASIT_USDC_DISTRIBUTOR_SECRET in .env and try again to send automatically.",
        );
        return lines;
      }

      await sendUsdcFromDistributor(distributorSecret, publicKey, USDC_DISTRIBUTOR_AMOUNT);
      lines.push(`Sent ${USDC_DISTRIBUTOR_AMOUNT} USDC from the distributor account.`);
      return lines;
    });
  };

  const handleSelect = (item: Item): void => {
    if (item.value === "back") {
      onBack();
      return;
    }
    if (item.value === "refresh") {
      refresh();
      return;
    }

    const separator = item.value.indexOf(":");
    const kind = item.value.slice(0, separator);
    const role = item.value.slice(separator + 1) as WalletRole;

    if (kind === "create") {
      createKey(role);
      return;
    }

    const overview = overviews.find((entry) => entry.role === role);
    if (!overview?.publicKey) return;

    if (kind === "fund-xlm") {
      fundXlm(role as FundableRole, overview.publicKey);
      return;
    }
    if (kind === "fund-usdc") {
      const secret = process.env[ROLE_ENV_VAR[role]];
      if (!secret) {
        // Only reachable if .env changed under a stale overview; say so
        // rather than swallowing the keypress with no feedback at all.
        setStage({
          name: "result",
          ok: false,
          lines: [`${ROLE_ENV_VAR[role]} is no longer set. Press Enter to refresh.`],
        });
        return;
      }
      fundUsdc(role as FundableRole, overview.publicKey, secret, overview.status);
    }
  };

  useInput((input, key) => {
    if (stage.name === "confirm-write") {
      if (key.return || input.toLowerCase() === "y") {
        stage.onConfirm();
        return;
      }
      if (key.escape || input.toLowerCase() === "n") {
        setStage({ name: "manual-copy", lines: stage.lines });
      }
      return;
    }

    if (stage.name === "loading" || stage.name === "running") {
      if (input === "q") exit();
      return;
    }

    if (input === "q") {
      exit();
      return;
    }

    if (key.escape) {
      if (stage.name === "overview") {
        onBack();
        return;
      }
      refresh();
      return;
    }

    if ((stage.name === "manual-copy" || stage.name === "result") && key.return) {
      refresh();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={THEME.accent}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={THEME.accent}>
        Testnet wallets
      </Text>

      {stage.name === "loading" && (
        <Box marginTop={1}>
          <Text>{spinnerFrame} Loading wallet status...</Text>
        </Box>
      )}

      {stage.name === "overview" && (
        <Box flexDirection="column" marginTop={1}>
          {overviews.map((overview) => (
            <Box key={overview.role} flexDirection="column" marginBottom={1}>
              <Text bold>{ROLE_LABEL[overview.role]}</Text>
              {!overview.configured && (
                <Text dimColor>  {ROLE_ENV_VAR[overview.role]} not set</Text>
              )}
              {overview.configured && overview.publicKey !== undefined && (
                <Text dimColor>  {overview.publicKey}</Text>
              )}
              {overview.error !== undefined && (
                <Text color={THEME.danger}>  Could not check: {overview.error}</Text>
              )}
              {overview.status !== undefined && !overview.status.exists && (
                <Text dimColor>  Not yet created on-chain</Text>
              )}
              {overview.status?.exists === true &&
                overview.status.balances.map((balance, index) => (
                  <Text key={index} dimColor>
                    {formatBalanceLine(balance)}
                  </Text>
                ))}
            </Box>
          ))}
          <SelectInput items={buildItems(overviews)} onSelect={handleSelect} />
          <Box marginTop={1}>
            <Text dimColor>Esc to go back · q to quit</Text>
          </Box>
        </Box>
      )}

      {stage.name === "confirm-write" && (
        <Box flexDirection="column" marginTop={1}>
          {stage.lines.map((line, index) => (
            <Text key={index}>{line}</Text>
          ))}
          <Box marginTop={1} flexDirection="column">
            <Text color={THEME.warning}>Save this to .env now? (Y/n)</Text>
            <Text dimColor>
              A secret key is on screen — do not leave this view up while recording.
            </Text>
          </Box>
        </Box>
      )}

      {stage.name === "manual-copy" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Not saved. Paste into .env yourself:</Text>
          {stage.lines.map((line, index) => (
            <Text key={index}>{line}</Text>
          ))}
          <Box marginTop={1}>
            <Text dimColor>Enter to continue · q to quit</Text>
          </Box>
        </Box>
      )}

      {stage.name === "running" && (
        <Box marginTop={1}>
          <Text color={THEME.accent}>
            {spinnerFrame} {stage.label}
          </Text>
        </Box>
      )}

      {stage.name === "result" && (
        <Box flexDirection="column" marginTop={1}>
          {stage.lines.map((line, index) => (
            <Text key={index} color={stage.ok ? undefined : THEME.danger}>
              {line}
            </Text>
          ))}
          <Box marginTop={1}>
            <Text dimColor>Enter to continue · q to quit</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
