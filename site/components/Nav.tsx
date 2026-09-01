import Link from "next/link"
import GlassSurface from "./GlassSurface"

/**
 * Sticky glass navbar. Its links point at the landing page's own
 * sub-heading sections (#what-it-checks, #how-it-works, etc. — see the
 * `id`s on app/page.tsx's <section> elements) rather than separate
 * routes, so from any other page they do a normal navigation to "/"
 * and then jump to that section; from "/" itself they just scroll.
 * "Docs" stays a real page link, styled apart from the anchor links so
 * it still reads as the primary destination.
 *
 * A fixed-size floating pill (see .nav-shell in globals.css) rather
 * than a bar that contracts on scroll — same width and border-radius
 * at rest and once scrolled.
 */
export function Nav() {
  return (
    <header>
      <div className="nav-shell">
        <GlassSurface
          width="100%"
          height={56}
          borderRadius={50}
          borderWidth={0.03}
          backgroundOpacity={0.4}
          saturation={1.4}
          blur={8}
          displace={0}
          distortionScale={-60}
          redOffset={0}
          greenOffset={3}
          blueOffset={6}
          mixBlendMode="difference"
          className="nav-glass"
        >
          <div className="navbar">
            <Link href="/" className="brand">
              wasit
            </Link>
            <nav className="navlinks">
              <Link href="/#what-it-checks">What it checks</Link>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#why-different">Why it&apos;s different</Link>
              <Link href="/#quick-start">Quick start</Link>
              <Link href="/docs" className="navlinks-docs">
                Docs
              </Link>
            </nav>
          </div>
        </GlassSurface>
      </div>
    </header>
  )
}
