# Phase 4A4-A2 — ניקיון אחרי שיפוץ ולפני אכלוס

הושלם מקומית שירות משותף תשיעי. זהות השירות קבועה בקוד: `post-renovation-cleaning`, הנתיב `/post-renovation-cleaning`, מזהה המסמך `46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8`, ושם ה־CRM `ניקיון אחרי שיפוץ ולפני אכלוס`.

ארבעת הצילומים המקוריים נשמרו תחת `public/images/services/post-renovation-cleaning-{1,2,3,4}.png` לפי סדר ההעלאה. סדר הקרוסלה הוא 4, 1, 3, 2. המדיה נרשמה ב־`src/cms/media/static-inventory.ts` ובמיגרציה הקדמית עם גודל, ממדים, MIME, SHA-256 ומזהי asset/version קבועים. אין זוג תמונות לפני/אחרי; העמוד מציג תיעוד של עבודה בשטח בלבד.

השירות מחובר ל־registry, ל־static baseline, לייבוא shared services האידמפוטנטי, לנתיב הציבורי, ל־`/services`, ל־sitemap, לאימות יעדי Page/Site/Home וליעדי Scheduled Promotions. המיגרציה החדשה בלבד מרחיבה את הזהויות וה־allowlists; שמונת מזהי השירותים הקיימים והרשאות ה־scheduler נשמרו.

## אימות מקומי

- `npm test`: 398/398.
- `npm run test:cms`: 337/337.
- `npm run test:cms:db`: 1,109/1,109 לאחר איפוס מסד מקומי ריק והחלת 20 migrations.
- ייבוא baseline פעמיים: 7 מסמכי shared service, גרסה אחת לשירות החדש, 4 הפניות Hero ו־24 גרסאות מדיה, ללא כפילות.
- `npm run test:cms:schedules:concurrency`: עבר.
- TypeScript, lint, `npm ls --all`, `git diff --check`: עברו. `npm audit`: 0 חולשות.
- `npm run build -- --webpack`: עבר; `/post-renovation-cleaning` נבנה סטטית.
- בדיקת דפדפן מקומי ברוחבים 390, 768 ו־1440 פיקסלים: הכותרת, תמונת Hero, FAQ ובחירת השירות בטופס תקינים; לא נמצאה גלילה אופקית.

`npm run build` הרגיל נעצר ב־Turbopack בעת ניסיון לפתוח פורט מקומי (`Operation not permitted`). `npm run test:e2e` ניסה 59 בדיקות אך Chromium לא הצליח להיפתח בסנדבוקס (`MachPortRendezvousServer: Permission denied`); הבדיקות אינן מספקות תוצאת מוצר בסביבה הזאת. נוספה בדיקת דפדפן לשירות החדש, והיא ממתינה לסביבה שבה Chromium יכול להיפתח. אין commit או push במסגרת שלב זה, ולא בוצע שינוי ב־CMS cloud, ב־Vercel, ב־Production, ב־CRM או ב־scheduler הקבוע.
