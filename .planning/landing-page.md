# Landing Page — Planning

Status: 🟡 **PLANNING** · Not a SOW deliverable (confirmed: "npm" and "landing
page" both absent from `WASIT_SOW.docx`) — this exists purely for user
traction: someone who lands on an outreach message or a social link needs
somewhere faster to understand Wasit than the root README.

## Why now

npm packages are live (`@wasit-dev/cli`, `@wasit-dev/server`), MCP setup is
documented, and outreach is already running against three candidates. Right
now every one of those paths dead-ends at either a GitHub repo (fine for
someone who already codes there) or nothing at all. A landing page is the
missing "explain in 10 seconds, then let them install" surface.

## Scope: kecil-kecilan, on purpose

One static page. No framework, no build step, no `packages/ui` workspace —
a `ui` package inside a CLI tool's monorepo would read as a dashboard, which
this explicitly isn't (decided earlier, still holds). If it grows into
something bigger later, that's a separate decision made once there's a
reason to make it, not now.

## Hosting

**Vercel**, decided in chat. Free tier, zero maintenance, deploys straight
from the GitHub repo on push. Custom domain is **deferred**, not skipped —
buy it once the SOW is closed out and traction actually justifies a
recurring cost; pointing a domain at an existing Vercel deployment later is
a DNS change, not a rebuild, so waiting costs nothing technically.

Structure: a `site/` folder at the repo root, kept separate from the npm
workspaces (`packages/*`) so it never gets swept into a package build or
publish. Vercel project's root directory setting points at `site/`.

## Visual style

Minimal / terminal-ish, modeled directly on skills.sh (user's reference,
2026-09-01) — inspected via the actual rendered page's computed CSS, not
guessed:

| Token | Value | Where |
|---|---|---|
| `--bg` | `#000000` | page background |
| `--fg` | `#ededed` | primary text |
| `--muted` | `#a0a0a0` | secondary text, labels |
| `--border` | `#1f1f1f` | hairline section dividers |
| `--border-strong` | `#2e2e2e` | command box / code block borders |
| surface | `#0a0a0a` | slightly lifted command/code block background |

Fonts: **Fira Mono** for the wordmark, section labels, nav, and all code —
skills.sh uses Geist Mono/Fira Mono for exactly these; **Inter** for body
copy, chosen as the closest freely-available match to skills.sh's Geist
Sans (Geist itself isn't reliably on Google Fonts, Inter is the same
lineage and widely available). No card chrome, no rounded corners beyond a
3px button — flat, hairline-divided sections, matching the reference's flat
terminal-list look rather than boxed cards.

Logo: plain mono text "WASIT" for now, per the user — an actual mark comes
later and swaps in without changing the rest of the layout.

## Proposed sections (draft — confirm or adjust before building)

1. **Hero.** One-line pitch + the install command (`npx @wasit-dev/cli test
   <url>`) with a copy button. No tagline fluff.
2. **What it checks.** x402 (7 checks) + MPP Charge (1) + MPP Channel (5),
   one line each, linking out to `docs/CHECKS.md` for the real detail rather
   than duplicating it here.
3. **Why it's different.** On-chain settlement verification (not just
   response-shape checking), a published spec-referenced catalogue, both CLI
   and MCP distribution.
4. **Quick start.** Two code blocks: CLI install + run, and the Claude Code
   `claude mcp add` one-liner from `docs/guides/mcp.md`.
5. **Links.** GitHub repo, the three npm packages, CHECKS.md, SECURITY.md.
   Live badges (npm version, GitHub stars) rather than hand-typed numbers —
   badges update themselves, typed claims go stale and become overclaiming.
6. **Footer.** License, author, repo link.

## Honesty guardrail

No invented adoption numbers, no "trusted by" claims — there's no confirmed
third-party validation yet (see `.planning/instawards/02-third-party-validation.md`).
Anywhere the page could imply traction that doesn't exist yet, it either
stays silent or links to something real (the repo's own commit history, the
published check catalogue) instead of asserting a number.

## Acceptance criteria (once built)

