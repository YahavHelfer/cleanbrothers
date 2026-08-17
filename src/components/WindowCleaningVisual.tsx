export function WindowCleaningVisual({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative isolate overflow-hidden bg-[linear-gradient(145deg,_#0b2133_0%,_#10354b_58%,_#14606a_100%)] ${compact ? "h-full min-h-44" : "aspect-[4/3] w-full rounded-[2rem] border border-white/15 shadow-2xl"}`}
    >
      <div className="absolute -left-[12%] -top-[20%] h-[70%] w-[70%] rounded-full bg-turquoise/16 blur-3xl" />
      <div className="absolute inset-[12%] grid grid-cols-2 overflow-hidden rounded-[1.5rem] border-4 border-white/75 bg-cyan-50/12 shadow-[0_24px_70px_rgba(8,19,31,0.35)]">
        <span className="border-b-2 border-l-2 border-white/55 bg-[linear-gradient(145deg,_rgba(255,255,255,0.32),_rgba(39,211,195,0.08))]" />
        <span className="border-b-2 border-white/55 bg-[linear-gradient(145deg,_rgba(255,255,255,0.2),_rgba(39,211,195,0.14))]" />
        <span className="border-l-2 border-white/55 bg-[linear-gradient(145deg,_rgba(39,211,195,0.12),_rgba(255,255,255,0.28))]" />
        <span className="bg-[linear-gradient(145deg,_rgba(255,255,255,0.3),_rgba(39,211,195,0.08))]" />
        <span className="absolute left-[13%] top-[16%] h-[2px] w-[36%] -rotate-45 bg-white/55" />
        <span className="absolute bottom-[18%] right-[12%] h-[2px] w-[28%] -rotate-45 bg-white/45" />
      </div>
      <svg
        className={`absolute text-turquoise drop-shadow-[0_8px_16px_rgba(39,211,195,0.32)] ${compact ? "bottom-[9%] left-[8%] h-16 w-16" : "bottom-[7%] left-[7%] h-24 w-24 sm:h-28 sm:w-28"}`}
        viewBox="0 0 96 96"
        fill="none"
      >
        <path d="M48 8l5.6 16.4L70 30l-16.4 5.6L48 52l-5.6-16.4L26 30l16.4-5.6L48 8Z" fill="currentColor" />
        <path d="M74 50l3.2 9.8L87 63l-9.8 3.2L74 76l-3.2-9.8L61 63l9.8-3.2L74 50ZM21 55l2.4 7.1 7.1 2.4-7.1 2.4L21 74l-2.4-7.1-7.1-2.4 7.1-2.4L21 55Z" fill="white" fillOpacity=".88" />
      </svg>
    </div>
  );
}
