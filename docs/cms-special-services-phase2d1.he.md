# Phase 2D1 — דוח מימוש ואימות מקומי

**סטטוס: Phase 2D1 הושלם ונבדק מקומית ב־24.09.2026. ממתין לסקירה; לא בוצע commit ולא הוחל דבר בענן.**

## A–D. Baseline, אודיט ומטריצות

ענף: `feature/cms-cloud-foundation`.
HEAD מאושר ונשמר: `df1973e5a3d5f674cbe2e5058cf6679eddbe4b38`.
ה־working tree היה נקי בתחילת Phase 2D1. הבייסליין עבר npm ci, ‏302 בדיקות כלליות, ‏241 CMS, ‏530 SQL/RLS, ‏39 E2E, ‏16 עמודים שקולים, TypeScript, lint, build, npm ls ו־audit ללא ממצאים.

האודיט המלא ומטריצות השדות נשמרים ב־[cms-special-services-audit.he.md](cms-special-services-audit.he.md), כולל הממצא המקורי של שני 404 ב־Production. אודיט מזגנים כולל Hero, רשימות, אזורים, FAQ, מחיר, פופ־אפ, CTA, SEO ו־JSON-LD. אודיט חלונות כולל איור CSS/SVG, חלקי ניקוי, סוגי נכסים, תהליך, התאמה, בטיחות, FAQ ו־CTA. אין מחשבון באף אחד מהם.

### א. תיקון שתי הפניות שבורות בבייסליין

**baseline repair of pre-existing broken media references** — בוצע באישור מפורש, לפני הרחבת CMS.

- `air-conditioner-cleaning-web.jpg` הוחלף ב־`Air-conditioner-cleaning4.JPG` ל־Hero ול־Open Graph.
- `Air-conditioner-cleaning5.JPG` הוסר ממערכי המדיה השבורים לטובת שלושת נכסי המזגנים הקיימים, ללא כפילות בתוך קרוסלה או גלריה. הקרוסלה מתחילה ב־4.JPG; בגלריה הוא אחרון.
- לא נוצרה או הורדה תמונה. bytes, עיצוב, crop, מבנה sections, מלל ו־SEO טקסטואלי נשמרו. Alt נשמר עם מספור תקין.
- שלוש התמונות ו־next/image החזירו HTTP 200 מקומי; Hero והגלריה נטענו בדפדפן עם naturalWidth חיובי.
- התיקון מבודד לעמוד המזגנים. הקטלוג, homepage, serviceImages הגלובלי ו־15 העמודים האחרים לא שונו.
- בדיקת הבייסליין ההיסטורי מחילה רק את תיקון המדיה המאושר על עמוד המזגנים. אין נרמול המעלים הבדלים בשאר התוכן.

### ב. שינויי CMS של Phase 2D1

השינויים הבאים נפרדים מתיקון המדיה ואינם מפעילים את המקור הציבורי בענן.

## E–H. זהות, מודלים, מבצע ומחיר

| שירות | זהות CRM בלתי ניתנת לעריכה | מודל |
|---|---|---|
| air-conditioner-cleaning | ניקוי מזגנים | AirConditionerCleaningContent, schemaVersion 4 |
| window-cleaning | ניקוי חלונות | WindowCleaningContent, schemaVersion 5 |

ה־registry מכיל כעת שמונה מסמכים יציבים. ששת השירותים הקיימים נשארים בקבוצת shared נפרדת עם אותם payloads, קישורים ותצוגה. שינוי H1, שם תצוגה, SEO, FAQ או מבצע אינו משנה CRM, route או canonical.

לכל עמוד חוזה סגור: סוגים מפורשים, שדות חובה, אורך טקסט, גבולות רשימות, UUID של Media Version, ודחיית שדות לא מוכרים בכל עומק. אין HTML חופשי, JavaScript, CSS, iframe או כתובות תמונה שהעורך מספק. SQL מאמת את אותו חוזה בנוסף לתיקוף בצד השרת.

