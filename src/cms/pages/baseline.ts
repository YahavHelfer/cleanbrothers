import { ABOUT_PATH, type PageDraft, type PromotionDraft, validatePageDraft, validatePromotionDraft } from "./model";

// A verbatim snapshot of the existing static /about copy. The public route
// remains code-owned in Phase 3A1; this payload is imported only locally.
export const aboutBaseline = validatePageDraft({
  schemaVersion: 6,
  publicTitle: "אודות CleanBrothers",
  h1: "עסק צעיר, רציני ומקצועי שמגיע עד אליכם",
  seoTitle: "אודות CleanBrothers | ניקוי ספות וריפודים בבית הלקוח",
  seoDescription: "הכירו את CleanBrothers, עסק צעיר ומקצועי לניקוי ספות, ריפודים, מזרנים, שטיחים וריפודי רכב בבית הלקוח באזור המרכז.",
  canonical: ABOUT_PATH,
  blocks: [
    {
      id: "a0000000-0000-4000-8000-000000000001", position: 0, type: "hero", schemaVersion: 1, hidden: false,
      mediaVersionId: null, promotionRevisionId: null,
      payload: {
        eyebrow: "על CleanBrothers",
        title: "עסק צעיר, רציני ומקצועי שמגיע עד אליכם",
        description: "CleanBrothers נולדה מתוך רצון לתת שירות ניקוי ריפודים שמרגיש אישי, מדויק ונקי באמת, עם תקשורת ברורה ועבודה מסודרת.",
        cta: { label: "דברו איתנו בוואטסאפ", target: { kind: "whatsapp", message: "היי, אשמח לשמוע פרטים על שירותי הניקוי של CleanBrothers." } },
        mediaAlt: null,
      },
    },
    {
      id: "a0000000-0000-4000-8000-000000000002", position: 1, type: "aboutOverview", schemaVersion: 1, hidden: false,
      mediaVersionId: null, promotionRevisionId: null,
      payload: {
        heading: "שירות מקצועי בגובה העיניים",
        paragraphs: [
          "אנחנו מתמחים בניקוי ספות, מזרנים, שטיחים, כורסאות, כיסאות וריפודי רכב בבית הלקוח. המטרה שלנו היא להפוך את השירות לפשוט: שולחים תמונה, מקבלים הצעת מחיר, קובעים מועד ואנחנו מגיעים עם כל הציוד הדרוש.",
          "כעסק צעיר, חשוב לנו לבנות אמון דרך עבודה מסודרת, תקשורת ברורה ותוצאה שנראית לעין. אנחנו מקפידים על חומרים איכותיים, התאמה לסוג הריפוד ושמירה על סביבת עבודה נקייה.",
          "השירות מתאים למשפחות, דירות שכורות, רכבים, משרדים וכל מי שרוצה להחזיר לריפוד מראה נקי, נעים ומטופח בלי להחליף אותו.",
        ],
        values: [
          { title: "אמינות", description: "מסבירים מה אפשר לעשות ומה צפוי לפני שמתחילים.", icon: "shield" },
          { title: "שקיפות", description: "הצעת מחיר ברורה לפי תמונה, סוג הריפוד והיקף העבודה.", icon: "message" },
          { title: "זמינות", description: "שירות מהיר ונוח באזור המרכז, עד בית הלקוח.", icon: "calendar" },
          { title: "עבודה מסודרת", description: "ציוד מקצועי, סביבת עבודה נקייה ויחס מכבד לבית.", icon: "sparkles" },
        ],
      },
    },
  ],
} satisfies PageDraft);

// A separate, revisioned document; no page or public route uses it at baseline.
export const aboutPromotionBaseline = validatePromotionDraft({
  schemaVersion: 7,
  publicTitle: "מבצע היכרות",
  h1: "הצעת היכרות",
  seoTitle: "מבצע היכרות | CleanBrothers",
  seoDescription: "פרטי הצעת ההיכרות של CleanBrothers.",
  description: "שולחים תמונה, מקבלים הערכת מחיר ומתאמים שירות שמתאים לכם.",
  template: "accent",
  enabled: true,
  cta: { label: "צרו קשר", target: { kind: "internal", path: "/contact" } },
  mediaVersionId: null,
  mediaAlt: null,
} satisfies PromotionDraft);
