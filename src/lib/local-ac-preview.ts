import { isSiteReview } from "./site-review";

export function isLocalAcPreview() {
  return isSiteReview() &&
    (process.env.VERCEL_GIT_COMMIT_REF === "review/local-ac-seo" || process.env.LOCAL_AC_PREVIEW_MODE === "1");
}