המבצע הוא הגדרת תוכן ייעודית למזגנים, הנפרדת משדות העמוד; ניתן יהיה להעבירה לישות Promotions בעתיד. enabled ו־bundleEnabled מפורשים. אין scheduler, תאריכים או מנוע Promotions. זמן 10 שניות, עומק גלילה 30%, sessionStorage, focus, consent ואירועי השיווק נשארים בקוד הציבורי.

199 ו־250 מקורם כעת באותה הגדרת מחיר לעמוד ולחלונית. מחירים שלמים בין 1 ל־10000, מחיר מבצע אינו גבוה מהמחיר הרגיל. בכיבוי המבצע מוצג המחיר הרגיל; הסמל, החלונית, ההשוואה ומבצע 5+1 מוסתרים. תנאי המחיר נפרדים מתנאי המזגן השישי ומוצגים לפי המצב. כלל 5+1 הקיים נשאר בקוד. אין מחיר מספרי בחלונות ואין מחיר שמועבר למחשבון או ל־CRM.

## I–J. Migration וייבוא

מיגרציה קדימה יחידה: `supabase/migrations/20260924090000_cms_special_services.sql`.

היא מרחיבה את מפת המסמכים, schema versions, תיקוף payload, תפקידי המדיה gallery/seo ומלאי שלושת נכסי המזגנים. אין טבלאות תוכן חדשות, מערכת revisions שנייה או הרחבת הרשאות למנהלים. כל המיגרציות ההיסטוריות נשארו ללא שינוי. היא הוחלה ונבדקה **רק מקומית**.

`npm run cms:import-special-services` דורש את סביבת CMS המקומית הייעודית הלא מקושרת, מאמת hash וגודל קובץ, ומייבא שני מסמכים ו־Revision 1 באופן אטומי ואידמפוטנטי. הרצה חוזרת לפני ואחרי עריכה אינה משנה היסטוריה, generation, draft או published pointers. אין ייבוא נכסים שאינם נדרשים; לחלונות אין תמונת legacy לייבוא.

## K–N. שקילות, עורכים ומדיה

ה־CMS baseline של שני העמודים מושווה בפועל ל־HTML, מלל, קישורים, images/alt, CTA, form service, metadata, canonical ו־JSON-LD של ה־static baseline המאושר. הבדיקה ההיסטורית מכסה את כל 16 העמודים.

`/admin/services` מציג שמונה שירותים. אותו route לעורך מבצע dispatch לעורך המשותף או לעורך הייחודי בעברית RTL. שדות ייחודיים מוצגים לפי חוזה ידוע, לא כ־JSON חופשי. אותו authorization, actions, repository, status, history ו־restore משרתים את כולם. אין אפשרות לשמור/לפרסם לפני hydration. שמירה ופרסום נפרדים, פרסום דורש אישור והטופס חייב להיות שמור.

Media Library משתמשת בגרסאות immutable ובהפניות עם role, position ו־alt הקשרי. למזגנים שבע הפניות בסיס: 3 Hero, ‏3 gallery, ‏1 OG. לחלונות Hero אופציונלי יחיד; כשהוא ריק נשמר האיור הייחודי המקורי. קבצים פרטיים/מפורסמים מהספרייה נטענים דרך נתיבי המדיה המורשים ישירות; נכסי static ממשיכים להשתמש ב־next/image.

הגבלה קיימת שנצפתה בבדיקה: שני קובצי PNG הוותיקים נטענים ומפוענחים תקין, אך מסנן ההעלאה הקיים דוחה את הבתים המקוריים שלהם. לא שונתה או הוחלשה מדיניות זו. ה־bootstrap משתמש בגרסאות static מאומתות hash; בדיקת upload/replacement משתמשת ב־JPEG המאושר הקיים (שני version IDs לאותם bytes). החלפת תמונה חזותית ושחזור נבדקים בנפרד באמצעות בחירת נכס ספרייה קיים אחר.

## O–R. Preview, lifecycle ו־concurrency

Exact Preview מקבל רק UUID של revision השייך לאותו מסמך. הוא דורש זהות מאומתת, חברות פעילה, onboarding מלא ו־AAL2. כותרות private/no-store ו־noindex/nofollow נשמרות.

רכיבי התצוגה הפרטיים אינם תלויים בטופס יצירת פנייה, מנגנון WhatsApp, מעקב שיחות או Popup controller. כפתורי קשר מושבתים, והמבצע מוצג כתוכן סטטי פרטי בלבד. לא נשלחו פניות אמיתיות.

