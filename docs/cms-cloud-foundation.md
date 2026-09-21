# Phase 1B-B1 — תשתית Supabase ייעודית ל־CleanBrothers CMS

תאריך: 2026-09-21. השלב הושלם במסלול **Free בלבד**, בהתאם להנחיה העדכנית.
נוצרו ארגון חדש ופרויקט CMS יחיד, הוחלו שתי מיגרציות החברות, נבדקה הרשאה
בענן ונוקו כל הזהויות הסינתטיות. הוגדרו משתני Vercel ב־Preview בלבד.
לא בוצעו commit, push, PR, פריסת אתר או יצירת מנהלים אמיתיים.

## A. Baseline

- בתחילת העבודה: `main`, עץ עבודה נקי.
- HEAD מאושר: `b2d3d0c7f60ae8401d8b092095dfc31c74bf6534`.
- Parent: `de4c547b6d418ef57f12d51ff68c38fd35a32afc`.
- לפני פעולות התשתית עברו: `npm test` — 77; `test:cms` — 16;
  `test:cms:db` — 22; TypeScript; lint; `npm audit` — 0 ממצאים.
- baseline של Vercel נרשם בקריאה בלבד, ללא חשיפת ערכי משתנים.

## B. Feature branch

כל העבודה על `feature/cms-cloud-foundation`, שנוצר מה־HEAD המאושר.
HEAD נשאר ללא שינוי. השינויים אינם staged ולא נוצר commit. הענף לא נדחף.

## C. Membership schema

המיגרציה ההיסטורית `20260921000000_cms_admin_members.sql` לא שונתה.
נוספה `supabase/migrations/20260921150000_cms_flexible_membership.sql`.
היא מסירה רק את `admin_slot` ואת אילוצי CHECK/UNIQUE התלויים בעמודה.

| עמודה | הגדרה סופית |
| --- | --- |
| `user_id` | UUID, מפתח ראשי, FK אל `auth.users(id)` עם `ON DELETE CASCADE` |
| `role` | text, לא NULL, ברירת מחדל ואפשרות יחידה `admin` |
| `is_active` | boolean, לא NULL, ברירת מחדל false |
| `created_at` | timestamptz, לא NULL, ברירת מחדל `now()` |
| `updated_at` | timestamptz, לא NULL, ברירת מחדל `now()`, trigger בעדכון |

אין מגבלת שני משתמשים בסכמה. בדיוק שני מנהלים אמיתיים היא מדיניות bootstrap
מבוקרת. האינדקס היחיד בטבלה הוא המפתח הראשי `cms_admin_members_pkey`.
אומתו מקומית שדרוג מסכמה ישנה עם חברות פעילה ולא פעילה וגם הקמה נקייה.
בשדרוג נשמרו UUIDs, תפקיד, מצב, timestamps, grants, policies ו־helper.
כל 26 בדיקות SQL עברו בשני המסלולים, עם שתי המיגרציות לפי הסדר.

## D. Supabase cloud project

| פריט | ערך מאומת |
| --- | --- |
| ארגון חדש | CleanBrothers CMS |
| Organization reference | `guvymdisspejtwehwcis` |
| שם הפרויקט | CleanBrothers CMS |
| Project reference | `plbwefnwussxlglscfpn` |
| מסלול | Free |
| Compute | Nano / `t3.nano`, ברירת המחדל של Free |
| אזור | East US (North Virginia), `us-east-1` |
| יצירה | `2026-09-21T16:05:57.011542Z` |
| מצב | `ACTIVE_HEALTHY` / Healthy |
| תוספים בתשלום | אין; `selected_addons` ריק |

