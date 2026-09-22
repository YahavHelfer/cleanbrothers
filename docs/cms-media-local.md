# Phase 2B1 — ספריית מדיה מקומית

היישום מיועד למסד ולשרתים המקומיים המבודדים בלבד. אין להפעיל את המיגרציה או את דגלי המדיה בענן כחלק משלב זה. מסמך זה משלים את תיעוד Phase 2A1/2A2; הוא אינו משנה את העובדות ההיסטוריות שתועדו שם.

## A. Baseline והיקף

התחלה נקייה בענף `feature/cms-cloud-foundation`, ב־HEAD `9b4eb0051427635b13ecc12ecbbb2b092e5b000b`, הורה `3f637f3ab06281b169666bb0685618be769d0905`. הבסיס עבר: `npm ci`, 154 בדיקות כלליות, מתוכן 93 CMS, ועוד 173 SQL ו־26 E2E; TypeScript, lint, build, audit ללא ממצאים, dependency tree ו־diff-check.

בדיקות קריאה בלבד אישרו CMS cloud תקין במסלול Free; שתי זהויות ושתי חברויות בלבד. יהב פעיל, onboarding הושלם ו־TOTP מאומת; המנהל השני נשמר כ־onboarding pending. לא נעשה שימוש בסיסמה או בקוד TOTP אמיתי. אין שינוי במשתמשים, Production, Preview, `main`, CRM, לידים, WhatsApp או אינטגרציות שיווק.

תוקן הנוסח הישן בחמישה קבצים, ללא שינוי בהתנהגות: הוסרה ״בסביבה המקומית״ מלוח הבקרה; ״לסביבה המקומית״ בשני מסכי השירות הוחלף ב״לסביבת התוכן״; הודעת ההצלחה ״הגרסה פורסמה בסביבה המקומית״ הוחלפה ב״הגרסה פורסמה בסביבת התוכן הנוכחית״; הערת הפרסום בעורך מתייחסת כעת לסביבת התוכן הנוכחית. בדיקת רגרסיה מונעת חזרת הנוסח הישן למסכים אלה.

## B. מיפוי התמונות הקיימות

| פריט | ערך מדויק |
| --- | --- |
| קובץ פיזי יחיד לפיילוט | `public/images/services/delicate-upholstery-cleaning.jpeg` |
| כתובת ציבורית | `/images/services/delicate-upholstery-cleaning.jpeg` |
| פורמט / ממדים / גודל | JPEG; ‏1600×1200; ‏132,211 bytes |
| SHA-256 | `b1420c216c60afec56597ccba27c5cabd2ee44f54a2904ac1b7824225e696107` |
| מקור נתונים | `src/data/serviceImages.ts`, המפתח `delicateUpholstery` |
| שימוש בדף הפיילוט | תמונת פתיחה, קרוסלת היתרונות ותמונת התוצאה — שלוש הפניות לאותם bytes |
| שימוש נוסף | כרטיס השירות בדף `/services`, שנשאר סטטי |
| דף הבית | הטקסט מציין ריפודים עדינים; רשימת ששת השירותים הראשיים אינה מציגה את תמונת הפיילוט |
| גלריה / לפני־אחרי | אין זוג לפני־אחרי של הפיילוט ואין תמונה נוספת לייבוא |

ה־alt בפתיחה הוא ״ניקוי מבוקר של ריפוד עדין על ידי CleanBrothers״; ביתרונות הוא נגזר מ־`serviceName` בתבנית ״תיעוד אמיתי של … על ידי CleanBrothers״, ובתוצאות ״צילום מהשטח במהלך …״. בכרטיס השירות הוא מגיע מכותרת השירות. `ImageWithFallback` מציג רקע CSS וטקסט אם תמונה חסרה; אין קובץ fallback נוסף.

האתר משתמש ב־`next/image` וב־`ServiceImageCarousel`. הקובץ הסטטי ממשיך במסלול האופטימיזציה הקיים. קובצי המדיה המקומיים הפרטיים והמסלול הציבורי הניסיוני משתמשים ב־`unoptimized`, כדי שבקשת התמונה הפרטית תישלח מהדפדפן עם cookies של `/admin`. לא הורחבו כללי image hosts ב־Next.

## C. מודל הנתונים

