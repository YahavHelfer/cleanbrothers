# Phase 1B-B2B1 — תשתית MFA/AAL2 מקומית

היישום מיועד לסקירה מקומית. אין לפרוס את הקוד או להחיל את המיגרציה בענן
לפני אישור B2B2. לא נוצרו זהויות אמיתיות ולא נשלחו הזמנות.

## A. נקודת מוצא ובידוד

- ענף: `feature/cms-cloud-foundation`.
- HEAD: `a767d9f1551dd4c34d3715adb76d52cc78424618`; עץ העבודה היה נקי בתחילת השלב.
- Production נשאר על `main`. ה־Preview המוגן הקיים הוא פריסת B2A באותו SHA.
- פרויקט CMS: `plbwefnwussxlglscfpn`, ארגון CleanBrothers CMS, ‏Free/Nano,
  ‏`us-east-1`. בתחילת השלב: Healthy, ‏0 משתמשי Auth ו־0 memberships.
- baseline: ‏81 בדיקות כלליות, 20 CMS, ‏26 SQL ו־10 E2E עברו. גם TypeScript,
  lint, build, npm ls, diff-check עברו; audit ללא ממצאים.
- אין שינוי באתר הציבורי, ב־CRM, ב־Production או בהגדרות Vercel/Supabase בענן.
  כל המשתמשים הסינתטיים נוצרו ב־`cleanbrothers-cms-local` בלבד.

## B–C. ארכיטקטורה ומכונת מצבים

כל פעולה משתמשת ב־Supabase SSR client חדש לבקשה, עם publishable key ו־JWT
של המשתמש. אין client בדפדפן, service key באפליקציה או מטמון הרשאות משותף.
`getUser()` בודק זהות מול Auth. ‏`getClaims()` מאמת חתימה ותוקף; נדרש אותו
`sub`, תפקיד `authenticated` ו־AAL מוכר. גורמי TOTP נקראים מתוצאת Auth
המאומתת, לא משדה user שנשמר ב־cookie.

| מצב | יעד/תוצאה |
| --- | --- |
| ללא זהות מאומתת | `/admin/login` |
| זהות ללא חברות פעילה בתפקיד admin | חסימה, גם ב־AAL2 |
| הזמנה מאומתת והגדרת סיסמה ראשונה טרם הושלמה | `/admin/onboarding/password` |
| חברות פעילה, AAL1, ללא גורם TOTP | `/admin/mfa/setup` |
| גורם TOTP מאומת, session ב־AAL1 | `/admin/mfa/challenge` |
| enrollment ממתין שאינו מאומת | `/admin/mfa/challenge` להשלמת האימות לאחר רענון |
| חברות פעילה, סיסמת הזמנה הושלמה, TOTP מאומת ו־AAL2 | `/admin` |

הצגת QR נעשית רק לאחר לחיצה, באמצעות `mfa.enroll`. האימות משתמש ב־
`challengeAndVerify`; ה־factor ID חייב להשתייך למשתמש בבדיקת Auth חדשה.
כאשר קיים גורם מאומת, גורם ממתין נוסף אינו יכול לשמש לעקיפתו. אחרי הצלחה
נבדקות שוב הזהות, החברות, ה־claims וקריאת RLS לפני הפניה ללוח הבקרה.
`currentLevel` נגזר מ־JWT מאומת; `nextLevel` נגזר גם מהגורמים המאומתים.
אין הסתמכות על תוצאת UI או פענוח JWT ללא בדיקת חתימה.

## D. מיגרציה ו־RLS

נוספה רק המיגרציה החדשה `20260922000000_cms_mfa_aal2.sql`; שתי המיגרציות
ההיסטוריות נשארו ללא שינוי. אין טבלת תוכן חדשה.

- `is_cms_member_for_onboarding()` — boolean של חברות admin פעילה לפי
  `auth.uid()` בלבד. אין פרמטר UUID ואין החזרת רשומות.
- `cms_invite_password_pending()` — boolean של משתמש שהוזמן וטרם השלים
  את הגדרת הסיסמה. אינו חושף hash, סיסמה, token או רשומת Auth.
- `password_setup_completed_at` — עמודת timestamp nullable בטבלת החברות;
  זו מטא־דאטה של תהליך ההצטרפות בלבד. משתמש שנוצר מראש עם סיסמה ולא הוזמן
  אינו נדרש לחותמת הזמנה. הזמנות חדשות נדרשות להשלים אותה כברירת מחדל.
