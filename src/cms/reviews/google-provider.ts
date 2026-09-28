import "server-only";
import { cache } from "react";
import { liveGoogleReviewsConfig } from "./environment";
import { approvedHomePreview } from "@/cms/home/environment";
import { validateGoogleReviews, type GoogleReviews } from "./model";

// Nested paths request only the fields rendered by the approved carousel.
export const GOOGLE_PLACE_FIELD_MASK = [
  "displayName.text", "rating", "userRatingCount", "googleMapsUri",
  "reviews.rating", "reviews.text.text", "reviews.relativePublishTimeDescription",
  "reviews.authorAttribution.displayName", "reviews.authorAttribution.uri",
  "reviews.authorAttribution.photoUri", "reviews.googleMapsUri",
].join(",");

type ObjectValue = Record<string, unknown>;
const DIAGNOSTIC = "[google-reviews-diagnostic]";
function diagnostic(value: Record<string, string | number | boolean | null>): void {
  console.info(DIAGNOSTIC, JSON.stringify(value));
}
function textValid(value: unknown, max: number): boolean {
  return typeof value === "string" && !!value.trim() && [...value].length <= max &&
    !/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
function mapsValid(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["www.google.com", "google.com", "maps.google.com", "maps.app.goo.gl"].includes(url.hostname);
  } catch { return false; }
}
function ratingValid(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}
function diagnosePlace(raw: unknown, result: GoogleReviews | null): void {
  const place = object(raw), name = object(place?.displayName);
  const reviews = Array.isArray(place?.reviews) ? place.reviews : null;
  diagnostic({ stage: "shape", placeObject: !!place, displayNameObject: !!name,
    placeNamePresent: name?.text != null, ratingPresent: place?.rating != null,
    userRatingCountPresent: place?.userRatingCount != null,
    placeMapsUriPresent: place?.googleMapsUri != null, reviewsArray: !!reviews,
    reviewCount: reviews?.length ?? null });
  const counts = { ratingValidCount: 0, textValidCount: 0, authorObjectCount: 0,
    authorNameValidCount: 0, authorUriValidCount: 0, reviewMapsUriValidCount: 0,
    relativeTimeValidCount: 0, avatarValidCount: 0, avatarInvalidCount: 0, avatarMissingCount: 0 };
  for (const item of reviews ?? []) {
    const review = object(item), author = object(review?.authorAttribution), body = object(review?.text);
    if (ratingValid(review?.rating)) counts.ratingValidCount++;
    if (textValid(body?.text, 5000)) counts.textValidCount++;
    if (author) counts.authorObjectCount++;
    if (textValid(author?.displayName, 180)) counts.authorNameValidCount++;
    if (mapsValid(author?.uri)) counts.authorUriValidCount++;
    if (mapsValid(review?.googleMapsUri)) counts.reviewMapsUriValidCount++;
    if (review?.relativePublishTimeDescription == null ||
      textValid(review.relativePublishTimeDescription, 120)) counts.relativeTimeValidCount++;
    if (author?.photoUri == null) counts.avatarMissingCount++;
    else if (typeof author.photoUri === "string" && /^https:\/\//.test(author.photoUri))
      counts.avatarValidCount++;
    else counts.avatarInvalidCount++;
  }
  const placeNameValid = textValid(name?.text, 180);
  const aggregateRatingValid = ratingValid(place?.rating);
  const userRatingCountValid = Number.isInteger(place?.userRatingCount) &&
    (place?.userRatingCount as number) >= 0;
  const placeMapsUriValid = mapsValid(place?.googleMapsUri);
  diagnostic({ stage: "validation", placeNameValid, aggregateRatingValid,
    userRatingCountValid, placeMapsUriValid, returnedCount: reviews?.length ?? 0,
    ...counts, finalSurvivingCount: result?.reviews.length ?? 0 });
  const outcome = !place || !name || !reviews || reviews.length > 5 ? "response_shape" :
    !placeNameValid ? "place_name" : !aggregateRatingValid ? "aggregate_rating" :
    !userRatingCountValid ? "user_rating_count" : !placeMapsUriValid ? "place_maps_uri" :
    reviews.length === 0 ? "zero_reviews" : !result?.reviews.length ? "all_reviews_filtered" : "accepted";
  diagnostic({ stage: outcome });
}
function object(value: unknown): ObjectValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : null;
}

function mapGooglePlace(raw: unknown): GoogleReviews | null {
  const place = object(raw), displayName = object(place?.displayName);
  if (!place || !displayName || !Array.isArray(place.reviews) ||
    place.reviews.length === 0 || place.reviews.length > 5) return null;
  const mapped = validateGoogleReviews({
    placeName: displayName.text,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    googleMapsUri: place.googleMapsUri,
    reviews: place.reviews.map((value: unknown) => {
      const review = object(value), text = object(review?.text);
      return { rating: review?.rating, text: text?.text,
        relativePublishTimeDescription: review?.relativePublishTimeDescription,
        author: review?.authorAttribution, googleMapsUri: review?.googleMapsUri };
    }),
  });
  return mapped?.reviews.length ? mapped : null;
}

// React cache is scoped to one render request. No Place response is persisted.
export const getLiveGoogleReviews = cache(async (): Promise<GoogleReviews | null> => {
  const config = liveGoogleReviewsConfig();
  if (!config) {
    const placeId = process.env.GOOGLE_REVIEWS_PLACE_ID;
    diagnostic({ stage: "config", sourceGoogle: process.env.GOOGLE_REVIEWS_SOURCE === "google",
      approvedPreview: approvedHomePreview(), placeIdPresent: !!placeId,
      placeIdFormatValid: !!placeId && /^ChIJ[A-Za-z0-9_-]{20,80}$/.test(placeId),
      placeIdMatchesApproved: placeId === "ChIJM6V_e13OrmgRCjbDT5abAqA",
      apiKeyPresent: !!process.env.GOOGLE_PLACES_API_KEY?.trim() });
    diagnostic({ stage: "config_rejected" });
    return null;
  }
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${config.placeId}`, {
      headers: { "X-Goog-Api-Key": config.apiKey, "X-Goog-FieldMask": GOOGLE_PLACE_FIELD_MASK },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    diagnostic({ stage: "http", status: response.status, ok: response.ok });
    if (!response.ok) { diagnostic({ stage: "http_error" }); return null; }
    let raw: unknown;
    try { raw = await response.json(); }
    catch { diagnostic({ stage: "request_exception", category: "json_parse_failure" }); return null; }
    const result = mapGooglePlace(raw);
    diagnosePlace(raw, result);
    return result;
  } catch (error) {
    diagnostic({ stage: "request_exception", category:
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ?
        "timeout" : error instanceof TypeError ? "fetch_network_failure" : "validation_exception" });
    // Google outages and malformed responses omit this optional block only.
    return null;
  }
});
