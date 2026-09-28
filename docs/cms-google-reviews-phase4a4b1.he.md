# Phase 4A4-B1 — בלוק ביקורות Google בדף הבית

זהו בסיס מקומי בלבד. הבלוק `homeGoogleReviews` מכיל רק `eyebrow`, `title`, `description`, `showRatingSummary` ואת מצב ההסתרה/הסדר של מנוע הבלוקים. בלוק יחיד מוסתר בבסיס דף הבית, אחרי "למה לבחור בנו" ולפני המחירים, עם UUID קבוע `d4000000-0000-4000-8000-000000000012`. מזהי 11 הבלוקים ההיסטוריים נשמרו גם כשמיקומם של חלקם השתנה. תוכן ביקורות, שמות, תמונות, דירוגים, קישורים ומועדים אינם נשמרים ב־CMS או במסד.

`getGoogleReviews()` הוא גבול שרת בלבד. בשלב זה הוא מחזיר fixture סינתטי לתצוגת Admin מדויקת ולשרת בדיקות מקומי מפורש. אין קריאה ל־Google ואין מפתח API. בדף הציבורי המקור מחזיר `null` מחוץ לסביבת הבדיקה, ולכן בלוק אופציונלי ללא נתונים אינו מוצג והעמוד ממשיך לפעול. כשהבלוק מוסתר, אין בקשת מקור נוספת ודף הבית שומר את התנהגות ברירת המחדל. אין שינוי גלובלי ב־caching או ב־JSON-LD/SEO.

## תנאי Phase 4A4-B2 להפעלה חיה

- להקים Google Maps Platform project עם Places API (New), חיוב ובקרת שימוש/עלות. לזהות Place ID אמיתי של CleanBrothers; אין לנחש אותו. `GOOGLE_REVIEWS_PLACE_ID` אינו סוד. `GOOGLE_PLACES_API_KEY` הוא סוד צד שרת בלבד, עם הגבלות API מתאימות, ולעולם אינו `NEXT_PUBLIC_*`, חלק מ־HTML/JS, לוג או revision. רק לאחר סקירה אפשר לשקול `GOOGLE_REVIEWS_SOURCE=google` ב־Vercel Preview של הענף המאושר.
- בקשת Place Details (New) עתידית תשתמש ב־field mask מצומצם עבור שם העסק, `rating`, `userRatingCount`, `googleMapsUri`, `reviews.rating`, `reviews.text`, `reviews.relativePublishTimeDescription`, `reviews.authorAttribution` ו־`reviews.googleMapsUri`. יש להעריך SKU, מכסה ועלות לפני חיבור. מקור החי חייב למפות ולאמת את התגובה לצורה הפנימית, ללא העברת תגובת API גולמית ל־component.
- מדיניות Google מגבילה שמירה ו־prefetch של Places content; יש לאמת את התנאים העדכניים ואת החריגים לפני הפעלה. אין לשמור ביקורות ב־CMS, במסד או ב־localStorage ואין לתכנן cache ארוך טווח. Place ID הוא החריג הידוע לשמירה. יש להכריע במפורש בהתנהגות request/cache של Homepage בלבד, בעלות קריאה חיה, ובטיפול timeout/rate limit. כשל ישמיט את הבלוק ללא שגיאת Google בדפדפן.
- נדרשת סקירת attribution חיה: שם המחבר וקישור לכל ביקורת, קישור העסק, הודעת סדר הרלוונטיות וייחוס Google Maps גלוי. לפי מדיניות Google, הצגת תוכן Places ללא מפה עשויה לדרוש לוגו Google רשמי לפי ההנחיות; בשלב זה אין נכס לוגו ולא תהיה הפעלה חיה לפני אימות/הוספת נכס רשמי מורשה. יש לבדוק גם את תנאי הפרטיות/תנאי השימוש הנדרשים.
- אין להוסיף דירוג/ביקורות ל־JSON-LD, ל־OpenGraph או ל־metadata ללא סקירת SEO ומדיניות נפרדת.

מקורות רשמיים: [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies), [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details), [Place fields](https://developers.google.com/maps/documentation/places/web-service/data-fields).
