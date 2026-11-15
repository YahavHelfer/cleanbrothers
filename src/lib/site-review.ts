export function isSiteReview() {
  return process.env.VERCEL_ENV === "preview" || process.env.SITE_REVIEW_MODE === "1";
}
