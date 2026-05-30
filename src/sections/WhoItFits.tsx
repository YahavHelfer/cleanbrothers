import { SectionHeading } from "@/components/SectionHeading";

type AudienceIcon = "family" | "pet" | "moving" | "car" | "office";

const audiences: {
  title: string;
  description: string;
  icon: AudienceIcon;
}[] = [
  {
    title: "משפחות עם ילדים",
    description: "כתמים, שימוש יומיומי וריפודים שצריכים רענון בלי להחליף ריהוט.",
    icon: "family",
  },
  {
    title: "בעלי כלבים וחתולים",
    description: "שיערות, ריחות ולכלוך שמצטבר על ספות, כורסאות וריפודי רכב.",
    icon: "pet",
  },
  {
    title: "דירות שכורות לפני/אחרי מעבר",
    description: "ניקוי שמחזיר לדירה תחושה נקייה ומסודרת לפני כניסה או מסירה.",
    icon: "moving",
  },
  {
    title: "רכבים פרטיים",
    description: "מושבים וריפודים שנמצאים בשימוש קבוע וצריכים תחזוקה מקצועית.",
    icon: "car",
  },
  {
    title: "משרדים וקליניקות",
    description: "כיסאות המתנה, כורסאות וריפודים שמקבלים לקוחות יום יום.",
    icon: "office",
  },
];

function AudienceCardIcon({ icon }: { icon: AudienceIcon }) {
  const props = {
    className: "h-7 w-7",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (icon === "family") {
    return (
      <svg {...props}>
        <path d="M4.8 11 12 5.2 19.2 11v8.2a1 1 0 0 1-1 1H5.8a1 1 0 0 1-1-1V11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 20v-5.2h6V20M9.2 11.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM14.8 11.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "pet") {
    return (
      <svg {...props}>
        <path d="M8.5 11.5c1.2 0 2.1-1.2 2.1-2.7S9.7 6.1 8.5 6.1 6.4 7.3 6.4 8.8s.9 2.7 2.1 2.7ZM15.5 11.5c1.2 0 2.1-1.2 2.1-2.7s-.9-2.7-2.1-2.7-2.1 1.2-2.1 2.7.9 2.7 2.1 2.7Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 11.6c2.5 0 5 2.7 5 5.1 0 1.5-1 2.4-2.3 2.4-.9 0-1.6-.5-2.7-.5s-1.8.5-2.7.5C8 19.1 7 18.2 7 16.7c0-2.4 2.5-5.1 5-5.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "moving") {
    return (
      <svg {...props}>
        <path d="M5 10.5 12 5l7 5.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 20v-6h8v6M8.2 10.8h7.6M9 14l6 6M15 14l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17.7 6.3h2.1v2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "car") {
    return (
      <svg {...props}>
        <path d="M6.5 15.8h11A2.5 2.5 0 0 0 20 13.3v-1.1a2.5 2.5 0 0 0-1.7-2.4l-1.1-.4-1.5-3.1A2.2 2.2 0 0 0 13.7 5H10a2.2 2.2 0 0 0-2 1.3L6.5 9.4l-.9.3A2.5 2.5 0 0 0 4 12v1.3a2.5 2.5 0 0 0 2.5 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.5 15.8V18M16.5 15.8V18M8 9.4h8M8 12.6h.01M16 12.6h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M6 20V6.8A1.8 1.8 0 0 1 7.8 5h8.4A1.8 1.8 0 0 1 18 6.8V20" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4.5 20h15M8.5 8.5h2M13.5 8.5h2M8.5 12h2M13.5 12h2M8.5 15.5h2M13.5 20v-4.5h-3V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function WhoItFits() {
  return (
    <section className="reveal bg-[linear-gradient(180deg,_#12324a_0%,_#0b2133_100%)] py-14 sm:py-16 lg:py-18">
      <div className="section-container">
        <SectionHeading
          eyebrow="למי השירות מתאים?"
          title="פתרון נקי ונוח לבית, לרכב ולעסק"
          description="השירות מתאים למי שרוצה לשמור על ריפודים נקיים, נעימים ומכובדים בלי להתעסק עם הובלות או פתרונות חלקיים."
        />

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {audiences.map((item, index) => (
            <article
              key={item.title}
              className={`card-lift reveal group flex h-full flex-col rounded-[2rem] border border-white/12 bg-white/[0.085] p-5 text-center text-white shadow-xl shadow-navy/12 backdrop-blur-xl hover:border-turquoise/35 hover:bg-white/[0.125] stagger-${(index % 5) + 1}`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-turquoise/25 bg-navy/45 text-turquoise shadow-[0_18px_45px_rgba(39,211,195,0.14)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_22px_55px_rgba(39,211,195,0.22)]">
                <AudienceCardIcon icon={item.icon} />
              </div>
              <h3 className="mt-5 text-lg font-black leading-tight">
                {item.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-white/66">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
