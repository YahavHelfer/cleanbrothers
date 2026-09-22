# Phase 2A1 — מחזור תוכן מקומי לשירות הפיילוט

השירות היחיד המנוהל: `delicate-upholstery-cleaning`. הסכמה, הייבוא והבדיקות מקומיים בלבד. אין שינוי במקור התוכן של האתר החי, ב־Production, ב־Preview המוגן, ב־CRM או בשני המנהלים האמיתיים. המסמך אינו הוראה להריץ פקודות בענן.

## A. Baseline

ענף: `feature/cms-cloud-foundation`. בסיס מאושר: `d2592d1400e23dc5d2897e452c1bec9fb6b936eb`. המאגר היה נקי בתחילת העבודה. בדיקות הבסיס: 102 כלליות, מתוכן 41 CMS, ועוד 73 SQL ו־19 E2E. TypeScript, lint, build, audit ללא ממצאים, עץ התלויות ו־diff-check עברו. סביבת CMS המקומית נסגרה לאחר baseline; סביבות Docker אחרות נשמרו.

בדיקת preflight לקריאה בלבד אישרה אתר Production תקין וזהה לדגימת הייחוס, ללא שינוי בהגנת Vercel או בהגדרות Production; פרויקט CMS בענן `plbwefnwussxlglscfpn` תקין, Free, `us-east-1`. לא בוצעו פעולות על זהויות או נתוני CRM בענן.

## B. מיפוי מדויק של התוכן הקיים

נבדקו `ServiceLandingConfig`, האובייקט `delicateUpholsteryLanding`, ה־adapter, רכיב העמוד והמטא־דאטה.

| שדה קיים | שדה בעורך / מגבלה |
| --- | --- |
| `serviceName` | `publicTitle`, עד 120 תווים; טקסט תצוגה בלבד |
| `h1` | כותרת ראשית, 180 |
| `eyebrow` | כותרת קטנה, 120 |
| `intro` | תיאור פתיחה, 2,000 |
| `images` | רשימה סדורה של הנכס המאושר היחיד: `/images/services/delicate-upholstery-cleaning.jpeg` |
| `imageAlt` | תיאור חלופי לתמונת הפתיחה, 300 |
| `signsTitle`, `signsDescription`, `signs` | כותרת 180, תיאור 2,000, רשימה של 1–12 פריטים בני עד 300 תווים |
| `processTitle`, `processDescription`, `process` | אותן מגבלות; סדר שלבי העבודה ניתן לעריכה |
| `benefitsDescription`, `benefits` | תיאור 2,000, רשימה של 1–12 פריטים בני עד 300 תווים |
| `resultDescription` | תיאור תוצאות, 2,000 |
| `faqs` | 1–20 זוגות; שאלה 300, תשובה 2,000; ללא שאלות כפולות |
| `relatedLinks` | 0–2 קישורים; תווית 120; רק `/mattress-cleaning` ו־`/car-upholstery-cleaning`, ללא כפילויות |
| `metaTitle`, `metaDescription` | `seoTitle` עד 120, `seoDescription` עד 320 |

ייבוא הבסיס כולל את כל הנוסח המקורי: 5 סימנים, 4 שלבים, 5 יתרונות, 6 שאלות, 2 קישורים ותמונה אחת. אין לשירות מחיר/תווית מחיר, סרטון, זוג לפני/אחרי, caption עצמאי או הגדרות מיקום תמונה. לכן לא הומצאו שדות כאלה. אין צורך בסידור כמה תמונות כשהנכס המאושר הוא יחיד; העורך מאפשר לבחור את הנכס הקיים ולערוך את ה־alt הנתמך.

הנתיב, זהות השירות ומיפוי ה־CRM בשליטת הקוד. כך גם מספרי קשר, מותג, אזור שירות, כותרות כלליות, פריטי האמון, ניווט ומחשבון. תיאורי התמונות המשניים וכותרת ה־FAQ ממשיכים להיגזר משם התצוגה כפי שנגזרו לפני השינוי. Canonical, כתובות OpenGraph, הגדרות robots וסכמת FAQ נוצרים בקוד; התוכן בלבד ניתן לעריכה.