- `media_assets`: UUID לוגי קבוע, מצב available/archived, `generation`, מצביע לגרסה הנוכחית, ברירות מחדל ל־alt/caption, סיווג תיקייה, יוצר וזמני יצירה/עדכון/ארכוב.
- `media_versions`: UUID פיזי, asset, מספר גרסה עולה, provider מסוג static/local, bucket ריק בשלב זה, path, MIME, bytes, ממדים, SHA-256, שם הקובץ המקורי, יוצר וזמן. אין שינוי או מחיקה של רשומה קיימת.
- `revision_media_refs`: FK לגרסת תוכן ולגרסת מדיה, תפקיד hero/benefits/result, סדר, ו־alt/caption קפואים בהקשר של אותה גרסת תוכן.
- `media_audit_events`: יצירה, החלפה, עריכת פרטים, ארכוב והחזרה לבחירה; מזהי נכס/גרסה, מבצע, זמן ומצב לפני/אחרי. רשומות האודיט אינן ניתנות לעריכה.

ברירת המחדל שייכת לנכס הלוגי; התיאור שנעשה בו שימוש שייך להפניית התוכן. כך שינוי בספרייה אינו משנה alt שכבר פורסם. השדה הקיים `imageAlt` ממשיך לשמש את תמונות הפתיחה; תיאורי היתרונות והתוצאה נגזרים מכותרת התצוגה בזמן שמירת הגרסה ונשמרים בהפניות. ה־caption נשמר כברירת מחדל וב־snapshot; לא נוסף caption ציבורי למקומות שבהם העיצוב הקיים לא הציג כזה.

## D. מיגרציה מדויקת

נוספה רק `supabase/migrations/20260922200000_cms_media_foundation.sql`. חמש המיגרציות ההיסטוריות לא שונו. החדשה כוללת טבלאות, אינדקסים, FKs, טריגרי immutability, RLS כפוי, RPCs מוגבלים, ו־schemaVersion 2 לתוכן הכולל UUIDs של גרסאות מדיה.

המיגרציה מרחיבה את אימות התוכן ושמירת הטיוטה במיגרציה קדימה. schemaVersion 1 והייבוא הישן נשארים תקפים; שום body או אודיט היסטורי אינו משוכתב. היא נבדקה גם באתחול נקי של המסד המקומי, ולא הוחלה בענן.

## E. שמירת גרסאות

החלפת תמונה יוצרת קובץ חדש ו־`media_version` חדש. היא מעדכנת את מצביע הספרייה, לא את הפניות התוכן. גרסה שפורסמה ממשיכה להצביע ל־UUID הישן. בחירת החדש בעורך דורשת שמירת טיוטה ופרסום נפרד.

טריגרים אוסרים UPDATE/DELETE לגרסאות, להפניות ולאודיט, גם עבור מפעיל SQL. FKs מגנים על תקינות ההפניות. שחזור תוכן יוצר גרסת תוכן חדשה ומעתיק בדיוק את ההפניות, ה־alt וה־caption של המקור, לרבות תמונות שנמצאות כעת בארכיון.

## F. Bootstrap סטטי

`npm run cms:import-media` מאמת את גודל הקובץ וה־hash המאושרים ומריץ רק את הייבוא המקומי. מזהי הנכס והגרסה קבועים: `d0000000-0000-4000-8000-000000000001` ו־`d1000000-0000-4000-8000-000000000001`. `npm run cms:import-pilot` קורא אליו לפני ייבוא התוכן.

הייבוא אידמפוטנטי ונעול מפני הרצה מקבילה: נכס אחד, גרסה אחת ואירוע bootstrap אחד. לא מועתקים bytes ולא מיובאים שירותים אחרים. לגרסאות תוכן legacy קיימות מצורפות הפניות יחסיות בלי לשנות את התוכן או את אודיט הפרסום. הבעלות בייבוא היא operator/system (`actor_id=null`), כמוסכם לגבי היסטוריית baseline.

## G. צינור האימות

השרת בודק הרשאה וסביבה לפני קריאת הגוף. מקבלים קובץ יחיד ב־multipart, עם תקרת stream של 8 MiB ועוד 64 KiB עבור מעטפת הטופס; כותרת Content-Length אינה תחליף לספירת bytes בפועל. Origin חייב להיות אחד משני שרתי הבדיקה המקומיים ולהתאים ל־Host. אין אמון בכותרת forwarded או בנתיב שהלקוח הציע.

