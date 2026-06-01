import { SectionHeading } from "@/components/SectionHeading";
import { getWhatsAppLink } from "@/lib/whatsapp";

type ProcessStep = {
  title: string;
  description: string;
  mobileDescription: string;
  icon: "image" | "quote" | "calendar" | "cleaning";
};

const processSteps: ProcessStep[] = [
  {
    title: "שולחים תמונה בוואטסאפ",
    description:
      "צלמו את הספה, המזרן, השטיח או הרכב ושלחו לנו הודעה קצרה.",
    mobileDescription: "מצלמים ושולחים בוואטסאפ.",
    icon: "image",
  },
  {
    title: "מקבלים הצעת מחיר",
    description:
      "נחזור אליכם עם מחיר ברור לפי סוג הניקוי והמצב של הריפוד.",
    mobileDescription: "מקבלים הערכה ברורה.",
    icon: "quote",
  },
  {
    title: "קובעים מועד",
    description: "מתאמים זמן שנוח לכם, בלי סיבוכים ובלי המתנה מיותרת.",
    mobileDescription: "מתאמים זמן שנוח לכם.",
    icon: "calendar",
  },
  {
    title: "מגיעים ומנקים",
    description:
      "אנחנו מגיעים עד אליכם עם ציוד מקצועי ומחזירים לריפוד מראה נקי ורענן.",
    mobileDescription: "מגיעים עם ציוד מקצועי.",
    icon: "cleaning",
  },
];

function StepIcon({ type }: { type: ProcessStep["icon"] }) {
  const sharedProps = {
    className: "h-6 w-6",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (type === "image") {
    return (
      <svg {...sharedProps}>
        <path d="M6.5 18.5h11A2.5 2.5 0 0 0 20 16V8a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 8v8a2.5 2.5 0 0 0 2.5 2.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7 15 2.6-2.7a1 1 0 0 1 1.45.03L13 14.5l1.35-1.35a1 1 0 0 1 1.45.04L18 15.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.7 9.2h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "quote") {
    return (
      <svg {...sharedProps}>
        <path d="M7 6.5h10A2.5 2.5 0 0 1 19.5 9v5A2.5 2.5 0 0 1 17 16.5h-4.2L8.5 20v-3.5H7A2.5 2.5 0 0 1 4.5 14V9A2.5 2.5 0 0 1 7 6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg {...sharedProps}>
        <path d="M7.5 4.5v3M16.5 4.5v3M5 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 6h10a2.5 2.5 0 0 1 2.5 2.5V17A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V8.5A2.5 2.5 0 0 1 7 6Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9 14.2 1.8 1.8 4.2-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <path d="M15.5 4.5 19.5 8.5M13.8 6.2l4 4L9.5 18.5H5.5v-4l8.3-8.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 20h15M7 11.5l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CleaningProcess() {
  return (
    <section className="reveal theme-section-soft relative overflow-hidden py-9 sm:py-16 lg:py-18">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-turquoise/35 to-transparent" />

      <div className="section-container">
        <SectionHeading
          eyebrow="תהליך העבודה"
          title="ארבעה צעדים פשוטים לריפוד נקי"
          mobileDescription="תמונה, מחיר, תיאום וניקוי עד הבית."
          description="בלי טפסים מיותרים ובלי ניחושים. שולחים תמונה, מקבלים מחיר ברור, קובעים מועד ואנחנו מגיעים עם כל הציוד."
          tone="light"
        />

        <div className="relative mt-5 sm:mt-10 lg:mt-12">
          <div className="absolute right-7 top-0 h-full w-px bg-gradient-to-b from-turquoise/10 via-turquoise/50 to-turquoise/10 md:hidden" />
          <div className="absolute right-[12.5%] top-10 hidden h-px w-[75%] bg-gradient-to-l from-turquoise/5 via-turquoise/55 to-turquoise/5 md:block" />

          <div className="grid gap-3 md:grid-cols-4 md:gap-5">
            {processSteps.map((step, index) => (
              <article
                key={step.title}
                className={`card-lift reveal relative rounded-[1.25rem] border theme-card p-3.5 hover:border-turquoise/45 hover:shadow-turquoise/10 sm:rounded-[2rem] sm:p-6 stagger-${index + 1}`}
              >
                <div className="relative z-10 flex items-start gap-4 md:block">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-turquoise/25 bg-turquoise/12 text-turquoise-dark shadow-[0_10px_24px_rgba(39,211,195,0.13)] sm:h-14 sm:w-14 sm:rounded-2xl sm:shadow-[0_14px_35px_rgba(39,211,195,0.16)] md:mx-auto">
                    <StepIcon type={step.icon} />
                  </div>

                  <div className="min-w-0 md:mt-5 md:text-center">
                    <span className="inline-flex rounded-full bg-navy px-3 py-1 text-xs font-black text-turquoise">
                      שלב {index + 1}
                    </span>
                    <h3 className="mt-2 text-lg font-black leading-tight text-[var(--foreground)] sm:mt-3 sm:text-xl">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 theme-muted sm:hidden">
                      {step.mobileDescription}
                    </p>
                    <p className="mt-2 hidden text-sm leading-6 theme-muted sm:mt-3 sm:block sm:leading-7">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 text-center sm:mt-9">
          <a
            href={getWhatsAppLink(
              "היי, אשמח לקבל הצעת מחיר לניקוי ריפודים.",
            )}
            aria-label="פתיחת וואטסאפ לקבלת הצעת מחיר לניקוי ריפודים"
            className="btn-primary inline-flex"
          >
            התחילו עכשיו בוואטסאפ
          </a>
        </div>
      </div>
    </section>
  );
}
