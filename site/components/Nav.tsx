import Link from "next/link";

export function Nav() {
  return (
    <header>
      <div className="wrap navbar">
        <Link href="/" className="brand mono">
          wasit
        </Link>
        <nav className="navlinks">
          <Link href="/docs">Docs</Link>
        </nav>
      </div>
    </header>
  );
}