## C–D. המודל והמיגרציה

נוספה רק `supabase/migrations/20260922150000_cms_content_lifecycle.sql`. שלוש המיגרציות ההיסטוריות לא שונו. המיגרציה הופעלה ונבדקה רק ב־Supabase המקומי המבודד.

- `content_documents`: מזהה קבוע, סוג, מפתח, זמני יצירה/עדכון וייחודיות `(content_type, content_key)`. אילוץ מגביל כעת לשירות הפיילוט בלבד.
- `content_revisions`: UUID, מספר גרסה ייחודי למסמך, `schema_version=1`, יוצר/זמן, גרסת בסיס ומקור שחזור. כותרת תצוגה, H1, כותרת ותיאור SEO הם עמודות יחסיות; `body` מכיל רק פסקאות ורשימות מסודרות, FAQ והפניות לנכסים. אין התנהגות, קוד, מזהי CRM או החלטות הרשאה ב־JSON.
- `content_publication_state`: מצביעי טיוטה ופרסום נפרדים ו־`generation`. מפתחות זרים משולבים מונעים הפניה לגרסה ממסמך אחר.
- `content_publication_events`: אירוע פרסום עם הגרסה, הגרסה הקודמת, UUID המפרסם והזמן; אירוע ייבוא ראשוני ללא משתמש מזויף.

טריגרים מונעים UPDATE/DELETE של גרסאות ושל אירועי פרסום, גם בכתיבה ישירה של מפעיל. פקודות TRUNCATE קיימות **רק ב־fixtures המקומיים** לצורך ניקוי ניסויים; אין ממשק מחיקה באפליקציה.

## E–F. מחזור החיים ומניעת התנגשויות

`npm run cms:import-pilot` משתמש בתוכן הסטטי עצמו, מאמת אותו ומייבא Revision 1. `scripts/cms-local.mjs` מוודא פרויקט מקומי ייעודי לא מקושר וכתובת loopback מדויקת לפני גישה למסד. ייבוא ראשון קובע את שני המצביעים לבסיס הזהה לאתר ומוסיף אירוע baseline; ייבוא חוזר אינו משנה עריכות, פרסום או היסטוריה.

שמירה יוצרת גרסה חדשה ומקדמת רק את מצביע הטיוטה ואת הדור. פרסום דורש פעולה נפרדת ואישור מפורש, מאמת הרשאה, AAL2 ותוכן, ומחליף את מצביע הפרסום יחד עם אירוע האודיט באותה טרנזקציה. מצביע הטיוטה ותוכן הגרסה אינם משתנים בפרסום. כשל באודיט מבטל גם את החלפת המצביע.

כל שינוי נועל את רשומת המצב לכתיבה ובודק גם `expected_generation` וגם את UUID הטיוטה שהעורך פתח. כך גם שמירה, פרסום או שחזור מקבילים גורמים לקונפליקט, ולא לדריסה שקטה. אין ניסיון חוזר אוטומטי מול דור חדש. הודעת הקונפליקט בעברית וה־state הנשלט של הטופס שומרים את העריכה שלא נשמרה, ומנחים להעתיק אותה לפני טעינה מחדש.

## G. מסכי הניהול

- `/admin/services`: שם השירות, גרסה שפורסמה, טיוטה, שינויים שלא פורסמו, זמן עדכון וכניסה לעורך. יתר השירותים מוצגים כהיקף שאינו מנוהל כאן.
- `/admin/services/delicate-upholstery-cleaning`: כל השדות הקיימים הנתמכים, עריכת רשימות ושאלות, סידור פריטי הרשימות, בחירת תמונה וקישורים מאושרים. מוצגים ״פורסם״, ״טיוטה״, ״יש שינויים שלא פורסמו״ ו״נשמר לאחרונה״.

שמירה, תצוגה ופרסום הן פעולות נפרדות. פרסום חסום כשיש שינויים בטופס שטרם נשמרו; התצוגה המקדימה מציגה תמיד גרסה שמורה. אין שדה CRM או אפשרות להעלות קבצים.

## H. תצוגה מקדימה

