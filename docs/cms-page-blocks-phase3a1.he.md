# Phase 3A1 — מנוע בלוקים ומבצעים, מקומי בלבד

## גבול ההפעלה והפיילוט

הפיילוט הוא `/about`: עמוד עריכתי ללא טופס לידים או זהות CRM. הנתיב הציבורי ממשיך להשתמש ב־`src/app/(site)/about/page.tsx` הסטטי. מסכי העמודים וה־RPC החדשים זמינים רק כש־`CMS_SUPABASE_URL` מצביע לסביבת CMS המקומית `127.0.0.1:56321` ואין סביבת Vercel. דגלי תוכן של השירותים אינם מפעילים את מנוע העמודים. Phase 3A1 אינו יוצר עמוד ציבורי חדש ואינו מפעיל CMS בענן.

## אודיט שימוש חוזר

| רכיב קיים | מועמד לבלוק | החלטה |
|---|---|---|
| `PageHero` | Hero | שימוש ברכיב הקיים; נוסף מצב פעולה מושבת ל־Preview בלבד |
| `SectionHeading` | Image + Text | שימוש חוזר עם שדות טיפוסיים |
| `/about` ערכי העסק ו־`Icon` | About Overview | תבנית קוד סגורה לשמירת הבייסליין; תוכן בלבד עריך |
| מחלקות `section-block`/`section-container`, כפתורים ורשתות responsive | Rich Text, CTA, Promotion, Spacer | שימוש בפרימיטיבים קיימים; אין מערכת עיצוב נוספת |
| FAQ של עמודי השירות | FAQ | תוכן שאלה/תשובה טיפוסי; HTML ו־JSON-LD מאותה רשימה |
| `ServiceLandingView` ורשת `/services` | Service Grid | נדרש adapter וזהות שירותים; נדחה משלב הפיילוט |
| `GalleryGrid`, `BeforeAfterCard`, `ServiceImageCarousel` | Gallery/BeforeAfter | דורשים חוזה מדיה והשוואת תמונות ייעודי; אינם בבלוקי 3A1 |
| `SummerAcPromotionPopup`, `AcPromotionContent` | Promotion Banner | לא מתאימים לשימוש ישיר: התנהגות מבצע המזגנים תלויה ב־consent, session ותזמון popup. נוסף Banner סטטי טיפוסי בלי לשנות אותם |
| עדויות/Testimonials | Testimonials | לא קיים רכיב תוכן כללי מספיק; לא הומצא דגם חדש בפיילוט |
| תבניות image + text בעמודים מיוחדים | Image + Text | שימוש בשפה החזותית וברכיבי המדיה הקיימים, עם adapter סגור |
| `WhatsAppButton` ו־CTA ציבוריים | Safe CTA | שימוש ב־`getWhatsAppLink` ובנתיב `/api/whatsapp`; Preview מציג פעולה מושבתת |

## חוזה המידע

המיגרציה הקדמית היחידה היא `20260925090000_cms_page_blocks.sql`. היא מרחיבה את `content_documents` ל־`page` ו־`promotion` וממחזרת את `content_revisions`, `content_publication_state` ו־`content_publication_events`. אין מערכת היסטוריה שנייה. גרסת עמוד היא schema 6; גרסת מבצע היא schema 7; כל בלוק הוא schema 1. ה־registry בקוד ממפה סוגים קבועים ל־validator, ברירת מחדל, עורך, renderer, תפקיד מדיה ונגישות. אין שם רכיב React ב־DB ואין HTML/CSS/JS או URL חיצוני שהעורך יכול להזין.

`page_revision_blocks` מחזיקה UUID יציב לבלוק, position מפורש, hidden ספציפי לגרסה, payload מאומת והפניות FK ל־`media_versions` ול־revision של מבצע. מפתח ראשי `(revision_id, block_id)` ואילוץ ייחודיות `(revision_id, position)` חוסמים זהות או מיקום כפולים. trigger מאמת התאמה לעמוד, לגרסת המבצע ולמצב המדיה. בלוקים של גרסאות היסטוריות אינם נדרסים או נמחקים. הסרה מטיוטה משמעה היעדר בגרסה החדשה בלבד; rollback יוצר גרסה חדשה המעתיקה את הרשימה ההיסטורית.

`cms_promotion_identity` מחזיקה את `about-intro`, מפתח אנליטי יציב ו־active/archive שאינם שדות עורך. תוכן המבצע עצמו הוא מסמך revisioned נפרד. `promotion_revision_media` ו־`revision_media_refs` מצביעים לגרסת מדיה immutable עם alt הקשרי. Banner בעמוד מצביע ל־**promotion revision ID מדויק**. פרסום עמוד עם Banner גלוי דורש שגרסת המבצע הזו תהיה המפורסמת בעת הפרסום. פרסום מאוחר של מבצע חדש אינו משנה עמוד שכבר פורסם או Preview היסטורי. אין start/end, cron או scheduler.

## בלוקים ועריכה

הסוגים הראשונים: Hero, Rich Text מובנה (פסקה, h2/h3, רשימות, קישור בטוח, bold/emphasis), Image + Text, FAQ, CTA, Promotion Banner, Divider/Spacer, וכן תבנית `aboutOverview` הנדרשת לשקילות הבייסליין. השדות, אורך הטקסט, enum, UUID והמבנה מאומתים ב־TypeScript וב־SQL; שדות לא מוכרים וגרסאות schema שגויות נדחים. קישור פנימי מוגבל לרשימת נתיבים קיימים, טלפון נגזר מהגדרת העסק, ו־WhatsApp נוצר דרך המנגנון הקיים. ה־Preview משבית פעולות, אינו שולח פנייה או attribution, ואינו טוען tracking ציבורי.

