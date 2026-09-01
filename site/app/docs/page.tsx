import type { Metadata } from "next"
import { DocsArticle } from "@/components/docs-article"
import { INSTALL_MD } from "@/lib/content"

export const metadata: Metadata = {
  title: "Install - Wasit Docs",
  description: "Install the Wasit CLI, MCP server, or core check library.",
}

export default function DocsHome() {
  return <DocsArticle markdown={INSTALL_MD} />
}
