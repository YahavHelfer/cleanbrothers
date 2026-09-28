import type { GoogleReviews } from "./model";

// Invented names and text. This fixture is never a CMS revision or live review cache.
export const syntheticGoogleReviews: GoogleReviews = {
  placeName: "CleanBrothers — דוגמת בדיקה",
  rating: 4.7,
  userRatingCount: 128,
  googleMapsUri: "https://www.google.com/maps/place/example",
  reviews: [
    { rating: 5, text: "דוגמת בדיקה: הצוות הגיע בזמן והסביר את שלבי העבודה.",
      relativePublishTimeDescription: "לפני חודש", author: { displayName: "לקוח לדוגמה א׳",
        uri: "https://www.google.com/maps/contrib/example-a", photoUri: null },
      googleMapsUri: "https://www.google.com/maps/reviews/example-a" },
    { rating: 4, text: "Sample review: the booking process was clear and the team was helpful.",
      relativePublishTimeDescription: null, author: { displayName: "Sample reviewer B",
        uri: "https://www.google.com/maps/contrib/example-b", photoUri: null },
      googleMapsUri: "https://www.google.com/maps/reviews/example-b" },
    { rating: 5, text: "דוגמת בדיקה: שיחה נעימה לפני העבודה ותיאום מפורט של האזורים לניקוי.",
      relativePublishTimeDescription: "לפני חודשיים", author: { displayName: "לקוח לדוגמה ג׳",
        uri: "https://www.google.com/maps/contrib/example-c", photoUri: null },
      googleMapsUri: "https://www.google.com/maps/reviews/example-c" },
    { rating: 3, text: "Sample review: This deliberately long synthetic paragraph checks that the full review remains accessible in the card. ".repeat(8),
      relativePublishTimeDescription: "3 months ago", author: { displayName: "Sample reviewer D",
        uri: "https://www.google.com/maps/contrib/example-d", photoUri: null },
      googleMapsUri: "https://www.google.com/maps/reviews/example-d" },
  ],
};
