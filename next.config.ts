import type { NextConfig } from "next";

// Set by the GitHub Pages workflow (e.g. "/bandit-island"): builds a static export served from a sub-path.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  // drei <Html> creates its own React roots; StrictMode's dev-only double mount makes them
  // log "synchronously unmount a root" warnings, so it is disabled.
  reactStrictMode: false,
  ...(pagesBasePath !== undefined && {
    output: "export",
    basePath: pagesBasePath,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