`/admin/preview/services/delicate-upholstery-cleaning?revision=<UUID>` קורא גרסה מסוימת לאחר הרשאה עצמאית. UUID חסר, שגוי או לא קיים מחזיר 404; אין נפילה אוטומטית לטיוטה האחרונה. נדרשים מנהל פעיל, השלמת onboarding ו־AAL2.

`ServiceLandingView` מכיל את המבנה המשותף. המעטפת הציבורית הקיימת מזריקה לתוכו את טופס הלידים ורכיבי הקשר/המעקב המקוריים. התצוגה הפרטית אינה מייבאת אותם: היא משתמשת בהדמיה מושבתת של שדות הטופס, ללא `<form>`, ללא action וללא קוד שליחה. קישורי הטלפון וה־WhatsApp ללא `href`; קישורי האתר בתוכן הם טקסט מושבת ללא prefetch. ה־carousel המקומי נשאר פעיל.

ה־layout הנפרד ו־Proxy הקיימים משמרים `no-store`, `noindex, nofollow` ו־`no-referrer`. אין canonical ציבורי, JSON-LD ציבורי, Google/Meta, attribution או call tracking במסלול התצוגה. Preview אינו זקוק ל־service key.

## I–J. בחירת מקור ושקילות

`staticContentSource` וה־`contentSource` הכללי נשארים סטטיים. רק עמוד הפיילוט משתמש ב־`getPublicPilot`, במודול server-only. ללא `CMS_PILOT_CONTENT_SOURCE=published`, אין כלל קריאת CMS. הפעלה מפורשת מחייבת `CMS_SUPABASE_URL=http://127.0.0.1:56321` והיעדר `VERCEL`/`VERCEL_ENV`; ניסיון הפעלה בענן נכשל סגור.

במצב המקומי המפורש, client אנונימי עם publishable key קורא רק RPC ללא פרמטרים: `cms_read_published_pilot()`. התשובה מכילה רק payload של הגרסה שפורסמה ו־UUID שלה. אין קבלת UUID מהדפדפן לקריאה ציבורית ואין fallback לטיוטה. כשל בתצורה/בתוכן המפורסם אינו מסתיר את הכשל בעזרת טיוטה.

`React.cache` משתף snapshot יחיד בין `generateMetadata` לבין רינדור העמוד באותה בקשה. `connection()` ו־fetch עם `no-store` חלים רק במצב CMS המקומי; build רגיל ממשיך לבצע prerender סטטי.

בדיקות הדפדפן משוות שני builds מקומיים: סטטי ב־56300 ו־CMS ב־56301. נבדקים טקסט, קישורים, תמונות/alt, ערך השירות בטופס, כותרת ותיאור SEO, canonical, OpenGraph/Twitter, FAQ ו־JSON-LD. מנורמלים רק רווחי HTML ו־origin מקומי של תמונה שמנורמל על ידי רכיב התמונה; נתיבי התמונות, query, `srcset`, alt, קישורים ומשמעות התוכן נשמרים. בקשות API וכתובות חיצוניות חסומות בדפדפן הבדיקה הציבורי.

בנוסף בוצעה השוואה ישירה מול רכיב Phase 1 ב־commit הבסיס: HTML של SSR, מטא־דאטה ו־FAQ JSON-LD זהים בכל שבע תצורות השירות המשתמשות ברכיב המשותף. בדיקת פרסומים מקבילים מול 12 בקשות HTML מוודאת שכותרת SEO ו־H1 מגיעות תמיד מאותה גרסה.

## K–L. CRM והרשאות

הזהות הפנימית נשארת `delicate-upholstery-cleaning`; ה־adapter הקיים ממשיך למפות אותה לערך CRM **`ניקוי ריפודים עדינים`**. שינוי כל הכותרות והתיאורים אינו משנה ערך זה. `ContactForm`, חוזה הלידים, קוד CRM, WhatsApp attribution, Google Ads, GA4, Meta והסכמה לעוגיות לא שונו.

כל קריאת עורך/גרסה וכל mutation קוראים עצמאית ל־`requireCmsAdmin()`. גם ה־Server Action מבצע הרשאה עצמאית; לא מסתמכים על layout, Proxy או כפתור מוסתר. פעולות התוכן כולן מוגבלות בשרת לסביבה המקומית בשלב זה.

