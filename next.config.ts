import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean standalone server output for self-hosting / Docker.
  output: "standalone",
  outputFileTracingIncludes: {
    // Ship the Prisma schema + generated client so `prisma db push` can run at
    // container start (same deployment pattern as `next start` behind Docker).
    "/": ["./prisma/**", "./src/generated/**"],
  },
};

export default nextConfig;
