import { NextResponse } from "next/server"
import { buildSearchIndex } from "@/lib/search-index"

// Static route segment ("search-index"), so it resolves before the
// [...slug] catch-all ever sees it. force-static means this is computed
// once at build time in production, not per-request.
export const dynamic = "force-static"

export function GET() {
  return NextResponse.json(buildSearchIndex())
}