מותרות תמונות JPEG, PNG ו־WebP חד־פריימיות בלבד. נבדקים חתימה, מבנה המכל, CRC ב־PNG, סיום מלא והיעדר trailing/concatenated payload, תאימות סיומת ו־MIME, ואז פענוח מלא באמצעות Sharp. SVG, HTML, תוכן פעיל מזוהה, ZIP משולב, קובץ פגום או קטוע, אנימציה ו־AVIF נדחים. AVIF נדחה לשלב עתידי כדי לצמצם את שטח הפענוח והבדיקות הנוכחי.

המגבלות: 8 MiB לקלט ולתוצר, 6,000 פיקסלים לצלע, 16 מיליון פיקסלים מפוענחים, עד ארבעה ערוצים, עד שני פענוחים במקביל בתהליך ו־timeout של חמש שניות לעיבוד. `failOn: warning` דורש פענוח קפדני. רק פיקסלים שעברו פענוח וקידוד מחדש ל־WebP נכתבים לדיסק; הקובץ המקורי אינו נשמר. אין טעינת URL חיצוני.

## H. EXIF ופרטיות

כיוון התמונה מיושם על הפיקסלים, הצבע מומר ל־sRGB והתוצר מקודד מחדש בלי keepMetadata/withMetadata. EXIF/GPS, XMP, IPTC, פרופיל ICC המקורי והערות אינם מועתקים. אין שמירת גאולוקציה או orientation כמטא־דאטה בתוצר. נשמרים רק נתוני המודל הדרושים, כולל שם מקורי מוגבל שנגיש בממשק הניהול.

