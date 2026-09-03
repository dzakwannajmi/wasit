# wasit — landing + docs site

Live at [usewasit.dev](https://usewasit.dev).

The marketing/traction page for [Wasit](../README.md), deployed separately
from the CLI/server/core npm workspaces. Next.js (App Router) + TypeScript,
no Tailwind — styling is hand-written CSS custom properties in
`app/globals.css` plus shadcn's [Typeset](https://ui.shadcn.com/typeset)
CSS system for the docs page's prose.

## Structure

- `app/page.tsx` — home page (hero, what it checks, why it's different, quick start).
- `app/docs/page.tsx` — single consolidated docs page. Renders the repo's
  real markdown (`docs/guides/*.md`, `docs/CHECKS.md`, `../SECURITY.md`)
  via `lib/content.ts#readRepoDoc`, so it can't drift out of sync with the
  actual guides. Sticky right-hand "On this page" sidebar
  (`components/TableOfContents.tsx`) is a scroll-spy built on
  `IntersectionObserver`.
- `components/` — `Nav`, `Footer`, `CopyButton` (the only client
  component besides the table of contents), `TableOfContents`.
- `app/globals.css` — design tokens (colors, fonts) + component styles;
  imports `app/typeset.css` (shadcn's official file) for the docs page's
  markdown typography.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying

Deployed on Vercel with **Root Directory** set to `site/`. The docs page
reads files outside this directory (`../docs`, `../SECURITY.md`), so
Vercel's project setting **"Include source files outside of the Root
Directory in the Build Step"** must be enabled — see
`.planning/landing-page.md` in the repo root for the full deploy
checklist.
