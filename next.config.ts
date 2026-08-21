import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean standalone server output for self-hosting / Docker.
  output: "standalone",
  outputFileTracingIncludes: {
    // Ship the Prisma schema + generated client so `prisma db push` can run at
    // container start (same deployment pattern as `next start` behind Docker).
    "/": ["./prisma/**", "./src/generated/**"],
  },
  // A stale service worker pins users to an old push handler forever.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
