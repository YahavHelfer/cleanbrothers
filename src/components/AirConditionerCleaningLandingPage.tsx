import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceImageCarousel } from "@/components/ServiceImageCarousel";
import { SummerAcPromotionPopup } from "@/components/SummerAcPromotionPopup";
import { businessConfig } from "@/config/business";
import { serviceImages } from "@/data/serviceImages";
import { getWhatsAppLink } from "@/lib/whatsapp";

const trustItems = [
  "שירות עד הבית",
  "הערכת מחיר לפי תמונה",
  "זמינות מהירה באזור המרכז",
];

const airConditionerServiceAreas = [
  "ראשון לציון",
  "בת ים",
  "חולון",
  "תל אביב",
  "רמת גן",
  "גבעתיים",
  "גבעת שמואל",
  "פתח תקווה",
  "הוד השרון",
  "כפר סבא",
  "מרכז הארץ",
];

const intentSignals = [
  "ריח לא נעים בזמן ההפעלה",
  "אבק או לכלוך בפתחי האוויר",
  "מזגן שלא נוקה זמן רב",
  "לפני שימוש אינטנסיבי בקיץ",
  "לאחר תקופה ארוכה ללא שימוש",
];

const cleaningAreas = [
  {
    title: "פילטרים",
    description: "ניקוי יסודי מאבק ולכלוך שהצטברו עם הזמן.",
  },
  {
    title: "סוללת המאייד",
    description:
      "ניקוי הצטברויות באזור הסוללה, בהתאם לנגישות ולמצב המזגן.",
  },
  {
    title: "תריסים ופתחי אוויר",
    description: "ניקוי התריסים ופתחי יציאת האוויר מאבק ולכלוך.",
  },
  {
    title: "תעלת ניקוז נגישה",
    description: "ניקוי האזור הנגיש של מערכת הניקוז לפי מבנה המזגן.",
  },
  {
    title: "מעטפת וחלקי פלסטיקה",
    description: "ניקוי החלקים החיצוניים והפלסטיקה מאבק ולכלוך.",
  },
  {
    title: "אזור המפוח הנגיש",
    description:
      "ניקוי לכלוך שהצטבר באזור המפוח, כאשר המבנה והגישה מאפשרים זאת.",
  },
];

const processSteps = [
  "שולחים תמונה בוואטסאפ",
  "מקבלים הערכת מחיר",
  "קובעים מועד",
  "מגיעים ומבצעים ניקוי מקצועי",
];

const faqs = [
  {
    question: "מה כולל ניקוי מזגן?",
    answer:
      "הניקוי מתמקד בפילטרים ובחלקים הנגישים ביחידה הפנימית, ובהם סוללת המאייד, תריסים, פתחי אוויר, מעטפת ואזורים נוספים שניתן להגיע אליהם בבטחה. ההיקף נקבע לפי סוג המזגן, המבנה והנגישות.",
  },
  {
    question: "כמה זמן לוקח ניקוי מזגן?",
    answer:
      "משך העבודה משתנה לפי סוג המזגן, הגישה אליו ורמת הלכלוך. לאחר קבלת תמונה ופרטים בסיסיים נוכל לתת הערכת זמן מדויקת יותר.",
  },
  {
    question: "כל כמה זמן כדאי לנקות מזגן?",
    answer:
      "התדירות תלויה בכמות השימוש, בסביבה ובהצטברות האבק. כדאי לפעול לפי הוראות היצרן ולשקול ניקוי מקצועי כשיש לכלוך נראה לעין, ריח לא נעים או לאחר תקופה ממושכת ללא ניקוי.",
  },
  {
    question: "האם ניקוי יכול לעזור במקרה של ריח לא נעים?",
    answer:
      "ניקוי עשוי לסייע כאשר מקור הריח הוא אבק או לכלוך בחלקים הנגישים. אם הריח נשאר לאחר הניקוי, ייתכן שמקורו בגורם אחר שדורש בדיקה של טכנאי מזגנים מוסמך.",
  },
  {
    question: "האם אתם מתקנים מזגנים?",
    answer:
      "לא. CleanBrothers מתמחים בניקוי מזגנים ולא בתיקון תקלות. אי־קירור, נזילה חריגה, רעשים או בעיית חשמל עשויים לדרוש טכנאי מזגנים מוסמך.",
  },
  {
    question: "האם צריך להכין משהו לפני ההגעה?",
    answer:
      "מומלץ לפנות חפצים מתחת למזגן ולאפשר גישה נוחה אליו. את שאר ההכנות וההגנה על אזור העבודה אנחנו מבצעים בהתאם למבנה ולגישה.",
  },
  {
    question: "אפשר לנקות כמה מזגנים באותו ביקור?",
    answer:
      "כן, בכפוף לסוגי המזגנים, הגישה והזמן הנדרש. שלחו תמונות של כל היחידות כדי שנוכל לתת הערכה מרוכזת ולתאם את הביקור.",
  },
  {
    question: "האם אתם מנקים מזגן עילי בלבד או גם סוגים אחרים?",
    answer:
      "השירות המרכזי הוא למזגנים עיליים. אפשר לשלוח תמונה של מזגן מסוג אחר ונבדוק אם המבנה והגישה מתאימים לשירות הניקוי שאנחנו מציעים.",
  },
];

