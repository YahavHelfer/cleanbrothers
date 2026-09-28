# CleanBrothers CMS — Phase 1B Security Gate

תאריך הבדיקה: 2026-09-21. תוצאה: התיקון המקומי עבר את שער האבטחה; אין commit או פריסה.

## A. מצב התחלתי ושימור העבודה

- ענף `main`; HEAD בתחילת העבודה ובסיומה: `de4c547b6d418ef57f12d51ff68c38fd35a32afc`.
- Phase 1B-A היה לא מחויב: 8 קבצים קיימים ששונו, מחיקת עמוד ה-placeholder, ו-21 קבצים חדשים. האינדקס היה ונשאר ריק.
- נשמר diff מלא, כולל untracked, עותקי 29 הקבצים הקיימים ושינויי המחיקה, וכן manifest של SHA-256. לא בוצעו reset, stash או החלפת המימוש.
- חומר הבדיקה המקומי נמצא ב-`/private/tmp/cleanbrothers-security-gate-u45qww03`: `phase-1ba-complete.patch`, `files/`, `manifest.json`, `status-before.txt`, דוחות audit, מטא-דאטה של גרסאות, advisories ופלטי build קודמים להשוואה. זהו גיבוי זמני מחוץ למאגר, לא artifact המיועד ל-commit.
- audit ראשוני: **9 חבילות פגיעות — 1 low, 1 moderate, 6 high, 1 critical**. אלו 30 advisories ייחודיים; npm מסכם לפי חבילה, ולכן מספר ה-advisories שונה ממספר החבילות.

## B. Advisories, גרסאות וחשיפה

הטבלה מכסה כל advisory ייחודי שה-audit החזיר, עם קישור למקור. גרסת התיקון היא הראשונה בענף הרלוונטי למותקן, לא בהכרח הגרסה שנבחרה. כל השורות נפתרו ב-lockfile הסופי. המונח moderate תואם ל-medium ברשומות GitHub. הערכת החשיפה מבוססת על הקוד והתצורה המקומיים; לא נערך exploit test ולא נבדקה תשתית Production.

### Next.js

