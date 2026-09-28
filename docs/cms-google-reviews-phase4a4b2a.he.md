# Phase 4A4-B2A — ספק ביקורות Google מקומי

הספק משתמש בצד השרת בלבד ב־Place Details (New). מסכת השדות המדויקת היא:

```text
displayName.text,rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text.text,reviews.relativePublishTimeDescription,reviews.authorAttribution.displayName,reviews.authorAttribution.uri,reviews.authorAttribution.photoUri,reviews.googleMapsUri
```

הקריאה משתמשת ב־`X-Goog-Api-Key` וב־`X-Goog-FieldMask`, ללא מפתח ב־URL. `fetch` מוגדר `no-store` עם timeout של שלוש שניות. `React cache` מונע בקשות כפולות בתוך רינדור יחיד בלבד; לא נשמרים נתוני ביקורות ב־CMS, ב־Supabase או במטמון מתמשך.

מקור Google חי נפתח רק כאשר `GOOGLE_REVIEWS_SOURCE=google`, מזהי Vercel Preview/פרויקט/ענף ומזהה פרויקט Supabase תואמים במדויק, ומזהה ה־Place המאושר והמפתח קיימים בצד השרת. Production נכשל סגור. Exact Preview של המנהל ממשיך להשתמש בנתונים סינתטיים בלבד. כל כשל בספק, נתון לא תקין או רשימת ביקורות ריקה משמיטים רק את הבלוק האופציונלי.

הלוגו `public/images/google/GoogleMaps_Logo_DarkGray.svg` הוא נכס Google Maps הרשמי, ללא שינוי, מתוך [חבילת נכסי הייחוס של Google](https://developers.google.com/static/maps/documentation/images/Google_Maps_Attribution_Assets.zip) שמקושרת מ[מדיניות Places API](https://developers.google.com/maps/documentation/places/web-service/policies). יחס הממדים והצבע נשמרים; הלוגו מוצג בגובה 18px וברווחים הנדרשים. קישור העסק, קישורי המחברים וקישורי הביקורות מגיעים מתשובת Google המאומתת בלבד.

הבלוק מוסתר ב־baseline. כל עוד הוא מוסתר, אין קריאת Google והתוכן הציבורי נשאר זהה. ב־Production דף הבית נשאר סטטי; ב־Preview המאושר התנהגות הבקשה הדינמית הקיימת של מקור דף הבית נשמרת גם כשהבלוק מוסתר. בפרסום עתידי של הבלוק ב־Preview המאושר, קריאת Google אינה נשמרת במטמון מתמשך. אין שינוי בנתיבים אחרים, ב־SEO או ב־JSON-LD.
