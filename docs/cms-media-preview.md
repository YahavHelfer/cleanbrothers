# Phase 2B2 — התאמת Storage ל־Preview וביצוע חלקי

השלב עדיין לא הושלם. התשתית המאושרת נוצרה והקוד המוצע נבדק מקומית; העלאת התמונה האמיתית והמחזור ב־Preview ממתינים לסקירת ההתאמה, commit ופריסה מאושרים. אין שינוי ב־Production או במנהלים.

## מה בוצע בענן במסגרת האישור הקיים

- התחלה נקייה בענף `feature/cms-cloud-foundation`, ב־`cf03db9456f0949db5dd83f447188727087c6317`, הורה `9b4eb0051427635b13ecc12ecbbb2b092e5b000b`.
- כל בדיקות הבסיס עברו לפני mutation חיצוני: 210 כלליות, מתוכן 149 CMS, ‏280 SQL ו־33 E2E; npm ci, TypeScript, lint, build, audit עם אפס ממצאים, dependency tree ו־diff-check. רינדור SSR ומטא־דאטה של 16 דפים ציבוריים זהים לבסיס.
- נדחף רק SHA זה לענף המאושר. Preview מוגן `dpl_9pAhmNpokHLGABaDcGTKPZU3YmiB` הגיע ל־READY ב־SHA המדויק. כתובת הענף נשארה `https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app`.
- CLI קושר לפרויקט ה־CMS בלבד, `plbwefnwussxlglscfpn`. ה־dry-run הראה רק `20260922200000_cms_media_foundation.sql`, עם `seeds=[]` ו־`roles=[]`. רק מיגרציה זו הוחלה; Vault לא עודכן. קובצי המיגרציות ההיסטוריות לא שונו.
- ארבע טבלאות המדיה קיימות עם forced RLS, קריאה ל־AAL2 בלבד והרשאות RPC מוגדרות. 73 בדיקות ענן טרנזקציוניות עברו, וה־fixtures בוטלו; אין שינוי בתוכן או בחשבונות המקוריים.
- גם 15 בדיקות Storage בענן עברו עם rollback מלא: anon/nonmember/inactive/AAL1/AAL2 ישיר אינם יכולים לעקוף את השרת בקריאה, העלאה או מחיקה.
- נוצר bucket יחיד, `cms-media-preview`: פרטי, 8,388,608 bytes, רק `image/webp`. אין Storage policies המעניקות גישה ישירה ל־anon או authenticated. אין bucket של Production.
- ייבוא המדיה הסטטית בוצע פעמיים ללא כפילות: asset אחד, version אחד, אירוע bootstrap אחד ו־21 references על שבע גרסאות התוכן הקיימות. הקבצים הסטטיים לא הועלו ל־Storage. תוכן, מצב פרסום ואירועי הפרסום הקודמים נשארו זהים.
- זהויות baseline: asset `d0000000-0000-4000-8000-000000000001`, version `d1000000-0000-4000-8000-000000000001`. תמונת JPEG קיימת, 1600×1200, ‏132,211 bytes, SHA-256 `b1420c216c60afec56597ccba27c5cabd2ee44f54a2904ac1b7824225e696107`.
- שתי זהויות Auth ושתי חברויות בלבד: יהב פעיל, onboarding הושלם, TOTP מאומת וקיים session AAL2; המנהל השני נשמר ב־onboarding pending. לא בוצעה כניסה בשמו ולא שונו המנהלים.

## הפער שמחייב סקירה נוספת

Phase 2B1 הגביל בכוונה את המדיה ל־localhost. הסכמה מאפשרת providers מסוג `static/local`, מחייבת bucket ריק והרישום יוצר provider מקומי. לכן פריסת הקומיט המאושר לבדה אינה מאפשרת העלאת מדיה לענן. אין להשתמש ב־filesystem הזמני של Vercel כאחסון מדיה קבוע, או לסמן אובייקט ענן כקובץ מקומי.