`/admin/pages` מציג רק את עמוד הפיילוט, סטטוס, נתיב, גרסאות, שינוי אחרון ומזהי עורך/מפרסם. `/admin/pages/about` מציג עורך RTL של metadata ובלוקים בלי JSON גולמי: הוספה, שכפול, למעלה/למטה נגישים למקלדת, הסתרה/הצגה והסרה מטיוטה. כותרת H1 מטאדאטה וכותרת Hero נשמרות מסונכרנות. Save Draft, Publish באישור מפורש, היסטוריה ושחזור הם פעולות נפרדות. עריכת מבצע היא במסך ייעודי. כל פעולה מבצעת שוב `requireCmsAdmin()` בצד השרת; Proxy אינו גבול ההרשאה היחיד.

## Baseline ושקילות

Revision 1 של `/about` מכיל שני בלוקים בסדר הקיים: Hero ו־About Overview. הטקסטים, הכותרות, CTA WhatsApp, ערכי העסק, SEO וה־canonical הועתקו מן העמוד הסטטי ללא שינוי שיווקי. לעמוד אין media או JSON-LD בבייסליין. מבצע `about-intro` נוצר בנפרד אך אינו נכלל בעמוד הבייסליין. `node scripts/cms-import-about.mjs` הוא ייבוא operator מקומי עם שער פרויקט; הרצה שנייה אינה מוסיפה מסמך, revision, בלוק או אירוע.

בדיקת שקילות משווה HTML סטטי מול רינדור CMS Revision 1 ברמת טקסט גלוי, סדר, h1–h6, קישורים, מטאדאטה ו־canonical; בדיקת הדפדפן מוודאת ש־`/about` הציבורי עדיין סטטי. רינדור ציבורי של CMS נבדק כמצב מקור מפורש בסביבת מבחן בלבד, ולא נקשר לנתיב האתר בשלב זה.

## הרשאות, אבטחה ומחזור

ה־RPCs והטבלאות מוגנים ב־RLS, ‏FORCE RLS וה־helper הקיים הדורש משתמש מאומת, חברות פעילה, onboarding מלא ו־AAL2. Anonymous, non-member, inactive, onboarding-pending ו־AAL1 חסומים. אין read ציבורי לבלוקים, טיוטות או מבצעים. נתיבי Admin/Preview נשארים private/no-store ו־noindex/nofollow. Exact Preview מאמת revision של מסמך העמוד הנכון; מזהה גרסת שירות/מבצע אינו מתקבל כעמוד.

מחזור מקומי שנבדק: Revision 1 → בלוק חדש וסדר חדש → hidden של בלוק קיים → Draft → Preview מדויק → Publish → restore של Revision 1 כטיוטה חדשה → Publish. הטיוטה לא משנה את published pointer, העמוד הציבורי נשאר סטטי, והיסטוריה אינה משתנה. שני עורכים על אותו generation נותנים conflict עברי ללא overwrite; תוכן הטופס הישן נשאר בעורך. Origin חסר־אמון ו־`Origin: null` נדחים על ידי שכבת Server Actions.

מבצע מקומי שנבדק: טיוטת מבצע חדשה → Publish למבצע → Banner בטיוטת העמוד עם הפניה לגרסה המדויקת → Preview/Publish לעמוד → גרסת מבצע חדשה. ה־Preview של העמוד ההיסטורי ממשיך להציג את נוסח המבצע המקורי.

## שלב המשך מוצע

Phase 3A2 דורש אישור נפרד ל־migration בענן, bootstrap של `/about` בלבד ו־Preview מוגן. יש להשאיר תחילה את הנתיב הציבורי סטטי, לבדוק עריכה ו־exact Preview, ורק אחר כך לאפשר זמנית ובמפורש את מקור ה־CMS ב־Preview לפיילוט, לאמת Publish/Rollback ולשמור Production ללא שינוי.

## אימות סופי מקומי

Baseline לפני שינוי: 345 בדיקות כלליות, 284 CMS, ‏640 SQL/RLS, ‏47 E2E ו־16 בדיקות שקילות ציבורית; audit ללא ממצאים. לאחר השינוי: `npm ci`; ‏352/352 כלליות; ‏291/291 CMS; ‏710/710 SQL/RLS; ‏51/51 E2E; ‏16/16 שקילות ציבורית; TypeScript, lint, build, `npm ls --all` ו־`git diff --check` תקינים; `npm audit` מדווח 0. בבנייה `/about` עדיין prerendered סטטית. סריקת bundle לקוח לא מצאה מזהי מפתחות CMS privileged.

בסיום סביבת הבדיקות המקומית הכילה 0 משתמשי Auth, ‏0 memberships, ‏0 MFA factors, ‏0 גרסאות media uploaded, ‏0 אובייקטי Storage ו־0 מסמכי page/promotion שנותרו מן הפיילוט; סביבת ה־CMS המקומית כובתה. סביבת Supabase מקומית אחרת שהייתה קיימת נשארה פועלת ללא התערבות. הענף ו־HEAD נשמרו, וכל השינויים לא staged ולא committed. לא בוצעו push, deploy, migration/ייבוא בענן, שינוי Preview/Production, CRM או חשבונות מנהלים.
