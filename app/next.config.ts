import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via cv-scoring-engine) ships a worker file and a native
  // canvas dependency that need to be traced/included as real files on disk
  // rather than bundled into a JS chunk — this is pdf-parse's own documented
  // requirement for serverless deployment (Vercel/Lambda/etc).
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
