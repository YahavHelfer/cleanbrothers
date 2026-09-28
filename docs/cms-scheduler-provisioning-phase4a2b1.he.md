# Phase 4A2-B1 — חבילת הקצאה למתזמן

החבילה מקומית בלבד. אין להחיל את המיגרציה בענן, להריץ את כלי ההקצאה בענן או לחבר מיקומים פעילים לרינדור הציבורי לפני אישור נפרד. פרויקט היעד היחיד הוא `plbwefnwussxlglscfpn`.

## חלוקת אחריות

`20260928150000_cms_scheduler_role.sql` מגדירה רק את `cms_scheduler`: ‏`LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`, ‏`USAGE` על `public` ו־`EXECUTE` על `public.cms_process_due_promotion_schedules(integer)`. אין לה חברות בתפקיד אחר, הרשאה לליבת הזמן המפורש או הרשאות ישירות לטבלאות. היא אינה יוצרת cron job; לכן הרצת migrations בבדיקות אינה מפעילה מתזמן ברקע.

`pg_cron` 1.6.4 כבר מותקן בפרויקט המתארח. בסטאק Supabase המקומי המבודד אומתה זמינות ההרחבה, ו־`CREATE EXTENSION IF NOT EXISTS pg_cron` עבר בתוך טרנזקציית בדיקה שבוטלה. לכן המיגרציה מצהירה על ההרחבה כתנאי תשתית לשחזור. כלי ההקצאה מאמת אותה שוב ונכשל אם היא חסרה. בשום מצב המיגרציה אינה יוצרת עבודה אוטומטית; זמינות ההרחבה לבדה אינה מריצה מתזמן.

## הקצאה מבוקרת

הכלי `scripts/cms-scheduler-provision.mjs` מקבל רק URL דרך משתנה תהליך זמני `CMS_SCHEDULER_DATABASE_URL`, ואינו מדפיס אותו. הוא מקבל רק חיבור ישיר ל־`db.plbwefnwussxlglscfpn.supabase.co` עם המשתמש `postgres`, או חיבור Supabase pooler עם המשתמש `postgres.plbwefnwussxlglscfpn`; מסד הנתונים חייב להיות `postgres`. גם ארגומנט הפרויקט חייב להיות ה־ref המדויק. אין לשמור את ה־URL ב־Vercel, בריפו או בלוגים.

לאחר מיגרציה מאושרת, פקודות המפעיל יהיו:

```text
node scripts/cms-scheduler-provision.mjs status plbwefnwussxlglscfpn
node scripts/cms-scheduler-provision.mjs provision plbwefnwussxlglscfpn --confirm
node scripts/cms-scheduler-provision.mjs disable plbwefnwussxlglscfpn --confirm
node scripts/cms-scheduler-provision.mjs deprovision plbwefnwussxlglscfpn --confirm
```

שם העבודה הקבוע הוא `cms-promotion-scheduler`, התדירות `* * * * *`, והפקודה היחידה היא `select public.cms_process_due_promotion_schedules(100);`. אין HTTP, URL, סוד, `service_role` או timestamp חיצוני. הפעלה/תפוגה צפויות בדרך כלל בתוך מחזור מתזמן אחד; הנכונות נובעת מזמן מסד הנתונים ומהתכנסות המנוע, ולא מהבטחה להרצה בשנייה המדויקת.

הכלי בודק לפני הקצאה את מאפייני התפקיד, חברות, הרשאות טבלאות, פונקציות נגישות, ההרחבה ועבודות קיימות. עבודה תקינה קיימת גורמת ל־no-op. אי־התאמה בפקודה, תדירות, זהות, מצב או הרשאות גורמת לעצירה; אין תיקון שקט. לעדכון חריג נדרשת סקירה ייעודית. מצב `status` לקריאה בלבד מציג רק metadata לא רגיש וטביעת SHA-256 של הפקודה.