function buildStructuredData() {
  const pageUrl = `${businessConfig.siteUrl}/air-conditioner-cleaning`;

  return {
    service: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "ניקוי מזגנים מקצועי עד הבית",
      serviceType: "ניקוי מזגנים",
      url: pageUrl,
      description:
        "ניקוי מזגנים מקצועי בבית הלקוח, עם טיפול באבק ובלכלוך בחלקים הנגישים לניקוי.",
      provider: {
        "@type": "LocalBusiness",
        name: businessConfig.name,
        telephone: businessConfig.phoneDisplay,
        url: businessConfig.siteUrl,
      },
      areaServed: airConditionerServiceAreas.map((area) => ({
        "@type": "City",
        name: area,
      })),
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "בית",
          item: businessConfig.siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "שירותים",
          item: `${businessConfig.siteUrl}/services`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "ניקוי מזגנים",
          item: pageUrl,
        },
      ],
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  };
}

export function AirConditionerCleaningLandingPage() {
  const whatsappHref = getWhatsAppLink(
    "היי, אשמח לשלוח תמונה של המזגן ולקבל הערכת מחיר לניקוי מזגן.",
  );
  const multipleUnitsHref = getWhatsAppLink(
    "היי, יש לי כמה מזגנים בבית. אשמח לשלוח את כל התמונות ולקבל הערכה מרוכזת.",
  );
  const phoneDigits = businessConfig.phoneDisplay.replace(/\D/g, "");
  const phoneHref = `tel:${phoneDigits}`;
  const structuredData = buildStructuredData();

  return (
    <div className="pb-20 sm:pb-0">
      <JsonLd id="ac-cleaning-service-jsonld" data={structuredData.service} />
      <JsonLd id="ac-cleaning-breadcrumb-jsonld" data={structuredData.breadcrumb} />
      <JsonLd id="ac-cleaning-faq-jsonld" data={structuredData.faq} />
      <SummerAcPromotionPopup />

      <section className="theme-section-strong overflow-hidden py-7 sm:py-14 lg:py-16">
        <div className="section-container grid items-center gap-6 lg:grid-cols-[1.03fr_0.97fr] lg:gap-12">
          <div className="reveal">
            <p className="text-sm font-black text-turquoise">
              ניקוי מזגנים מקצועי עד הבית
            </p>
            <p className="mt-2 inline-flex rounded-full border border-turquoise/35 bg-turquoise/10 px-3 py-1.5 text-xs font-black text-turquoise sm:text-sm">
              מבצע קיץ — החל מ־199 ₪
            </p>
            <h1 className="mt-2 max-w-3xl text-[2.35rem] font-black leading-[1.08] text-white sm:mt-3 sm:text-5xl lg:text-6xl">
              מזגן נקי יותר, אוויר נעים יותר
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              ניקוי מקצועי למזגנים עיליים בבית הלקוח, עם טיפול באבק, לכלוך
              וריחות לא נעימים בחלקים הנגישים לניקוי.
            </p>

            <div className="mt-5 grid gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex min-h-12 px-5 text-sm sm:text-base"
              >
                <Icon name="whatsapp" className="ml-2 h-5 w-5" />
                שלחו תמונה וקבלו הערכת מחיר
              </a>
              <a
                href={phoneHref}
                className="btn-secondary inline-flex min-h-12 px-5 text-sm text-white sm:text-base"
              >
                <Icon name="phone" className="ml-2 h-5 w-5" />
                התקשרו עכשיו
              </a>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-white/80"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="reveal stagger-2 relative aspect-[16/11] overflow-hidden rounded-[1.5rem] border border-white/15 bg-navy shadow-2xl sm:rounded-[2rem] lg:aspect-[4/3]">
            <ServiceImageCarousel
              images={serviceImages.airConditioner}
              alt="עבודות ניקוי מזגנים אמיתיות של CleanBrothers"
              className="absolute inset-0 h-full w-full"
              imageClassName="object-cover"
              imagePosition="object-[center_38%]"
              sizes="(min-width: 1024px) 46vw, 100vw"
              priority
            />
            <p className="absolute bottom-3 right-3 z-20 rounded-full bg-navy/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
              תמונות אמיתיות מהשטח
            </p>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container">
          <SectionHeading
            eyebrow="סימנים שכדאי לבדוק"
            title="מתי כדאי להזמין ניקוי מזגן?"
            description="הסימנים הבאים יכולים להעיד שהגיע הזמן לנקות הצטברות אבק ולכלוך. הם אינם אבחון של תקלה טכנית."
            tone="light"
          />
          <div className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-5">
            {intentSignals.map((signal, index) => (
              <article
                key={signal}
                className="card-lift rounded-2xl border theme-card p-4 sm:rounded-3xl sm:p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-turquoise/15 text-sm font-black text-turquoise-dark">
                  {index + 1}
                </span>
                <h2 className="mt-3 text-base font-black leading-6">{signal}</h2>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container">
          <SectionHeading
            eyebrow="ניקוי יסודי ומסודר"
            title="מה כולל ניקוי מזגן?"
            description="מנקים את החלקים המרכזיים שנגישים לניקוי מקצועי, בלי להבטיח תיקון או שינוי בביצועי המזגן."
            tone="light"
          />
          <div className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
            {cleaningAreas.map((area, index) => (
              <article
                key={area.title}
                className="card-lift rounded-[1.25rem] border theme-card p-4 sm:rounded-[2rem] sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-turquoise/15 font-black text-turquoise-dark">
                    {index + 1}
                  </span>
                  <h2 className="text-lg font-black sm:text-xl">{area.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-7 theme-muted">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
          <p className="theme-glass mx-auto mt-5 max-w-4xl rounded-2xl border px-4 py-3 text-center text-sm font-bold theme-muted">
            היקף הניקוי בפועל נקבע לפי סוג המזגן, המבנה והנגישות לחלקים.
          </p>
        </div>
      </section>

      <section className="theme-section-soft py-8 sm:py-12">
        <div className="section-container">
          <div className="grid gap-4 rounded-[1.5rem] border border-turquoise/25 bg-turquoise/[0.07] p-5 sm:rounded-[2rem] sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-turquoise/18 text-turquoise-dark">
              <Icon name="shield" />
            </span>
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                ניקוי או תקלה טכנית?
              </h2>
              <p className="mt-2 max-w-5xl leading-7 theme-muted sm:text-lg sm:leading-8">
                אנחנו מתמחים בניקוי עמוק של המזגן. אם לאחר הניקוי נשארת תקלה
                כמו אי־קירור, נזילה חריגה, רעשים או בעיית חשמל — ייתכן שיהיה
                צורך בטכנאי מזגנים מוסמך.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-contrast">
        <div className="section-container">
          <SectionHeading
            eyebrow="תהליך פשוט וברור"
            title="כך מזמינים ניקוי מזגן"
            description="מתמונה ראשונה ועד ביקור מתואם בבית — בלי מנגנון פנייה חדש ובלי שלבים מיותרים."
          />
          <ol className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <li
                key={step}
                className="card-lift rounded-3xl border theme-inverse-card p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-turquoise font-black text-navy">
                  {index + 1}
                </span>
                <h2 className="mt-4 text-lg font-black leading-7 text-white">
                  {step}
                </h2>
              </li>
            ))}
          </ol>
          <div className="mt-6 text-center">
            <a href={whatsappHref} className="btn-primary inline-flex">
              שלחו תמונה עכשיו
            </a>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-12">
          <div>
            <p className="text-sm font-black text-turquoise-dark">
              עבודות מהשטח
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              עבודות ניקוי מזגנים אמיתיות
            </h2>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">
              תמונות מעבודות אמיתיות שבוצעו על ידי CleanBrothers. איננו מציגים
              זוג לפני ואחרי כאשר אין תיעוד מלא מאותה עבודה.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {serviceImages.airConditioner.slice(1, 5).map((src, index) => (
              <div
                key={src}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border theme-card bg-navy sm:rounded-3xl"
              >
                <Image
                  src={src}
                  alt={`עבודת ניקוי מזגן אמיתית של CleanBrothers, תמונה ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 28vw, 50vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">
              הערכת מחיר לפי תמונה
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight">
              כמה עולה ניקוי מזגן?
            </h2>
            <div className="mt-4 rounded-2xl border border-turquoise/25 bg-turquoise/[0.08] p-4">
              <p className="text-xl font-black sm:text-2xl">
                ניקוי מזגן החל מ־<span className="text-turquoise-dark">199 ₪</span>{" "}
                <span className="text-sm theme-muted">
                  במקום <span className="line-through">250 ₪</span>
                </span>
              </p>
              <p className="mt-2 font-black">
                מנקים 5 מזגנים? המזגן ה־6 עלינו.
              </p>
            </div>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">
              המחיר נקבע לפי סוג המזגן, מצב הלכלוך, הנגישות וכמות המזגנים.
              שלחו תמונה בוואטסאפ לקבלת הערכה מדויקת יותר.
            </p>
            <a href={whatsappHref} className="btn-primary mt-5 inline-flex">
              קבלו הערכת מחיר
            </a>
            <p className="mt-4 text-xs leading-5 theme-muted">
              המחיר הסופי נקבע לפי סוג המזגן, מצבו, הנגישות ומיקום השירות.
              מבצע המזגן השישי מתייחס לניקוי במסגרת אותו ביקור ובאותה כתובת,
              בכפוף להתאמת המזגנים לשירות.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-turquoise/25 bg-[radial-gradient(circle_at_85%_0%,_rgba(39,211,195,0.16),_transparent_45%)] p-5 sm:rounded-[2rem] sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">
              תיאום מרוכז
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight">
              יש כמה מזגנים בבית?
            </h2>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">
              שלחו לנו תמונות של כל המזגנים ונוכל לתת הערכה מרוכזת ולתאם את
              כולם באותו ביקור, בהתאם לסוגי המזגנים ולגישה.
            </p>
            <a href={multipleUnitsHref} className="btn-secondary mt-5 inline-flex">
              שלחו את כל התמונות
            </a>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeading
            align="start"
            eyebrow="אזורי שירות"
            title="ניקוי מזגנים עד הבית באזור המרכז"
            description="מגיעים עם ציוד מקצועי לערי המרכז והשרון. שלחו תמונה ואת היישוב כדי לבדוק זמינות ולקבל הערכת מחיר."
            tone="light"
          />
          <div className="flex flex-wrap gap-2" aria-label="אזורי שירות לניקוי מזגנים">
            {airConditionerServiceAreas.map((area) => (
              <span
                key={area}
                className="rounded-full border border-turquoise/20 bg-turquoise/[0.08] px-3 py-2 text-sm font-black"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container max-w-4xl">
          <SectionHeading
            eyebrow="שאלות נפוצות"
            title="מה חשוב לדעת לפני ניקוי מזגן?"
            tone="light"
          />
          <div className="mt-6 grid gap-3 sm:mt-9">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border theme-card p-4 open:border-turquoise/40 sm:p-5"
              >
                <summary className="cursor-pointer list-none font-black focus:ring-2 focus:ring-turquoise">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-2xl text-turquoise-dark transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-[var(--card-border)] pt-3 leading-7 theme-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact-form"
        className="scroll-mt-24 section-block theme-section-clean pb-28 sm:pb-20"
      >
        <div className="section-container grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black text-turquoise-dark">
              הצעת מחיר לניקוי מזגן
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              שלחו תמונה או השאירו פרטים
            </h2>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">
              ציינו את סוג המזגן, היישוב ומה תרצו לנקות. נחזור עם הערכה ותיאום
              לפי הזמינות באזורכם.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={whatsappHref} className="btn-primary inline-flex">
                שלחו תמונת מזגן וקבלו מחיר
              </a>
              <a href={phoneHref} className="btn-secondary inline-flex">
                התקשרו: {businessConfig.phoneDisplay}
              </a>
            </div>
          </div>
          <ContactForm initialService="ניקוי מזגנים" />
        </div>
      </section>

      <div
        aria-label="פעולות מהירות לניקוי מזגן"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-navy/96 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(8,19,31,0.22)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <a
            href={whatsappHref}
            className="flex min-h-12 items-center justify-center rounded-xl bg-[#22c55e] px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-white"
          >
            שלחו תמונת מזגן וקבלו מחיר
          </a>
          <a
            href={phoneHref}
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-turquoise"
          >
            התקשרו עכשיו
          </a>
        </div>
      </div>

      <div className="theme-section-clean pb-6 text-center text-sm theme-muted sm:pb-8">
        <Link href="/services" className="font-black text-turquoise-dark hover:underline">
          לכל שירותי הניקוי של CleanBrothers
        </Link>
      </div>
    </div>
  );
}
