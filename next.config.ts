import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // drei <Html> creates its own React roots; StrictMode's dev-only double mount makes them
  // log "synchronously unmount a root" warnings, so it is disabled.
  reactStrictMode: false,
};

export default nextConfig;
