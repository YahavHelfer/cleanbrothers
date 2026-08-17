import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { GoogleCallTrackingNumber } from "@/components/GoogleCallTrackingNumber";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { WindowCleaningVisual } from "@/components/WindowCleaningVisual";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

const path = "/window-cleaning";
const title = "ניקוי חלונות מקצועי לבית ולעסק | CleanBrothers";
const description =
  "ניקוי חלונות בדירות, בתים ומשרדים, כולל זכוכית, מסגרות, מסילות, תריסים ורשתות בחלונות בעלי גישה בטוחה. לקבלת הערכת מחיר מ-CleanBrothers.";
const pageUrl = `${businessConfig.siteUrl}${path}`;
const phoneHref = "tel:0559577731";
const whatsappHref = getWhatsAppLink(
  "היי, אשמח לקבל הצעת מחיר לניקוי חלונות. מצורפות תמונות של החלונות והגישה אליהם.",
);

export const metadata: Metadata = buildMetadata({ title, description, path });

const includedItems = [
  "ניקוי משטחי זכוכית",
  "ניקוי מסגרות",
  "ניקוי מסילות",
  "ניקוי תריסים",
  "ניקוי רשתות",
];

const propertyTypes = [
  { title: "דירות ובתים", text: "חלונות בחדרים, בסלון ובאזורים נוספים שניתן להגיע אליהם בבטחה." },
  { title: "משרדים", text: "ניקוי חלונות פנימיים וחיצוניים במשרדים עם גישה בטוחה ונוחה." },
  { title: "לאחר שיפוץ", text: "טיפול באבק ובשאריות שניתן להסיר בהתאם לסוג הזכוכית, מצבה וסוג הלכלוך." },
];

const process = [
  "שולחים תמונות של החלונות והגישה אליהם",
  "בודקים את סוג החלון, היקף העבודה והמגבלות",
  "מתאמים ציפיות והערכת מחיר לפני ההגעה",
  "מבצעים ניקוי מסודר ובודקים את התוצאה",
];

const faqs = [
  {
    question: "האם השירות כולל ניקוי מסילות, תריסים ורשתות?",
    answer: "אפשר לכלול מסגרות, מסילות, תריסים ורשתות בהתאם לסוג החלון, למצבם ולגישה. מומלץ לשלוח תמונות כדי שנוכל להעריך את היקף העבודה.",
  },
  {
    question: "האם אתם מנקים חלונות לאחר שיפוץ?",
    answer: "כן, כאשר קיימת גישה בטוחה. היכולת להסיר שאריות תלויה בסוג הזכוכית, במצבה ובסוג הלכלוך, ולכן בודקים תמונות ומתאמים ציפיות מראש.",
  },
  {
    question: "האם אתם מבצעים עבודות בגובה או סנפלינג?",
    answer: "לא. השירות מיועד לחלונות בעלי גישה בטוחה ואינו כולל עבודות בגובה או סנפלינג.",
  },
  {
    question: "איך מקבלים הערכת מחיר?",
    answer: "שולחים ב-WhatsApp תמונות של החלונות, המסגרות והגישה אליהם, יחד עם סוג הנכס והעיר. כך ניתן להעריך את היקף העבודה בצורה מדויקת יותר.",
  },
  {
    question: "האם כל כתם או שארית צבע ניתנים להסרה?",
    answer: "לא תמיד. התוצאה תלויה בסוג הזכוכית, במצבה, בסוג הלכלוך ובנגישות החלון. לפני העבודה נסביר מה ניתן לבצע בלי להבטיח הסרה שאינה ודאית.",
  },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: businessConfig.siteUrl },
    { "@type": "ListItem", position: 2, name: "שירותים", item: `${businessConfig.siteUrl}/services` },
    { "@type": "ListItem", position: 3, name: "ניקוי חלונות", item: pageUrl },
  ],
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "ניקוי חלונות מקצועי לבית ולעסק",
  description,
  url: pageUrl,
  serviceType: "ניקוי חלונות",
  provider: {
    "@type": "LocalBusiness",
    name: businessConfig.name,
    url: businessConfig.siteUrl,
    telephone: businessConfig.phoneDisplay,
  },
};

