import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div className="wrap footer-top">
        <span className="footer-brand mono">WASIT</span>
        <p className="footer-tagline">
          Independent conformance testing for x402 and MPP on Stellar.
        </p>
      </div>
      <div className="wrap footer-links">
        <Link href="/docs">Docs</Link>
        <a href="https://github.com/dzakwannajmi/wasit">GitHub</a>
        <a href="https://github.com/dzakwannajmi/wasit/blob/main/LICENSE">
          License
        </a>
      </div>
      <div className="wrap footer-bottom">
        <span className="fine">© 2026 Wasit — Apache-2.0, open source</span>
        <span className="fine">Stellar Testnet</span>
      </div>
    </footer>
  );
}
