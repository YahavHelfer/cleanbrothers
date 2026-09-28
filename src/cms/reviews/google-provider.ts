import "server-only";
import { cache } from "react";
import { liveGoogleReviewsConfig } from "./environment";
import { validateGoogleReviews, type GoogleReviews } from "./model";

// Nested paths request only the fields rendered by the approved carousel.
export const GOOGLE_PLACE_FIELD_MASK = [
  "displayName.text", "rating", "userRatingCount", "googleMapsUri",
  "reviews.rating", "reviews.text.text", "reviews.relativePublishTimeDescription",
  "reviews.authorAttribution.displayName", "reviews.authorAttribution.uri",
  "reviews.authorAttribution.photoUri", "reviews.googleMapsUri",
].join(",");

type ObjectValue = Record<string, unknown>;
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
  if (!config) return null;
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${config.placeId}`, {
      headers: { "X-Goog-Api-Key": config.apiKey, "X-Goog-FieldMask": GOOGLE_PLACE_FIELD_MASK },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return mapGooglePlace(await response.json());
  } catch {
    // Google outages and malformed responses omit this optional block only.
    return null;
  }
});
