import { SectionHeading } from "@/components/SectionHeading";

type ExampleIcon = "spill" | "dust" | "odor" | "paw" | "fabric" | "moving";

const examples: {
  title: string;
  description: string;
  icon: ExampleIcon;
}[] = [
  {
    title: "כתמי שתייה",
    description: "קפה, יין, מיצים ונוזלים שהשאירו סימן על הריפוד.",
    icon: "spill",
  },
  {
    title: "אבק ולכלוך שהצטבר",
    description: "לכלוך יומיומי שנכנס לעומק הבד ומעמעם את המראה.",
    icon: "dust",
  },
  {
    title: "ריחות לא נעימים",
    description: "רענון ריפודים שספגו ריחות משימוש, לחות או בעלי חיים.",
    icon: "odor",
  },
  {
    title: "שיערות בעלי חיים",
    description: "טיפול בשיערות ולכלוך שמצטברים על ספות, כורסאות ורכב.",
    icon: "paw",
  },
  {
    title: "ריפודים שהתכהו עם הזמן",
    description: "רענון בד שאיבד מהברק והתחושה הנקייה שלו.",
    icon: "fabric",
  },
  {
    title: "תחזוקה לפני מעבר דירה",
    description: "ניקוי שמכין את הבית לכניסה, יציאה או מסירה מסודרת.",
    icon: "moving",
  },
];

function CleaningExampleIcon({ icon }: { icon: ExampleIcon }) {
  const props = {
    className: "h-7 w-7",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (icon === "spill") {
    return (
      <svg {...props}>
        <path d="M8 5h7l-.8 7.6a3.1 3.1 0 0 1-6.2 0L7.2 5H8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6.8 5h8.8M9.4 19h4.4M11.6 15.5V19M17 15.5c1.1.7 1.6 1.5 1.6 2.3a2.2 2.2 0 0 1-4.4 0c0-.8.5-1.6 1.6-2.3.4-.3.8-.3 1.2 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "dust") {
    return (
      <svg {...props}>
        <path d="M12 4.5l1.1 3.2 3.2 1.1-3.2 1.1L12 13.1l-1.1-3.2-3.2-1.1 3.2-1.1L12 4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 15.5h.01M9 18h.01M15.5 17.5h.01M18.5 14.5h.01M5 10.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "odor") {
    return (
      <svg {...props}>
        <path d="M7 17c2-1.3 2-2.7 0-4s-2-2.7 0-4M12 18c2.3-1.5 2.3-3.1 0-4.6s-2.3-3.1 0-4.6M17 17c2-1.3 2-2.7 0-4s-2-2.7 0-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 5.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      </svg>
    );
  }

  if (icon === "paw") {
    return (
      <svg {...props}>
        <path d="M8.5 11.5c1.2 0 2.1-1.2 2.1-2.7S9.7 6.1 8.5 6.1 6.4 7.3 6.4 8.8s.9 2.7 2.1 2.7ZM15.5 11.5c1.2 0 2.1-1.2 2.1-2.7s-.9-2.7-2.1-2.7-2.1 1.2-2.1 2.7.9 2.7 2.1 2.7Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 11.6c2.5 0 5 2.7 5 5.1 0 1.5-1 2.4-2.3 2.4-.9 0-1.6-.5-2.7-.5s-1.8.5-2.7.5C8 19.1 7 18.2 7 16.7c0-2.4 2.5-5.1 5-5.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "fabric") {
    return (
      <svg {...props}>
        <path d="M5.5 13.5v-2.2A3.3 3.3 0 0 1 8.8 8h6.4a3.3 3.3 0 0 1 3.3 3.3v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6.5 13h11A2.5 2.5 0 0 1 20 15.5V18H4v-2.5A2.5 2.5 0 0 1 6.5 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 6.2c1.3-.8 2.7-.8 4 0s2.7.8 4 0M7 18v1.5M17 18v1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M5 10.5 12 5l7 5.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 20v-6h8v6M7.5 10.8h9M9 14l6 6M15 14l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CleaningExamples() {
  return (
    <section className="reveal theme-section-soft py-8 sm:py-16 lg:py-18">
      <div className="section-container">
        <SectionHeading
          eyebrow="ניקוי פרקטי ליום יום"
          title="מה אנחנו מנקים בפועל?"
          description="לא רק ניקוי כללי. אנחנו מתמקדים בלכלוך האמיתי שמצטבר בריפודים בבית, ברכב ובמשרד."
          tone="light"
        />

        <div className="mt-5 grid gap-3 sm:mt-9 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {examples.map((item, index) => (
            <article
              key={item.title}
              className={`card-lift reveal group rounded-[1.25rem] border theme-card p-3.5 text-center hover:border-turquoise/35 sm:rounded-[2rem] sm:p-5 stagger-${(index % 6) + 1}`}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-turquoise/25 bg-turquoise/12 text-turquoise-dark shadow-[0_12px_30px_rgba(39,211,195,0.12)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_22px_55px_rgba(39,211,195,0.22)] sm:h-16 sm:w-16">
                <CleaningExampleIcon icon={item.icon} />
              </div>
              <div className="mx-auto mt-4 inline-flex rounded-full border border-turquoise/20 bg-turquoise/10 px-2.5 py-1 text-xs font-black text-turquoise-dark">
                {index + 1}
              </div>
              <h3 className="mt-2 text-lg font-black sm:mt-3 sm:text-xl">
                {item.title}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 theme-muted sm:mt-3 sm:leading-7">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