- `complete_cms_initial_password_setup()` — פעולה מצומצמת שמסמנת רק את
  חותמת המשתמש הנוכחי, רק כשהוא חבר פעיל ורק עם claim חתום `amr=password`.
  OTP, ‏AAL2 לבדו, metadata או טופס אינם הוכחה לסיסמה שנקבעה. הפעולה אינה
  יכולה ליצור חברות או לשנות UUID, תפקיד או `is_active`.
- שלוש פונקציות ההצטרפות הן SECURITY DEFINER בבעלות postgres, עם
  `search_path=''`, ללא פרמטרים, ו־EXECUTE ל־authenticated בלבד. זה נדרש כדי
  לבדוק זכאות ב־AAL1 בלי לחשוף את טבלת החברות. אין הרשאת קריאה ל־`auth.users`
  למשתמשי האפליקציה ואין שינוי בסכמת Auth.
- `is_cms_admin_aal2()` — SECURITY INVOKER; דורש UUID, חברות פעילה, JWT עם
  `aal2` והשלמת הסיסמה למוזמנים. גם `is_cms_admin()` הוותיק מפנה אליו.
- מדיניות SELECT מאפשרת רק את הרשומה הפעילה של המשתמש וב־AAL2. RLS נשאר
  enabled ו־forced. אין grants או policies ל־INSERT/UPDATE/DELETE של memberships.
  עדכון חותמת ההצטרפות דרך הפונקציה המוגבלת הוא החריג היחיד לכתיבה מבוקרת.
- **כל RLS עתידי לתוכן חייב להשתמש ב־`is_cms_admin_aal2()`**. פונקציות
  ההצטרפות אינן הרשאות תוכן. אין מדיניות תוכן בשלב זה.

