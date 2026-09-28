# דוח Phase 2C1 — הרחבת השירותים המשותפים, מקומית בלבד

## A. קו בסיס

ענף: `feature/cms-cloud-foundation`. ה־HEAD נשאר
`02af571d8d1c15b38e1e203711921b0b512a87e7`; בתחילת העבודה עץ העבודה היה נקי.
קו הבסיס המלא עבר: 220 בדיקות כלליות, 159 בדיקות CMS, ‏314 בדיקות SQL,
34 בדיקות E2E, ‏TypeScript, lint, build, npm ci, npm ls, diff check ואפס ממצאי audit.

אימותי הענן היו לקריאה בלבד. פרויקט CMS ‏`plbwefnwussxlglscfpn` תקין;
התוכן, המדיה, ה־Storage והפרסום זהים לצילום המצב המאושר מסיום 2B2.
נשמרו בדיוק שני משתמשים ושתי חברויות: יהב פעיל, השלים onboarding ו־TOTP,
וקיים session ברמת AAL2; המנהל השני נשאר `onboarding_pending`.
Preview המוגן נשאר על ה־commit המאושר. Production והגדרות Vercel לא השתנו.

## B–D, R. השירותים, מטריצת השדות והזהות הקבועה

אומתו בקוד בדיוק ששת הנתיבים המשתמשים ב־`ServiceLandingPage`:

| מפתח פנימי | ערך CRM קיים ומקובע | תמונות פתיחה | FAQ | שדות ייחודיים |
|---|---|---:|---:|---|
| `sofa-cleaning` | ניקוי ספות | 4 | 6 | חיתוך לכל תמונה וזוג לפני/אחרי |
| `mattress-cleaning` | ניקוי מזרנים | 1 | 5 | זוג לפני/אחרי |
| `carpet-cleaning` | ניקוי שטיחים | 1 | 5 | זוג לפני/אחרי |
| `car-upholstery-cleaning` | ניקוי ריפודי רכב | 4 | 6 | חיתוך משותף וזוג לפני/אחרי |
| `armchair-chair-cleaning` | ניקוי כורסאות וכיסאות | 1 | 5 | תוצאת צילום יחיד |
| `delicate-upholstery-cleaning` | ניקוי ריפודים עדינים | 1 | 6 | צילום יחיד והיסטוריית הפיילוט הקיימת |

לכולם נשמרים שם תצוגה, H1, eyebrow, פתיח, כותרות ותיאורי הסימנים והתהליך,
רשימות סימנים/תהליך/יתרונות (5/4/5 בהתאמה), תיאור תוצאה, FAQ, קישורים קשורים, תמונות ו־alt,
SEO title/description ו־canonical. לזוג לפני/אחרי נשמרים גם כותרת, תיאור,
שתי תמונות ושני תיאורי alt. אף שירות יעד אינו משתמש ב־video או `image` יחיד.

הקישורים הקשורים שונים בין השירותים ונשמרו במדויק. פעולות ה־CTA משותפות:
טלפון קבוע, עוגן לטופס, WhatsApp וטופס לידים. FAQ JSON-LD נגזר מהשאלות של
אותו שירות; OG/Twitter נגזרים מה־SEO ומהתמונה הראשית. אין JSON-LD ייחודי נוסף
בשירותי היעד. מטריצת השדות והקישורים המפורטת נמצאת גם ב־`cms-shared-services.md`.

`service-registry.ts` מרכז את ששת המפתחות, מזהי המסמכים, הנתיבים וערכי CRM.
אלה אינם שדות עריכה. בדיקות לכל ששת השירותים משנות את הטקסטים ומוודאות
שזהות הטופס ו־canonical נשארים קבועים; לא בוצעו קריאות CRM.

## E–G. מודל, מיגרציה וייבוא

נוספה סכמת payload בגרסה 3, הכוללת חיתוכים והפניות לפני/אחרי. גרסאות 1 ו־2
של הפיילוט נשמרו, ללא המרת היסטוריה. אין HTML חופשי, נתיבי תמונה חופשיים,
יצירת שירותים או טבלאות נפרדות לכל שירות.

