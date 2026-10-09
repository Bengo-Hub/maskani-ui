import type { NextConfig } from "next";

// Offline and caching come from the committed hand-written service worker at public/sw.js
// (registered by the shared OfflineBar) plus public/sw-media.js for media. The fleet keeps
// next-pwa installed but disabled; maskani-ui leaves it out entirely because its build chain
// pulled five high-severity advisories (serialize-javascript, braces, old sharp) for a plugin
// that never runs. The guarantee is the same: no build ever writes public/sw.js.
const nextConfig: NextConfig = {
  ...(process.env.SKIP_STANDALONE !== "true" && { output: "standalone" as const }),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maskaniapi.codevertexafrica.com", pathname: "/media/**" },
      { protocol: "https", hostname: "sso.codevertexafrica.com" },
      { protocol: "https", hostname: "accounts.codevertexafrica.com" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/media/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800,
  },
  turbopack: {},
};

export default nextConfig;
