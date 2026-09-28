import "server-only";
import { approvedHomePreview } from "@/cms/home/environment";

const PREVIEW_PLACE_ID = "ChIJM6V_e13OrmgRCjbDT5abAqA";

export function liveGoogleReviewsConfig(): { placeId: string; apiKey: string } | null {
  const placeId = process.env.GOOGLE_REVIEWS_PLACE_ID;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (process.env.GOOGLE_REVIEWS_SOURCE !== "google" || !approvedHomePreview() ||
    !placeId || !/^ChIJ[A-Za-z0-9_-]{20,80}$/.test(placeId) || placeId !== PREVIEW_PLACE_ID ||
    !apiKey?.trim()) return null;
  return { placeId, apiKey };
}