מיגרציה חדשה יחידה:
`supabase/migrations/20260923160000_cms_shared_services.sql`.
היא הוחלה ונבדקה רק בסביבה המקומית המבודדת. שבע המיגרציות ההיסטוריות לא נערכו.
המיגרציה אינה יוצרת bucket ואינה מייבאת תוכן אוטומטית.

`npm run cms:import-shared-services` מאמת hashes, דורש את סביבת CMS המקומית
הלא מקושרת ומייבא את המדיה והתוכן בטרנזקציה אחת. מסמך קיים מוחזר ללא שינוי
גרסאות, מצביעים, generation או audit. ייבוא חוזר נבדק גם לאחר עריכה ושחזור;
ההיסטוריה הקיימת של הפיילוט נשארת סמכותית.

## H. שקילות רינדור

כל ששת השירותים עברו השוואת baseline סטטי מול baseline שהגיע בפועל מהמסד:
טקסט, קישורים, תמונות, alt, חיתוכים, CTA, זהות טופס, SEO, canonical ו־FAQ JSON-LD.
בנפרד, HTML ב־SSR ו־metadata של כל 16 העמודים הציבוריים זהים לבסיס המאושר.

השער זיהה ותיקן אובדן של סיומת alt ממוספרת בגלריות; ההבדל לא הוסתר.
בדיקת הדפדפן משווה נתיבים ביחס לאותו origin בשני פורטים מקומיים ומנטרלת
autoplay; opacity זמני בזמן טעינת תמונה אינו חלק מהשוואת התוכן. בדיקת SSR
משווה את ה־HTML המלא, כולל מחלקות CSS, ללא נרמול.

## I–J. ממשק ניהול ו־Preview

רשימת השירותים מציגה את כל השישה: מצב ייבוא, גרסה מפורסמת, טיוטה, זמן שמירה
ועורך/מפרסם. מזגנים וחלונות מסומנים כלא מנוהלים.
עורך אחד ב־`/admin/services/[serviceKey]` תומך בטיוטה, פרסום מאושר, היסטוריה,
שחזור, מדיה, alt, חיתוכים ולפני/אחרי. אין שישה עורכים כפולים.

Preview משתמש ב־`/admin/preview/services/[serviceKey]?revision=<UUID>`.
מזהה הגרסה חייב להתאים למסמך של השירות. מפתח לא מוכר וגרסה מנתיב שירות אחר
נחסמים. נדרשים חברות פעילה, onboarding מלא ו־AAL2; נשמרו no-store/noindex,
ללא טופס לידים פעיל, טלפון/WhatsApp פעילים או tracking ציבורי.

## K. מדיה

יובאו לוגית רק 20 קבצי static קיימים: 12 תמונות פתיחה ושמונה תמונות לפני/אחרי.
לא הועתקו או הועלו קבצים. לא נמצאו כפילויות ב־hashes. המדיניות היא asset/version
אחד לנתיב static פיזי; שימוש חוזר חולק אותו, ו־alt/caption נשמרים בהפניה ההקשרית.
מזהי מדיית הפיילוט נשמרו. עותקי upload מנורמלים בעלי מקור ו־audit קיימים אינם
ממוזגים בדיעבד.

שתי תמונות רכב היסטוריות הן 4284×5712. הוחרגו רק רשומות static שתואמות במדויק
למניפסט המאושר — מזהה, נתיב, hash, גודל, מידות ו־MIME. מגבלת 16M הפיקסלים
להעלאות חדשות ושאר מגבלות ההעלאה נשארו ללא שינוי.

הפניות המדיה הבלתי משתנות כוללות גם תפקידי לפני/אחרי. מסך שימושי המדיה מציג
את השירות הנכון ומקשר ל־Preview של הגרסה שלו, ללא הנחת פיילוט קבועה.

## L–P. בידוד, מחזור חיים והיסטוריה

