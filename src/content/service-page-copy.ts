// Optional editorial labels preserve historical service payloads and presentation.
export const servicePageCopyFields = {
  "heroCta": "כפתור הצעת מחיר",
  "whatsappCta": "כפתור וואטסאפ בפתיחה",
  "imageCaption": "כיתוב תמונה",
  "signsEyebrow": "כותרת קטנה לסקירה",
  "processEyebrow": "כותרת קטנה לתהליך",
  "benefitsTitle": "כותרת יתרונות",
  "resultEyebrow": "כותרת קטנה לתיעוד",
  "resultTitle": "כותרת תיעוד",
  "resultHeading": "כותרת הסבר תיעוד",
  "resultNote": "הסבר תיעוד",
  "galleryCta": "כפתור גלריה",
  "faqTitle": "כותרת שאלות נפוצות",
  "contactEyebrow": "כותרת קטנה ליצירת קשר",
  "contactTitle": "כותרת יצירת קשר",
  "contactDescription": "תיאור יצירת קשר",
  "contactWhatsappCta": "כפתור וואטסאפ ליצירת קשר"
} as const;
export type ServicePageCopy = Record<keyof typeof servicePageCopyFields, string>;
