import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The Get Started group was split into Overview, Getting Started and
   * Install, which moved four pages. These URLs were live and linked
   * from the homepage, so they redirect rather than 404 — permanently,
   * since the old paths are not coming back.
   */
  async redirects() {
    return [
      { source: "/docs/about/overview", destination: "/docs/overview/wasit", permanent: true },
      { source: "/docs/get-started/install", destination: "/docs/install/packages", permanent: true },
      { source: "/docs/get-started/quick-start", destination: "/docs/start/try-it", permanent: true },
      {
        source: "/docs/get-started/how-it-works",
        destination: "/docs/overview/how-it-works",
        permanent: true,
      },
      // "Why Wasit Exists" moved from a standalone article into the docs
      // sidebar's Overview group; the old URL was linked from the homepage.
      { source: "/why", destination: "/docs/overview/why", permanent: true },
      // The three reporting sections of SECURITY.md became one page.
      {
        source: "/docs/security/vulnerability-reporting",
        destination: "/docs/security/disclosure",
        permanent: true,
      },
      { source: "/docs/security/service-findings", destination: "/docs/security/disclosure", permanent: true },
      { source: "/docs/security/sdk-findings", destination: "/docs/security/disclosure", permanent: true },
      // Merged into one "MPP modes" page in the Core Guide.
      { source: "/docs/core/mpp-charge", destination: "/docs/core/mpp-modes", permanent: true },
      { source: "/docs/core/mpp-channel", destination: "/docs/core/mpp-modes", permanent: true },
    ];
  },
};

export default nextConfig;
