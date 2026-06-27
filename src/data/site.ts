import { businessConfig } from "@/config/business";

export const navLinks = [
  { label: "בית", href: "/" },
  { label: "שירותים", href: "/services" },
  { label: "גלריה", href: "/gallery" },
  { label: "אודות", href: "/about" },
  { label: "צור קשר", href: "/contact" },
];

export const services = [
  {
    title: "ניקוי ספות",
    landingPath: "/sofa-cleaning",
    description:
      "ניקוי עמוק לריפודי בד, הסרת לכלוך ורענון הספה בבית הלקוח.",
    benefit: "מחזיר לספה מראה רענן ונעים בלי להחליף ריפוד.",
    image: "/images/services/sofa-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "שירות ניקוי ספות מקצועי לספות בד, מיקרופייבר וריפודים נפוצים נוספים. אנחנו בודקים את סוג הריפוד, מרככים את הלכלוך, שואבים לעומק ומבצעים ניקוי שמחזיר לספה מראה נקי ורענן.",
  },
  {
    title: "ניקוי מזרנים",
    landingPath: "/mattress-cleaning",
    description:
      "טיפול יסודי באבק, ריחות וכתמים לשינה נקייה ונעימה יותר.",
    benefit: "שינה נקייה יותר עם טיפול ממוקד בריחות וכתמים.",
    image: "/images/services/mattress-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "ניקוי מזרנים בבית הלקוח עם דגש על רענון הבד, הפחתת ריחות וטיפול בכתמים נקודתיים. מתאים למזרני יחיד, זוגי, מיטות ילדים וחדרי אירוח.",
  },
  {
    title: "ניקוי שטיחים",
    landingPath: "/carpet-cleaning",
    description:
      "ניקוי מקצועי לשטיחים ביתיים עם התאמה לסוג הסיב ורמת הלכלוך.",
    benefit: "מרענן את החלל ומחזיר לשטיח תחושה נקייה ונעימה.",
    image: "/images/services/carpet-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "אנחנו בודקים את סוג השטיח לפני תחילת העבודה ומתאימים את שיטת הניקוי. השירות מתאים לשטיחי סלון, חדרי ילדים, שטיחים קצרים ושטיחים בשימוש יום יומי.",
  },
  {
    title: "ניקוי ריפודי רכב",
    landingPath: "/car-upholstery-cleaning",
    description:
      "חידוש מושבים, דיפונים וריפודים ברכב עם ציוד קומפקטי ומדויק.",
    benefit: "רכב שמרגיש נקי יותר לנסיעות יום יומיות ומשפחתיות.",
    image: "/images/services/car-upholstery-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "ניקוי מושבים, דיפונים וריפודי רכב עד הבית או למקום העבודה. פתרון מצוין לרכבים משפחתיים, רכבים אחרי קנייה, ריחות, כתמים ושימוש אינטנסיבי.",
  },
  {
    title: "ניקוי מזגנים",
    landingPath: "/air-conditioner-cleaning",
    description:
      "ניקוי מזגנים מקצועי להסרת אבק, ריחות ולכלוך שהצטבר בתוך המזגן.",
    benefit: "אוויר נקי ורענן יותר עם טיפול בלכלוך שמצטבר בתוך המזגן.",
    image: "/images/services/Air-conditioner-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "ניקוי מזגנים מקצועי לבית ולעסק, עם דגש על הסרת אבק, לכלוך וריחות לא נעימים שהצטברו בתוך היחידה. השירות מתאים למזגנים עיליים נפוצים ועוזר לשמור על תחושת אוויר נקייה ונעימה יותר.",
  },
  {
    title: "ניקוי כורסאות וכיסאות",
    landingPath: "/armchair-chair-cleaning",
    description:
      "ניקוי נקודתי או מלא לכורסאות, כיסאות אוכל וכיסאות משרדיים.",
    benefit: "פתרון יעיל לפריטים שנוגעים בהם כל יום ומתלכלכים מהר.",
    image: "/images/services/armchair-chair-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "שירות מדויק לפריטים קטנים יותר בבית או במשרד. מתאים לכורסאות טלוויזיה, כיסאות אוכל, כיסאות המתנה וכיסאות משרדיים עם ריפוד בד.",
  },
  {
    title: "ניקוי ריפודים עדינים",
    landingPath: "/delicate-upholstery-cleaning",
    description:
      "עבודה זהירה עם חומרים איכותיים לריפודים שדורשים יחס מיוחד.",
    benefit: "ניקוי זהיר ומותאם לריפודים שדורשים עבודה רגישה.",
    image: "/images/services/delicate-upholstery-cleaning.jpeg",
    imagePosition: "object-center",
    details:
      "לריפודים עדינים אנחנו עובדים בזהירות, בודקים תגובה של החומר ומתאימים את רמת הלחות והניקוי. המטרה היא ניקיון יעיל בלי לפגוע במרקם או במראה.",
  },
];

