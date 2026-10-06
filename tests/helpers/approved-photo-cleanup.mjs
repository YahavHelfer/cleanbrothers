// Narrowly approved copy/overlay changes for the frozen public baseline.
export function approvedPhotoCleanup(file, source) {
  if (!/ServiceLandingView|ServiceLandingPage|AirConditionerCleaningView|serviceLandingPages|BeforeAfter|gallery\/page/.test(file)) return source;
  source = source.replace(/תוצאות אמיתיות, בלי פילטרים מיותרים/g, "תוצאות לפני ואחרי ניקוי")
    .replace(/תיעוד אמיתי של /g, "צילום של ")
    .replace(/תוצאות אמיתיות/g, "עבודות ניקוי")
    .replace(/תיעוד אמיתי מהעבודה בשטח/g, "דוגמאות לעבודות ניקוי")
    .replace(/מציגים רק תמונות ותוצאות שתועדו באמת/g, "עבודות ניקוי של CleanBrothers")
    .replace(/לא נמצא בפרויקט זוג תמונות לפני ואחרי מאותו טיפול לשירות הזה, ולכן מוצגת תמונת עבודה אמיתית בלי לחבר בין עבודות שונות\./g, "לצפייה בעבודות נוספות, היכנסו לגלריית העבודות שלנו.")
    .replace(/ (אמיתיות|אמיתיים|אמיתית|אמיתי)(?![א-ת])/g, "");
  source = source.replace(/\{?serviceImages\.length > 0 && <p className="pointer-events-none absolute bottom-[\s\S]*?<\/p>\}/g, "")
    .replace(/<p className="pointer-events-none absolute bottom-[\s\S]*?<\/p>/g, "")
    .replace(/\{hero\.length > 0 && <p[^>]*>\{content\.copy\.imageCaption\}<\/p>\}/g, "");
  return source;
}
