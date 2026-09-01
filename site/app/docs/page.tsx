import type { Metadata } from "next"
import { DocsHome } from "@/components/docs-home"

export const metadata: Metadata = {
  title: "Wasit",
  description:
    "Install Wasit, run your first x402 or MPP conformance check, and browse every guide and reference page.",
}

// The docs landing page — see components/docs-home.tsx for the actual
// content. This used to redirect straight to Install; now /docs has a
// real overview so a first-time reader can see the whole shape of the
// docs before picking a page.
export default function DocsHomePage() {
  return <DocsHome />
}
