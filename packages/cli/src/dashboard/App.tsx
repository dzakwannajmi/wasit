import { useState } from "react";
import { useInput } from "ink";
import type { ProtocolId } from "@wasit-dev/core";
import { Home } from "./Home.js";
import { TargetForm } from "./TargetForm.js";
import { RunView } from "./RunView.js";
import { CatalogueView } from "./CatalogueView.js";
import { WalletView } from "./WalletView.js";

/** One thing the dashboard can run. See runners.ts for what each does. */
export type DashboardAction =
  | { readonly kind: "x402-read" }
  | { readonly kind: "mpp-channel" }
  | { readonly kind: "mpp-charge" };

type Screen =
  | { readonly name: "home" }
  | { readonly name: "target"; readonly action: DashboardAction }
  | { readonly name: "run"; readonly action: DashboardAction; readonly target: string }
  | { readonly name: "catalogue" }
  | { readonly name: "wallet" };

const PROTOCOL_BY_ACTION: Record<DashboardAction["kind"], ProtocolId> = {
  "x402-read": "x402",
  "mpp-channel": "mpp-channel",
  "mpp-charge": "mpp-charge",
};

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  // Ctrl+C must stop the process from any screen, including while a text
  // field has focus. Unlike a plain letter key, no legitimate typed input
  // (a target URL, a y/n confirmation) ever contains a literal Ctrl+C
  // keystroke, so binding it globally here never collides with typing.
  // 128 + SIGINT (2) — the exit code a shell expects after Ctrl+C.
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      process.exit(130);
    }
  });

  if (screen.name === "home") {
    return (
      <Home
        onSelectAction={(action) => setScreen({ name: "target", action })}
        onBrowseCatalogue={() => setScreen({ name: "catalogue" })}
        onOpenWallet={() => setScreen({ name: "wallet" })}
      />
    );
  }

  if (screen.name === "catalogue") {
    return <CatalogueView onBack={() => setScreen({ name: "home" })} />;
  }

  if (screen.name === "wallet") {
    return <WalletView onBack={() => setScreen({ name: "home" })} />;
  }

  if (screen.name === "target") {
    return (
      <TargetForm
        action={screen.action}
        onSubmit={(target) => setScreen({ name: "run", action: screen.action, target })}
        onCancel={() => setScreen({ name: "home" })}
      />
    );
  }

  return (
    <RunView
      protocol={PROTOCOL_BY_ACTION[screen.action.kind]}
      action={screen.action}
      target={screen.target}
      onBack={() => setScreen({ name: "home" })}
    />
  );
}