נבחרה **16.3.5**, גרסת 16.x יציבה אחרונה שזוהתה ב-npm בעת הבדיקה. 16.x הוא Active LTS; אין מעבר major או שימוש ב-canary/beta. המקורות: [מדיניות התמיכה](https://nextjs.org/support-policy), [הודעת 16.3.5](https://github.com/vercel/next.js/releases/tag/v16.3.5), וה-peer dependencies שפורסמו ב-npm. נבדקו גם מדריכי Next המותקנים לפני שינוי הבדיקות.

| חבילה | Advisory / CVE | חומרה | מותקן לפני | תיקון ראשון | חשיפה בפרויקט לפני התיקון |
|---|---|---|---|---|---|
| `next` | [GHSA-6gpp-xcg3-4w24](https://github.com/vercel/next.js/security/advisories/GHSA-6gpp-xcg3-4w24); CVE-2026-64642 | high | 16.2.6 | 16.2.11 | עקיפת Proxy: דורש App Router/Turbopack והגדרת i18n עם locale יחיד. next.config ריק ולכן התנאי האחרון אינו קיים; DAL עצמאי נשמר. |
| `next` | [GHSA-m99w-x7hq-7vfj](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj); CVE-2026-64641 | high | 16.2.6 | 16.2.11 | CPU DoS ב-Server Actions: נתיב ניתן להגעה, משום שקיימות פעולות התחברות/התנתקות. הרשאות CMS אינן מגינות על פענוח הבקשה של המסגרת. |
| `next` | [GHSA-89xv-2m56-2m9x](https://github.com/vercel/next.js/security/advisories/GHSA-89xv-2m56-2m9x); CVE-2026-64649 | high | 16.2.6 | 16.2.11 | SSRF דרך Server Actions ו-Host ב-custom server; הפרויקט משתמש ב-next start ואין custom server. לא נמצא נתיב חשוף בתצורה הנבדקת. |
| `next` | [GHSA-68g3-v927-f742](https://github.com/vercel/next.js/security/advisories/GHSA-68g3-v927-f742); CVE-2026-64648 | moderate | 16.2.6 | 16.2.11 | בלבול cache ב-fetch עם Request ו-init שונים; לא נמצא דפוס כזה. קריאות CMS ו-CRM הרלוונטיות מוגדרות no-store. |
| `next` | [GHSA-4633-3j49-mh5q](https://github.com/vercel/next.js/security/advisories/GHSA-4633-3j49-mh5q); CVE-2026-64647 | moderate | 16.2.6 | 16.2.11 | התנגשות cache עבור גופי בקשה שאינם UTF-8; לא נמצא נתיב כזה. בקשות האפליקציה הרלוונטיות משתמשות ב-JSON וב-no-store. |
| `next` | [GHSA-4c39-4ccg-62r3](https://github.com/vercel/next.js/security/advisories/GHSA-4c39-4ccg-62r3); CVE-2026-64646 | moderate | 16.2.6 | 16.2.11 | חריגת מגבלת גודל Server Action ב-Edge; אין runtime=Edge בפרויקט, ולכן תנאי זה אינו קיים. |
| `next` | [GHSA-p9j2-gv94-2wf4](https://github.com/vercel/next.js/security/advisories/GHSA-p9j2-gv94-2wf4); CVE-2026-64645 | high | 16.2.6 | 16.2.11 | SSRF ב-rewrite/redirect ל-hostname דינמי חיצוני; אין rewrites או redirects כאלה ב-next.config, ויעדי auth קבועים. |
| `next` | [GHSA-q8wf-6r8g-63ch](https://github.com/vercel/next.js/security/advisories/GHSA-q8wf-6r8g-63ch); CVE-2026-64644 | moderate | 16.2.6 | 16.2.11 | SVG ב-image optimizer עם תמונות מרוחקות ב-self-hosting; אין remotePatterns או הגדרת SVG לא בטוחה. לא זוהה מסלול קלט מתאים. |
| `next` | [GHSA-955p-x3mx-jcvp](https://github.com/vercel/next.js/security/advisories/GHSA-955p-x3mx-jcvp); CVE-2026-64643 | moderate | 16.2.6 | 16.2.11 | חשיפת endpoints של Server Functions: קיימות Server Actions ולכן המשטח רלוונטי. מזהי פעולות אינם סוד או תחליף להרשאה. |
| `next` | [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36); CVE-2026-75604 | critical | 16.2.6 | 16.3.3 | RCE במארח Windows; הבדיקה המקומית על macOS אינה עומדת בתנאי. תשתית Production לא נבדקה ולא שונתה; אין הנחת פטור לגביה. |
| `next` | [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4); ללא CVE ברשומת GHSA | critical | 16.2.6 | 16.3.3 | RCE בשרשרת AVIF/libheif של אופטימיזציית תמונות. endpoint קיים; לא נמצאו תמונות AVIF, העלאות או remotePatterns המאפשרים קלט כזה. גרסת התיקון השביתה AVIF כאמצעי הגנה; עודכנה גם sharp. |

### יתר התלויות

| חבילה | Advisory / CVE | חומרה | מותקן לפני | תיקון ראשון | חשיפה בפרויקט לפני התיקון |
|---|---|---|---|---|---|
| `@babel/core` | [GHSA-4x5r-pxfx-6jf8](https://github.com/babel/babel/security/advisories/GHSA-4x5r-pxfx-6jf8); CVE-2026-49356 | low | 7.29.0 | 7.29.6 | פיתוח בלבד, דרך eslint-plugin-react-hooks; אין עיבוד AST לא מהימן בשרת האפליקציה. |
| `baseline-browser-mapping` | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv); CVE-2026-45819 | moderate | 2.10.31 | 2.11.0 | תלות production עקיפה של Next וכלי Browserslist; שימוש בבחירת יעדי build. לא נמצא קלט HTTP המגיע לפונקציה הפגיעה. |
| `brace-expansion` | [GHSA-3jxr-9vmj-r5cp](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-3jxr-9vmj-r5cp); CVE-2026-13149 | high | 1.1.14 / 5.0.6 | 1.1.16 / 5.0.7 | פיתוח בלבד, דרך minimatch/ESLint/TypeScript-ESLint. אין מסלול HTTP המרחיב ביטויים לא מהימנים. |
| `brace-expansion` | [GHSA-mh99-v99m-4gvg](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-mh99-v99m-4gvg); CVE-2026-14257 | high | 1.1.14 / 5.0.6 | 1.1.17 / 5.0.8 | פיתוח בלבד, דרך minimatch/ESLint/TypeScript-ESLint. אין מסלול HTTP המרחיב ביטויים לא מהימנים. |
| `brace-expansion` | [GHSA-rgw5-rvv9-x895](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-rgw5-rvv9-x895); CVE-2026-69152 | high | 1.1.14 / 5.0.6 | 1.1.18 / 5.0.9 | פיתוח בלבד, דרך minimatch/ESLint/TypeScript-ESLint. אין מסלול HTTP המרחיב ביטויים לא מהימנים. |
| `browserslist` | [GHSA-c83g-rgw3-j3cx](https://github.com/browserslist/browserslist/security/advisories/GHSA-c83g-rgw3-j3cx); CVE-2026-73089 | high | 4.28.2 | 4.28.7 | פיתוח בלבד בנתיב Babel; אין API המקבל שאילתות או נתוני סטטיסטיקה מהמשתמש לכלי זה. |
| `browserslist` | [GHSA-73wf-gq98-2v4g](https://github.com/browserslist/browserslist/security/advisories/GHSA-73wf-gq98-2v4g); CVE-2026-73088 | high | 4.28.2 | 4.28.7 | פיתוח בלבד בנתיב Babel; אין API המקבל שאילתות או נתוני סטטיסטיקה מהמשתמש לכלי זה. |
| `js-yaml` | [GHSA-h67p-54hq-rp68](https://github.com/nodeca/js-yaml/security/advisories/GHSA-h67p-54hq-rp68); CVE-2026-53550 | moderate | 4.1.1 | 4.2.0 | פיתוח בלבד, דרך @eslint/eslintrc. אין parser של YAML מקלט משתמש בשרת האפליקציה. |
| `js-yaml` | [GHSA-52cp-r559-cp3m](https://github.com/nodeca/js-yaml/security/advisories/GHSA-52cp-r559-cp3m); CVE-2026-59869 | high | 4.1.1 | 4.3.0 | פיתוח בלבד, דרך @eslint/eslintrc. אין parser של YAML מקלט משתמש בשרת האפליקציה. |
| `js-yaml` | [GHSA-5p4m-2wfm-xmqj](https://github.com/nodeca/js-yaml/security/advisories/GHSA-5p4m-2wfm-xmqj); ללא CVE ברשומת GHSA | high | 4.1.1 | 4.3.1 | פיתוח בלבד, דרך @eslint/eslintrc. אין parser של YAML מקלט משתמש בשרת האפליקציה. |
| `js-yaml` | [GHSA-2883-xcg3-v3hh](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh); CVE-2026-84375 | high | 4.1.1 | 4.3.2 | פיתוח בלבד, דרך @eslint/eslintrc. אין parser של YAML מקלט משתמש בשרת האפליקציה. |
| `nanoid` | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv); CVE-2026-67214 | high | 3.3.12 | 3.3.16 | תלות עקיפה של PostCSS; אין שימוש אפליקטיבי במחולל non-secure עם גודל שלילי/אפס בשליטת משתמש. |
| `nanoid` | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8); CVE-2026-67213 | high | 3.3.12 | 3.3.18 | תלות עקיפה של PostCSS; אין שימוש אפליקטיבי במחולל non-secure עם גודל שלילי/אפס בשליטת משתמש. |
| `postcss` | [GHSA-qx2v-qp2m-jg93](https://github.com/postcss/postcss/security/advisories/GHSA-qx2v-qp2m-jg93); CVE-2026-41305 | moderate | 8.4.31 | 8.5.10 | תלות עקיפה של Next ושל כלי Tailwind לבניית CSS; אין עיבוד CSS לא מהימן בזמן בקשת משתמש. |
| `postcss` | [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q); CVE-2026-45623 | high | 8.4.31 | 8.5.12 | תלות עקיפה של Next ושל כלי Tailwind לבניית CSS; אין עיבוד CSS לא מהימן בזמן בקשת משתמש. |
| `postcss` | [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp); CVE-2026-69153 | moderate | 8.4.31 / 8.5.15 | 8.5.23 | תלות עקיפה של Next ושל כלי Tailwind לבניית CSS; אין עיבוד CSS לא מהימן בזמן בקשת משתמש. |
| `postcss` | [GHSA-r28c-9q8g-f849](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849); CVE-2026-73646 | high | 8.4.31 / 8.5.15 | 8.5.18 | תלות עקיפה של Next ושל כלי Tailwind לבניית CSS; אין עיבוד CSS לא מהימן בזמן בקשת משתמש. |
| `sharp` | [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj); ללא CVE ברשומת GHSA | high | 0.34.5 | 0.35.0 | תלות production עקיפה; מסלול אופטימיזציית תמונות קיים. אין העלאות, remotePatterns או AVIF מקומי מזוהה; חשיפה תלויה בפורמט וביכולת לספק קלט. תוקן ולא נפטר כ-dev-only. |
| `sharp` | [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c); ללא CVE ברשומת GHSA | high | 0.34.5 | 0.35.4 | תלות production עקיפה; מסלול אופטימיזציית תמונות קיים. אין העלאות, remotePatterns או AVIF מקומי מזוהה; חשיפה תלויה בפורמט וביכולת לספק קלט. תוקן ולא נפטר כ-dev-only. |

ב-sharp, GHSA-f88m-g3jw-g9cj הוא advisory מאגד ללא CVE יחיד וכולל את CVE-2026-33327, CVE-2026-33328, CVE-2026-35590 ו-CVE-2026-35591. GHSA-rgj7-g3m4-5g8c מאגד את עדכוני libheif ובהם GHSA-g89c-p67h-r497 ו-GHSA-2jg2-4ch7-h545. אין להחשיב דיווחים חופפים על אותה שרשרת ספריות כאירועי פריצה נפרדים.

### נתיבי התלויות הפגיעות שנמצאו

- `@babel/core`: eslint-config-next → eslint-plugin-react-hooks → @babel/core. נתיבים: `node_modules/@babel/core` (7.29.0).
- `baseline-browser-mapping`: next → baseline-browser-mapping; Babel → browserslist → baseline-browser-mapping. נתיבים: `node_modules/baseline-browser-mapping` (2.10.31).
- `brace-expansion`: ESLint → minimatch → brace-expansion; TypeScript-ESLint → minimatch → brace-expansion. נתיבים: `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion` (5.0.6), `node_modules/brace-expansion` (1.1.14).
- `browserslist`: @babel/core → @babel/helper-compilation-targets → browserslist. נתיבים: `node_modules/browserslist` (4.28.2).
- `js-yaml`: eslint → @eslint/eslintrc → js-yaml. נתיבים: `node_modules/js-yaml` (4.1.1).
- `nanoid`: next / @tailwindcss/postcss → postcss → nanoid. נתיבים: `node_modules/nanoid` (3.3.12).
- `next`: תלות ישירה. נתיבים: `node_modules/next` (16.2.6).
- `postcss`: next → postcss; @tailwindcss/postcss → postcss. נתיבים: `node_modules/next/node_modules/postcss` (8.4.31), `node_modules/postcss` (8.5.15).
- `sharp`: next → sharp (optional dependency). נתיבים: `node_modules/sharp` (0.34.5).

## C. שינויי תלויות ותאימות

בוצעו שתי פעולות ממוקדות:

```sh
npm install --save-exact next@16.3.5 eslint-config-next@16.3.5
npm update @babel/core baseline-browser-mapping brace-expansion browserslist js-yaml
```

לא הורץ `npm audit fix --force`, לא נוספו overrides ולא עודכנו חבילות עליונות לא קשורות. הפעולה השנייה התמקדה בחמש החבילות שנותרו פגיעות לאחר עדכון המסגרת, בתוך טווחי התלויות של ההורים. היא עדכנה גם את משפחת Babel ונתוני Browserslist הנדרשים לפתרון העץ; כל השינויים מפורטים בנספח. עדכון עקיף לא נחוץ של fastq הוחזר ל-1.20.1 המקורית; semver המקונן של sharp נדרש בגרסה ^7.8.5 על ידי sharp 0.35.4 ולכן עודכן.

| חבילה | לפני | אחרי | סיבה |
|---|---|---|---|
| next | 16.2.6 | 16.3.5 | גרסת 16 יציבה ומטופלת |
| eslint-config-next | 16.2.6 | 16.3.5 | התאמה למסגרת |
| @next/env, @next/eslint-plugin-next, @next/swc-* | 16.2.6 | 16.3.5 | חבילות מצומדות למסגרת |
| react / react-dom | 19.2.4 | 19.2.4 | ללא צורך בשינוי; תואמות peer range של Next וזו לזו |
| eslint | 9.39.4 | 9.39.4 | תואם ל-eslint-config-next הדורש >=9 |
| typescript | 5.9.3 | 5.9.3 | תואם לדרישת >=3.3.1 |
| @babel/core | 7.29.0 | 7.29.7 | תיקון תלות כלי פיתוח |
| baseline-browser-mapping | 2.10.31 | 2.11.25 | תיקון תלות עקיפה |
| brace-expansion, root | 1.1.14 | 1.1.21 | תיקון בתוך ענף 1 |
| brace-expansion, TypeScript-ESLint | 5.0.6 | 5.0.12 | תיקון בתוך ענף 5 |
| browserslist | 4.28.2 | 4.29.0 | תיקון בתוך ענף 4 |
| js-yaml | 4.1.1 | 4.3.2 | תיקון כל ארבעת ה-advisories בענף 4 |
| nanoid | 3.3.12 | 3.3.19 | פתרון PostCSS מתוקן |
| postcss | 8.4.31 nested / 8.5.15 root | 8.5.23 root משותף | גרסת Next המתוקנת דורשת 8.5.23; העותק המקונן הוסר |
| sharp | 0.34.5 | 0.35.4 | תלות אופטימיזציית תמונות מעודכנת של Next; מתקן את שתי רשומות sharp |
| @swc/helpers | 0.5.15 | 0.5.23 | תלות של Next המעודכן |

Supabase SSR 0.12.7, Supabase SDK 2.116.0, Supabase CLI 2.117.0, Playwright 1.63.0 ו-server-only 0.0.1 נשארו ללא שינוי. Node המקומי 24.20.0 מתאים לדרישות. `npm ls --all --json` הסתיים בקוד 0, ללא peer dependencies שבורות. package.json ו-lockfile תואמים; npm ci הושלם בהצלחה מול ה-lockfile הסופי וכל האימות הורץ שוב לאחריו. השדרוג המצומד של sharp/libvips נבדק יחד עם build מלא; קוד האפליקציה והתצורה לא דרשו שינוי.

## D. הממצאים שנותרו

אחרי עדכון המסגרת בלבד נותרו 5 חבילות: 1 low, 1 moderate, 3 high, 0 critical. כולן תלויות עקיפות ונפתרו בעדכון הממוקד השני:

| חבילה | סיווג והגעה | מצב סופי |
|---|---|---|
| @babel/core | transitive, development-only; לא נמצא נתיב production | resolved |
| baseline-browser-mapping | transitive, נכללת בתלויות production של Next; שימוש build, לא נמצא נתיב בקשות פגיע | resolved |
| brace-expansion | transitive, development-only; לא נמצא נתיב production | resolved |
| browserslist | transitive, development-only ב-lockfile; לא נמצא נתיב production | resolved |
| js-yaml | transitive, development-only; לא נמצא parser של קלט HTTP | resolved |

`npm audit` סופי, **כולל dev dependencies**, החזיר exit 0 ו-0 בכל רמות החומרה. לא נשאר ממצא המחייב שדרוג נפרד או שאין לו תיקון. הסיווג מתאר את הנתיבים שנבדקו; הוא לא שימש הצדקה להשאיר פגיעויות כלי פיתוח.

## E. אימות גבול ההרשאה

`requireCmsAdmin()` נשאר ללא שינוי ומבצע בכל קריאה אימות זהות דרך `getUser()` ואז בדיקת חברות פעילה של אותו UUID בתפקיד admin. אין הרשאה על סמך cookie לא מאומת, כתובת דוא״ל, user metadata או cache בין בקשות.

Proxy נשאר שכבת הגנה נוספת ותחזוקת session בלבד. גם layout מוגן וגם `getCmsDashboard()` מגיעים לגבול ההרשאה באופן עצמאי. נוספו ארבע בדיקות המפעילות את `getCmsDashboard()` ישירות בלי Proxy ובלי layout: דחיית אנונימי, non-member ומנהל לא פעיל, ומתן גישה למנהל פעיל בלבד לאחר אימות זהות וחברות. 12 הבדיקות המקוריות נשמרו; כעת 16 בדיקות CMS עוברות. כל read, mutation, Server Action או Route Handler עתידיים חייבים לאכוף אותו גבול בעצמם.

## F. סקירת cookie scope

Path=`/admin` נשאר מתאים ליסוד המקומי. בדיקות הדפדפן מכסות login, גישה מוגנת, refresh, logout ומחיקת עוגיות CMS בלי למחוק עוגיות ציבוריות. HttpOnly ו-SameSite=Lax נשמרו. Secure=false נשאר מוגבל ל-loopback HTTP שהקוד מאשר; תמיכה ב-HTTPS/cloud לא נוספה.

Server Action מקבל את ה-cookie לפי URL הבקשה שממנה הוא מופעל, ולא לפי מיקום קובץ הפונקציה. פעולות מתוך `/admin/*` מקבלות את העוגייה; פעולה מתוך נתיב ציבורי לא תקבל אותה ועליה לדחות גישה בהיעדר session. ההרשאה העצמאית נדרשת בכל מקרה.

`/preview/*` לא יקבל עוגיית Path=/admin. ההמלצה היא למקם Preview מאומת תחת `/admin/preview/*` עם layout מבודד ובדיקת חברות עצמאית. Route group כשלעצמו אינו משנה URL ואינו משנה התאמת cookie. אם המוצר דורש דווקא `/preview/*`, יש לתכנן בנפרד החלפה מבוקרת ל-session קצר ייעודי ל-Preview, מוגבל ליעד ולתוכן, או מקור admin נפרד. אין להרחיב אוטומטית ל-`/`. לא מומש Preview או מנגנון auth חדש בשלב זה.

## G. סקירת מודל החברות

האילוץ הנוכחי מבטיח **לכל היותר שני חברים**, כולל חברים לא פעילים; הוא אינו מחייב שיהיו שתי שורות. שני התפקידים שווים.

| חלופה | יתרון | מחיר |
|---|---|---|
| A: שני admin_slot קבועים וייחודיים | תקרה גלובלית פשוטה ואטומית במסד; גם bootstrap שגוי לא ייצור חבר שלישי | שמירת חבר לא פעיל צורכת מקום; החלפה דורשת מחיקה/הקצאה מחדש; הרחבה דורשת migration |
| B: טבלת חברות גמישה ומגבלה במדיניות bootstrap | דרישת ״שני מנהלים כיום״ מופרדת ממבנה הנתונים; מאפשרת החלפה והיסטוריה והתרחבות | המגבלה חייבת להיות נאכפת בתהליך מנהלי מבוקר ובטרנזקציה/נעילה כנגד תחרות; מגבלת UI לבדה אינה מספיקה |

**המלצה לעתיד: B**, אם שני מנהלים הם מדיניות המוצר כיום ולא invariant קבוע לעולם. יש להגדיר במפורש אם סופרים שני פעילים או שני חברים בכלל, ולשמר איסור כתיבה למשתמשי API ו-RLS. **בשער הזה נשאר A**: אין פגם טכני הדורש שינוי סכמה מיידי. לא שונו migration, grants, policies או bootstrap.

## H. אימות מלא ורגרסיות

| בדיקה | תוצאה |
|---|---|
| `npm test` | 77 עברו, 0 נכשלו (73 מקוריות ועוד 4) |
| `npm run test:cms` | 16 עברו, 0 נכשלו; תת-קבוצה של npm test |
| `npm run test:cms:db` | 22 בדיקות pgTAP עברו |
| `npm run test:e2e` | 10 עברו, 0 נכשלו |
| `tsc --noEmit --incremental false` | עבר, גם אחרי build |
| `npm run lint` | עבר |
| `npm run build` | עבר על Next 16.3.5; 24 פלטים סטטיים בתהליך הבנייה; admin/login ו-admin דינמיים |
| `git diff --check` | עבר; נבדקו גם קבצים חדשים בנפרד |
| `npm audit` | exit 0; אפס ממצאים כולל dev |
| `npm ls --all --json` | exit 0; עץ תלויות תקין |
| `npm ci` | התקנה נקייה ומוצלחת של ה-lockfile הסופי |

נבדקה אותה סביבת Supabase מקומית מבודדת: `cleanbrothers-cms-local`, API בפורט 56321, DB בפורט 56322, Next test server ב-127.0.0.1:56300. בדיקות SQL בטרנזקציה ו-fixtures של Auth סינתטיים בלבד. בסיום אומת 0 משתמשי Auth ו-0 memberships, ה-stack נעצר, ואין listeners בפורטים 56300/56321/56322/56324.

### אתר ציבורי

- כל 16 כתובות הדפים נשמרו. קוד `src/app/(site)`, API, רכיבים, lib, תוכן, config, sections ו-public זהה ל-HEAD; לא בוצע שינוי קוד ציבורי.
- הושוו פלטי build לפני/אחרי עבור כל 16 הדפים: טקסט גלוי, קישורים, תמונות, שדות טפסים, canonical ושאר ערכי SEO, JSON-LD ואתחול consent — זהים סמנטית.
- קובצי sitemap ו-robots זהים byte-for-byte; כך גם favicon, icon ו-apple-icon. Next שינה את מיקום ה-metadata בסריאליזציית HTML ומזהי cache בקישורי האייקונים. הבדיקה מנרמלת סדר metadata ואת query של מזהה האייקון לאחר אימות גוף הקובץ; היא אינה טוענת ש-HTML או chunks זהים byte-for-byte.
- בדיקות הרגרסיה הקיימות ל-ContactForm/חוזה lead, `/api/contact-lead`, `/api/whatsapp`, cookie consent, attribution, Google Ads, GA4, Meta Pixel ו-Google call tracking עברו. נבדקה נוכחות האינטגרציות פעם אחת ומיקומן מאחורי consent. התנהגות שירותי Production עצמם לא נבדקה.
- לא בוצעו בקשות CRM/WhatsApp חיות. בדיקות החוזים משתמשות במוקים, וסביבת E2E מוגבלת למקור המקומי ואינה יורשת credentials של CRM.

### CMS

10 בדיקות הדפדפן עברו עבור אנונימי ונתיב admin עתידי, פרטי כניסה שגויים, מנהל פעיל, non-member, חבר לא פעיל, logout, refresh, ביטול חברות תוך session, RTL/mobile ובידוד tracking, חסימת signup וגישה אנונימית לנתונים. הן בודקות redirect, no-store, noindex ו-cookie scope. לא נוספו marketing scripts ל-admin. אזהרות Node MODULE_TYPELESS ואזהרת Playwright על FORCE_COLOR/NO_COLOR לא הכשילו בדיקות ואינן ממצאי audit.

## I. סקירת diff — שער האבטחה בלבד

כל קובצי המקור של Phase 1B-A נשמרו לפי manifest, פרט לתוספת בדיקות ותיעוד המפורטים כאן. השינוי המצטבר עדיין מכיל את Phase 1B-A הלא מחויב; `git diff HEAD` לבדו אינו מפריד בין השלבים.

1. `package.json`: רק next ו-eslint-config-next מ-16.2.6 ל-16.3.5.
2. `package-lock.json`: פתרון מסגרת ותלויות פגיעות ממוקד; 69 נתיבי package שנוספו/השתנו ונתיב PostCSS מקונן אחד שהוסר, כמפורט בנספח. רבים הם variants אופציונליים של SWC/sharp/libvips לפלטפורמות אחרות.
3. `tests/cms-authorization.test.mjs`: mock ל-redirect, חשיפת loader למבחן וארבע בדיקות גישה ישירה לדשבורד; כל 12 בדיקות הבסיס נשמרו.
4. `docs/cms-auth-local.md`: גרסת Next ותוצאת audit מעודכנות, תיעוד מסקנות cookie/membership וקישור לדוח זה.
5. `docs/phase-1b-security-gate.md`: דוח חדש זה.

לא שונו runtime auth/Proxy, סכמה, cookie scope, APIs, עמודי האתר או תוכן. אין קבצים staged. build outputs, caches, סביבת Docker וקובצי environment מקומיים אינם חלק מה-diff. `.env.example` הוא קובץ דוגמה של Phase 1B-A ואינו מכיל ערכי CMS סודיים. לא נוספו credentials או secrets לחומר המיועד לביקורת. לוג startup זמני שהכיל מפתחות מקומיים שנוצרו אוטומטית הוסר מהגיבוי הזמני.

## J. המלצה ל-checkpoint

**כן: השילוב של Phase 1B-A והתיקון מתאים ל-checkpoint מקומי הבא, לאחר ביקורת הדוח.** לא נמצאו ממצאי audit שנותרו, כל בדיקות הרגרסיה עברו וגבול ההרשאה העצמאי נשמר. ההמלצה מתייחסת ליסוד המקומי; תמיכה ב-cloud/HTTPS, MFA, זהויות אמת ו-Preview עדיין מחוץ לשלב זה. לא נוצר commit, הענף ו-HEAD לא השתנו וה-working tree נשאר מלוכלך במכוון עם העבודה המיועדת לביקורת.

## נספח: כל שינויי הגרסאות ב-lockfile

העמודה ״שלב״ מציינת את פעולת ה-resolution: framework או targeted-transitive. ״חדש״ מציין variant שלא היה ב-lockfile הקודם. זו רשימת כל הנתיבים שהגרסה שלהם השתנתה או נוספה, ולא רק החבילות הישירות.

| נתיב package | לפני | אחרי | שלב |
|---|---|---|---|
| `node_modules/@babel/code-frame` | 7.29.0 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/compat-data` | 7.29.3 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/core` | 7.29.0 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/generator` | 7.29.1 | 7.29.8 | targeted-transitive |
| `node_modules/@babel/helper-compilation-targets` | 7.28.6 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helper-globals` | 7.28.0 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helper-module-imports` | 7.28.6 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helper-module-transforms` | 7.28.6 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helper-string-parser` | 7.27.1 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helper-validator-identifier` | 7.28.5 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helper-validator-option` | 7.27.1 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/helpers` | 7.29.2 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/parser` | 7.29.3 | 7.29.9 | targeted-transitive |
| `node_modules/@babel/template` | 7.28.6 | 7.29.7 | targeted-transitive |
| `node_modules/@babel/traverse` | 7.29.0 | 7.29.8 | targeted-transitive |
| `node_modules/@babel/types` | 7.29.0 | 7.29.8 | targeted-transitive |
| `node_modules/@img/sharp-darwin-arm64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-darwin-x64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-freebsd-wasm32` | חדש | 0.35.4 | framework |
| `node_modules/@img/sharp-libvips-darwin-arm64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-darwin-x64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linux-arm` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linux-arm64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linux-ppc64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linux-riscv64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linux-s390x` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linux-x64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linuxmusl-arm64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-libvips-linuxmusl-x64` | 1.2.4 | 1.3.3 | framework |
| `node_modules/@img/sharp-linux-arm` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linux-arm64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linux-ppc64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linux-riscv64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linux-s390x` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linux-x64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linuxmusl-arm64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-linuxmusl-x64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-wasm32` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-wasm32/node_modules/@emnapi/runtime` | חדש | 1.11.3 | framework |
| `node_modules/@img/sharp-webcontainers-wasm32` | חדש | 0.35.4 | framework |
| `node_modules/@img/sharp-win32-arm64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-win32-ia32` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@img/sharp-win32-x64` | 0.34.5 | 0.35.4 | framework |
| `node_modules/@next/env` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/eslint-plugin-next` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-darwin-arm64` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-darwin-x64` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-linux-arm64-gnu` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-linux-arm64-musl` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-linux-x64-gnu` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-linux-x64-musl` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-win32-arm64-msvc` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@next/swc-win32-x64-msvc` | 16.2.6 | 16.3.5 | framework |
| `node_modules/@swc/helpers` | 0.5.15 | 0.5.23 | framework |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion` | 5.0.6 | 5.0.12 | targeted-transitive |
| `node_modules/baseline-browser-mapping` | 2.10.31 | 2.11.25 | targeted-transitive |
| `node_modules/brace-expansion` | 1.1.14 | 1.1.21 | targeted-transitive |
| `node_modules/browserslist` | 4.28.2 | 4.29.0 | targeted-transitive |
| `node_modules/caniuse-lite` | 1.0.30001793 | 1.0.30001810 | targeted-transitive |
| `node_modules/electron-to-chromium` | 1.5.361 | 1.5.433 | targeted-transitive |
| `node_modules/eslint-config-next` | 16.2.6 | 16.3.5 | framework |
| `node_modules/js-yaml` | 4.1.1 | 4.3.2 | targeted-transitive |
| `node_modules/nanoid` | 3.3.12 | 3.3.19 | framework |
| `node_modules/next` | 16.2.6 | 16.3.5 | framework |
| `node_modules/node-releases` | 2.0.46 | 2.0.56 | targeted-transitive |
| `node_modules/postcss` | 8.5.15 | 8.5.23 | framework |
| `node_modules/sharp` | 0.34.5 | 0.35.4 | framework |
| `node_modules/sharp/node_modules/semver` | 7.8.1 | 7.8.5 | framework |
| `node_modules/update-browserslist-db` | 1.2.3 | 1.3.3 | targeted-transitive |
| `node_modules/next/node_modules/postcss` | 8.4.31 | הוסר; dedupe ל-PostCSS 8.5.23 | framework |

Phase 1B security gate completed locally. No commit, deployment, cloud infrastructure, CRM mutation, or CMS content migration performed. Awaiting review.
