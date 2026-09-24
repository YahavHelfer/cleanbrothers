# Phase 2D1 — אודיט מבנה מקומי

**מצב: חסם המדיה המקורי תועד ונפתר באישור מפורש; המימוש המקומי הושלם ואומת. זהו אודיט הבייסליין והחלטות המודל; תוצאות הסיום ב־cms-special-services-phase2d1.he.md.**

## Baseline

- ענף `feature/cms-cloud-foundation`, HEAD `df1973e5a3d5f674cbe2e5058cf6679eddbe4b38`; working tree נקי בתחילת המשימה.
- Preview מוגן READY; רשימת השירותים נפתחה ב־session AAL2 הקיים.
- CMS הייעודי בריא: 2 משתמשים ו־2 memberships מאושרים; יהב פעיל/onboarded/TOTP והמנהל השני onboarding_pending. אין שינוי במנהלים.
- ששת השירותים המשותפים נשארו ב־Preview allowlist ובתוכן המקורי. Production/main והגדרות הענן לא שונו.
- baseline מלא: npm ci, ‏302 general, ‏241 CMS, ‏530 SQL/RLS, ‏39 E2E, TypeScript, lint, build, npm ls --all, git diff --check ו־16 בדיקות שקילות ציבורית — עברו. npm audit: אפס ממצאים.
- שמונה תגובות HTML של Production נבדקו בקריאה בלבד ונשארו זהות לבייסליין המאושר.
- סביבת CMS המקומית כובתה בסיום. ששת ה־baselines המקוריים נשמרו; 0 משתמשים, memberships, factors או אובייקטי Storage סינתטיים. שש המכולות הלא קשורות ופורטי הבדיקה נשמרו/נסגרו כנדרש.

## ממצא מקורי — חסם המדיה לפני האישור

`src/data/serviceImages.ts` מפנה לחמש תמונות מזגנים. שתיים חסרות במאגר וגם מחזירות HTTP 404 ב־Production:

| קובץ | שימוש בפועל |
|---|---|
| `/images/services/air-conditioner-cleaning-web.jpg` | התמונה הראשונה בקרוסלת Hero ותמונת Open Graph |
| `/images/services/Air-conditioner-cleaning5.JPG` | תמונה חמישית בקרוסלה ורביעית בגלריית העבודות |

שלושת הקבצים `Air-conditioner-cleaning.PNG`, `Air-conditioner-cleaning2.PNG`, `Air-conditioner-cleaning4.JPG` קיימים. אין להמציא hash, מידות או bytes עבור התמונות החסרות. בעת האודיט הראשוני לא בוצעה החלפה ללא אישור, משום שהיא משנה את הבייסליין.

בדיקות השקילות הקיימות משוות HTML ו־metadata, לא את זמינות כל קובצי התמונות; לכן הן ירוקות למרות החסר. ייבוא Media Library תקין דורש בדיקת נוכחות ו־hash של כל legacy asset. נשלחה בקשה למקור הקבצים המקוריים, או לאישור מפורש לתיקון הבייסליין.

## אודיט מזגנים

ה־route מספק metadata סטטי ומרנדר `AirConditionerCleaningLandingPage`. הקומפוננטה כוללת קבועים מקומיים לרשימות אמון, יישובים, סימנים, אזורי ניקוי, תהליך ו־8 FAQ; יתר הכותרות והפסקאות ב־JSX. התמונות מגיעות מ־serviceImages. JSON-LD כולל Service, BreadcrumbList ו־FAQPage; FAQ נבנה מאותה רשימה שמוצגת. אין מחשבון מחיר.

`SummerAcPromotionPopup` הוא client component ייעודי: הצגה אחרי 10 שניות או 30% גלילה, פעם ב־sessionStorage, עם focus trap, Escape, חסימת גלילה ו־portal. האירועים הם promotion_popup_impression, promotion_popup_close ו־promotion_whatsapp_click. מחירי 199/250 ותיאור 5+1 משוכפלים בינו לבין העמוד. אין תאריכי מבצע או scheduler.

## אודיט חלונות