export const whyChooseUs = [
  "ציוד מקצועי",
  "שירות עד הבית",
  "חומרי ניקוי איכותיים",
  "יחס אישי",
  "זמינות מהירה",
  "תוצאות שנראות לעין",
];

export const faqs = [
  {
    question: "כמה זמן לוקח לניקוי להתייבש?",
    answer:
      "זמן הייבוש משתנה לפי סוג הבד, עומק הניקוי והאוורור בבית. ברוב המקרים מדובר בכמה שעות, ומומלץ להשאיר חלונות פתוחים.",
  },
  {
    question: "האם יש ריח אחרי הניקוי?",
    answer:
      "בדרך כלל נשאר ריח נקי ועדין לזמן קצר. אנחנו עובדים עם חומרים איכותיים ומתאימים את העבודה לסוג הריפוד.",
  },
  {
    question: "האם אתם מנקים כתמי שתן?",
    answer:
      "כן, אפשר לטפל בכתמי שתן ובריחות לא נעימים. חשוב לשלוח תמונה ולציין מתי הכתם נוצר כדי שנוכל להעריך את הטיפול.",
  },
  {
    question: "האם הניקוי מתאים לבעלי חיים?",
    answer:
      "כן. השירות מתאים לבתים עם כלבים וחתולים, כולל טיפול בשיערות, לכלוך וריחות שהצטברו על הריפוד.",
  },
  {
    question: "האם אפשר לשלוח תמונה ולקבל מחיר?",
    answer:
      "בהחלט. שולחים תמונה בוואטסאפ, מציינים את סוג השירות והעיר, ואנחנו חוזרים עם הערכת מחיר ברורה ככל האפשר.",
  },
  {
    question: "האם אתם מגיעים עד הבית?",
    answer:
      "כן. CleanBrothers מספקים שירות ניקוי עד בית הלקוח עם ציוד מקצועי, ללא צורך בהובלה של הספה, המזרן, השטיח או הרכב.",
  },
  {
    question: "האם החומרים בטוחים לילדים?",
    answer:
      "אנחנו משתמשים בחומרי ניקוי מקצועיים ומתאימים לריפודים. לאחר הניקוי מומלץ להמתין לייבוש מלא לפני שימוש רגיל.",
  },
  {
    question: "האם צריך להכין משהו לפני ההגעה?",
    answer:
      "כדאי לפנות חפצים קטנים מהאזור ולוודא שיש גישה נוחה לפריט שמנקים. אנחנו מגיעים עם הציוד וחומרי הניקוי הדרושים.",
  },
];

export const galleryItems = [
  {
    title: "ניקוי ספה",
    category: "sofas",
    description: "ניקוי ריפוד בד לפני ואחרי",
    beforeImage: "/images/before-after/sofa-before.png",
    afterImage: "/images/before-after/sofa-after.png",
    beforeAlt: "ספה לפני ניקוי מקצועי של CleanBrothers",
    afterAlt: "ספה אחרי ניקוי מקצועי של CleanBrothers",
  },
  {
    title: "ניקוי מזרן",
    category: "mattresses",
    description: "רענון מזרן וטיפול בכתמים",
    beforeImage: "/images/before-after/mattress-before.jpeg",
    afterImage: "/images/before-after/mattress-after.jpeg",
    beforeAlt: "מזרן לפני ניקוי מקצועי של CleanBrothers",
    afterAlt: "מזרן אחרי ניקוי מקצועי של CleanBrothers",
  },
  {
    title: "ניקוי שטיח",
    category: "carpets",
    description: "חידוש שטיח ביתי",
    beforeImage: "/images/before-after/carpet-before.jpeg",
    afterImage: "/images/before-after/carpet-after.jpeg",
    beforeAlt: "שטיח לפני ניקוי מקצועי של CleanBrothers",
    afterAlt: "שטיח אחרי ניקוי מקצועי של CleanBrothers",
  },
  {
    title: "ניקוי ריפודי רכב",
    category: "cars",
    description: "ניקוי מושבים וריפודי רכב",
    beforeImage: "/images/before-after/car-before.jpeg",
    afterImage: "/images/before-after/car-after.jpeg",
    beforeAlt: "ריפודי רכב לפני ניקוי מקצועי של CleanBrothers",
    afterAlt: "ריפודי רכב אחרי ניקוי מקצועי של CleanBrothers",
  },
];

export const serviceOptions = services.map((service) => service.title);

export const serviceAreas = businessConfig.serviceAreas;