RLS מופעל וכפוי בכל ארבע הטבלאות. אנונימי אינו מקבל הרשאת טבלה או RPC עריכה; authenticated מקבל SELECT בלבד בכפוף ל־`is_cms_admin_aal2()`. מנהל AAL1, לא־חבר, חבר לא פעיל ו־onboarding pending אינם יכולים לקרוא נתוני ניהול. פעולות כתיבה מתבצעות רק דרך RPC עם בדיקת AAL2 עצמאית. הפונקציות בעלות search_path ריק, ללא זהות/תפקיד שהלקוח יכול להכתיב. helper פנימי וייבוא אינם נגישים ל־anon/authenticated. ה־RPC הציבורי הוא החריג המכוון: תוכן מפורסם בלבד, ללא שדות אודיט/טיוטה.

## M–N. היסטוריה וסקירת אבטחה

ההיסטוריה מציגה מספר גרסה, זמן, עורך במינימום מידע (UUID, ״את/ה״ או ייבוא), מצב נוכחי וקישור לגרסה קבועה. שחזור מעתיק את התוכן ההיסטורי לגרסה חדשה, מתעד גם מקור וגם טיוטת בסיס וממתין לפרסום מפורש. אין מחיקה הרסנית.

יש אימות שרת ו־SQL לשדות חובה, אורכים, Unicode, שדות לא מוכרים, גרסת schema, FAQ, רשימות, כפילויות, תמונות וקישורים. טקסט רגיל בלבד; HTML ותווי בקרה אסורים. אין CMS rich HTML או `dangerouslySetInnerHTML` חדש. JSON-LD הציבורי נשאר דרך serializer הקיים והנבדק.

אין תלות חדשה, privileged key באפליקציה, public Supabase browser client, קובץ סביבה חדש או שינוי Auth. privileged access קיים רק במפעילי fixtures המקומיים; סיסמאות וקודי TOTP סינתטיים נוצרים בזיכרון ואינם נשמרים. Playwright trace, וידאו וצילומי מסך מושבתים. כל זהות, חברות ופקטור בדיקה נמחקים בסיום; נשאר רק baseline תוכן מקומי. חשבונות הענן נשארים ללא שינוי, כולל המנהל השני ב־onboarding pending.

## הרצה מקומית בלבד

1. `npm run cms:start` — סביבת CMS המבודדת בלבד; אין להשתמש ב־cloud link.
2. `supabase migration up --local` דרך CLI המקומי, אם הסכמה טרם הוחלה.
3. `npm run cms:import-pilot` — אידמפוטנטי, ללא פרטי התחברות בפלט.
4. `npm run build` ואז `npm run test:e2e`; השרת השני בונה אוטומטית לתיקייה המוחרגת `.next-cms-published` ומשתמש ב־publishable key מקומי בלבד. אין להגדיר את דגלי הבדיקה ב־Vercel.
5. `npm run cms:stop` — רק הפרויקט המקומי הייעודי; אין לעצור סביבות Docker אחרות.

אין commit/push/deploy אוטומטי. אין להחיל את המיגרציה בענן כחלק משלב זה.

## O. רשימת קבצים מדויקת

לא נמחקו ולא הועברו קבצים. אין staging או commit. רשימת השינויים כוללת גם את המסמך הזה.

