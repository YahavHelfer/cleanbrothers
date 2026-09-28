import "server-only";
import { requireCmsAdmin } from "@/cms/authorization";
import { approvedHomePreview } from "@/cms/home/environment";
import { liveGoogleReviewsConfig } from "@/cms/reviews/environment";
import { GOOGLE_PLACE_FIELD_MASK } from "@/cms/reviews/google-provider";
import { validateGoogleReviews } from "@/cms/reviews/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'",
};
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : null;

// Ask the current validator itself; do not introduce a second URL policy.
function mapsAccepted(value: unknown) {
  return validateGoogleReviews({ placeName: "probe", rating: 1, userRatingCount: 0,
    googleMapsUri: value, reviews: [] }) !== null;
}
function parsedUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { return new URL(value); } catch { return null; }
}
function pathShape(pathname: string) {
  const known = new Set(["maps", "place", "reviews", "review", "contrib", "local", "profile"]);
  const parts = pathname.split("/").filter(Boolean);
  return parts.length ? `/${parts.slice(0, 3).map((part) => known.has(part) ? part : "{segment}").join("/")}` +
    (parts.length > 3 ? "/{…}" : "") : "/";
}
function urlSummary(values: unknown[]) {
  const categories = new Map<string, { hostname: string | null; pathShape: string | null;
    accepted: boolean; count: number }>();
  let present = 0, accepted = 0;
  for (const value of values) {
    if (typeof value !== "string" || !value) continue;
    present++;
    const url = parsedUrl(value), valid = mapsAccepted(value);
    if (valid) accepted++;
    const item = { hostname: url?.hostname ?? null,
      pathShape: url ? pathShape(url.pathname) : null, accepted: valid };
    const key = JSON.stringify(item), old = categories.get(key);
    if (old) old.count++;
    else categories.set(key, { ...item, count: 1 });
  }
  return { present, accepted, rejected: present - accepted, categories: [...categories.values()] };
}
function textValid(value: unknown, max: number) {
  return typeof value === "string" && !!value.trim() && [...value].length <= max &&
    !/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
function ratingValid(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

async function authorized() {
  await requireCmsAdmin(); // Fresh AAL2 and active membership check, independent of Proxy.
  if (!approvedHomePreview()) return null;
  const config = liveGoogleReviewsConfig();
  return config?.placeId === "ChIJM6V_e13OrmgRCjbDT5abAqA" ? config : null;
}

export async function GET(request: Request) {
  let config: Awaited<ReturnType<typeof authorized>>;
  try {
    config = await authorized();
  } catch { return new Response(null, { status: 403, headers: privateHeaders }); }
  if (!config) return new Response(null, { status: 404, headers: privateHeaders });
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
    return new Response(null, { status: 403, headers: privateHeaders });
  const search = new URL(request.url).searchParams;
  if (search.size === 0) return new Response("Diagnostic ready", {
    headers: { ...privateHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
  if (search.size !== 1 || search.get("run") !== "1")
    return new Response(null, { status: 404, headers: privateHeaders });

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${config.placeId}`, {
      headers: { "X-Goog-Api-Key": config.apiKey, "X-Goog-FieldMask": GOOGLE_PLACE_FIELD_MASK },
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return Response.json({ providerStatus: response.status, stage: "http_error" },
      { headers: privateHeaders });
    const place = object(await response.json());
    const rawReviews = Array.isArray(place?.reviews) ? place.reviews : null;
    const reviews = rawReviews?.map(object) ?? [];
    const mapped = { placeName: object(place?.displayName)?.text, rating: place?.rating,
      userRatingCount: place?.userRatingCount, googleMapsUri: place?.googleMapsUri,
      reviews: reviews.map((review) => ({ rating: review?.rating, text: object(review?.text)?.text,
        relativePublishTimeDescription: review?.relativePublishTimeDescription,
        author: review?.authorAttribution, googleMapsUri: review?.googleMapsUri })) };
    const validated = validateGoogleReviews(mapped);
    const placeNameValid = textValid(mapped.placeName, 180);
    const aggregateRatingValid = ratingValid(mapped.rating);
    const userRatingCountValid = Number.isInteger(mapped.userRatingCount) &&
      (mapped.userRatingCount as number) >= 0;
    const placeUriValid = mapsAccepted(place?.googleMapsUri);
    const reviewUris = urlSummary(reviews.map((review) => review?.googleMapsUri));
    const authorUris = urlSummary(reviews.map((review) => object(review?.authorAttribution)?.uri));
    const otherRejected = reviews.filter((review) => {
      const author = object(review?.authorAttribution);
      return !ratingValid(review?.rating) || !textValid(object(review?.text)?.text, 5000) ||
        !textValid(author?.displayName, 180) ||
        (review?.relativePublishTimeDescription != null &&
          !textValid(review.relativePublishTimeDescription, 120));
    }).length;
    const rejectionReasons = { reviewRating: 0, missingReviewText: 0, missingAuthor: 0,
      authorUri: 0, reviewMapsUri: 0, relativeTime: 0 };
    for (const review of reviews) {
      const author = object(review?.authorAttribution);
      if (!ratingValid(review?.rating)) rejectionReasons.reviewRating++;
      if (!textValid(object(review?.text)?.text, 5000)) rejectionReasons.missingReviewText++;
      if (!textValid(author?.displayName, 180)) rejectionReasons.missingAuthor++;
      if (!mapsAccepted(author?.uri)) rejectionReasons.authorUri++;
      if (!mapsAccepted(review?.googleMapsUri)) rejectionReasons.reviewMapsUri++;
      if (review?.relativePublishTimeDescription != null &&
          !textValid(review.relativePublishTimeDescription, 120)) rejectionReasons.relativeTime++;
    }
    const allFilteredReason = Object.entries(rejectionReasons).find(([, count]) => count === reviews.length)?.[0];
    const stageByReason: Record<string, string> = { reviewMapsUri: "review_maps_uri", authorUri: "author_uri",
      missingReviewText: "missing_review_text", missingAuthor: "missing_author" };
    const stage = !place || !rawReviews || reviews.length === 0 || reviews.length > 5
      ? "response_or_review_count"
      : !placeNameValid ? "place_name"
      : !aggregateRatingValid ? "aggregate_rating"
      : !userRatingCountValid ? "user_rating_count"
      : !placeUriValid ? "place_maps_uri"
      : !validated?.reviews.length ? (stageByReason[allFilteredReason ?? ""] ?? "all_reviews_filtered")
      : "accepted";
    const placeUrl = parsedUrl(place?.googleMapsUri);
    return Response.json({ providerStatus: response.status,
      place: { hostname: placeUrl?.hostname ?? null, pathShape: placeUrl ? pathShape(placeUrl.pathname) : null,
        mapsUriAccepted: placeUriValid },
      reviews: { count: reviews.length, mapsUris: reviewUris, survivingValidation: validated?.reviews.length ?? 0,
        otherRejectedCount: otherRejected, rejectionReasons },
      authors: { uris: authorUris },
      validation: { placeNameValid, aggregateRatingValid, userRatingCountValid,
        mappedReviewCount: reviews.length, validatedReviewCount: validated?.reviews.length ?? 0,
        validateGoogleReviewsNonNull: validated !== null,
        providerResultNonNull: !!rawReviews && reviews.length > 0 && reviews.length <= 5 &&
          !!validated?.reviews.length, stage },
    }, { headers: privateHeaders });
  } catch { return Response.json({ stage: "request_or_parse_error" },
    { status: 502, headers: privateHeaders }); }
}