המקור הציבורי נשאר סטטי כברירת מחדל. להפעלת CMS נדרשים גם
`CMS_PILOT_CONTENT_SOURCE=published` וגם allowlist מפורש של השירות.
`CMS_CONTENT_ENABLED=true` לבדו אינו מפעיל דבר. wildcard, מפתח לא מוכר
ו־allowlist כפול נדחים. השירותים החדשים מוגבלים בנוסף ל־CMS המקומי; הרחבת
דגלי Preview לבדה אינה מפעילה אותם. דגלי הענן עצמם לא השתנו.

ספות ומזרנים עברו בדפדפן מחזור UI מלא: baseline → draft → exact Preview →
publish → historical restore → publish rollback, כולל החלפת מדיה ובידוד שירות אחר.
יתר השירותים עברו מחזורים ממוקדים דרך אותם RPCs ומסלולי Preview.
לכולם נבדקו גם מחזורי SQL עצמאיים.

טיוטה אינה מפרסמת, פרסום משנה אטומית מצביע של מסמך יחיד, ושחזור יוצר גרסה
חדשה עם הפניות המדיה ההיסטוריות המדויקות. שמירה בשירות אחד אינה הופכת עורך
של שירות אחר למיושן. עורך מיושן של אותו שירות מקבל conflict בעברית והקלט
נשאר בטופס. אין overwrite שקט או שינוי גרסה היסטורית.
ייבוא מיוחס למערכת (`NULL`); פעולות מנהל מיוחסות ל־`auth.uid()` האמיתי.

## Q, T. הרשאות וסקירת אבטחה

RLS ובדיקות השרת מכסים anonymous, non-member, inactive, onboarding pending
ו־AAL1. רק מנהל AAL2 מורשה מפעיל את הפעולות המיועדות. Proxy אינו גבול ההרשאה
היחיד; הפעולות וה־repositories מאמתים הרשאה מחדש.

נתיב מסירת המדיה הציבורי דורש גם הוכחה שהגרסה פורסמה וגם שירות בעלים
שמופעל ב־allowlist. תמונה שפורסמה רק בשירות שאינו מופעל לא נמסרת.

נבדקו הזרקת מפתחות, document types לא נתמכים, revisions משירות אחר, עקיפת
allowlist, שינוי CRM, מזהי מדיה מזויפים, CSS/URL/HTML לא מאושרים, דליפת טיוטות
ו־SEO ופרסום בין שירותים. אין הרשאת יצירת מסמכים/שירותים או bootstrap למנהל.
סריקת הקבצים לא מצאה credentials, קובצי סביבה, מצב CLI מקושר או תוצרי בדיקות.

## S. בידוד האתר והענן

מזגנים וחלונות לא הומרו; homepage ו־`/services` נשארו על המקור הקיים.
לא השתנו CRM, לידים, WhatsApp attribution, Google Ads, GA4, Meta או consent.
שמונה עמודי Production חיים נבדקו בקריאה בלבד ונשארו זהים ב־hash לבסיס 2B2.
לא הופעלו deployment, push, merge, שינוי cloud schema/Storage/flags או שינוי מנהלים.
ה־remote feature branch נשאר `02af571…`; ‏main נשאר `62399c1…`.

## U. קבצים מדויקים

**קבצים ששונו (27):**

- `package.json`
- `scripts/cms-test-server.mjs`
- `src/app/(admin)/admin/(protected)/media/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/services/page.tsx`
- `src/app/(site)/armchair-chair-cleaning/page.tsx`
- `src/app/(site)/car-upholstery-cleaning/page.tsx`
- `src/app/(site)/carpet-cleaning/page.tsx`
- `src/app/(site)/mattress-cleaning/page.tsx`
- `src/app/(site)/sofa-cleaning/page.tsx`
- `src/app/cms-media/[id]/route.ts`
- `src/cms/content/ServiceEditor.tsx`
- `src/cms/content/actions.ts`
- `src/cms/content/baseline.ts`
- `src/cms/content/environment.ts`
- `src/cms/content/public-source.ts`
- `src/cms/content/repository.ts`
- `src/cms/media/model.ts`
- `src/cms/media/repository.ts`
- `src/cms/media/resolve.ts`
- `src/content/service-identity.ts`
- `src/content/static-source.ts`
- `tests/application-boundaries.test.mjs`
- `tests/cms-content.test.mjs`
- `tests/cms-media.test.mjs`
- `tests/content-source.test.mjs`
- `tests/e2e/cms-content.spec.ts`
- `tests/helpers/source-module.mjs`

