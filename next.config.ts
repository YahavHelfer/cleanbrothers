import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second, isolated E2E build exercises opt-in published CMS rendering.
  // Hosted deployments and normal builds always keep the default build folder.
  ...(process.env.CMS_CONTENT_TEST_BUILD === "1" && !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321"
    ? { distDir: ".next-cms-published" } : {}),
};

export default nextConfig;
