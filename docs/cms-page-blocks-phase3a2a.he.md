# Phase 3A2-A — הכנת עמוד אודות ל־Preview מוגן (מקומי בלבד)

Phase 3A1 נשארת מיגרציה היסטורית ללא שינוי. התיקון הזה אינו מפעיל מקור CMS באתר, אינו משנה Vercel ואינו מוחל בענן.

## גבולות ההרשאה

- `src/cms/pages/environment.ts`: מסכי הניהול וה־Preview המדויק זמינים בסביבת CMS המקומית או ב־Vercel Preview רק כשמזהה פרויקט Vercel, הענף וכתובת פרויקט Supabase CMS תואמים לערכים המאושרים. Production וענף/פרויקט אחרים חסומים. זוהי בדיקת סביבה בלבד; `requireCmsAdmin()` ב־repository וב־Preview עדיין דורש משתמש פעיל, onboarding שהושלם ו־AAL2.
- המקור הציבורי דורש בנפרד `CMS_PAGE_SOURCE=published` ו־`CMS_PAGE_ALLOWLIST=about`. אלה דגלים ייעודיים לעמודים; דגלי השירותים ו־`CMS_CONTENT_ENABLED` אינם מפעילים אותם. ערכי allowlist נוספים, כפולים או wildcard נכשלים סגור. ללא שני הדגלים `/about` נשאר סטטי.
- `src/cms/pages/public-source.ts`: לקוח Supabase עם publishable key בלבד, ללא session, ללא privileged key ועם `fetch` מסוג `no-store`. הקריאה מוגבלת ל־`cms_read_public_page('about')`. React `cache()` משתף את אותו snapshot בין HTML ל־metadata בתוך בקשה אחת.

## קורא מסד הנתונים

`20260925120000_cms_public_page_reader.sql` מוסיפה פונקציה נפרדת מ־`cms_read_published_page()` של המנהלים. הפונקציה היא `SECURITY DEFINER` עם `search_path` קבוע, owner מפורש, הרשאת EXECUTE ל־`anon` ול־`authenticated` בלבד, וללא הרשאת SELECT חדשה לטבלאות. היא מקבלת מפתח ציבורי יציב בלבד (`about`), מאתרת את מצביע הפרסום ואת revision המתאים, ומחזירה רק בלוקים גלויים בסדרם. אין בה פרמטר revision ואין בה draft pointer, היסטוריה, זהות עורך או audit.

מבצע נחשף רק אם בלוק גלוי בעמוד המפורסם מפנה לגרסה המדויקת שלו והגרסה פורסמה בעבר. מדיה נחשפת רק מהפניות של בלוקים גלויים או של אותן גרסאות מבצע מוצמדות. ה־RPC מחזיר `null` אם הפניה למבצע אינה תקינה; שכבת השרת נכשלת סגור. מסלולי הניהול וה־Preview ממשיכים להשתמש בקריאות AAL2 הנפרדות.

## רינדור ו־cache

`/about` שומר את רכיבי ה־static המקוריים כברירת מחדל. כאשר שני השערים עוברים, הוא מרנדר `PageBlocksView` מן ה־snapshot המפורסם בלבד, ואותה קריאה משמשת גם את `generateMetadata`; canonical נשאר `/about`. בלוקים hidden אינם חלק מהתצוגה הציבורית, בעוד ה־Preview המאומת ממשיך לקרוא revision בלתי־משתנה מדויק.

ב־Preview המאושר בלבד `connection()` מונע prerender של `/about` גם כשהעמוד עדיין מחוץ ל־allowlist, כדי ש־alias ישן לא יקבע תוצאה סטטית אחרי הפעלה. ב־Production הנתיב נשאר סטטי. במצב CMS הקריאה ל־Supabase היא `no-store`; בקשה טרייה אמורה לראות מצביע פרסום מעודכן. אין השבתת cache גלובלית ואין revalidation נדרשת למסלול זה; Phase 3A2 החי עדיין צריך לאמת את כותרות ה־HTTP וה־alias בפועל.

## מה נשאר ל־Phase 3A2

לאחר סקירה ו־commit נפרד: push לענף המאושר, Preview מוגן, dry-run ואישור שתי המיגרציות הצפויות לפני החלה, bootstrap של `/about`, בדיקות RLS ו־AAL2 בענן, שקילות baseline, ומחזור Draft → Preview → Publish → Rollback. אין לבצע את הצעדים האלה במסגרת Phase 3A2-A.