[לוח הבקרה של הפרויקט](https://supabase.com/dashboard/project/plbwefnwussxlglscfpn).
הארגון והפרויקט נפרדים מ־CRM. המשתמש מחק בעצמו פרויקט Free קודם כדי לפנות
מכסה; העבודה הזו לא מחקה או שינתה פרויקט CRM. אישור Pro הקודם בוטל: לא נוצר
ארגון Pro, לא הוזן אמצעי תשלום ולא בוצע חיוב. לא הופעלו IPv4 ייעודי,
Custom Domain, PITR, Read Replica, paid branching או compute בתשלום.

אזור Vercel הקיים הוא `iad1`, המקביל ל־`us-east-1` לפי
[מיפוי האזורים של Vercel](https://vercel.com/docs/regions). לכן נבחר אותו אזור
למסד CMS כדי לצמצם את המרחק בין השרת למסד. אזור Vercel לא שונה.
לפי [מחירון Supabase](https://supabase.com/pricing), Free כולל מגבלות שימוש
והפרויקט עשוי להיעצר לאחר שבוע של חוסר פעילות. לפני בדיקות Preview עתידיות
יש לבדוק שהוא פעיל. Spend Cap הוא כלי של Pro ואינו מוגדר כאן; לא בוצע שדרוג.

## E. Migration deployment

ה־CLI מקושר לפרויקט החדש דרך `supabase/.cloud`, תיקייה מקומית ignored.
ה־reference המאומת נמצא ב־`supabase/.cloud/supabase/.temp/project-ref`.
תיקיית `supabase` הראשית נשארה unlinked, וה־guard של בדיקות local לא הוחלש.

לפני היישום אומתו שם/ארגון/אזור/Free, היסטוריית מיגרציות ריקה,
0 משתמשי Auth וללא טבלאות בסכמת `public`. ה־dry-run הנתמך:

```sh
./node_modules/.bin/supabase db push --workdir supabase/.cloud --linked --dry-run --skip-vault
```

הציג רק:

1. `20260921000000_cms_admin_members.sql`
2. `20260921150000_cms_flexible_membership.sql`

רשימות seeds ו־roles היו ריקות. רק לאחר סקירת התוצאה הופעל אותו `db push`
ללא `--dry-run`. שתי הגרסאות אומתו בהיסטוריה המרוחקת לאחר היישום.
לא הופעל `config push`, לא הוחלו vault secrets ולא נוספו מיגרציות אחרות.

אומתו בענן: העמודות והאילוצים לעיל, אינדקס המפתח הראשי ו־trigger העדכון הפעיל,
`is_cms_admin()` כ־SECURITY INVOKER עם search path ריק, ו־RLS enabled ו־forced.
ההרשאה היחידה לטבלת החברות עבור API roles היא SELECT ל־authenticated.
המדיניות היחידה היא `cms_admin_members_read_own_active`, עם התנאי:

```sql
user_id = (select auth.uid()) and is_active and role = 'admin'
```

אין INSERT/UPDATE/DELETE למשתמשי API. `public` מכילה רק `cms_admin_members`;
אין טבלאות CRM, לקוחות, לידים, תוכן CMS, מדיה או page builder.

לשחזור הקישור ב־checkout חדש, לאחר אימות זהות פרויקט CMS:

```sh
mkdir -p supabase/.cloud/supabase
cat > supabase/.cloud/supabase/config.toml <<'EOF'
project_id = "cleanbrothers-cms-cloud"
[db]
major_version = 17
[db.seed]
enabled = false
EOF
ln -s ../../migrations supabase/.cloud/supabase/migrations
./node_modules/.bin/supabase link --workdir supabase/.cloud --project-ref plbwefnwussxlglscfpn
```

יש להשתמש ב־login הרשמי ובקלט credential מוגן, לא להכניס סיסמה לשורת הפקודה
או לריפו. תמיד לבדוק את ה־reference ואת ה־dry-run לפני כל יישום נוסף.

## F. Cloud RLS verification

הבדיקות השתמשו ב־Auth וב־PostgREST האמיתיים של פרויקט CMS בלבד, עם
publishable key ו־JWTs של שלוש זהויות סינתטיות ב־`example.invalid`.
ליצירה ולמחיקה בלבד נעשה שימוש ב־secret key בתוך תהליך הבדיקה, לא באפליקציה.
חברויות הוכנו בחיבור ניהול ייעודי לפרויקט המאומת.

| תרחיש | תוצאה בענן |
| --- | --- |
| Public signup | נדחה על ידי Auth עם `signup_disabled` |
| Anonymous signup | נדחה |
| Email/password לשלוש הזהויות הסינתטיות | הצליח |
| Anonymous קורא חברות | נדחה, `42501` |
| Anonymous מפעיל helper | נדחה |
| משתמש רגיל קורא חברות, כולל UUID מפורש של מנהל | אפס שורות |
| משתמש רגיל מפעיל helper | false |
| משתמש רגיל מוסיף חברות לעצמו | נדחה, `42501` |
| משתמש רגיל מעדכן/מקדם או מוחק חברות | נדחה בשתי הפעולות |
| מנהל פעיל קורא חברות | רק השורה הפעילה של עצמו |
| מנהל פעיל מפעיל helper | true |
| מנהל פעיל מוסיף/מעדכן/מוחק חברות | נדחה בכל הפעולות |
| מנהל לא פעיל קורא חברות / מפעיל helper | אפס שורות / false |
| מנהל לא פעיל מוסיף/מעדכן/מוחק חברות | נדחה בכל הפעולות |
| ביטול חברות תחת JWT קיים | helper הופך ל־false מיד; השורה אינה נגישה |

עברו **28 assertions**, כולל יצירת fixtures והתחברות. כל שלוש הזהויות נמחקו
ב־finally והחברויות נמחקו ב־cascade. בדיקה נוספת לאחר מכן אישרה **0 משתמשי
Auth ו־0 חברויות CMS**. לא נוצרו מנהלים אמיתיים ולא נשלחו הזמנות או הודעות.

## G. Auth configuration

- `external_email_enabled=true`: כניסת email/password זמינה.
- `disable_signup=true`: הרשמה ציבורית כבויה.
- כל ספקי social/Web3, phone ו־anonymous כבויים; `saml_enabled=false`.
- `mailer_autoconfirm=false`; זהויות בדיקה אושרו רק בתהליך admin סינתטי.
- `password_min_length=12`; refresh-token rotation פעיל; manual linking כבוי.
- JWT נשאר בברירת המחדל בענן, 3600 שניות; ביטול חברות אינו ממתין לפקיעתו.
- Site URL: `https://cms-preview.invalid/admin/login`.
- `uri_allow_list` ריק. אין wildcards ואין דומיין Production בהפניות.

Site URL הוא placeholder מכוון בדומיין השמור `.invalid`, שאינו יעד אתר פעיל.
זרימת password הנוכחית אינה דורשת redirect של Supabase. ב־B2, לאחר קביעת
כתובת Preview אמיתית, יש להחליף אותו בכתובת HTTPS מדויקת לפני הזמנות או
recovery. לא הוגדר SMTP מותאם ולא בוצעו enrollment או MFA למשתמשים אמיתיים.

## H. Environment separation

| משתנה | Local | Vercel Preview | Vercel Production |
| --- | --- | --- | --- |
| `CMS_SUPABASE_URL` | loopback ייעודי | נוסף, sensitive | לא נוסף ולא שונה |
| `CMS_SUPABASE_PUBLISHABLE_KEY` | publishable מקומי | נוסף, sensitive | לא נוסף ולא שונה |

לא שונו שמות משתנים. ערכים אינם נכללים בדוח או בקובץ הדוגמה.
ניסיון להגביל את משתני Preview לענף נדחה כי הענף לא נדחף ל־GitHub; לא נוצרו
משתנים באותו ניסיון. ההגדרה הסופית היא **Preview בלבד, ללא gitBranch**, כפי
שאושר בתוכנית המקורית. ניתן לצמצם לענף לאחר push מאושר בעתיד.

כל ששת המשתנים הקודמים נשארו ב־Preview וב־Production ללא שינוי, כולל
טביעות SHA-256 של הרשומות המלאות:
`NEXT_PUBLIC_META_PIXEL_ID`, `CRM_WEBHOOK_SECRET`,
`NEXT_PUBLIC_BUSINESS_EMAIL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_WHATSAPP_PHONE`, `NEXT_PUBLIC_BUSINESS_PHONE`.

מכיוון שב־Preview כבר קיים CRM secret, בדיקות Preview עתידיות צריכות להישאר
בגבולות admin ולמנוע פניות lead/WhatsApp חיות. סקריפט בדיקות local ממשיך
להעביר לשרת סביבה מפורשת ומבודדת שאינה יורשת credentials של CRM או cloud.

## I. Vercel Preview

- פרויקט: `cleanbrothers`; מאגר: `YahavHelfer/cleanbrothers`.
- Production branch: `main`, ללא שינוי.
- פונקציות: `iad1`, Fluid Compute, ללא שינוי.
- Vercel Authentication: `all_except_custom_domains`; אין password protection.
- `gitForkProtection` פעיל. ההגנות לא שונו ולא נחלשו.
- יש לשמור Vercel Authentication גם ב־Preview העתידי של CMS; דומיין מותאם
  אישית אינו מכוסה בהגדרה הנוכחית באופן אוטומטי.
- בדיקת API אישרה **0 deployments מאז ה־baseline**, כולל Preview ו־Production.

## J. Security

הקוד מאפשר רק endpoint מקומי מפורש מחוץ ל־Vercel, או את פרויקט CMS המאומת
כאשר `VERCEL=1` ו־`VERCEL_ENV=preview`. הוא דוחה Production, פרויקטים אחרים,
HTTP בענן, כתובות דומות/עם query/port/path, קונפיגורציה חסרה ו־privileged/legacy keys.

Cookies נשארו `cb-cms-auth`, ‏`HttpOnly`, ‏`SameSite=Lax`, ‏`Path=/admin`, ללא
Domain מורחב. `Secure=true` ב־Preview ובכל הקשר שאינו loopback מקומי מפורש.
גם מחיקת cookie ב־logout משתמשת באותה מדיניות. בדיקה עם ספריית Supabase SSR
האמיתית ו־transport סינתטי אימתה login, refresh ו־logout עם דגלי HTTPS אלו.
בדיקות דפדפן מקומיות אימתו את מחזור החיים המלא. **לא בוצעה בדיקת דפדפן
ב־Vercel Preview חי, משום שלא נפרס אתר בשלב זה.**

`requireCmsAdmin()` נשאר גבול הרשאה עצמאי: client לכל request, קריאת `getUser()`
בשרת ובדיקת חברות פעילה לפי UUID. אין הרשאה על בסיס cookie בלבד, אין cache
חוצה בקשות, ו־Proxy אינו הגבול היחיד. לא נוסף browser Supabase client.
Runtime משתמש רק ב־publishable key; אין service-role/secret key בקוד הדפדפן
או בהגדרות האפליקציה. מפתחות ניהול שימשו רק בתהליכי bootstrap/test מבוקרים.

`/admin` נשאר no-store ו־noindex, ללא marketing/analytics. בדיקות משתמש רגיל,
מנהל לא פעיל וביטול חברות מיידי עברו. נתיב preview מאומת עתידי יהיה
`/admin/preview/...`; לא הורחב scope של cookie ולא מומש preview תוכן.

התחברות CLI נעשתה במסלול הרשמי. ה־credential נשמר על ידי ה־CLI מחוץ לריפו
בהרשאות `0600`; לא נחשף בדוח. העותק הזמני של סיסמת המסד שנוצרה בהקמה
נמחק בסיום; היא אינה חלק מתצורת האפליקציה או הריפו. סריקת הקבצים ששונו
וקובצי JavaScript לדפדפן עברה ללא credentials או דליפת תצורת CMS לדפדפן.
לא נחשפו tokens או secret/service keys.

## K. Public / Production isolation

השוואה חוזרת בקריאה בלבד אישרה שהגדרות הפרויקט, ענף Production, אזור,
הגנת Preview, הדומיינים, יעד Production וכל רשומות הסביבה הקודמות לא השתנו.
השינוי היחיד ב־Vercel הוא שני משתני CMS החדשים ב־Preview.

- Production deployment: `dpl_2xQfcYuQXfHF1TJnwhAY1ocZFuuP`.
- Git SHA הפרוס: `62399c185e86d2eabd4c49e61ee2433784258cac`.
- דומיינים ללא שינוי: `cleanbrothers.co.il`, `www.cleanbrothers.co.il`,
  `cleanbrothers.vercel.app`.

לא ניגשנו לנתוני CRM, למסד CRM או ל־CRM Auth ולא שינינו אותם. לא נשלחו
פניות lead/WhatsApp חיות. קוד האתר הציבורי, התוכן, webhooks, attribution
ו־Google Ads/GA4/Meta לא השתנו. לא שונו Vercel Production או DNS.

## L. Files

נוספו:

- `supabase/migrations/20260921150000_cms_flexible_membership.sql`
- `docs/cms-cloud-foundation.md`

שונו:

- `.env.example` — הערות בלבד; ערכי CMS נשארו ריקים.
- `.gitignore` — החרגת תיקיית CLI העננית המקומית.
- `README.md`
- `docs/cms-auth-local.md`
- `src/cms/config.ts` — allowlist מפורש ל־Preview ו־Secure cookies.
- `supabase/tests/database/cms_admin_members.test.sql`
- `tests/cms-authorization.test.mjs`
- `tests/e2e/admin-auth.spec.ts`
- `tests/helpers/source-module.mjs` — הזרקת transport בדיקות ללא רשת כברירת מחדל.

לא נמחקו או הועברו קבצים. אין שינוי ב־package.json/lock, במיגרציה המקורית,
בקוד הרשאות השרת או בקוד הציבור. `supabase/.cloud` הוא state מקומי ignored,
ואינו חלק מהשינויים לסקירה. לא בוצע staging; artifacts ו־credentials לא נוספו לריפו.

## M. Validation

| בדיקה | תוצאה |
| --- | --- |
| `npm ci` | עבר; 376 packages; lockfile ללא שינוי |
| `npm test` | 81 עברו |
| `npm run test:cms` | 20 עברו |
| `npm run test:cms:db` | 26 עברו |
| `npm run test:e2e` | 10 עברו, local מבודד בלבד |
| `tsc --noEmit --incremental false` | עבר |
| `npm run lint` | עבר ללא אזהרות |
| `npm run build` | עבר, Next.js 16.3.5 |
| `npm audit` | 0 ממצאים |
| `npm ls --all` | עבר |
| `git diff --check` | עבר |
| שדרוג מקומי והקמת DB נקי | עברו, שתי המיגרציות לפי הסדר |
| Cloud Auth / RLS | 28 assertions עברו |
| בדיקת בידוד Vercel | עבר; 0 deployments; Production ללא שינוי |

אזהרות npm install-scripts ו־NO_COLOR/FORCE_COLOR הן לא חוסמות. אזהרת lint
בודדת בקוד הבדיקה החדש תוקנה, ו־lint והבדיקות הרלוונטיות הורצו שוב בהצלחה.
לא שונו גרסאות Next.js, React, React DOM או תלויות אחרות.

אחרי בדיקות local אומתו 0 משתמשים ו־0 חברויות והופעל `npm run cms:stop`.
אין שירותי CMS מקומיים פעילים. סביבת Supabase מקומית אחרת שהייתה קיימת
לפני המשימה נשארה ללא שינוי. בענן אומתו בנפרד 0 משתמשים ו־0 חברויות;
פרויקט CMS הענני נשאר פעיל כמתוכנן.

## N. Phase 1B-B2 proposal

לאחר ביקורת ואישור נפרד:

1. לאמת את פרויקט CMS ואת שתי הזהויות המיועדות. ליצור בדיוק שני משתמשי Auth
   אמיתיים בתהליך מבוקר ללא signup ציבורי. לקבוע flow בטוח למסירת גישה ו־recovery.
2. לבצע bootstrap בחיבור בעלים מחוץ לאפליקציה: transaction עם advisory lock
   משותף, לוודא שטבלת החברות ריקה, להוסיף את שני ה־UUIDs אטומית ולאמת בדיוק
   שני מנהלים פעילים לפני commit. לעצור אם קיימת חברות בלתי צפויה. אין API בדפדפן.
3. לממש enrollment/challenge/verification ל־TOTP ולדרוש `aal2` גם בגבול הרשאת
   השרת וגם ב־RLS/helper. לאפשר רק flow מוגבל להרשמת MFA לפני קבלת הרשאת CMS.
4. רק לאחר אישור push/Preview, לפרוס מהענף עם Vercel Authentication; להחליף
   את Site URL בכתובת HTTPS מדויקת, ללא wildcard, ולצמצם משתנים לענף אם רצוי.
5. לבדוק ב־Preview חי: login, TOTP, דחיית `aal1`, HTTPS cookies, refresh/logout,
   no-store/noindex, היעדר tracking, וביטול חברות תחת session קיים. לא להפעיל CRM.
6. rollback: לבטל חברות/sessions, להסיר רק משתני CMS של Preview ולסגת מפריסת
   Preview. אין לשנות Production או CRM ואין למחוק משתמשים אמיתיים או תשתית
   אוטומטית. שחזור סכמה דורש סקירה; אין להחזיר מגבלת slots כברירת מחדל.

שום חלק מ־Phase 1B-B2 לא בוצע. אין CMS content tables או ממשקי ניהול תוכן.