להקצאה, המפעיל מעניק זמנית `USAGE ON SCHEMA cron` ואת היכולת `SET ROLE cms_scheduler` *למפעיל כלפי התפקיד הצר*. העבודה נוצרת תחת `SET ROLE cms_scheduler`, ולכן `cron.job.username` חייב להיות `cms_scheduler`. באותה טרנזקציה הכלי מסיר `USAGE` ואת מענק ה־`SET ROLE` הזמני לפני commit. אם הבעלות אינה מדויקת, אימות הסיום נכשל; אין fallback ל־`postgres` או `service_role`. התפקיד נשאר עם הרשאת מעטפת בלבד. B0 הוכיח שעבודה קיימת ממשיכה לרוץ אחרי ביטול הרשאת ניהול cron.

## השבתה והסרה

`disable` מבטל רק את העבודה, באופן חוזר ובטוח. לשם ביטול עבודה בבעלות התפקיד הצר, הוא מעניק זמנית הרשאת cron ומעבר תפקיד בתוך טרנזקציה אחת, מבטל את העבודה כבעליה ומסיר את שתי ההרשאות לפני commit. הוא אינו מוחק לוחות זמנים, ניסיונות, audit או revisions, ואינו משנה מיקום פעיל. אם מבצע כבר פעיל, מפעיל מורשה צריך להחליט בנפרד אם לבטלו; השבתת האוטומציה לבדה אינה שקולה לביטול המבצע.

`deprovision` משבית תחילה, מוודא שאין עבודה, מבטל `EXECUTE` ו־`USAGE` של התפקיד ומוחק אותו. אם יש session פעיל או תלות אחרת, פעולת המחיקה נכשלת ונדרשת סקירה; אין מחיקה של נתוני תוכן/תזמון או של `pg_cron`. לפני הפעלה עתידית יש לבדוק אם נותרו עבודות אחרות, הרשאות חריגות או sessions. אין להשתמש בהסרה המלאה כתגובת חירום רגילה; `disable` הוא שער העצירה הראשון.

## ניטור והתאוששות

מפעיל DB מורשה בודק בנפרד שתי שכבות. לתשתית: `cron.job` עבור שם העבודה, `username`, `active`, `schedule`, `command`, ו־`cron.job_run_details` עבור status, `start_time`, `end_time` והרצות שהוחמצו. לאפליקציה: `cms_promotion_schedules` עבור due/overdue ו־`retryable`, ‏`cms_promotion_schedule_attempts` ו־`cms_promotion_schedule_audit` עבור כישלונות וניסיונות, ו־`cms_active_promotion_placements` עבור מיקום פעיל אחרי `ends_at`. הרצת cron מוצלחת אינה מוכיחה שכל schedule הצליח. גישת ניטור זו שייכת למפעיל DB, לא לדפדפן או לתפקיד המתזמן.

דקה שהוחמצה, כמה דקות שהוחמצו או אתחול DB: בודקים בריאות job והרצה הבאה; המנוע מתכנס לפי זמן DB ואין להוסיף job משלים. כשל transient/retryable: בודקים `retry_after` וניסיונות לפני התערבות. כשל terminal: בודקים audit ופועלים ידנית לפי מדיניות, בלי ליצור retry עיוור. מיקום פעיל מיושן: משווים `ends_at` ו־attempts; אם האוטומציה מושבתת, מבצעים החלטת ביטול נפרדת. עבודה חסרה/מושבתת או תפקיד חסר: מפעילים `status`, מאמתים drift ופרויקט, ומקצים מחדש רק לפי שער שינוי מאושר. אין מתזמן שני ואין catch-up job.

## גבולות שחרור

אין בחבילה שימוש ב־`cms_read_active_promotion_placement` מרכיבי האתר, שינוי Homepage/Service/Global UI, סודות, משתני Vercel או שינוי CRM/Production. פריסה ציבורית נשארת שער נפרד.
