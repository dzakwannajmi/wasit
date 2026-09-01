import Link from "next/link";

const GITHUB_URL = "https://github.com/dzakwannajmi/wasit";
const X_URL = "https://x.com/ImutNajmi";

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Docs",
    links: [
      { label: "Why Wasit", href: "/why" },
      { label: "Install", href: "/docs/get-started/install" },
      { label: "Quick Start", href: "/docs/get-started/quick-start" },
      { label: "CLI Guide", href: "/docs/cli/overview" },
      { label: "MCP Guide", href: "/docs/mcp/overview" },
      { label: "Core Guide", href: "/docs/core/overview" },
    ],
  },
  {
    title: "Reference",
    links: [
      { label: "Configuration", href: "/docs/configuration/overview" },
      { label: "Check Catalogue", href: "/docs/checks/overview" },
      { label: "Security Policy", href: "/docs/security/overview" },
    ],
  },
  {
    title: "Packages",
    links: [
      { label: "@wasit-dev/cli", href: "https://www.npmjs.com/package/@wasit-dev/cli", external: true },
      { label: "@wasit-dev/server", href: "https://www.npmjs.com/package/@wasit-dev/server", external: true },
      { label: "@wasit-dev/core", href: "https://www.npmjs.com/package/@wasit-dev/core", external: true },
    ],
  },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap footer-top">
        <p className="footer-statement">
          VERIFY THE
          <br />
          SETTLEMENT
        </p>

        <div className="footer-columns">
          {FOOTER_COLUMNS.map((col) => (
            <div className="footer-col" key={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noreferrer noopener">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="wrap footer-mid">
        <Link href="/" className="footer-brand-row">
          <span className="footer-logo mono">W</span>
          <span className="footer-brand mono">wasit</span>
        </Link>

        <div className="footer-actions">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" aria-label="Wasit on GitHub" className="footer-icon-link">
            <GitHubIcon />
          </a>
          <a href={X_URL} target="_blank" rel="noreferrer noopener" aria-label="Wasit on X" className="footer-icon-link">
            <XIcon />
          </a>
        </div>
      </div>

      <div className="wrap footer-bottom">
        <span className="fine">© {year} Wasit. Open source.</span>
      </div>
    </footer>
  );
}