Supabase יוצר סיסמה אקראית פנימית בעת אישור הזמנה. לכן hash שאינו ריק אינו
מוכיח שהמשתמש קבע סיסמה. גם token-hash SSR מחזיר כאן `amr=otp`. בחירת
חותמת ההשלמה והתחברות בסיסמה לאחר קביעתה אומתו מול Auth המקומי בפועל.
ראו [מימוש אימות ההזמנה של Supabase](https://github.com/supabase/auth/blob/master/internal/api/verify.go)
ו־[הגדרת claims](https://supabase.com/docs/guides/auth/jwt-fields).

## E–F. גבולות ההרשאה בשרת

`requireCmsAdmin()` הוא הגבול העצמאי של כל קריאה/כתיבה עתידית. הוא דורש
זהות מאומתת, חברות admin פעילה, השלמת הזמנה, TOTP מאומת ו־AAL2, ואז קורא
מחדש את רשומת החברות תחת RLS. אין לו מצב שמחזיר מנהל ב־AAL1. כל קריאה
בודקת מחדש; ביטול חברות אינו ממתין לפקיעת JWT.

`requireCmsMemberForOnboarding()` מחזיר רק הקשר לצורך מסכי ההצטרפות.
המסכים מפנים לפי המצב המדויק; כל Server Action מאמת מחדש את ההקשר ואת
הפעולה המותרת. לוח הבקרה וה־data boundary אינם מקבלים הקשר זה כהרשאה.
Proxy מרענן sessions ומסמן headers, אך אינו גבול ההרשאה היחיד.

## G–H. הזמנה, סיסמה וכתובות Preview

כתובת ה־Site URL הקיימת נשארת:

`https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app/`

הרשומה היחידה הנדרשת ב־Supabase Redirect URLs, להכנה ב־B2B2:

`https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app/admin/auth/confirm`

זה גם הערך המדויק של `redirectTo` בעת הזמנה עתידית. אין צורך להוסיף את
נתיבי password/setup/challenge: ההפניות אליהם פנימיות וקבועות. אין wildcard,
כתובת Production, דומיין מותאם או כתובת deployment מתחלפת.

יש להכין ב־B2B2 את תבנית **Invite user** עם קישור HTTPS מדויק, ללא analytics:

```html
<a href="https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app/admin/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite">השלמת ההצטרפות לניהול האתר</a>
```

אין להשתמש ב־`ConfirmationURL` שמחזיר session tokens ב־URL fragment.
`GET /admin/auth/confirm` מאשר רק `type=invite`, token_hash יחיד בפורמט מוגבל
וה־origin הקבוע. פרמטרי next/redirect_to, כפילויות, recovery/signup וכתובות
זרות נדחים לפני צריכת ההזמנה. האימות נעשה בשרת דרך `verifyOtp`, ונוצרות
cookies של SSR. לאחר מכן נבדקת החברות וזכאות ההזמנה; יעד ההפניה מוחק את
ה־token מהכתובת. הזמנה שגויה/פגה/ממוחזרת מחזירה הודעה כללית בעברית.

קישור ההזמנה הוא credential חד־פעמי: אין לשתף אותו, להעתיק ללוגים או לכלי
analytics. אין להפעיל link tracking במייל. סורק קישורי דואר שצורך את ה־GET
עלול לנצל את ההזמנה לפני המשתמש; אין מסלול ציבורי לשליחה מחדש. יש לטפל בכך
בתהליך המפעיל המאומת ולבדוק את ספק המייל לפני הזמנות אמיתיות.

הסיסמה חייבת להכיל 12–128 תווים, אות גדולה וקטנה באנגלית, ספרה וסימן מיוחד,
עם התאמה לשדה האישור. היא עוברת רק ל־Supabase Auth ואינה נשמרת באפליקציה.
אחרי `updateUser` מסתיים session ההזמנה ונוצרת התחברות בסיסמה החדשה;
רק JWT חתום של התחברות זו מאפשר את חותמת ההשלמה. לאחר מכן חייבים MFA.
התחברות רגילה גם משלימה חותמת חסרה במקרה של ניתוק אחרי שמירת הסיסמה.
אין סיסמה משותפת, ברירת מחדל או מסירת סיסמה על ידי מפעיל.

ב־local ה־origin היחיד הוא `http://127.0.0.1:56300`, ורק עם פרויקט CMS המקומי
מחוץ ל־Vercel. הוא אינו נוסף לרשימת redirects בענן. אין שינוי במשתני הסביבה:
שני משתני CMS נשארים Preview בלבד, מוגבלים לענף המאושר.

## I. טיפול בסודות, cookies ו־UX

- QR הוא data-image שמגיע מ־Supabase למשתמש המבצע enrollment בלבד. אין
  שירות QR חיצוני, image optimizer, ‏HTML גולמי, localStorage או שמירה במסד
  האפליקציה. ה־secret וה־`otpauth://` הגולמיים אינם מוחזרים בנפרד.
- ה־QR עצמו מכיל סוד ולכן מוצג רק במסך ההקמה; אינו נשמר בלוגים או ב־analytics.
  ה־UI מחזיק אותו בזיכרון העמוד. רענון אינו חושף אותו מחדש ואינו יוצר גורם נוסף.
- OTP, סיסמה, token_hash ותוכן QR אינם נרשמים בלוגי האפליקציה או בהודעות שגיאה.
  בעת rollout יש לשמר redaction של query/body רגישים גם בכלי תצפית חיצוניים.
- Cookies: ‏`cb-cms-auth`, ‏HttpOnly, ‏SameSite=Lax, ‏Path=/admin, ללא Domain.
  ב־HTTPS Preview גם Secure; חריג HTTP קיים רק ב־loopback המאושר.
- כל נתיבי admin: ‏private/no-store, ‏noindex/nofollow, ‏Referrer-Policy=no-referrer.
  המסכים בעברית RTL, מותאמים לנייד, עם שגיאות כלליות ויציאה מהחשבון.
- אין ניווט שיווקי, Google/Meta/consent/attribution, browser Supabase client,
  מפתח ניהול, service_role או secret key בקוד הדפדפן.
- Server Actions שומרים על בדיקות Origin/Host של Next; לא נוספו allowedOrigins.
  תצורת CMS דוחה Production ופרויקט Supabase שאינו ה־CMS המאומת.

## J. התאוששות מבוקרת ומגבלות

אין signup ציבורי, forgot-password פתוח, endpoint להסרת גורם או recovery codes
באפליקציה. גם AAL1 של מנהל פעיל אינו מורשה להסיר גורם TOTP מאומת דרך Auth.
הסודות של Auth וה־TOTP נשארים בניהול Supabase, לא במסד האפליקציה.

אם אבד המאמת, או שהעמוד נסגר לפני סריקת QR של גורם ממתין:

1. מפעיל מורשה מאמת את זהות המנהל בערוץ עצמאי ומוכר; session של AAL1 או
   ידיעת כתובת המייל אינם מספיקים. מתעדים רק החלטה, UUID וזמן, ללא סודות.
2. מאמתים ref של CMS; משביתים את החברות ומבטלים sessions של המשתמש דרך
   כלי ניהול מחוץ לאפליקציה. אין להפעיל משתמש מחדש כל עוד JWT ישן ב־AAL2
   עשוי להיות תקף: יש להמתין לפחות ל־TTL המאומת ולמרווח שעון, או לבצע הליך
   ביטול שקילות מוכח. TTL הענן הקיים הוא 3600 שניות, ויש לאמתו בעת הפעולה.
3. אחרי אישור זהות מפורש, מפעיל עם הרשאה מתאימה מסיר רק את הגורם של אותו
   UUID. אין גישה ל־CRM, אין bypass של RLS ואין הפיכת AAL1 להרשאת מנהל.
4. מטפלים באובדן סיסמה/הזמנה בתהליך תפעולי נפרד ומאושר; לא משנים ידנית
   את חותמת הסיסמה כדי לדלג על אימות. התחברות חוזרת דורשת סיסמה אישית,
   הפעלת החברות מחדש במועד הבטוח, enrollment חדש ו־AAL2 לפני CMS.
5. אם אין מפעיל מהימן זמין, החשבון נשאר חסום. אין חשבון חירום משותף או קוד
   עוקף. ביטול refresh tokens לבדו אינו הבטחה לביטול כל JWT שכבר הונפק.

## K. בדיקות ו־validation

הבדיקות משתמשות רק ב־Supabase המקומי המבודד. pgTAP פועל בטרנזקציה עם rollback.
Playwright יוצר fixtures נפרדים לכל בדיקה ומוחק אותם ב־afterEach עם cascade,
כולל זהויות הזמנה. `generateLink` המקומי אינו שולח מייל. המפתחות המורשים
נמצאים רק בזיכרון תהליך ה־test runner ואינם עוברים לשרת Next או לדפדפן.
כל בקשת דפדפן ל־origin חיצוני נחסמת. אין screenshots, traces או video.

הכיסוי כולל: AAL1 מול AAL2 בשרת וב־SQL; קריאה ישירה ללא Proxy/layout;
גורם חסר/ממתין/מאומת; TOTP אמיתי; קוד שגוי; התחברות חוזרת; מניעת הסרת גורם
ב־AAL1; ביטול חברות תחת AAL2; nonmember/inactive; refresh/logout; אימות
הזמנה ומיחזורה; redirects זרים; סיסמה חלשה; מניעת הגדרת סיסמה רגילה דרך
onboarding; שמירת cookies ציבוריים והיעדר tracking בכל מסכי ההרשאה.

| בדיקה סופית | תוצאה |
| --- | --- |
| `npm test` | 102 עברו; כולל בדיקות CMS |
| `npm run test:cms` | 41 עברו |
| `npm run test:cms:db` | 73 עברו בשני קובצי pgTAP |
| `npm run test:e2e` | 19 עברו, כולל הזמנה → סיסמה → TOTP → AAL2 |
| `tsc --noEmit --incremental false` | עבר |
| `npm run lint` | עבר, ללא אזהרות lint |
| `npm run build` | עבר, Next.js 16.3.5 |
| `npm audit` | 0 ממצאים |
| `npm ls --all` | עבר |
| `git diff --check` | עבר |
| התקנה מקומית נקייה של המיגרציות | שלוש המיגרציות הוחלו לפי הסדר והבדיקות עברו |
| סריקת credentials והפרדת bundle הדפדפן | עברה; אין סודות או תצורת CMS ב־browser bundles |

בסיום: 0 משתמשי Auth, ‏0 memberships ו־0 גורמי MFA מקומיים. סביבת CMS כובתה,
והפורטים 56300/56321/56322/56324 סגורים. שש המכולות של הסביבה המקומית
האחרת נשמרו בדיוק כפי שהיו. לוגי startup זמניים שעשויים לכלול מפתחות נמחקו.

בדיקת סיום נפרדת בקריאה בלבד אישרה: CMS בענן Healthy, ‏Free/Nano, ‏0 משתמשים
ו־0 memberships; רק שתי המיגרציות הקודמות קיימות בענן. Site URL וה־redirects
בענן לא השתנו, אין תוספים בתשלום, ושני משתני CMS עדיין Preview בלבד לענף.
ה־Preview הקיים, יעד Production, רשומות הסביבה הקודמות, הדומיינים ותוכן HTML
הציבורי נשארו ללא שינוי. לא בוצעה גישה לנתוני CRM.

HEAD נשאר כפי שהיה. 28 קבצים ממתינים לסקירה, ללא staging או commit.

## L. רשימת קבצים מדויקת

נוספו 14 קבצים:

```text
docs/cms-mfa-foundation.md
src/app/(admin)/admin/AuthPanel.tsx
src/app/(admin)/admin/auth/confirm/route.ts
src/app/(admin)/admin/mfa/VerifyForm.tsx
src/app/(admin)/admin/mfa/challenge/page.tsx
src/app/(admin)/admin/mfa/setup/SetupForm.tsx
src/app/(admin)/admin/mfa/setup/page.tsx
src/app/(admin)/admin/onboarding-actions.ts
src/app/(admin)/admin/onboarding/password/PasswordForm.tsx
src/app/(admin)/admin/onboarding/password/page.tsx
src/cms/invitation.ts
src/cms/onboarding.ts
supabase/migrations/20260922000000_cms_mfa_aal2.sql
supabase/tests/database/cms_mfa_aal2.test.sql
```

שונו 14 קבצים:

```text
README.md
docs/cms-auth-local.md
src/app/(admin)/admin/actions.ts
src/app/(admin)/admin/login/page.tsx
src/app/(admin)/layout.tsx
src/cms/authorization.ts
src/cms/config.ts
src/cms/dashboard.ts
src/proxy.ts
supabase/config.toml
supabase/tests/database/cms_admin_members.test.sql
tests/application-boundaries.test.mjs
tests/cms-authorization.test.mjs
tests/e2e/admin-auth.spec.ts
```

לא נמחקו או הועברו קבצים. package.json/lock, שתי המיגרציות ההיסטוריות וקוד
האתר הציבורי לא שונו. אין env, credentials, CLI cloud state או artifacts בשינויים.

## M–N. גבולות השינוי ומוכנות ל־B2B2

השינויים הם בגבולות CMS, מסכי האימות, המיגרציה החדשה, בדיקות ותיעוד בלבד.
אין תלות חדשה, שדרוג framework, שינוי lockfile, קוד ציבורי או תוכן CMS.
המיגרציה החדשה לא הוחלה בענן, והקוד החדש אינו נמצא ב־Preview הקיים.

לאחר סקירה ואישור נפרד, סדר B2B2 הנדרש הוא:

1. לאמת שוב Free/Nano, ‏ref, ‏0 משתמשים/חברויות, הגנת Preview ומשתני CMS
   לענף בלבד. לאמת שלשתי הזהויות יהיה נתיב כניסה דרך Vercel Authentication;
   אין להסיר את ההגנה כדי לשלוח הזמנות.
2. לסקור ולהחיל רק את מיגרציית AAL2 החדשה בענן, לאחר dry-run; לאמת RLS,
   grants ופונקציות. לפרוס את הקוד המאושר ל־Preview בלבד ולבדוק fail-closed.
3. להפעיל/לאמת TOTP enroll+verify ב־CMS בלבד; להכין את redirect היחיד ואת
   תבנית Invite user שלעיל. להשאיר signup/sms/social כבויים ולהחיל דרישות
   הסיסמה גם ב־Auth, כך שקריאה ישירה ל־Auth לא תחליש אותן.
4. לבדוק את כל המחזור ב־HTTPS Preview, לרבות cookie Secure, תבנית המייל,
   ההפניה המדויקת, חסימת AAL1, ‏AAL2 ו־RLS, עם fixtures סינתטיים מאושרים;
   למחוק אותם ולאמת שוב אפס רשומות לפני bootstrap אמיתי.
5. רק לאחר הצלחת הבדיקות ובאישור B2B2, ליצור בדיוק שתי זהויות הזמנה:
   `yahavhelfer7@gmail.com` ו־`info@cleanbrothers.co.il`. הכנת Auth והחברויות
   נעשית מחוץ לאפליקציה. לוודא ששתי הרשומות המוזמנות מחייבות השלמת סיסמה.
6. לבצע bootstrap אטומי לשני UUIDs בחיבור בעלים, עם advisory lock משותף,
   בדיקת טבלת memberships ריקה והוכחת בדיוק שני admins פעילים. חותמת
   `password_setup_completed_at` נשארת NULL; אין לסמן אותה עבור המשתמשים.
   יש להכין את שתי החברויות לפני מסירת קישורי ההזמנה כדי למנוע לחיצה מוקדמת.
7. למסור כל הזמנה אישית בערוץ מאושר; כל מנהל קובע בעצמו סיסמה ומאמת TOTP.
   אין לחשוף למפעיל password, QR או OTP ואין ליצור recovery codes.

אם ספק המייל, Vercel Authentication, זכאות ההזמנה, דרישות הסיסמה או בדיקות
HTTPS אינן תקינות, עוצרים לפני הזמנות אמיתיות. התשתית המקומית אינה תחליף
לשערי rollout אלה. שום צעד ברשימה זו לא בוצע במסגרת B2B1.

מקורות ראשוניים: [TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa),
[SSR token-hash](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs),
[Invitations](https://supabase.com/docs/guides/auth/users),
[CLI Auth configuration](https://supabase.com/docs/guides/local-development/cli/config).
נקראו גם מדריכי Next המותקנים ל־Server Actions, Authentication, Route Handlers
ו־cookies לפני שינוי הקוד.