ה־route כולל metadata, שני אובייקטי JSON-LD (Service ו־BreadcrumbList), רשימת רכיבי ניקוי, שלושה סוגי נכסים, ארבעה שלבי עבודה, פסקאות התאמה ובטיחות ו־5 FAQ. אין FAQPage JSON-LD בבייסליין; אין להוסיף אחד במסגרת ריפקטור שקול.

`WindowCleaningVisual` הוא איור CSS/SVG דקורטיבי ו־aria-hidden, ללא קובץ תמונה. אין מחיר מספרי, גלריה או מחשבון. מחיר מופיע רק בניסוח בקשת הערכה ותיאום ציפיות.

## סיווג והחלטות

A — תוכן עריכתי; B — תוכן עסקי מובנה; C — תצוגה בשליטת קוד; D — אינטגרציה ואבטחה בשליטת קוד. המודל להלן מנחה את המימוש המקומי.

| תחום | החלטה |
|---|---|
| publicTitle, H1, כותרות, פסקאות, תוויות CTA | A; טקסט רגיל מוגבל. שם תצוגה אינו משנה CRM או route. |
| רשימות, FAQ, אזורי שירות, פריטי ניקוי וסוגי נכסים | B; מבנים סגורים עם שדות ומגבלות מפורשים. |
| SEO title/description ו־AC keywords | A/B; מאותה גרסה מפורסמת שמספקת HTML. |
| canonical/path/serviceType/breadcrumb identity | D; נקבעים לפי registry ומיפוי יציב. |
| Service JSON-LD | נתונים מוגדרים משדות העמוד; מבנה בשליטת קוד, ללא JSON חופשי. |
| AC Hero/gallery/OG media | B; immutable version IDs ו־alt הקשרי. שלוש תמונות קיימות וייחודיות לפי תיקון הבייסליין המאושר, המתועד להלן. |
| Window visual | C; האיור נשאר ברירת מחדל. אין legacy image לייבוא. אפשרות Hero אופציונלית יחידה דרך Media Library לא תשנה baseline כשהיא ריקה. |
| crop, sizes, מעברים, SVG, CSS, icons וסדר sections | C; נשארים בקוד, ללא layout חופשי או Page Builder. |
| promotion.enabled ו־bundleEnabled | B; מצב תצוגה מפורש, ללא תזמון חדש. |
| מחירי המבצע והמחיר הרגיל | B; מספרים מוגבלים ומקור יחיד לעמוד ולפופאפ. לא נמצא מחשבון או מחיר המועבר ל־CRM. |
| טקסט מבצע, badge, CTA ותנאים | A; הגדרה ייעודית למזגנים, מופרדת מתוכן העמוד, ניתנת להעברה לישות Promotions עתידית. |
| כלל המבצע 5+1 | C/D; כלל עסקי קיים בשליטת קוד בשלב זה, ללא המצאת מנוע חישוב. |
| popup timer/scroll/sessionStorage/focus | C/D; נשארים בקוד. |
| tracking IDs/events, consent, attribution | D; אינם שדות CMS. Preview לא מפעיל את controller הפופאפ השיווקי. |
| WhatsApp href/messages, טלפון, form endpoint | D; יעדים והתנהגות קבועים בקוד. רק תוויות CTA עריכתיות. |
| ContactForm initialService | D; מזגנים: `ניקוי מזגנים`; חלונות: `ניקוי חלונות`. |
| homepage, catalog, navigation | מחוץ להיקף; אינם עוברים לניהול CMS. |
| schemaVersion/document/revision/generation | D; מוגדרים בחוזה ובשרת. |

## ארכיטקטורת המימוש המקומי

