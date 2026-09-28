import "server-only";
import { syntheticGoogleReviews } from "./fixture";
import { validateGoogleReviews, type GoogleReviews } from "./model";
import { getLiveGoogleReviews } from "./google-provider";

// Exact admin preview uses synthetic data; public Google data is server-only and
// available only behind the exact approved Preview identity gate.
export async function getGoogleReviews(mode: "public" | "preview"): Promise<GoogleReviews | null> {
  if (mode === "preview") return validateGoogleReviews(syntheticGoogleReviews);
  if (process.env.GOOGLE_REVIEWS_SOURCE === "fixture" && !process.env.VERCEL &&
      (process.env.NODE_ENV === "test" || process.env.CMS_CONTENT_TEST_BUILD === "1"))
    return validateGoogleReviews(syntheticGoogleReviews);
  return getLiveGoogleReviews();
}
