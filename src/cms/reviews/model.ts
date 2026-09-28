export type GoogleReview = {
  rating: number;
  text: string;
  relativePublishTimeDescription: string | null;
  author: { displayName: string; uri: string; photoUri: string | null };
  googleMapsUri: string;
};

export type GoogleReviews = {
  placeName: string;
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
  reviews: GoogleReview[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim() || [...value].length > max ||
    /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)) return null;
  return value.trim();
}
function safeUrl(value: unknown, kind: "maps" | "avatar"): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (kind === "maps" && ((["www.google.com", "google.com", "maps.google.com"].includes(url.hostname) &&
      url.pathname.startsWith("/maps")) || url.hostname === "maps.app.goo.gl")) return url.href;
    if (kind === "avatar" && (url.hostname === "googleusercontent.com" ||
      url.hostname.endsWith(".googleusercontent.com"))) return url.href;
  } catch { /* Invalid external URL; omit it. */ }
  return null;
}
function rating(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;
}

// Missing per-review Maps links make attribution incomplete; omit those reviews.
// A malformed place or rating makes the entire source unavailable.
export function validateGoogleReviews(value: unknown): GoogleReviews | null {
  const place = record(value);
  if (!place || !Array.isArray(place.reviews)) return null;
  const placeName = safeText(place.placeName, 180);
  const overall = rating(place.rating);
  const count = place.userRatingCount;
  const googleMapsUri = safeUrl(place.googleMapsUri, "maps");
  if (!placeName || overall === null || !Number.isInteger(count) || (count as number) < 0 || !googleMapsUri) return null;
  const reviews = place.reviews.flatMap((raw: unknown): GoogleReview[] => {
    const row = record(raw), author = record(row?.author);
    if (!row || !author) return [];
    const score = rating(row.rating), text = safeText(row.text, 5000),
      name = safeText(author.displayName, 180), authorUri = safeUrl(author.uri, "maps"),
      reviewUri = safeUrl(row.googleMapsUri, "maps");
    if (score === null || !text || !name || !authorUri || !reviewUri) return [];
    const relative = row.relativePublishTimeDescription == null ? null :
      safeText(row.relativePublishTimeDescription, 120);
    if (row.relativePublishTimeDescription != null && !relative) return [];
    return [{ rating: score, text, relativePublishTimeDescription: relative,
      author: { displayName: name, uri: authorUri,
        photoUri: author.photoUri == null ? null : safeUrl(author.photoUri, "avatar") },
      googleMapsUri: reviewUri }];
  });
  return { placeName, rating: overall, userRatingCount: count as number, googleMapsUri, reviews };
}
