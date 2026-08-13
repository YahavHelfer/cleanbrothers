import { SectionHeading } from "@/components/SectionHeading";

type ExampleIcon = "filter" | "coil" | "vents" | "drain" | "shell" | "fan";

const summerAirConditionerCleaningExamples: {
  title: string;
  description: string;
  icon: ExampleIcon;
}[] = [
  {
    title: "פילטרים",
    description: "ניקוי יסודי של הפילטרים מאבק ולכלוך שהצטברו עם הזמן.",
    icon: "filter",
  },
  {
    title: "סוללת המאייד",
    description:
      "ניקוי הצטברויות אבק ולכלוך באזור הסוללה, בהתאם לנגישות ולמצב המזגן.",
    icon: "coil",
  },
  {
    title: "תריסים ופתחי אוויר",
    description: "ניקוי התריסים ופתחי יציאת האוויר מאבק ולכלוך.",
    icon: "vents",
  },
  {
    title: "תעלת ניקוז נגישה",
    description: "ניקוי האזור הנגיש של מערכת הניקוז בהתאם למבנה המזגן.",
    icon: "drain",
  },
  {
    title: "מעטפת וחלקי פלסטיקה",
    description:
      "ניקוי החלקים החיצוניים והפלסטיקה שמצטברים עליהם אבק ולכלוך.",
    icon: "shell",
  },
  {
    title: "אזור המפוח הנגיש",
    description:
      "ניקוי לכלוך שהצטבר באזור המפוח, כאשר המבנה והגישה מאפשרים זאת.",
    icon: "fan",
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

  if (icon === "filter") {
    return (
      <svg {...props}>
        <path d="M5 5.5h14v13H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.5 5.5v13M12 5.5v13M15.5 5.5v13M5 9.8h14M5 14.2h14" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      </svg>
    );
  }

  if (icon === "coil") {
    return (
      <svg {...props}>
        <path d="M6 6.5h12v11H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m8 16 2.2-8m1.3 8 2.2-8m1.3 8 2.2-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M3.5 9h1M3.5 12h1M3.5 15h1M19.5 9h1M19.5 12h1M19.5 15h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "vents") {
    return (
      <svg {...props}>
        <path d="M5 6.5h14v6H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.5 9.5h9M7 16c1.3 1 2.6 1 3.9 0M12 18c1.3 1 2.6 1 3.9 0M16.2 16c.8.6 1.6.7 2.4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "drain") {
    return (
      <svg {...props}>
        <path d="M5 6h8v4.5a3 3 0 0 0 3 3h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19 17.5c1.2.9 1.8 1.7 1.8 2.4a1.8 1.8 0 0 1-3.6 0c0-.7.6-1.5 1.8-2.4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "shell") {
    return (
      <svg {...props}>
        <path d="M5.5 7h13A2.5 2.5 0 0 1 21 9.5v4a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 13.5v-4A2.5 2.5 0 0 1 5.5 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6.5 12.5h11M17.5 4.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.8 10c-1.3-2.8-.8-4.7.6-5.2 1.6-.5 3 1.5 2.3 3.4-.5 1.3-1.5 2-2.9 1.8ZM14 12.2c2.8-1.3 4.7-.8 5.2.6.5 1.6-1.5 3-3.4 2.3-1.3-.5-2-1.5-1.8-2.9ZM12.2 14c1.3 2.8.8 4.7-.6 5.2-1.6.5-3-1.5-2.3-3.4.5-1.3 1.5-2 2.9-1.8ZM10 11.8c-2.8 1.3-4.7.8-5.2-.6-.5-1.6 1.5-3 3.4-2.3 1.3.5 2 1.5 1.8 2.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function CleaningExamples() {
  return (
    <section className="reveal theme-section-soft py-8 sm:py-16 lg:py-18">
      <div className="section-container">
        <SectionHeading
          eyebrow="ניקוי מזגן יסודי לקיץ"
          title="מה אנחנו מנקים בפועל?"
          description="אנחנו מנקים לעומק את החלקים המרכזיים במזגן שנגישים לניקוי מקצועי, כדי להסיר אבק, לכלוך והצטברויות ולהחזיר תחושה נקייה ורעננה יותר."
          tone="light"
        />

        <div className="mt-5 grid gap-3 sm:mt-9 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {summerAirConditionerCleaningExamples.map((item, index) => (
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