- שני payloads סגורים ומובחנים, עם schemaVersion נפרד ותיקוף טקסט, רשימות, FAQ, מדיה ומבצע. דחיית שדות זרים בכל עומק, HTML/JS/iframe/CSS וזהויות אינטגרציה.
- הפרדת נתונים מהמצגות הקיימות; אין העברה ל־ServiceLandingPage.
- הרחבת registry לשמונה תוך שמירה על קבוצת ששת השירותים המשותפים. מקור CMS של המיוחדים מותר רק ב־local test mode וב־allowlist מפורש ב־2D1; Preview ו־Production נשארים סטטיים עבורם.
- אותם content_documents/revisions/publication_state/events ו־RPCs. נדרשת migration קדימה להרחבת constraints של service keys/schema versions, תיקוף payloads והפניות מדיה; אין צורך במערכת revisions או טבלאות תוכן שנייה.
- אותו route לעורך, עם dispatch לשדות מוכרים וללא כפילות באימות/שמירה/פרסום/שחזור. controls מושבתים עד hydration.
- Exact Preview דורש AAL2, ללא analytics/controller שיווקי, עם CTA וטופס מושבתים ו־no-store/noindex. ניתן להמחיש תוכן מבצע באופן סטטי פרטי.
- HTML ו־metadata קוראים snapshot מפורסם יחיד לפי request; טיוטות אינן משפיעות על SEO/JSON-LD.

## מצב העבודה

האודיט והחלטות המודל הושלמו. נוספו המימוש המקומי, מיגרציה קדימה, bootstrap ושני עורכים מובנים; מחזורי הדפדפן והרגרסיה מתועדים בדוח הסיום בנפרד.

לא בוצעו commit, push, deploy, שינוי Preview flags, schema/bootstrap בענן, שינוי Production/CRM/מנהלים או תחילת Phase 2D2.

## Field inventory (A/B)

### ac

| Field | Existing content | Class |
|---|---|---|
| h1 | מזגן נקי יותר, אוויר נעים יותר | A |
| copy.heroEyebrow | ניקוי מזגנים מקצועי עד הבית | A |
| copy.heroDescription | ניקוי מקצועי למזגנים עיליים בבית הלקוח, עם טיפול באבק, לכלוך וריחות לא נעימים בחלקים הנגישים לניקוי. | A |
| copy.heroCta | שלחו תמונה וקבלו הערכת מחיר | A |
| copy.callCta | התקשרו עכשיו | A |
| copy.imageCaption | תמונות אמיתיות מהשטח | A |
| copy.signsEyebrow | סימנים שכדאי לבדוק | A |
| copy.signsTitle | מתי כדאי להזמין ניקוי מזגן? | A |
| copy.signsDescription | הסימנים הבאים יכולים להעיד שהגיע הזמן לנקות הצטברות אבק ולכלוך. הם אינם אבחון של תקלה טכנית. | A |
| copy.cleaningEyebrow | ניקוי יסודי ומסודר | A |
| copy.cleaningTitle | מה כולל ניקוי מזגן? | A |
| copy.cleaningDescription | מנקים את החלקים המרכזיים שנגישים לניקוי מקצועי, בלי להבטיח תיקון או שינוי בביצועי המזגן. | A |
| copy.cleaningNote | היקף הניקוי בפועל נקבע לפי סוג המזגן, המבנה והנגישות לחלקים. | A |
| copy.technicalTitle | ניקוי או תקלה טכנית? | A |
| copy.technicalDescription | אנחנו מתמחים בניקוי עמוק של המזגן. אם לאחר הניקוי נשארת תקלה כמו אי־קירור, נזילה חריגה, רעשים או בעיית חשמל — ייתכן שיהיה צורך בטכנאי מזגנים מוסמך. | A |
| copy.processEyebrow | תהליך פשוט וברור | A |
| copy.processTitle | כך מזמינים ניקוי מזגן | A |
| copy.processDescription | מתמונה ראשונה ועד ביקור מתואם בבית — בלי מנגנון פנייה חדש ובלי שלבים מיותרים. | A |
| copy.processCta | שלחו תמונה עכשיו | A |
| copy.galleryEyebrow | עבודות מהשטח | A |
| copy.galleryTitle | עבודות ניקוי מזגנים אמיתיות | A |
| copy.galleryDescription | תמונות מעבודות אמיתיות שבוצעו על ידי CleanBrothers. איננו מציגים זוג לפני ואחרי כאשר אין תיעוד מלא מאותה עבודה. | A |
| copy.pricingEyebrow | הערכת מחיר לפי תמונה | A |
| copy.pricingTitle | כמה עולה ניקוי מזגן? | A |
| copy.pricingDescription | המחיר נקבע לפי סוג המזגן, מצב הלכלוך, הנגישות וכמות המזגנים. שלחו תמונה בוואטסאפ לקבלת הערכה מדויקת יותר. | A |
| copy.pricingCta | קבלו הערכת מחיר | A |
| copy.multipleEyebrow | תיאום מרוכז | A |
| copy.multipleTitle | יש כמה מזגנים בבית? | A |
| copy.multipleDescription | שלחו לנו תמונות של כל המזגנים ונוכל לתת הערכה מרוכזת ולתאם את כולם באותו ביקור, בהתאם לסוגי המזגנים ולגישה. | A |
| copy.multipleCta | שלחו את כל התמונות | A |
| copy.areasEyebrow | אזורי שירות | A |
| copy.areasTitle | ניקוי מזגנים עד הבית באזור המרכז | A |
| copy.areasDescription | מגיעים עם ציוד מקצועי לערי המרכז והשרון. שלחו תמונה ואת היישוב כדי לבדוק זמינות ולקבל הערכת מחיר. | A |
| copy.faqEyebrow | שאלות נפוצות | A |
| copy.faqTitle | מה חשוב לדעת לפני ניקוי מזגן? | A |
| copy.contactEyebrow | הצעת מחיר לניקוי מזגן | A |
| copy.contactTitle | שלחו תמונה או השאירו פרטים | A |
| copy.contactDescription | ציינו את סוג המזגן, היישוב ומה תרצו לנקות. נחזור עם הערכה ותיאום לפי הזמינות באזורכם. | A |
| copy.contactCta | שלחו תמונת מזגן וקבלו מחיר | A |
| copy.callPrefix | התקשרו:  | A |
| copy.servicesCta | לכל שירותי הניקוי של CleanBrothers | A |
| trustItems | 3 items; text[] | B |
| airConditionerServiceAreas | 11 items; text[] | B |
| intentSignals | 5 items; text[] | B |
| cleaningAreas | 6 items; title, description | B |
| processSteps | 4 items; text[] | B |
| faqs | 8 items; question, answer | B |

