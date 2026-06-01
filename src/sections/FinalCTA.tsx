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
      className="reveal theme-section-clean pb-8 pt-10 sm:py-16 lg:py-20"
    >
      <div className="section-container">
        <div className="card-lift relative overflow-hidden rounded-[1.35rem] border border-turquoise/18 bg-[radial-gradient(circle_at_20%_0%,_rgba(39,211,195,0.20),_transparent_34%),radial-gradient(circle_at_85%_100%,_rgba(75,159,216,0.14),_transparent_36%),linear-gradient(135deg,_#0b2133_0%,_#102f48_100%)] p-4 text-white shadow-lg shadow-slate-900/12 sm:rounded-[2rem] sm:p-10 sm:shadow-xl lg:p-14">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-turquoise/55 to-transparent" />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-xs font-black text-turquoise sm:text-sm">
              הצעת מחיר בוואטסאפ תוך דקות
            </p>
            <h2 className="mt-2 text-[1.45rem] font-black leading-tight sm:mt-3 sm:text-5xl">
              רוצים להחזיר לריפוד את המראה הנקי?
            </h2>
            <p className="mx-auto mt-2.5 max-w-2xl text-sm leading-6 text-white/78 sm:mt-5 sm:text-lg sm:leading-8">
              שלחו תמונה של הריפוד בוואטסאפ ונחזור עם הערכת מחיר ברורה.
            </p>

            <div className="mt-4 grid justify-center gap-2 sm:mt-8 sm:flex sm:flex-row sm:items-center sm:gap-3">
              <a
                href={getWhatsAppLink(
                  "היי, אשמח לשלוח תמונה ולקבל הערכת מחיר לניקוי ריפודים.",
                )}
                aria-label="פתיחת וואטסאפ לשליחת תמונה וקבלת מחיר לניקוי ריפודים"
                className="btn-primary inline-flex min-h-10 px-4 py-2 text-xs sm:min-h-12 sm:px-7 sm:py-3.5 sm:text-base"
              >
                שלחו תמונה וקבלו מחיר
              </a>
              <a
                href={phoneHref}
                aria-label="חיוג ל-CleanBrothers"
                className="btn-secondary inline-flex min-h-10 px-4 py-2 text-xs sm:min-h-12 sm:px-7 sm:py-3.5 sm:text-base"
              >
                התקשרו עכשיו: {businessConfig.phoneDisplay}
              </a>
            </div>

            <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-1.5 text-[0.7rem] font-bold text-white/70 sm:mt-6 sm:gap-2 sm:text-xs">
              {trustNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-white/12 bg-white/[0.075] px-2.5 py-1 sm:px-3 sm:py-1.5"
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