לכל אחד משני השירותים הבדיקות כוללות Draft → exact Preview → Publish → fresh public render במצב בדיקה → restore כטיוטה חדשה → Publish rollback. הטיוטה אינה משפיעה על public/SEO. שבעת המסמכים האחרים נשארים ללא שינוי. Restore אינו משנה את revision המקורי.

שני עורכים באותו שירות מקבלים קונפליקט עברי ושומרים את קלט העורך השני בטופס, בלי overwrite. עריכות בשירותים שונים אינן מתנגשות. Origin חסר־אמון ו־Origin null ממשיכים להידחות בשרת.

בדיקות מדיה מכסות בחירת גרסה קיימת, החלפה, Preview של היסטוריה ושחזור, וכן archive/deletion protection. גרסה היסטורית אינה מתחילה להציג current media version חדש.

## S–V. SEO, אבטחה ורגרסיה

HTML ו־generateMetadata משתמשים באותה פונקציית snapshot ממוזכרת לבקשה. SQL מקרין רק את ה־published revision; טיוטות אינן משפיעות על metadata או JSON-LD. FAQPage של מזגנים נבנה מאותן שאלות מוצגות. לחלונות לא נוסף FAQPage שלא היה בבייסליין.

בדיקות האבטחה מכסות: AAL1, nonmember, inactive, onboarding pending, anonymous, טיפוס payload שגוי, shared payload בעמוד מיוחד, revision ממסמך אחר, media UUID/URL לא תקין, HTML, CSS ושדות זרים, שינוי CRM, מחיר/boolean לא תקינים, הזרקת schedule, עקיפת allowlist ו־Origin.

המקור הסטטי נשאר ברירת המחדל. למזגנים ולחלונות אפשר להפעיל CMS רק בסביבה המקומית המדויקת ובשני דגלים מפורשים: source=published ו־allowlist. hosted Preview/Production חסומים גם אם ה־allowlist כולל אותם. CMS_CONTENT_ENABLED לבדו אינו מפעיל דבר. אין שינוי בדגלי Preview בענן.

## W–X. קבצים ותוצאות סיום

| בדיקה | תוצאה סופית |
|---|---|
| npm ci | עבר |
| npm test | 343/343 |
| npm run test:cms | 282/282 |
| npm run test:cms:db | 640/640, שבעה קובצי SQL/RLS |
| npm run test:e2e | 47/47 בסבב מלא ירוק |
| tsc --noEmit --incremental false | עבר |
| npm run lint | עבר, ללא אזהרות |
| npm run build | עבר |
| npm audit | 0 vulnerabilities |
| npm ls --all | עבר |
| git diff --check | עבר |
| שקילות ציבורית היסטורית | 16/16, מזגנים לפי תיקון הבייסליין המאושר |
| סריקת client bundles | 56 קובצי JS; ללא ערך המפתח המקומי המורשה או שמות משתני המדיה המורשים |

מחזורי מזגנים וחלונות עברו בפועל בדפדפן המקומי. בדיקת המדיה הנוספת הוכיחה טעינת קובץ פרטי/מפורסם ללא image optimizer, שימור version ID היסטורי אחרי החלפה, ושחזור לבייסליין. ההגנות של Origin, hydration, RLS ו־AAL2 נשארו פעילות.

בסיום נותרו מקומית 8 מסמכים, 8 revisions מקוריים, 8 publication events, ‏23 גרסאות static ו־45 media refs. כל draft pointer שווה ל־published pointer, generation=1. יש 0 משתמשי Auth סינתטיים, 0 memberships, ‏0 TOTP factors, ‏0 uploads ו־0 אובייקטים או buckets של Storage.

סביבת CMS המקומית כובתה; כל פורטי הבדיקה נסגרו. שש המכולות המקומיות הלא קשורות נשארו בדיוק כפי שהיו. נסרקו הקבצים ששונו: אין קובצי סביבה, credentials, סודות, linked-project state או תוצרים שנוצרו בתוך ה־diff. המיגרציות ההיסטוריות ו־package-lock.json לא שונו.