- [ ] Single static page, no build tooling required to preview locally.
- [ ] Install command is copy-pasteable and correct against the live 0.1.1/0.1.0 packages.
- [ ] Every outbound link (repo, 3× npm, CHECKS.md, SECURITY.md) resolves live.
- [ ] No fabricated stats or claims.
- [ ] Readable on mobile without horizontal scrolling.
- [ ] Deployed on Vercel, reachable at the project's `*.vercel.app` URL.

## Open decisions still needed before building

- Exact hero copy (one-liner + supporting line) — draft it together or hand
  me a rough version to tighten?
- Whether "What it checks" lists all 13 checks by ID or just the three
  categories (x402 / Charge / Channel) — leaning toward categories only,
  keeps the page short.

## Result

**2026-09-01 — first draft (static HTML), then migrated to Next.js same day.**

First pass was a single static `site/index.html` — sent to the user, who
approved the visual direction and asked to move to Next.js (App Router,
TypeScript) instead: cleaner folder structure, native Vercel deploy
detection, and no extra work when the custom domain gets added later.

**Structure (`site/`, separate project from the `packages/*` npm
workspaces — not added to the root `workspaces` array):**

- `app/layout.tsx` — loads Fira Mono + Inter via `next/font/google`
  (self-hosted, zero layout shift — replaces the earlier `<link>` tag
  approach per Next.js font best practice), sets page metadata.
- `app/globals.css` — same tokens as before, referenced via the
  `next/font` CSS variables (`var(--font-fira-mono)`, `var(--font-inter)`)
  instead of literal font-family strings.
- `app/page.tsx` — home: hero + install command, what it checks (3
  categories), why it's different, quick start (CLI + Claude Code MCP).