הוצעה מיגרציה קדימה נפרדת: `20260922210000_cms_media_preview_storage.sql`. **לא הוחלה בענן.** היא מוסיפה provider בשם `supabase` עם bucket קבוע ונתיב UUID.webp, ו־RPC רישום ייעודי שרק service_role רשאי להפעיל. הפונקציה בודקת מחדש חברות פעילה/onboarding, וקיום אובייקט עם MIME וגודל תואמים ב־bucket הפרטי המוגבל. אין שינוי ב־RPC המקומי, במודל הגרסאות/ההפניות, ב־RLS, בחשבונות, בתוכן או במיגרציות היסטוריות; היא אינה יוצרת bucket, policy או role.

## התכנון המוצע בקוד

- דגל `CMS_MEDIA_PREVIEW_ENABLED=1` פועל רק כשכל התנאים מתקיימים: Vercel Preview, הענף המאושר, כתובת פרויקט ה־CMS המדויקת, מקור published ו־allowlist יחיד לפיילוט. Production, `main`, פרויקט אחר ודגלים חלקיים נדחים. מצב מקומי נשאר מבודד.
- `requireCmsAdmin()` נשאר גבול הרשאה עצמאי לכל ניהול מדיה; upload דורש AAL2 לפני קריאת הטופס ושוב לפני העבודה. Origin/Host חייבים להתאים בדיוק לכתובת הענף המאושרת; אין הסתמכות על forwarded headers.
- pipeline הפענוח והנרמול של 2B1 נשאר זהה: JPEG/PNG/WebP מאומתים, מגבלות bytes/ממדים/פיקסלים, הסרת EXIF וקידוד WebP, SHA-256 ומזהה אקראי בשרת. שם מקורי נשמר רק כמטא־דאטה.
- כתיבה פרטית עם `upsert:false`, ללא path או bucket מהמשתמש. רישום assets/versions/audit נעשה לאחר הכתיבה. דחייה ודאית מפוצה במחיקת ה־UUID החדש בלבד; תוצאת רשת לא ודאית נשארת לבדיקה ידנית. אין מחיקה אוטומטית של היסטוריה או מדיה שלא נבחרה עוד.
- `/admin/media/file/[id]` דורש AAL2. `/cms-media/[id]` מחייב את דגלי ה־Preview ואת הוכחת הפרסום במסד לפני קריאת bytes. שני המסלולים באותו origin, תחת Deployment Protection, עם no-store/noindex; הם מאמתים hash ולא מוסרים signed URLs.
- נשאר `unoptimized` למדיה בנתיבים אלה; אין שינוי ב־`next.config.ts`, ברשימת image hosts או בתמונות הסטטיות.
- נדרש `CMS_MEDIA_SERVER_KEY` **server-only**, מוצפן ומוגבל ל־Preview של הענף בלבד, לצד דגל המדיה. הוא לא הוגדר ב־Vercel בשלב זה. אין `NEXT_PUBLIC_`, credentials בדפדפן או כתיבה ישירה ל־Storage מהדפדפן.

מפתח שרת בעל service_role נדרש בארכיטקטורה זו לשתי פעולות בזמן ריצה: רישום תוצר שהשרת אימת, וגישה ל־bucket הפרטי בלי לתת לדפדפן לעקוף אימות קבצים. גם מסירת תמונה שכבר פורסמה לקורא Preview מוגן שאינו מנהל CMS דורשת גישת שרת. המפתח מאפשר עקיפת RLS בפרויקט ה־CMS ולכן יש לשמור אותו בגבול השרת; הוא אינו מפתח CRM. אין צורך לשמור ב־Vercel מפתח Management API או סיסמת מסד.