### window

| Field | Existing content | Class |
|---|---|---|
| h1 | ניקוי חלונות מקצועי לבית ולעסק | A |
| copy.heroEyebrow | ניקוי חלונות בבית הלקוח | A |
| copy.heroDescription | ניקוי זכוכית, מסגרות, מסילות, תריסים ורשתות בדירות, בתים ומשרדים — בהתאם למצב החלונות ולגישה בטוחה. | A |
| copy.heroCta | שלחו תמונות ב-WhatsApp | A |
| copy.includedEyebrow | מה כולל השירות | A |
| copy.includedTitle | ניקוי שמתייחס לכל חלקי החלון | A |
| copy.includedDescription | היקף העבודה נקבע לפי סוג החלונות, מצבם והגישה אליהם. לפני התיאום בודקים תמונות ומסבירים מה ניתן לכלול. | A |
| copy.propertyEyebrow | סוגי נכסים | A |
| copy.propertyTitle | לדירות, בתים ומשרדים | A |
| copy.processEyebrow | תהליך העבודה | A |
| copy.processTitle | מתמונה ראשונית ועד ניקוי מסודר | A |
| copy.audienceEyebrow | למי השירות מתאים | A |
| copy.audienceTitle | למי שמחפש ניקוי יסודי בחלונות נגישים | A |
| copy.audienceDescription | השירות מתאים לדיירים, בעלי בתים ומשרדים שרוצים לנקות את הזכוכית ואת חלקי החלון הנלווים, כולל לאחר שיפוץ, כאשר קיימת גישה בטוחה לעבודה. | A |
| copy.safetyEyebrow | חשוב לדעת מראש | A |
| copy.safetyTitle | עבודה בטוחה ותיאום ציפיות ברור | A |
| copy.safetyDescription | השירות מיועד לחלונות בעלי גישה בטוחה ואינו כולל עבודות בגובה או סנפלינג. התוצאה תלויה בסוג הזכוכית, מצבה, סוג הלכלוך ונגישות החלון. | A |
| copy.faqEyebrow | שאלות נפוצות | A |
| copy.faqTitle | מה חשוב לדעת לפני שמזמינים ניקוי חלונות? | A |
| copy.contactEyebrow | הצעת מחיר לניקוי חלונות | A |
| copy.contactTitle | שלחו תמונות או השאירו פרטים | A |
| copy.contactDescription | כדי להעריך את העבודה, כדאי לצלם את החלונות, המסגרות והגישה אליהם ולציין את סוג הנכס והעיר. | A |
| copy.callPrefix | התקשרו:  | A |
| copy.callCta | התקשרו עכשיו | A |
| copy.quoteCta | קבלת הצעת מחיר | A |
| includedItems | 5 items; text[] | B |
| propertyTypes | 3 items; title, text | B |
| process | 4 items; text[] | B |
| faqs | 5 items; question, answer | B |