- `app/docs/page.tsx` — **rebuilt twice.** First pass rendered real
  markdown content in-page instead of linking out to GitHub, using
  shadcn's [Typeset](https://ui.shadcn.com/typeset) CSS system for
  prose styling (`app/typeset.css`, the actual official file, pulled
  live — not hand-written) and [Iconify](https://icon-sets.iconify.design/)
  for icons. That version was still a 5-route structure (`/docs`,
  `/docs/cli`, `/docs/mcp`, ...). Second pass — current — collapsed it
  into **one page, modeled on
  [developers.uniswap.org](https://developers.uniswap.org/docs/trading/overview)**:
  Install, CLI, MCP, Configuration, the check catalogue, and the security
  policy are concatenated into a single markdown document (headings
  demoted per source file via `lib/content.ts#demoteHeadings` so they
  nest correctly under one page), rendered with `react-markdown` +
  `remark-gfm` + `rehype-slug` (slug plugin generates the heading `id`s
  the sidebar links jump to).
- `components/TableOfContents.tsx` — **new**, client component. Sticky
  right-hand "On this page" sidebar listing h2/h3 headings, with an
  `IntersectionObserver` toggling `data-active` on the link for whichever
  heading is currently in view — the scroll-spy behavior from the
  Uniswap reference.
- `lib/content.ts` — reads the *actual* repo docs (`docs/guides/*.md`,
  `docs/CHECKS.md`, `SECURITY.md`) via `fs.readFileSync` at
  request/build time rather than duplicating their content by hand, so
  the docs page can't drift out of sync with the real guides.
- `components/Nav.tsx` — trimmed to exactly two destinations per the
  user's request: the brand (→ `/`) and **Docs** (→ `/docs`). No more
  separate GitHub/npm/Checks links directly in the nav — they all live on
  the Docs page now.
- `components/Footer.tsx` — rewritten as a generic product footer per the
  user's request: brand + tagline, a few links (Docs/GitHub/License), and
  a copyright line reading "© 2026 Wasit — Apache-2.0, open source". The
  personal name that was in the original static version's footer is gone.
- `components/CopyButton.tsx` — the only other client component
  (`"use client"`), isolated so the rest of the page stays
  server-rendered.

No fake traction numbers anywhere — skills.sh's own leaderboard table was
deliberately not mirrored, since there's no real usage data yet to show.

## Docs page, second rebuild — shadcn sidebar-07

**2026-09-01 — same day, superseding the single-page + custom right-TOC
version above.** User asked for the docs page to follow shadcn's
`sidebar-07` block (https://ui.shadcn.com/blocks/sidebar#sidebar-07)
instead of a hand-rolled layout — "lebih rapi dan terstruktur... rombak
total aja."

This pulls Tailwind CSS + shadcn/ui into the project for the first time,
which the earlier Next.js migration had deliberately avoided (Typeset was
chosen specifically to get real prose styling *without* Tailwind). Scoped
narrowly on purpose, so it doesn't touch anything outside `/docs`:

- `app/docs/docs.css` — `@import "tailwindcss"` + the shadcn theme tokens
  (`--background`, `--sidebar`, `--primary`, etc.), all mapped onto
  Wasit's own palette (`--bg`/`--fg`/`--muted`/`--border`/`--surface`
  from `globals.css`) rather than shadcn's default neutral scale. This
  file is imported only from `app/docs/page.tsx`, not the root layout —
  Next.js scopes a route-local CSS import to that route's bundle, so
  Tailwind's reset and utility classes exist on `/docs` only. The home
  page, Nav, and Footer are untouched, still plain CSS.
- `components/ui/*` — the actual shadcn/ui primitives the block depends
  on (`sidebar.tsx`, `button.tsx`, `sheet.tsx`, `tooltip.tsx`, `input.tsx`,
  `skeleton.tsx`, `separator.tsx`, `breadcrumb.tsx`, `collapsible.tsx`),
  fetched verbatim from shadcn's registry (not hand-written — `sidebar.tsx`
  alone is ~700 lines of state/keyboard-shortcut/mobile-sheet logic, not
  something to reconstruct from memory) and adjusted only where the
  registry's own import paths needed rewriting for this project's layout.
- `components/docs-sidebar.tsx` — the actual per-project adaptation.
  `sidebar-07`'s own demo content (team switcher, project list, user
  account menu) doesn't apply to a static docs site, so those are
  replaced with: a brand header linking home, one collapsible nav group
  per doc section, and a GitHub link in the footer. The nav tree itself
  is **not** hardcoded — it's rebuilt from the same rendered h2/h3
  headings the page's `<ReactMarkdown>` output already has (via
  `rehype-slug`), so it can't drift out of sync with the real docs the
  way a hand-typed nav array would. An `IntersectionObserver` (carried
  over from the previous version's `TableOfContents.tsx`, now deleted)
  drives the active-item highlighting as the user scrolls.
- New deps: `radix-ui`, `class-variance-authority`, `lucide-react`,
  `clsx`, `tailwind-merge` (runtime) and `tailwindcss`,
  `@tailwindcss/postcss`, `tw-animate-css` (dev) — versions pinned to
  whatever was current on npm at build time (checked live, not guessed).
- `components.json` added for convention (style: `new-york-v4`,
  `baseColor: neutral`) even though no file in this project was actually
  generated by running the shadcn CLI — the CLI's own network/native-binary
  install step was skipped for the same platform-mismatch reason
  `npm install` always is (see below); everything here was fetched from
  the public registry JSON and vendored by hand instead.

## Next: deploy to Vercel

1. Locally (not via the assistant, to avoid the Linux-vs-macOS native
   binary mismatch): `cd site && npm install` (picks up `react-markdown`,
   `remark-gfm`, `rehype-slug`, `@iconify/react`), then `npm run dev` →
   http://localhost:3000 to preview, `npm run build` to confirm it
   compiles clean.
2. Commit `site/` and push to `main`.
3. On vercel.com: New Project → import the `dzakwannajmi/wasit` repo.
4. Set **Root Directory** to `site`. Vercel auto-detects Next.js — no
   framework preset or build command to configure manually.
5. **Required:** in that project's Settings → Build & Development
   Settings, enable **"Include source files outside of the Root
   Directory in the Build Step."** The docs page reads
   `../docs/*.md` and `../SECURITY.md` (outside `site/`) at build time
   via `lib/content.ts#readRepoDoc` — without this setting the Vercel
   build can't see them and the build fails.
6. Deploy. Vercel auto-redeploys on every push to `main` from then on.
7. Custom domain stays deferred per the earlier decision — add it later
   from the same project's Domains tab, no redeploy needed when that
   happens.