| מצב | קובץ |
| --- | --- |
| נוסף | `docs/cms-content-local.md` |
| נוסף | `scripts/cms-import-pilot.mjs` |
| נוסף | `src/app/(admin)/admin/(protected)/preview/services/delicate-upholstery-cleaning/page.tsx` |
| נוסף | `src/app/(admin)/admin/(protected)/services/delicate-upholstery-cleaning/page.tsx` |
| נוסף | `src/app/(admin)/admin/(protected)/services/page.tsx` |
| נוסף | `src/cms/content/PreviewContact.tsx` |
| נוסף | `src/cms/content/ServiceEditor.tsx` |
| נוסף | `src/cms/content/actions.ts` |
| נוסף | `src/cms/content/baseline.ts` |
| נוסף | `src/cms/content/environment.ts` |
| נוסף | `src/cms/content/pilot-model.ts` |
| נוסף | `src/cms/content/public-source.ts` |
| נוסף | `src/cms/content/repository.ts` |
| נוסף | `src/components/ServiceLandingView.tsx` |
| נוסף | `supabase/migrations/20260922150000_cms_content_lifecycle.sql` |
| נוסף | `supabase/tests/database/cms_content.test.sql` |
| נוסף | `tests/cms-content.test.mjs` |
| נוסף | `tests/e2e/cms-content.spec.ts` |
| נוסף | `tests/e2e/helpers/content-fixtures.ts` |
| שונה | `.gitignore` |
| שונה | `eslint.config.mjs` |
| שונה | `next.config.ts` |
| שונה | `package.json` |
| שונה | `playwright.config.ts` |
| שונה | `scripts/cms-test-server.mjs` |
| שונה | `src/app/(admin)/admin/(protected)/page.tsx` |
| שונה | `src/app/(admin)/layout.tsx` |
| שונה | `src/app/(site)/delicate-upholstery-cleaning/page.tsx` |
| שונה | `src/components/ServiceLandingPage.tsx` |
| שונה | `src/content/source.ts` |
| שונה | `tests/application-boundaries.test.mjs` |
| שונה | `tests/content-source.test.mjs` |
| שונה | `tsconfig.json` |

## P. רגרסיה סופית

| בדיקה | תוצאה |
| --- | --- |
| `npm test` | 145/145 עברו |
| `npm run test:cms` | 84/84 עברו (תת־קבוצה של הבדיקות הכלליות) |
| `npm run test:cms:db` | 173/173 עברו: 73 קיימות ו־100 חדשות |
| `npm run test:e2e` | 26/26 עברו: 19 קיימות ו־7 חדשות |
| `tsc --noEmit --incremental false` | עבר |
| `npm run lint` | עבר |
| `npm run build` | עבר; כל 16 העמודים הציבוריים נשארו סטטיים |
| `npm audit` | 0 vulnerabilities |
| `npm ls --all` | עבר; ללא שינויי dependencies או lockfile |
| `git diff --check` | עבר; נבדקו גם הקבצים החדשים |

המיגרציות נבדקו גם באתחול נקי של המסד המקומי המבודד. לאחר כל הבדיקות: 0 משתמשי Auth מקומיים, 0 חברויות ו־0 פקטורי MFA; נותרה רק Revision 1 שיובאה מהתוכן הסטטי ואירוע baseline אחד, ללא תוכן ניסוי. סביבת CMS נסגרה; הפורטים 56300, 56301, 56321, 56322 ו־56324 אינם מאזינים. סביבות Docker האחרות נשמרו.

בדיקת הסיום לקריאה בלבד אישרה שוב: Production, הגנות Vercel, רשומות סביבה ציבוריות/CRM ותצורת הפרויקט לא השתנו; תגובת HTML באתר הציבורי זהה לייחוס; CMS cloud תקין ב־Free וב־us-east-1. לא הופעלה מיגרציית תוכן בענן ולא בוצעו קריאות לנתוני CRM. לא נוצרו קבצי סביבה חדשים או ערכי credentials בקבצי השינוי; build/cache/test artifacts נשארים מוחרגים. אין קבצים staged ואין commit חדש; HEAD והענף נותרו כפי שהיו בבסיס.

## Q. מוכנות ל־Phase 2A2

Phase 2A1 מוכן לסקירה. לאחר אישור נפרד, Phase 2A2 יהיה השלב המצומצם להפעלת הסכמה והייבוא בפרויקט CMS בענן, הרחבה מפורשת של הגנות local-only ל־Preview המאושר בלבד, פריסת העורך ל־Preview המוגן, עריכה/תצוגה/פרסום ניסוי של יהב, הפעלת מקור CMS רק לפיילוט ב־Preview ואימות rollback. Production וכל שאר העמודים יישארו סטטיים. אין צורך להמתין ל־onboarding של המנהל השני. שלב זה לא התחיל.