## א. תיקון baseline מאושר של שתי הפניות 404

**baseline repair of pre-existing broken media references** — אישור המשתמש מאפשר להחליף רק את שתי ההפניות השבורות בנכסי מזגנים קיימים בריפו. הממצא המקורי לעיל נשמר; אין מדובר ברגרסיה או בשכתוב שיווקי.

| נכס קיים | מידות | bytes | תוכן ותפקיד |
|---|---:|---:|---|
| Air-conditioner-cleaning4.JPG | 1536×2048 | 308108 | עבודת ניקוי עם המזגן גלוי; האיכות והגודל מתאימים ביותר ל־Hero/OG, והמשקל הנמוך ביותר |
| Air-conditioner-cleaning.PNG | 1086×1448 | 2162084 | טכנאי מאחור עם לוגו ויריעת הגנה; תיעוד משלים |
| Air-conditioner-cleaning2.PNG | 1086×1448 | 2027316 | טיפול בפילטרים; תיעוד משלים |

- Hero ו־OG משתמשים ב־4.JPG. הקרוסלה מציגה 4.JPG, PNG, 2.PNG; הגלריה PNG, 2.PNG, 4.JPG. הכפילויות הוסרו במקום להציג אותה תמונה פעמיים.
- נשמרו grid, יחס ממדים, crop, מידות Next Image ומבנה כל section. כיתוב ו־alt המקוריים נשמרו עם מספור המתאים לשלוש תמונות תקינות.
- נבדקו HTTP 200 לכל שלושת הנכסים ולפלט next/image; גם Hero והגלריה נטענו בדפדפן המקומי עם naturalWidth חיובי. OG מפנה לאותו נכס קיים.
- לא נוצרו, הורדו, הועתקו או שונו bytes של תמונות. לא שונו נכסים אחרים.
- serviceImages הגלובלי לא שונה: הוא משמש גם קטלוג/גלריה/דף בית שמחוץ להיקף. ההפניות הישנות שמחוץ לעמוד המזגנים אינן מתוקנות במשימה זו.
- בדיקת כל 16 העמודים משווה את מזגנים לבייסליין ההיסטורי בתוספת תיקון שתי ההפניות בלבד. 15 העמודים האחרים משווים לבייסליין ההיסטורי המקורי, ללא נרמול שמסתיר שינוי.

## ב. שינויי CMS — נפרדים מתיקון המדיה

- schemaVersion 4 למזגנים ו־5 לחלונות, חוזים סגורים ב־TypeScript וב־SQL. מפתחות זרים, URL חופשי, HTML ונתוני CRM נדחים.
- source מבדיל בין ששת השירותים המשותפים לשני הייחודיים. ב־2D1 שני הייחודיים חסומים לכל hosted environment, גם אם הוכנסו בטעות ל־allowlist.
- שדות טקסט/רשימות/FAQ ו־SEO נערכים ב־RTL לפי חוזה מוכר; אין עורך JSON או שליטת פריסה. בחירת תמונות רק מ־Media Library.
- רכיבי View טהורים מופרדים מהחיבור הציבורי לטופס/WhatsApp/Google וממנגנון Popup. בתצוגה הפרטית לא נטענות תלויות השיווק האלה.
- forward migration יחידה: 20260924090000_cms_special_services.sql. אין טבלאות revisions חדשות, אין שינוי למיגרציות היסטוריות ואין החלה בענן.
- הייבוא המקומי נעול ל־CMS המקומי הלא מקושר; שלושה נכסי static בלבד, שני מסמכים, Revision 1. האיור של חלונות נשאר קוד ואינו דורש ייבוא קובץ.
