import { getWhatsAppLink } from "@/lib/whatsapp";

function WhatsAppIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.2 18.8 6 15.9a7.4 7.4 0 1 1 2.4 2.2l-3.2.7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 8.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.1.7l-.5.6c.6 1.1 1.5 2 2.7 2.6l.6-.7c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.5c0 .3-.1.5-.4.7-.5.4-1.2.6-1.9.5-2.9-.4-5.2-2.3-6.3-5-.3-.7-.2-1.4.2-2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function WhatsAppButton() {
  return (
    <a
      href={getWhatsAppLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="פתיחת וואטסאפ לשליחת תמונה וקבלת מחיר מ-CleanBrothers"
      className="wa-pulse btn-glow fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-50 inline-flex min-h-12 items-center gap-2.5 rounded-full border border-white/18 bg-[#22c55e] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(8,19,31,0.18)] ring-1 ring-[#25d366]/25 transition duration-300 hover:-translate-y-0.5 hover:bg-[#16a34a] hover:shadow-[0_14px_32px_rgba(8,19,31,0.22)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-navy sm:bottom-5 sm:left-5 sm:min-h-13 sm:px-5 sm:py-3.5"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/18">
        <WhatsAppIcon />
      </span>
      <span className="leading-none">שלחו תמונה וקבלו מחיר</span>
    </a>
  );
}