export default function WindowCleaningPage() {
  return (
    <div className="pb-20 sm:pb-0">
      <JsonLd id="window-cleaning-breadcrumb-jsonld" data={breadcrumbJsonLd} />
      <JsonLd id="window-cleaning-service-jsonld" data={serviceJsonLd} />

      <section className="theme-section-strong overflow-hidden py-8 sm:py-14 lg:py-18">
        <div className="section-container">
          <nav aria-label="פירורי לחם" className="mb-7 text-sm font-bold text-white/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">דף הבית</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/services" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">שירותים</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-turquoise">ניקוי חלונות</li>
            </ol>
          </nav>

          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="reveal">
              <p className="text-sm font-black text-turquoise">ניקוי חלונות בבית הלקוח</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-6xl">
                ניקוי חלונות מקצועי לבית ולעסק
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">
                ניקוי זכוכית, מסגרות, מסילות, תריסים ורשתות בדירות, בתים ומשרדים — בהתאם למצב החלונות ולגישה בטוחה.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={whatsappHref} className="btn-primary inline-flex" aria-label="שליחת תמונות ב-WhatsApp לקבלת הערכת מחיר לניקוי חלונות">
                  <Icon name="whatsapp" className="ml-2 h-5 w-5" />
                  שלחו תמונות ב-WhatsApp
                </a>
                <a href={phoneHref} className="btn-secondary inline-flex text-white" aria-label="חיוג ל-CleanBrothers">
                  <Icon name="phone" className="ml-2 h-5 w-5" />
                  <GoogleCallTrackingNumber>055-957-7731</GoogleCallTrackingNumber>
                </a>
              </div>
            </div>
            <div className="reveal stagger-2 mx-auto w-full max-w-xl">
              <WindowCleaningVisual />
            </div>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="text-sm font-black text-turquoise-dark">מה כולל השירות</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">ניקוי שמתייחס לכל חלקי החלון</h2>
            <p className="mt-4 text-base leading-8 theme-muted">היקף העבודה נקבע לפי סוג החלונות, מצבם והגישה אליהם. לפני התיאום בודקים תמונות ומסבירים מה ניתן לכלול.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {includedItems.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-2xl border theme-card p-4 font-black">
                <Icon name="check" className="h-5 w-5 shrink-0 text-turquoise-dark" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container">
          <p className="text-sm font-black text-turquoise-dark">סוגי נכסים</p>
          <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">לדירות, בתים ומשרדים</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3 sm:mt-10">
            {propertyTypes.map((item) => (
              <article key={item.title} className="card-lift rounded-3xl border theme-card p-5 sm:p-6">
                <Icon name="sparkles" className="h-7 w-7 text-turquoise-dark" />
                <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 theme-muted">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-contrast">
        <div className="section-container">
          <p className="text-sm font-black text-turquoise">תהליך העבודה</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">מתמונה ראשונית ועד ניקוי מסודר</h2>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:mt-10">
            {process.map((step, index) => (
              <li key={step} className="card-lift rounded-3xl border theme-inverse-card p-5 sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-turquoise font-black text-navy">{index + 1}</span>
                <h3 className="mt-5 text-lg font-black leading-7 text-white">{step}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-[2rem] border theme-card p-6 sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">למי השירות מתאים</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">למי שמחפש ניקוי יסודי בחלונות נגישים</h2>
            <p className="mt-4 leading-8 theme-muted">השירות מתאים לדיירים, בעלי בתים ומשרדים שרוצים לנקות את הזכוכית ואת חלקי החלון הנלווים, כולל לאחר שיפוץ, כאשר קיימת גישה בטוחה לעבודה.</p>
          </div>
          <div className="rounded-[2rem] border border-turquoise/30 bg-turquoise/10 p-6 sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">חשוב לדעת מראש</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">עבודה בטוחה ותיאום ציפיות ברור</h2>
            <p className="mt-4 leading-8 theme-muted">השירות מיועד לחלונות בעלי גישה בטוחה ואינו כולל עבודות בגובה או סנפלינג. התוצאה תלויה בסוג הזכוכית, מצבה, סוג הלכלוך ונגישות החלון.</p>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container max-w-4xl">
          <p className="text-sm font-black text-turquoise-dark">שאלות נפוצות</p>
          <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">מה חשוב לדעת לפני שמזמינים ניקוי חלונות?</h2>
          <div className="mt-7 grid gap-3 sm:mt-10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border theme-card p-5 open:border-turquoise/40">
                <summary className="cursor-pointer list-none font-black focus:ring-2 focus:ring-turquoise">
                  <span className="flex items-center justify-between gap-4">{faq.question}<span aria-hidden="true" className="text-2xl text-turquoise-dark transition group-open:rotate-45">+</span></span>
                </summary>
                <p className="mt-3 border-t border-[var(--card-border)] pt-3 leading-7 theme-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contact-form" className="scroll-mt-24 section-block theme-section-clean pb-28 sm:pb-20">
        <div className="section-container grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black text-turquoise-dark">הצעת מחיר לניקוי חלונות</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">שלחו תמונות או השאירו פרטים</h2>
            <p className="mt-4 text-base leading-8 theme-muted">כדי להעריך את העבודה, כדאי לצלם את החלונות, המסגרות והגישה אליהם ולציין את סוג הנכס והעיר.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={whatsappHref} className="btn-primary inline-flex">שלחו תמונות ב-WhatsApp</a>
              <a href={phoneHref} className="btn-secondary inline-flex">התקשרו: <GoogleCallTrackingNumber>055-957-7731</GoogleCallTrackingNumber></a>
            </div>
          </div>
          <ContactForm initialService="ניקוי חלונות" />
        </div>
      </section>

      <div aria-label="פעולות מהירות עבור ניקוי חלונות" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-navy/96 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(8,19,31,0.22)] backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a href={whatsappHref} className="flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-white">WhatsApp</a>
          <a href={phoneHref} className="flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-turquoise">התקשרו עכשיו</a>
          <a href="#contact-form" className="flex min-h-11 items-center justify-center rounded-xl bg-turquoise px-2 text-center text-xs font-black text-navy focus:ring-2 focus:ring-white">קבלת הצעת מחיר</a>
        </div>
      </div>
    </div>
  );
}
