import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CopyButton } from "@/components/CopyButton";

const INSTALL_CMD = "npx @wasit-dev/cli test <your-service-url>";

export default function Home() {
  return (
    <>
      <Nav />

      <div className="hero">
        <div className="wrap">
          <h1 className="wordmark">WASIT</h1>
          <p className="tagline">
            Independent conformance testing for <b>x402</b> and{" "}
            <b>MPP</b> on Stellar. Wasit runs the real payment flow against
            your service and verifies the on-chain settlement itself — not
            just whether the response looks right.
          </p>

          <div className="label">Try it now</div>
          <div className="cmdbox">
            <code className="mono">$ {INSTALL_CMD}</code>
            <CopyButton text={INSTALL_CMD} />
          </div>
        </div>
      </div>

      <section>
        <div className="wrap">
          <h2>What it checks</h2>
          <table className="checks-table">
            <tbody>
              <tr>
                <td className="ct-name">x402</td>
                <td className="ct-count">7 checks</td>
                <td className="ct-desc">
                  402 response, payment header, payload decode, required
                  fields, network id, a real accepted payment, a rejected
                  corrupted signature.
                </td>
              </tr>
              <tr>
                <td className="ct-name">MPP — Charge mode</td>
                <td className="ct-count">1 check</td>
                <td className="ct-desc">
                  Settlement verified independently on-chain via the token
                  contract&apos;s own CAP-46 transfer event, not the
                  response the target returns.
                </td>
              </tr>
              <tr>
                <td className="ct-name">MPP — Channel mode</td>
                <td className="ct-count">5 checks</td>
                <td className="ct-desc">
                  Deployment, cumulative commitment ordering, challenge
                  replay, commitment replay, and close settlement —
                  including negative cases a service must reject.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Why it&apos;s different</h2>
          <div className="why-grid">
            <div className="why-item">
              <h3>Verifies settlement, not shape</h3>
              <p>
                Reads the token contract&apos;s own on-chain transfer event
                via Stellar RPC, so a response that merely claims success
                doesn&apos;t pass.
              </p>
            </div>
            <div className="why-item">
              <h3>Every check maps to a spec clause</h3>
              <p>
                The full catalogue is published in CHECKS.md — what each
                check asserts and which spec/SDK version it was verified
                against, not a black box.
              </p>
            </div>
            <div className="why-item">
              <h3>CLI and MCP, same core</h3>
              <p>
                The terminal command and the MCP tools run identical check
                code, so a CLI run and an agent&apos;s run can never
                disagree about the same target.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Quick start</h2>

          <div className="quickstart-block">
            <div className="qs-label">CLI</div>
            <pre className="codeblock mono">
              <span className="cm"># run once, no install</span>
              {"\n"}npx @wasit-dev/cli test https://your-service.example.com
              {"\n\n"}
              <span className="cm"># or install globally</span>
              {"\n"}npm install -g @wasit-dev/cli
              {"\n"}wasit test https://your-service.example.com
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

      <Footer />
    </>
  );
}
