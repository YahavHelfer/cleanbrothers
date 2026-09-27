# Phase 4A3-A — תצוגה ציבורית של מבצעים מתוזמנים (מקומי בלבד)

המתזמן משנה רק `cms_active_promotion_placements`; קריאת עמוד אינה מפעילה,
מתקנת או מבטלת לוח זמנים. המימוש אינו משנה תוכן Revision של עמוד, בית או שירות,
ואינו מחבר את התוצאה ל־SEO, JSON-LD, CRM או למערכת attribution.

## שער הפעלה

`CMS_SCHEDULED_PROMOTIONS_SOURCE=active` וגם
`CMS_SCHEDULED_PROMOTIONS_ALLOWLIST` עם זהויות מפורשות בלבד, לדוגמה
`global:site,home:home,service:sofa-cleaning`. אסורים wildcard, כפילויות,
רווחים ויעדים לא מוכרים. בנוסף נדרשים Vercel Preview, מזהה פרויקט CleanBrothers,
הענף `feature/cms-cloud-foundation` וכתובת פרויקט Supabase CMS המדויקת. Production
נחסם ללא תנאי. בדיקות מקומיות יכולות להשתמש רק ב־CMS loopback הייעודי ובדגל
`CMS_SCHEDULED_PROMOTIONS_LOCAL_ENABLED=true`. לא הוגדרו משתני Vercel בשלב זה.

## מיקום ותזמון

- `global/site`: אחרי Navbar ולפני `<main>` בכל נתיבי `(site)`, ללא Admin.
- `home/home`: בדף הבית לפני בלוקי דף הבית. אם גם Global פעיל, שניהם מוצגים.
- `service/<stable-key>`: רק בנתיב הנחיתה של אחד משמונת מפתחות השירות הקבועים;
  לא ב־`/services` ולא בשירות אחר.

כאשר placement מאושר, `connection()` הופך את הנתיב המשתתף לתלוי־בקשה.
קריאת ה־RPC משתמשת ב־`cache: "no-store"`; React `cache` מאחד קריאות לאותו
placement בתוך בקשה אחת. בלי שער ההפעלה, נתיבי Production ממשיכים בהתנהגות
הסטטית הקיימת. אין `force-dynamic` גלובלי.

## גבול הנתונים

המיגרציה החדשה מחזקת את `cms_read_active_promotion_placement(kind,target)`.
הפונקציה ניתנת להרצה ל־`anon`/`authenticated` בלבד, אך אינה מעניקה להם SELECT
ישיר. בכל קריאה היא בודקת שורה פעילה, סטטוס לוח זמנים, חלון זמן לפי שעון DB,
זהות Promotion פעילה, התאמת מסמך ו־Revision, schema 7, payload תקין ומופעל,
ואירוע baseline/publish של אותה Revision. אם יש מדיה, היא חייבת להיות רפרנס
בלתי־משתנה של אותה Revision; מוחזרים רק מזהה גרסת מדיה, provider ו־alt.
התוצאה כוללת רק `kind`, `target`, `promotionKey`, `promotionRevisionId`,
`promotion`, `media`. אין בה מזהה לוח זמנים, תאריכים, ניסיונות, audit או actor.

קורא השרת משתמש במפתח publishable בלבד, מאמת את כל שדות התוצאה ואת חוזה
`PromotionDraft` הקיים. כשל תשתית, payload פגום או תוכן שאינו כשיר מסתיימים
באי־הצגת הבאנר ובסמן שרת קבוע שאינו מכיל פרטי שגיאה. שאר העמוד נשאר זמין.
אותו `PromotionBannerView` משמש מבצעים מקובעים ומבצעים מתוזמנים, עם פתרון CTA
הקיים עבור נתיב פנימי, טלפון ו־WhatsApp; מזהה `about-intro` נשאר רק לבלוק
המקובע הקיים.

המיגרציה מקומית בלבד בשלב זה. אין cloud migration, לוח זמנים אמיתי, שינוי job,
שינוי סביבת Vercel, commit או push.
