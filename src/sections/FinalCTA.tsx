import { businessConfig } from "@/config/business";
import { getWhatsAppLink } from "@/lib/whatsapp";

const trustNotes = [
  "אפשר לשלוח תמונה ולקבל הערכת מחיר",
  "זמינות מהירה באזור המרכז",
  "ללא התחייבות",
];

export function FinalCTA() {
  const phoneDigits = businessConfig.phoneDisplay.replace(/\D/g, "");
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : "/contact";

  return (
    <section
      id="contact"
      className="reveal theme-section-clean py-11 sm:py-16 lg:py-20"
    >
      <div className="section-container">
        <div className="card-lift relative overflow-hidden rounded-[1.5rem] border border-turquoise/18 bg-[radial-gradient(circle_at_20%_0%,_rgba(39,211,195,0.20),_transparent_34%),radial-gradient(circle_at_85%_100%,_rgba(75,159,216,0.14),_transparent_36%),linear-gradient(135deg,_#0b2133_0%,_#102f48_100%)] p-5 text-white shadow-lg shadow-slate-900/12 sm:rounded-[2rem] sm:p-10 sm:shadow-xl lg:p-14">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/55 to-transparent" />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-sm font-black text-turquoise">
              הצעת מחיר בוואטסאפ תוך דקות
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight sm:mt-3 sm:text-5xl">
              רוצים להחזיר לריפוד את המראה הנקי?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-white/78 sm:mt-5 sm:text-lg sm:leading-8">
              שלחו תמונה של הריפוד בוואטסאפ ונחזור עם הערכת מחיר ברורה.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <a
                href={getWhatsAppLink(
                  "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ריפודים.",
                )}
                aria-label="פתיחת וואטסאפ לשליחת תמונה וקבלת מחיר לניקוי ריפודים"
                className="btn-primary inline-flex"
              >
                שלחו תמונה וקבלו מחיר
              </a>
              <a
                href={phoneHref}
                aria-label="חיוג ל-CleanBrothers"
                className="btn-secondary inline-flex"
              >
                התקשרו עכשיו: {businessConfig.phoneDisplay}
              </a>
            </div>

            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2 text-xs font-bold text-white/70">
              {trustNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-white/12 bg-white/[0.075] px-3 py-1.5"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