[תיעוד Supabase לבקרת גישה](https://supabase.com/docs/guides/storage/security/access-control) מתאר את חסימת ההעלאות ללא policies ואת סמכות מפתח השירות. [תיעוד buckets פרטיים](https://supabase.com/docs/guides/storage/buckets/fundamentals) מתאר קריאה מאומתת וקישורים חתומים; כאן נבחר proxy ללא מסירת קישור חתום.

## בדיקות ומצב הפיילוט

נוספו בדיקות guards, Origin/Host, הפרדה בין filesystem לענן, no-store, מפתחות שרת, נתיבים, שלמות hash, compensation והפרדת draft/public. בדיקות SQL מקומיות מכסות את ה־provider ואת מניעת הגישה הישירה ל־Storage. Storage הופעל רק בפרויקט Docker המקומי המבודד לשם בדיקות אלה.

תרחיש אינטגרציה נוסף מפעיל את קוד ה־provider מול Storage ו־PostgREST מקומיים אמיתיים, עם session AAL2 סינתטי והרשאה רגילה של האפליקציה. transport הבדיקה מוגבל ל־loopback; אין בקשות לענן. הוא בודק upload → draft → publish → archive → rollback, חסימת הורדה/כתיבה ישירה, hash, EXIF והיסטוריה. bucket ואובייקטי הבדיקה נמחקים בסיום; משתמשי הבדיקה מנוקים ב־fixture הרגיל. אין שמירת tokens בקבצים או בארגומנטים של תהליך.

הרגרסיה הסופית על ההתאמה, לאחר תיקון מגבלת Vercel ובניית המסד המקומי מחדש מהמיגרציות: **220/220 כלליות**, מתוכן **159/159 CMS**, ‏**314/314 SQL**, ‏**34/34 E2E**. גם `npm ci`, ‏`tsc --noEmit --incremental false`, ‏`npm run lint`, ‏`npm run build`, ‏`npm audit` עם **0 vulnerabilities**, ‏`npm ls --all` ו־`git diff --check` עברו. SSR ומטא־דאטה של 16 דפים ציבוריים זהים ל־HEAD המאושר.

נבדקו 56 קובצי JS/maps של הדפדפן: אין בהם את מפתח השירות המקומי או מזהי הקוד/המפתח המיוחסים. סריקת 21 הקבצים לסקירה לא מצאה credentials, קבצי סביבה או artifacts; אין קבצים staged. כל המיגרציות ההיסטוריות זהות ל־HEAD.

בסיום: CMS המקומי נסגר; 0 משתמשי Auth, ‏0 חברויות, ‏0 גורמי MFA, ‏0 buckets, ‏0 Storage objects ו־0 קובצי העלאה מקומיים. ששת הקונטיינרים הלא קשורים נשמרו; פורטי הבדיקה נסגרו. נותר baseline סטטי מקומי בלבד.

בענן טרם בוצעו: העלאה אמיתית, בחירה בטיוטה, Preview מדויק עם תמונת ענן, פרסום/ארכוב/rollback של תמונה זו, concurrency ואודיט של יהב עבור המדיה החדשה. יש **אפס אובייקטי Storage**, והשירות נשאר על התוכן ותמונת ה־legacy המקוריים. אין asset אמיתי חדש לדווח עליו ואין orphan.

## גבול ההמשך

השינוי המקומי ממתין לאישור לפני commit/push ו־Preview נוסף, ולפני החלת המיגרציה הנוספת בענן. לאחר אישור: dry-run המוגבל רק למיגרציה החדשה, אימות ענן, שני משתני המדיה ב־Preview של הענף בלבד, פריסה מוגנת וביצוע מחזור התמונה האמיתית היחידה. מגבלת Preview היא 4MiB לקלט ולתוצר WebP, נאכפת בממשק ובשרת ובסכמת provider הענן; למסגרת multipart נשאר מרווח 64KiB. המצב המקומי נשאר 8MiB. הגבלת bucket המאושרת נשארה 8MiB, אך האפליקציה וה־RPC מחמירים יותר. זאת בעקבות מגבלת 4.5MB לבקשה/תגובה של [Vercel Functions](https://vercel.com/docs/functions/limitations).

Production deployment, הגדרות Production, `main`, אתר Production, CRM, חשבונות המנהלים, זהות השירות `ניקוי ריפודים עדינים` וקוד consent/Ads/GA4/Meta/WhatsApp נשמרו. לא נשלחו לידים. שאר השירותים נשארים סטטיים.

אין אישור סיום 2B2 בשלב זה, ואין התחלה של 2C. הדוח הסופי A–X יושלם רק לאחר הפיילוט החי והשחזור בפועל.

## קבצים לסקירה

21 קבצים: 15 שונו ו־6 נוספו. אין מחיקות, העברות, שינוי תלויות, קבצי סביבה, credentials או artifacts.

| מצב | קובץ |
| --- | --- |
| נוסף | `docs/cms-media-preview.md` |
| שונה | `src/app/(admin)/admin/(protected)/media/[id]/page.tsx` |
| שונה | `src/app/(admin)/admin/(protected)/media/page.tsx` |
| שונה | `src/app/(admin)/admin/(protected)/services/delicate-upholstery-cleaning/page.tsx` |
| שונה | `src/app/(admin)/admin/media/upload/route.ts` |
| שונה | `src/app/(admin)/layout.tsx` |
| שונה | `src/cms/media/UploadForm.tsx` |
| נוסף | `src/cms/media/cloud-storage.ts` |
| שונה | `src/cms/media/environment.ts` |
| שונה | `src/cms/media/http.ts` |
| שונה | `src/cms/media/local-storage.ts` |
| שונה | `src/cms/media/model.ts` |
| שונה | `src/cms/media/repository.ts` |
| שונה | `src/cms/media/resolve.ts` |
| נוסף | `src/cms/media/trusted-client.ts` |
| שונה | `supabase/config.toml` |
| נוסף | `supabase/migrations/20260922210000_cms_media_preview_storage.sql` |
| נוסף | `supabase/tests/database/cms_media_preview.test.sql` |
| שונה | `tests/cms-media.test.mjs` |
| שונה | `tests/e2e/cms-media.spec.ts` |
| נוסף | `tests/helpers/cms-storage-integration.mjs` |

## מצב הדוח A–X בנקודת הסקירה

| סעיף | מצב |
| --- | --- |
| A — SHA ו־Preview | cf03db9 על הענף המאושר; deployment READY מוגן כמפורט למעלה |
| B — מיגרציות | dry-run יחיד והחלת 20260922200000; הצעת 20260922210000 נשארה מקומית |
| C — סכמה | ארבע טבלאות מדיה, גרסאות/הפניות immutable, constraints, RPCs, audit ו־forced RLS |
| D — bucket | אחד, פרטי, Preview בלבד, WebP עד 8MiB ברמת Storage |
| E — הרשאות | 73 assertions לענן CMS ו־15 ל־Storage; fixtures ב־rollback |
| F — legacy import | פעמיים, ללא כפילות או העתקת קובץ; 1 asset / 1 version / 21 refs |
| G — תמונה אמיתית | טרם הועלתה; pipeline אומת מקומית |
| H — EXIF/hash/path | pipeline מקומי עבר; טרם יש תוצר ענן חדש |
| I — identifiers | רק מזהי ה־legacy המפורטים למעלה |
| J — Draft isolation | עברה מקומית עם provider אמיתי מול Storage מקומי; בדיקה חיה ממתינה |
| K — exact Preview | בדיקה חיה עם תמונת ענן ממתינה |
| L — Publish | לא פורסם תוכן חדש בענן בשלב זה |
| M — היסטוריה | שבע גרסאות התוכן וחמשת אירועי הפרסום בענן ללא שינוי |
| N — archive/delete | SQL/RLS ואינטגרציה מקומיים עברו; בדיקה על תמונה אמיתית ממתינה |
| O — Rollback | עבר מקומית; אין עדיין פרסום ענן חדש לשחזר |
| P — orphan | אפס אובייקטים בענן; אין orphan או מחיקה אוטומטית |
| Q — concurrency | מנגנון generation/PT409 נבדק; בדיקת UI חיה ממתינה |
| R — audit | bootstrap מיוחס למערכת; טרם אירוע העלאת תמונה של יהב |
| S — שאר הדפים | SSR ומטא־דאטה של 16 דפים נשמרו מול הבסיס |
| T — CRM/tracking | קוד ו־env ללא שינוי; אין לידים או גישה לנתוני CRM |
| U — Production | main, deployment, env ושמונה דפי HTML ללא שינוי |
| V — repository | התאמה מקומית ללא staging/commit/push חדש |
| W — validation | תוצאות הרגרסיה המלאה מפורטות לעיל |
| X — המשך | סקירה ואישור ההתאמה, ואז השלמת 2B2; לא להתחיל 2C |