**קבצים שנוספו (14):**

- `docs/cms-phase2c1-report.he.md`
- `docs/cms-shared-services.md`
- `scripts/cms-import-shared-services.mjs`
- `src/app/(admin)/admin/(protected)/preview/services/[serviceKey]/page.tsx`
- `src/app/(admin)/admin/(protected)/services/[serviceKey]/page.tsx`
- `src/cms/content/service-model.ts`
- `src/cms/media/static-inventory.ts`
- `src/content/service-registry.ts`
- `supabase/migrations/20260923160000_cms_shared_services.sql`
- `supabase/tests/database/cms_shared_services.test.sql`
- `tests/cms-public-equivalence.test.mjs`
- `tests/cms-shared-services.test.mjs`
- `tests/e2e/cms-shared-services.spec.ts`
- `tests/helpers/shared-service-media.mjs`

**נתיבים קודמים שהוחלפו בנתיבים הכלליים (2):**

- `src/app/(admin)/admin/(protected)/preview/services/delicate-upholstery-cleaning/page.tsx`
- `src/app/(admin)/admin/(protected)/services/delicate-upholstery-cleaning/page.tsx`

## V. תוצאות אימות ומצב סיום

| בדיקה | תוצאה |
|---|---|
| `npm ci` | עבר; lockfile והתלויות תואמים |
| `npm test` | 296 עברו |
| `npm run test:cms` | 235 עברו, תת־קבוצה של הכלליות |
| `npm run test:cms:db` | 530 assertions עברו |
| `npm run test:e2e` | 38 עברו |
| `tsc --noEmit --incremental false` | עבר |
| `npm run lint` | עבר, ללא אזהרות |
| `npm run build` | עבר |
| `npm audit` | 0 ממצאים |
| `npm ls --all` | עבר |
| `git diff --check` | עבר |

נבדקו 56 קובצי JavaScript/map של לקוח, ללא מפתח CMS פריבילגי או מזהי מנגנון
השרת הפריבילגי. לא שונו תלויות או lockfile.

בסיום נשמרו מקומית שישה מסמכי baseline, שש גרסאות Revision 1 ושישה פרסומי
baseline; ‏20 assets/versions ו־38 הפניות מדיה. הייבוא הורץ שוב ונמצא ללא שינוי.
אין משתמשי Auth, חברויות או גורמי MFA סינתטיים; אין אובייקטי Storage, buckets
או קובצי upload מקומיים שנותרו מהבדיקות. סביבת CMS המקומית כובתה, פורטי
הבדיקה נסגרו וששת הקונטיינרים הלא קשורים נשמרו.

השינויים במאגר נשארו לא מחויבים לסקירה. ה־index ריק; לא נוצר commit.
דוח זה נוסף לאחר הבדיקות, ושוב נבדקו diff וסריקת קבצים ללא שינוי קוד נוסף.

## W. המלצה ל־Phase 2C2

מוכן לסקירה לקראת rollout ענן מבוקר. יש לאשר בנפרד את המיגרציה, הייבוא והפריסה;
לשמר את היסטוריית הפיילוט; לייבא את חמשת השירותים הנותרים; לפרוס את העורך
הכללי ל־Preview מוגן ולהשאיר את הנתיבים הציבוריים סטטיים בתחילה.
לאחר השוואת baseline בענן, יש לסקור את הרחבת שערי content/media המקומיים
ולהפעיל שירות אחד בכל פעם ב־Preview, עם בדיקות מחזור חיים לכל שירות.
Production נשאר סטטי. לא התחילו 2C2, שירותים מיוחדים, Page Builder או Promotions.
לא נוצר commit ולא בוצע staging אוטומטי.

Phase 2C1 completed locally. The proven CMS content and media architecture now supports all existing shared ServiceLandingPage services while public rendering remains unchanged. Special pages, Production and CRM remain untouched. Awaiting review before Phase 2C2.
