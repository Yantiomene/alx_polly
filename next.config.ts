import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React Strict Mode in development to prevent double-invocation of effects/logs
  // which manifests as "duplicate" console output when running the dev server.
  reactStrictMode: false,
  /* config options here */
};

export default nextConfig;
