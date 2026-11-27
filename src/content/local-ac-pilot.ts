export const localAcBasePath = "/air-conditioner-cleaning";

const localAcCities = {
  "petah-tikva": {
    name: "פתח תקווה",
    description: "ניקוי מזגן עילי בפתח תקווה. הכינו תמונה של כל יחידה ותאמו ניקוי מרוכז לכמה חדרים בביקור אחד.",
    localTitle: "ניקוי כמה מזגנים באותה דירה",
    localCopy: "אם יש מזגנים בחדרי השינה ובסלון, שלחו מראש תמונה של כל יחידה וציינו באיזה חדר היא נמצאת. בדירות עם חניון או כניסה נפרדת לבניין, כדאי לציין מראש באיזו כניסה אפשר לפרוק את הציוד.",
    question: "מה צריך לשלוח לתמחור כמה מזגנים בביקור אחד?",
    answer: "שלחו תמונה של כל יחידה וציינו באיזה חדר היא נמצאת. סוג העבודה והגישה נבדקים לכל יחידה לפני מתן הצעה.",
  },
  "rosh-haayin": {
    name: "ראש העין",
    description: "ניקוי מזגן עילי בראש העין. כך תבדקו אם המזגן שהריח מגיע ממנו הוא עילי או מיני מרכזי.",
    localTitle: "יש מזגן עילי ופתחים של מיני מרכזי באותה דירה?",
    localCopy: "צלמו את היחידה שעל הקיר ואת הפתח שממנו מורגש הריח, וציינו באיזה חדר זה קורה. הפרטים יעזרו להבחין בין מזגן עילי לבין מערכת מיני מרכזית שדורשת בדיקת התאמה נפרדת.",
    question: "איך מתמחרים בית שיש בו עילי ומיני מרכזי?",
    answer: "לכל סוג מזגן יש סעיף נפרד במחירון. ציינו את סוגי היחידות ושלחו צילום של פתח השירות של המיני מרכזי, אם הוא נגיש.",
  },
  herzliya: {
    name: "הרצליה",
    description: "ניקוי מזגן עילי בהרצליה. בדקו מראש איך להכין את הגישה למזגן מעל ארון או ריהוט.",
    localTitle: "המזגן מותקן גבוה או מעל ריהוט?",
    localCopy: "צלמו את כל הקיר, כולל הרצפה והשטח שמתחת ליחידה. אם המזגן נמצא מעל ארון קבוע או ליד מדרגות, ציינו זאת בתיאום כדי שנוכל לבדוק מראש את הגישה ואת המקום הדרוש לכיסוי ולציוד.",
    question: "צריך להזיז ריהוט לפני הביקור?",
    answer: "אפשר לפנות פריטים קטנים שמתחת ליחידה. אם יש רהיט כבד או קבוע, שלחו צילום שלו עם המזגן כדי שנתאם את ההכנה מראש.",
  },
  "tel-aviv": {
    name: "תל אביב",
    description: "ניקוי מזגן עילי בתל אביב. תיאום ביקור לפי רחוב, גישה לבניין ואפשרות לפריקת ציוד.",
    localTitle: "כך מתאמים ביקור וגישה ברחוב שלכם",
    localCopy: "שלחו שם רחוב, קומה וציינו אם יש מעלית. אם הכניסה לבניין מרחוב אחר או שיש מגבלות פריקה, כדאי לציין זאת מראש. נבדוק את ההתאמה לכתובת לפני קביעת מועד.",
    question: "מה עושים אם אין חניה ליד הבניין?",
    answer: "עדכנו בעת התיאום היכן אפשר לפרוק ציוד ובאילו שעות. נאשר את מועד הביקור אחרי שנבדוק גישה לכתובת.",
  },
} as const;

export const localAcCityLinks = Object.entries(localAcCities).map(([slug, city]) => ({
  name: city.name,
  path: `${localAcBasePath}/${slug}`,
}));

export function getLocalAcCity(slug: string) {
  return Object.hasOwn(localAcCities, slug) ? localAcCities[slug as keyof typeof localAcCities] : undefined;
}

// Add each approved city here in its own release. Tel Aviv is preview-only.
const publishedCitySlugs: readonly ("petah-tikva" | "rosh-haayin" | "herzliya")[] = ["petah-tikva"];

export function isPublishedLocalAcCity(slug: string) {
  return publishedCitySlugs.some(city => city === slug);
}

export const publishedLocalAcLinks = localAcCityLinks.filter(
  ({ path }) => isPublishedLocalAcCity(path.slice(localAcBasePath.length + 1)),
);