הבדיקות כוללות JPEG עם EXIF ו־orientation, אימות סיבוב הממדים והיעדר המטא־דאטה בתוצר. התנהגות הסרת המטא־דאטה תואמת ל־[Sharp output documentation](https://sharp.pixelplumbing.com/api-output/); מגבלות הפענוח מתבססות על [Sharp constructor documentation](https://sharp.pixelplumbing.com/api-constructor/).

## I. אחסון, נתיבים ו־hash

אין bucket, גם במימוש המקומי. התוצרים הפרטיים נשמרים ב־`<OS tmpdir>/cleanbrothers-cms-media-local/<server UUID>.webp`, מחוץ ל־`public` ולמאגר. התיקייה מחויבת להרשאות 0700 והקובץ נוצר כ־0600, באופן exclusive ועם no-follow. symlink, תיקייה פתוחה מדי, UUID שגוי ודריסת קובץ קיים נדחים. הקריאה בודקת SHA-256 מול המסד.

השם המקורי עובר NFKC ואימות Unicode; traversal, מפרידי נתיב, control/bidi, שמות מוסתרים וטריקי executable extension נחסמים. הוא לעולם אינו נתיב האחסון. SHA-256 מחושב על התוצר המנורמל, עם אינדקס לחיפוש כפילויות. bytes זהים יכולים להשתייך לנכסים לוגיים שונים; אין איחוד אוטומטי.

קובץ חדש שהרישום שלו נדחה בוודאות בטרנזקציה מפוצה במחיקה של אותו UUID חדש בלבד. במקרה של תוצאת רשת לא ודאית משאירים orphan candidate פרטי, כדי לא למחוק קובץ שאולי כבר נרשם. אין GC אוטומטי של מדיה היסטורית.

## J. ממשק הספרייה

`/admin/media` מציג עברית RTL, חיפוש מקומי בשם/alt/סיווג, סינון ארכיון, thumbnail, סוג, ממדים, גרסה נוכחית, מספר הפניות שמורות ומספר הפניות בתוכן המפורסם. הספירה היא של שימושים בתפקידים, לא של מסמכים ייחודיים: תמונת baseline מציגה שלוש הפניות.

`/admin/media/[id]` כולל עריכת פרטים, החלפת תמונה, היסטוריית גרסאות עם יוצר וזמן, שימושים עם קישור לגרסת תוכן מדויקת ואודיט. יש ארכוב והחזרה לבחירה, ללא כפתור מחיקה לצמיתות.

טופס ההעלאה כולל בחירת קובץ וגרירה, תצוגה מקומית לפני אישור, מגבלות ברורות, alt חובה, caption וסיווג. בזמן עיבוד מוצג חיווי פעילות, לא אחוז מומצא. שגיאות מוצגות בעברית. קלט מטא־דאטה וקובץ שנבחר נשמרים במקרה conflict. אין העלאה ישירה מהדפדפן לאחסון עם הרשאה מיוחדת.

## K. חיבור לעורך הפיילוט

רק `delicate-upholstery-cleaning` מקבל בורר מספריית המדיה כשהדגל המקומי מפורש. ניתן לבחור גרסה מסוימת, להוסיף עד שמונה תמונות, להסיר ולשנות סדר. אין URL או path חופשי, אין שינוי לזהות CRM, ומפתחות שירות אחרים לא הופכים למנוהלים.

שמירה יוצרת revision רגיל; פרסום נפרד מחליף מצביע אטומית; שחזור יוצר revision חדש. הארכיון אינו מוצע לבחירה חדשה, אך בחירה קיימת נשמרת וניתנת לשחזור היסטורי. בלי הדגל נשמר הבורר הישן המאושר של התמונה הסטטית.

## L. הפניות ותצוגה

כל שימוש מקבל FK לגרסת המדיה, תפקיד וסדר. SQL יוצר את ההפניות באותה טרנזקציה של גרסת התוכן. ה־Preview מאמת מנהל AAL2 וקורא את מזהה הגרסה המדויק; המסלול `/admin/media/file/[id]` דורש הרשאה עצמאית גם אם מגיעים אליו ישירות.

בבדיקות בלבד, `/cms-media/[id]` דורש את כל דגלי הסביבה המקומית, published ו־allowlist של הפיילוט; הוא מגיש רק תמונה שהוזכרה בפרסום שבוצע בפועל. טיוטה או החלפה שטרם פורסמה מחזירות 404 לאנונימי. תמונה שכבר פורסמה נשארת ניתנת להגשה לצורך היסטוריה גם לאחר rollback: פרסום אינו פעולת סודיות הפיכה. נתוני הספרייה, האודיט וטיוטות אינם מצורפים להיטל הציבורי.

## M. ארכוב, מחיקה וניקוי עתידי

ארכוב מסתיר מבחירה חדשה ושומר קבצים, גרסאות, הפניות ואודיט. אין hard delete דרך האפליקציה או הרשאת DELETE לדפדפן. ההגנה מחמירה יותר מהפניה נוכחית: גם גרסה שלא נבחרה עוד בטיוטה נשמרת.

מצבי העבודה: קלט פרטי בזיכרון → פענוח מאומת → קובץ פרטי ורישום available → referenced draft → published/referenced; archived הוא מצב של הנכס הלוגי. orphan candidate הוא קובץ ללא רישום ודאי, לא נכס שאיבד שימוש בטיוטה. ניקוי ענן עתידי ידרוש inventory בשני הצדדים, תקופת חסד, בדיקת כל ההפניות ההיסטוריות ואירועי הפרסום, היעדר upload פעיל, dry-run, אישור מפעיל ואודיט. אין למחוק עקב אפס שימושים בטיוטה הנוכחית בלבד.

## N. הרשאות ו־RLS

כל כניסה לקריאה או mutation בספריית המדיה מבצעת `requireCmsAdmin()` באופן עצמאי: זהות מאומתת, חברות admin פעילה, onboarding שהושלם ו־AAL2 עם גורם TOTP מאומת. גם upload handler וה־Server Action מאמתים עצמאית; Proxy/layout אינם גבול ההרשאה היחיד.

RLS כפוי בארבע הטבלאות. אנונימי חסום לקריאת מטא־דאטה פרטית; authenticated מקבל SELECT בכפוף ל־AAL2 בלבד. nonmember, AAL1, inactive ו־onboarding pending חסומים. אין מענקי INSERT/UPDATE/DELETE ישירים גם למנהל AAL2.

שינוי מטא־דאטה/ארכוב נעשה ב־RPC הדורש AAL2. רישום bytes מאומתים מותר רק ל־RPC ייעודי עם service-role **מקומי** בשרת לאחר `requireCmsAdmin()`, ובדיקה נוספת שה־actor עדיין חבר פעיל ושה־onboarding אינו pending. מפתח זה אינו מעניק אמינות לדיווח מהדפדפן; הדפדפן אינו יכול לקרוא ל־RPC הרישום או לקבוע תוצאת פענוח. השרת אינו יורש credentials של CRM/cloud. כל הפונקציות מגדירות search_path ריק ומענקים מפורשים.

## O. עריכה מקבילה

לנכס `generation`, ונעילת שורה לפני השוואה. עריכת פרטים, החלפה, ארכוב והחזרה דורשים את הדור שהעורך פתח. כשל מחזיר HTTP 409/‏PT409 והודעה ״מנהל אחר שינה את המדיה…״; אין ניסיון אוטומטי מול הדור החדש. דור העריכה והקלט נשמרים גם אם רענון RSC מעביר למסך מידע עדכני אחרי conflict. החלפה מעדכנת את פרטי ברירת המחדל והגרסה באותה טרנזקציה, בלי לשנות הפניות קודמות.

## P. אודיט

פעולות אנושיות נרשמות ב־UUID של מנהל ה־CMS שאומת, עם זמן, סוג הפעולה, נכס, גרסה ומצב לפני/אחרי. אין רישום bytes, סיסמאות, cookies, TOTP, QR או מפתחות. ייבוא מדיה מיוחס למערכת; היסטוריית baseline התוכן הקודמת נשארת ללא שיוך אנושי בדיעבד.

## Q. סקירת אבטחה

נבדקו traversal/Unicode/קוליזיות/symlinks, MIME spoofing, קבצים פגומים, trailing payload ו־polyglots מזוהים, SVG/HTML/אנימציה/AVIF, גבולות bytes ופיקסלים, EXIF, CSRF, גבולות גוף multipart וחריגה ב־stream. נבדקו RLS והרשאה ללא הסתמכות על Proxy, מניעת enumeration פרטי, חסימת תמונת draft גם דרך `/_next/image`, ושימור references/alt תחת replacement/archive/rollback.

תגובות פרטיות, לרבות redirects ו־404 של קובץ, כוללות `private, no-store`, noindex, nosniff ו־CSP מגביל. עמודי admin/Preview יורשים noindex/no-store ובידוד שיווק. אין נתיב raw upload ציבורי. הדגל `CMS_MEDIA_LOCAL_ENABLED=1` מחייב בנוסף CMS ב־`127.0.0.1:56321` והיעדר Vercel environment; שמירה/רינדור של schemaVersion 2 נכשלת סגור מחוץ לסביבה זו.

נסרקו שני bundles של הדפדפן: 56 קובצי JS/map, ללא המפתח המקומי המיוחד, ללא משתנה הסביבה שלו וללא פונקציית הרישום המיוחדת. `sharp@0.35.4` נוסף כתלות ישירה בגרסה שכבר הייתה נעולה כתלות של Next; Next, React ושאר גרסאות התלויות לא שודרגו.

## R. המלצה ל־Supabase Storage ב־Phase 2B2 — תכנון בלבד

| אפשרות | התאמה למערכת |
| --- | --- |
| A — bucket ציבורי | פשוט, יציב ומתאים לקאש; קריאת אובייקט ציבורי עוקפת את סודיות ה־Preview ואינה מתאימה לטיוטות |
| B — bucket פרטי וקישורים חתומים | מתאים לטיוטות ולהיסטוריה פרטית; URL חתום הוא הרשאת bearer זמנית, גם מחוץ ל־Deployment Protection; פקיעת URL מקשה על URL יציב ועל cache/Next optimization |
| C — עותקים ציבוריים immutable רק לאחר פרסום, טיוטות פרטיות | מתאים בעתיד לפרסום Production: object קבוע לכל version, CDN יעיל, הפרדה מטיוטות; דורש promotion אטומי/בר־התאוששות ומכיר בכך שפרסום ציבורי אינו הפיך |

ל־**Phase 2B2 המוגבל ל־Preview מוגן ההמלצה היא bucket פרטי ייעודי ל־CMS Preview**, ללא הפיכתו לציבורי. עבור `/admin` עדיף proxy באותו origin שמאמת AAL2 ומזרים bytes; אם נעשה שימוש ב־signed URL לצורך הקריאה בשרת, לא למסור אותו לדפדפן. נתיב תמונות של השירות המפורסם ב־Preview יישאר תחת Deployment Protection ויאמת הפניה שפורסמה, בלי לפתוח גישה ל־draft. שימוש ב־proxy גם שומר URL יציב המבוסס על version UUID ומונע הכנסת חתימות מתחלפות לתוכן היסטורי.

בתחילת הפיילוט מומלץ להשאיר `unoptimized` למדיה הפרטית ו־no-store, עד שנבדקים במפורש Auth, תמונות, cache ו־egress. אין להגדיר remote host רחב רק כדי לעקוף בעיית cookies. אם בעתיד יוחלט על אופטימיזציה/URL חיצוני, לאפשר רק project/bucket/path מדויקים ולבדוק שחתימה או cookie אינם נכנסים לקאש ציבורי. יש למדוד egress של הדפדפן, שרת ה־Preview ו־Storage לפני בחירת pipeline נוסף.

לפרסום Production עתידי, באישור נפרד, אפשר לעבור למודל C: namespace/bucket ציבורי נפרד, immutable objects לפרסום אמיתי בלבד, וטיפול פרטי נפרד ב־Preview. אין לשתף דגלים, כתובות אובייקט או הרשאות בין סביבות. ההבדל בין buckets פרטיים וציבוריים מבוסס על [תיעוד Supabase Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals). זו המלצת תכנון; לא נוצר bucket ולא הוגדרה מדיניות ענן בשלב הנוכחי.

## S. רשימת קבצים מדויקת

45 קבצים: 22 נוספו ו־23 שונו; אין מחיקות או העברות. אין staging, commit או push.

| מצב | קובץ |
| --- | --- |
| נוסף | `docs/cms-media-local.md` |
| שונה | `package-lock.json` |
| שונה | `package.json` |
| נוסף | `scripts/cms-import-media.mjs` |
| שונה | `scripts/cms-import-pilot.mjs` |
| שונה | `scripts/cms-local.mjs` |
| שונה | `scripts/cms-test-server.mjs` |
| נוסף | `src/app/(admin)/admin/(protected)/media/[id]/page.tsx` |
| נוסף | `src/app/(admin)/admin/(protected)/media/page.tsx` |
| שונה | `src/app/(admin)/admin/(protected)/page.tsx` |
| שונה | `src/app/(admin)/admin/(protected)/preview/services/delicate-upholstery-cleaning/page.tsx` |
| שונה | `src/app/(admin)/admin/(protected)/services/delicate-upholstery-cleaning/page.tsx` |
| שונה | `src/app/(admin)/admin/(protected)/services/page.tsx` |
| נוסף | `src/app/(admin)/admin/media/file/[id]/route.ts` |
| נוסף | `src/app/(admin)/admin/media/upload/route.ts` |
| שונה | `src/app/(admin)/layout.tsx` |
| נוסף | `src/app/cms-media/[id]/route.ts` |
| שונה | `src/cms/content/ServiceEditor.tsx` |
| שונה | `src/cms/content/actions.ts` |
| שונה | `src/cms/content/pilot-model.ts` |
| שונה | `src/cms/content/public-source.ts` |
| שונה | `src/cms/content/repository.ts` |
| נוסף | `src/cms/media/Library.tsx` |
| נוסף | `src/cms/media/MetadataEditor.tsx` |
| נוסף | `src/cms/media/UploadForm.tsx` |
| נוסף | `src/cms/media/actions.ts` |
| נוסף | `src/cms/media/environment.ts` |
| נוסף | `src/cms/media/http.ts` |
| נוסף | `src/cms/media/local-storage.ts` |
| נוסף | `src/cms/media/model.ts` |
| נוסף | `src/cms/media/repository.ts` |
| נוסף | `src/cms/media/resolve.ts` |
| נוסף | `src/cms/media/validate-image.ts` |
| שונה | `src/components/ImageWithFallback.tsx` |
| שונה | `src/components/ServiceImageCarousel.tsx` |
| שונה | `src/components/ServiceLandingView.tsx` |
| שונה | `src/content/service-landing.ts` |
| נוסף | `supabase/migrations/20260922200000_cms_media_foundation.sql` |
| שונה | `supabase/tests/database/cms_content.test.sql` |
| נוסף | `supabase/tests/database/cms_media.test.sql` |
| שונה | `tests/application-boundaries.test.mjs` |
| נוסף | `tests/cms-media.test.mjs` |
| נוסף | `tests/e2e/cms-media.spec.ts` |
| שונה | `tests/e2e/helpers/content-fixtures.ts` |
| שונה | `tests/helpers/source-module.mjs` |

## T. תוצאות אימות

| בדיקה | Baseline | סיום |
| --- | --- | --- |
| `npm ci` | עבר | עבר; package/lock תואמים |
| `npm test` | 154 | **210/210** |
| `npm run test:cms` | 93 | **149/149**, תת־קבוצה של הכלליות |
| `npm run test:cms:db` | 173 | **280/280**, כולל 107 בדיקות מדיה חדשות |
| `npm run test:e2e` | 26 | **33/33**, כולל 7 תרחישי מדיה חדשים |
| `tsc --noEmit --incremental false` | עבר | עבר |
| `npm run lint` | עבר | עבר, ללא אזהרות |
| `npm run build` | עבר | עבר; כל 16 העמודים הציבוריים prerendered/static |
| `npm audit` | 0 | **0 vulnerabilities** |
| `npm ls --all` | עבר | עבר; אף גרסת dependency לא הוחלפה |
| `git diff --check` | עבר | עבר; נבדקו גם whitespace וקבצים חדשים |

56 בדיקות יחידה חדשות מכסות אימות קבצים, קובצי EXIF, hashes, גבולות ופענוח, נתיבים/הרשאות קובץ, compensation, סביבה והרשאות עצמאיות, schemaVersion 2, CSRF, multipart ותגובות קובץ בלי Proxy. תרחישי הדפדפן מריצים upload → draft → private preview → publish → replace → explicit new selection → publish → rollback, כולל שימור היסטוריה, הודעת conflict ושימור הקלט, ארכוב, drag/drop, סדר, חיפוש ו־RTL בנייד. הבדיקות משתמשות בתמונות זעירות שנוצרות בזיכרון, בלי binaries חדשים במאגר.

בוצעה השוואת SSR ומטא־דאטה ישירה מול HEAD המאושר בכל 16 העמודים הציבוריים: זהות מלאה. בדיקות התוכן והדפדפן מאשרות גם שה־legacy static baseline זהה לרינדור CMS המקביל, ושה־CRM נשאר `ניקוי ריפודים עדינים`. אין שינויים בקוד CRM, Consent, Ads, GA4, Meta או WhatsApp.

בסיום: 0 משתמשי Auth מקומיים, 0 חברויות ו־0 פקטורי MFA; 0 קובצי העלאה מקומיים ו־0 גרסאות provider=local. נשארו רק baseline תוכן ופרסום אחד, נכס static אחד, גרסה אחת, אירוע bootstrap אחד ושלוש הפניות. CMS המקומי נסגר וכל פורטי הבדיקה 56300/56301/56321/56322/56324 סגורים. ששת הקונטיינרים שהיו קיימים בסביבה המקומית האחרת נשמרו.

בדיקת ענן לקריאה בלבד: CMS בריא ב־Free, 2 Auth users ו־2 memberships ללא שינוי, השני onboarding pending; מסמך פיילוט אחד, 7 revisions, ‏5 אירועי פרסום, revision 7 המקורית מפורסמת, generation 11. סכמה של מדיה אינה קיימת בענן ו־Storage מכיל 0 buckets. שמונה תגובות HTML של Production זהות לייחוס, הגדרות הפרויקט, הרשומות של משתני הסביבה והגנת Vercel ללא שינוי; לא נוצר deployment ולא בוצעה קריאת נתוני CRM. הענף המרוחק ו־main נשארו באותם SHA.

סקירת 45 הקבצים מצאה רק שינויי Phase 2B1: אין credentials, `.env`, local state, קבצים בינאריים, artifacts או caches ברשימת השינויים. אין קבצים staged. הענף וה־HEAD המקומיים נשארו כפי שהיו בתחילת השלב; השינויים ממתינים לסקירה ללא commit.

## U. מוכנות ל־Phase 2B2

מוכן לסקירה מקומית. Phase 2B2 לא התחיל. לאחר אישור נפרד בלבד: התאמת provider/storage קדימה, החלת סכמה מאושרת על CMS cloud, bucket פרטי מאושר, כללי image host רק אם נחוצים, credentials מוגבלים בשרת Preview בלבד, deployment מוגן, העלאה אמיתית יחידה, בחירה בטיוטת הפיילוט, Preview, פרסום ב־Preview, אימות שהיסטוריה נשארה זהה ו־rollback לתמונת ה־legacy. Production, CRM ושאר השירותים יישארו ללא שינוי. אין צורך להשלים את onboarding של המנהל השני לשם כך.

Phase 2B1 completed locally. Secure Media Library, immutable image versions, reference tracking and pilot integration implemented and validated without cloud Storage, Production or CRM changes. Awaiting review before Phase 2B2.
