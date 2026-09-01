import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CopyButton } from "@/components/CopyButton";
import { HowItWorksFlow } from "@/components/HowItWorksFlow";

const INSTALL_CMD = "npx @wasit-dev/cli test --target <your-service-url>";
const GITHUB_URL = "https://github.com/dzakwannajmi/wasit";

const FEATURES: { title: string; body: string }[] = [
  {
    title: "On-chain settlement",
    body: "Reads the token contract's own transfer event via Stellar RPC. A response that only claims success does not pass.",
  },
  {
    title: "Traceable checks",
    body: "Every check in the catalogue maps to a spec clause and the SDK version it was verified against.",
  },
  {
    title: "One core, two interfaces",
    body: "The CLI and the MCP server run identical check code, so a terminal run and an agent run can never disagree.",
  },
  {
    title: "Free by default",
    body: "Read-only checks cost nothing to run. Checks that spend or mutate state are opt-in and clearly flagged.",
  },
  {
    title: "Testnet-only by design",
    body: "Destructive checks require an explicit flag and only run against a channel you name as disposable.",
  },
  {
    title: "Open source",
    body: "Apache-2.0, full source and Check Catalogue on GitHub — nothing about how a check works is hidden.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* The actual scrolling viewport for everything below Nav — see
          .landing-scroll in globals.css for why this is its own
          overflow region (CSS scroll-snap) rather than plain page
          scroll: it's what makes each scroll gesture land on exactly
          one section instead of an arbitrary position. */}
      <div className="landing-scroll">
        <div className="hero">
          <div className="wrap">
            <h1 className="wordmark">WASIT</h1>
            <p className="tagline">
              Independent conformance testing for <b>x402</b> and{" "}
              <b>MPP</b> on Stellar. Wasit runs the real payment flow against
              your service and verifies the on-chain settlement itself, not
              just whether the response looks right.
            </p>

            <div className="label">Try it now</div>
            <div className="terminal">
              <div className="terminal-bar">
                <span className="terminal-dot terminal-dot-red" />
                <span className="terminal-dot terminal-dot-yellow" />
                <span className="terminal-dot terminal-dot-green" />
              </div>
              <div className="cmdbox">
                <code className="mono">$ {INSTALL_CMD}</code>
                <CopyButton text={INSTALL_CMD} />
              </div>
            </div>
            <div className="hero-trust">
              Open source · Testnet only · No signup required ·{" "}
              <Link href="/why">Why we built this</Link>
            </div>
          </div>
        </div>

        <section id="features">
          <div className="wrap">
            <h2>Features</h2>
            <p className="section-lead">
              Independent, traceable, and free by default — how Wasit is
              built, not just what it checks.
            </p>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <div className="feature-card" key={f.title}>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works">
          <div className="wrap">
            <h2>How it works</h2>
            <p className="section-lead">
              Wasit talks to two things: your service, over HTTP, and Stellar,
              over RPC. It never trusts the first about what happened on the
              second.
            </p>
            <HowItWorksFlow />
            <p className="section-body">
              Step 5 is the point of the tool. A receipt only proves a service
              claims to have been paid; the chain proves it actually happened.{" "}
              <Link href="/docs/get-started/how-it-works">
                Full flow in the docs →
              </Link>
            </p>
          </div>
        </section>

        <section id="quick-start">
          <div className="wrap">
            <h2>Quick start</h2>

            <div className="quickstart-block">
              <div className="qs-label">CLI</div>
              <pre className="codeblock mono">
                <span className="cm"># run once, no install</span>
                {"\n"}npx @wasit-dev/cli test --target https://your-service.example.com
                {"\n\n"}
                <span className="cm"># or install globally</span>
                {"\n"}npm install -g @wasit-dev/cli
                {"\n"}wasit test --target https://your-service.example.com
              </pre>
            </div>

            <div className="quickstart-block">
              <div className="qs-label">Claude Code (MCP)</div>
              <pre className="codeblock mono">
                claude mcp add --transport stdio wasit \{"\n"}
                {"  "}--env MPP_STELLAR_NETWORK=stellar:testnet \{"\n"}
                {"  "}--env STELLAR_PRIVATE_KEY=S... \{"\n"}
                {"  "}-- npx -y @wasit-dev/server
              </pre>
            </div>
          </div>
        </section>

        <section id="get-started" className="cta-section">
          <div className="wrap cta-wrap">
            <h2>Ready to test your x402 or MPP integration?</h2>
            <p className="section-lead">
              Point it at your service and get a pass/fail report backed by
              on-chain verification. No signup, no config file required to
              start.
            </p>
            <div className="cta-actions">
              <Link href="/docs/get-started/quick-start" className="cta-primary">
                Read the quick start
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="cta-secondary"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
