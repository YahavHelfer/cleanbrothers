import "server-only";
import { syntheticGoogleReviews } from "./fixture";
import { validateGoogleReviews, type GoogleReviews } from "./model";

// B1 has no live provider or Google network call. Public fixture use is local-only;
// exact admin preview always uses the synthetic fixture.
export async function getGoogleReviews(mode: "public" | "preview"): Promise<GoogleReviews | null> {
  if (mode === "preview") return validateGoogleReviews(syntheticGoogleReviews);
  if (process.env.GOOGLE_REVIEWS_SOURCE === "fixture" && !process.env.VERCEL &&
      (process.env.NODE_ENV === "test" || process.env.CMS_CONTENT_TEST_BUILD === "1"))
    return validateGoogleReviews(syntheticGoogleReviews);
  return null;
}
