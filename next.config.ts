import type { NextConfig } from "next";
import { acPriceReviewPages, isAcPriceAlignmentPreview, isLocalAcPreview } from "./src/lib/local-ac-preview";

const nextConfig: NextConfig = {
  images: { qualities: [75, 90] },
  // Review deployments must never compete with the canonical public website.
  headers() {
    return process.env.VERCEL_ENV === "preview" ? [{
      source: "/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }] : [];
  },
  // The branch preview exposes the city pages and infrastructure only.
  // Legacy page bodies still contain live contact links and previous pricing.
  async redirects() {
    if (!isLocalAcPreview()) return [];
    const destination = "/air-conditioner-cleaning/petah-tikva";
    const alignmentPreview = isAcPriceAlignmentPreview();
    const allowed = alignmentPreview
      ? acPriceReviewPages.filter(({ href }) => href !== "/").map(({ href }) => `${href.slice(1)}/?$|`).join("")
      : "";
    return [
      ...(!alignmentPreview ? [{ source: "/", destination, permanent: false }] : []),
      {
        source: `/:legacy((?!${allowed}api(?:/|$)|_next(?:/|$)|images(?:/|$)|air-conditioner-cleaning/[^/]+/?$|[^/]+\\.[^/]+/?$).+)`,
        destination,
        permanent: false,
      },
    ];
  },
  // A second, isolated E2E build exercises opt-in published CMS rendering.
  // Hosted deployments and normal builds always keep the default build folder.
  ...(process.env.CMS_CONTENT_TEST_BUILD === "1" && !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321"
    ? { distDir: ".next-cms-published" } : {}),
};

export default nextConfig;