השינויים נשארים לא staged ולא committed: ‏28 modified ו־19 added, ‏47 קבצים בסך הכול. HEAD והענף נשארו כפי שצוינו לעיל.

רשימת הקבצים המדויקת — אין מחיקות של קבצים tracked, ואין staging או commit:

### Modified

- `package.json`
- `scripts/cms-import-shared-services.mjs`
- `scripts/cms-test-server.mjs`
- `src/app/(admin)/admin/(protected)/media/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/preview/services/[serviceKey]/page.tsx`
- `src/app/(admin)/admin/(protected)/services/[serviceKey]/page.tsx`
- `src/app/(admin)/admin/(protected)/services/page.tsx`
- `src/app/(site)/air-conditioner-cleaning/page.tsx`
- `src/app/(site)/window-cleaning/page.tsx`
- `src/cms/content/ServiceEditor.tsx`
- `src/cms/content/baseline.ts`
- `src/cms/content/environment.ts`
- `src/cms/content/public-source.ts`
- `src/cms/content/repository.ts`
- `src/cms/content/service-model.ts`
- `src/cms/media/model.ts`
- `src/cms/media/resolve.ts`
- `src/cms/media/static-inventory.ts`
- `src/components/AirConditionerCleaningLandingPage.tsx`
- `src/components/SummerAcPromotionPopup.tsx`
- `src/content/service-registry.ts`
- `src/content/static-source.ts`
- `supabase/tests/database/cms_shared_services.test.sql`
- `tests/cms-media.test.mjs`
- `tests/cms-public-equivalence.test.mjs`
- `tests/cms-shared-services.test.mjs`
- `tests/e2e/cms-content.spec.ts`
- `tests/e2e/cms-shared-services.spec.ts`

### Added

- `docs/cms-special-services-audit.he.md`
- `docs/cms-special-services-phase2d1.he.md`
- `scripts/cms-import-special-services.mjs`
- `src/cms/content/SpecialServiceEditor.tsx`
- `src/cms/content/managed-model.ts`
- `src/cms/content/special-baseline.ts`
- `src/cms/content/special-model.ts`
- `src/cms/content/special-view.ts`
- `src/cms/media/special-static-inventory.ts`
- `src/components/AcPromotionContent.tsx`
- `src/components/AirConditionerCleaningView.tsx`
- `src/components/WindowCleaningLandingPage.tsx`
- `src/components/WindowCleaningView.tsx`
- `supabase/migrations/20260924090000_cms_special_services.sql`
- `supabase/tests/database/cms_special_services.test.sql`
- `tests/cms-ac-media-baseline.test.mjs`
- `tests/cms-special-services.test.mjs`
- `tests/e2e/cms-special-services.spec.ts`
- `tests/helpers/ac-approved-baseline.mjs`


## Y. בידוד והמלצה

לא בוצעו commit, push, merge, deploy, שינוי main, שינוי Production/Preview configuration, migration/bootstrap בענן, שינוי CRM או שינוי מנהלים. פרטי המשתמשים האמיתיים נשארו מחוץ לבדיקות המקומיות. בדיקות משתמשים והרשאות השתמשו בזהויות סינתטיות מקומיות בלבד.

Phase 2D2 לא התחיל. לאחר סקירת הדוח וה־diff, התוכנית הבאה היא rollout ענן מוגן ומדורג: אישור migration/bootstrap, שמירת public static תחילה, שקילות בענן, lifecycle של מזגנים ורק אז allowlist Preview עבורו; לאחר הצלחתו אותו מחזור לחלונות. Production נשאר סטטי.

ל־Phase 2D2 יידרש שינוי מפורש ומאושר בשער ה־Preview של שני השירותים, נוסף לאישור ההחלה והייבוא בענן. בשלב הנוכחי שינוי environment variables בלבד אינו יכול להפעיל אותם בסביבה מתארחת.


Phase 2D1 completed locally. The two special CleanBrothers service pages now support typed CMS content, immutable revisions, Media Library integration and the proven lifecycle while their existing public presentation remains unchanged. Production, CRM and cloud configuration remain untouched. Awaiting review before Phase 2D2.
