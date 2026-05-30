"use client";

import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { ImageWithFallback } from "@/components/ImageWithFallback";

type BeforeAfterCardProps = {
  title: string;
  description: string;
  beforeImage?: string;
  afterImage?: string;
  beforeAlt?: string;
  afterAlt?: string;
  variant?: "home" | "gallery";
  className?: string;
};

type LightboxMode = "before" | "after" | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BeforeAfterCard({
  title,
  description,
  beforeImage,
  afterImage,
  beforeAlt,
  afterAlt,
  variant = "home",
  className = "",
}: BeforeAfterCardProps) {
  const [slider, setSlider] = useState(50);
  const [lightbox, setLightbox] = useState<LightboxMode>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const didDrag = useRef(false);
  const modalStartX = useRef<number | null>(null);
  const imageSizes =
    variant === "gallery"
      ? "(min-width: 768px) 45vw, 92vw"
      : "(min-width: 1024px) 40vw, 92vw";

  useEffect(() => {
    if (!lightbox) {
      return;
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setLightbox(null);
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        setLightbox((current) => (current === "before" ? "after" : "before"));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  const activeImage = lightbox === "before" ? beforeImage : afterImage;
  const activeAlt =
    lightbox === "before"
      ? beforeAlt || `תמונת לפני עבור ${title}`
      : afterAlt || `תמונת אחרי עבור ${title}`;
  const activeLabel = lightbox === "before" ? "לפני" : "אחרי";

  function updateSliderFromPointer(clientX: number) {
    const rect = comparisonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const nextValue = ((rect.right - clientX) / rect.width) * 100;
    setSlider(clamp(nextValue, 5, 95));
  }

  function handleComparisonPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    dragStartX.current = event.clientX;
    didDrag.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSliderFromPointer(event.clientX);
  }

  function handleComparisonPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    if (Math.abs(event.clientX - dragStartX.current) > 4) {
      didDrag.current = true;
    }

    updateSliderFromPointer(event.clientX);
  }

  function handleComparisonPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!didDrag.current) {
      setLightbox("after");
    }
  }

  function handleComparisonKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setLightbox("after");
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSlider((current) => clamp(current - 6, 5, 95));
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSlider((current) => clamp(current + 6, 5, 95));
    }
  }

  function handleModalPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    modalStartX.current = event.clientX;
  }

  function handleModalPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (modalStartX.current === null) {
      return;
    }

    const delta = event.clientX - modalStartX.current;
    modalStartX.current = null;

    if (Math.abs(delta) > 42) {
      setLightbox((current) => (current === "before" ? "after" : "before"));
    }
  }

  return (
    <>
      <article
        className={`card-lift group overflow-hidden rounded-[1.5rem] border theme-card p-2.5 hover:border-turquoise/40 sm:rounded-[2rem] sm:p-3 ${className}`}
      >
        <div className="relative overflow-hidden rounded-[1.35rem]">
          <div
            ref={comparisonRef}
            role="button"
            tabIndex={0}
            onPointerDown={handleComparisonPointerDown}
            onPointerMove={handleComparisonPointerMove}
            onPointerUp={handleComparisonPointerUp}
            onKeyDown={handleComparisonKeyDown}
            aria-label={`פתיחת תמונת אחרי עבור ${title}`}
            className="relative block aspect-[4/3] w-full cursor-ew-resize touch-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-turquoise"
          >
            <ImageWithFallback
              src={afterImage}
              alt={afterAlt || `תמונת אחרי עבור ${title}`}
              fallbackLabel="אחרי"
              className="image-reveal absolute inset-0 h-full w-full"
              imageClassName="object-cover transition duration-500 group-hover:scale-105"
              fallbackClassName="from-turquoise via-white to-cyan-100 text-navy"
              sizes={imageSizes}
            />

            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                clipPath: `polygon(${100 - slider}% 0, 100% 0, 100% 100%, ${100 - slider}% 100%)`,
              }}
            >
              <ImageWithFallback
                src={beforeImage}
                alt={beforeAlt || `תמונת לפני עבור ${title}`}
                fallbackLabel="לפני"
                className="image-reveal absolute inset-0 h-full w-full"
                imageClassName="object-cover transition duration-500 group-hover:scale-105"
                fallbackClassName="from-slate-800 via-slate-600 to-slate-950 text-white"
                sizes={imageSizes}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between">
            <span className="rounded-full border border-white/15 bg-navy/74 px-3 py-1 text-xs font-black text-white backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm">
              לפני
            </span>
            <span className="rounded-full border border-turquoise/35 bg-turquoise px-3 py-1 text-xs font-black text-navy shadow-sm shadow-turquoise/15 sm:px-4 sm:py-1.5 sm:text-sm">
              אחרי
            </span>
          </div>

          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ right: `${slider}%` }}
          >
            <div className="h-full w-px bg-white/90 shadow-[0_0_18px_rgba(39,211,195,0.45)]" />
            <div className="absolute top-1/2 -right-5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-turquoise text-sm font-black text-navy shadow-lg shadow-turquoise/15">
              ↔
            </div>
          </div>

          <input
            type="range"
            min="5"
            max="95"
            value={slider}
            onChange={(event) => setSlider(Number(event.target.value))}
            aria-label={`השוואת לפני ואחרי עבור ${title}`}
            className="absolute inset-x-4 bottom-3 h-3 cursor-ew-resize touch-pan-x appearance-none rounded-full bg-white/35 accent-turquoise backdrop-blur focus:outline-none focus:ring-2 focus:ring-turquoise sm:bottom-4 sm:h-2"
          />

          <div className="absolute bottom-3 left-3 flex gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
            <button
              type="button"
              onClick={() => setLightbox("before")}
              className="rounded-full border border-white/20 bg-navy/68 px-3 py-1 text-xs font-black text-white backdrop-blur-sm transition hover:border-turquoise hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              לפני
            </button>
            <button
              type="button"
              onClick={() => setLightbox("after")}
              className="rounded-full border border-white/20 bg-navy/68 px-3 py-1 text-xs font-black text-white backdrop-blur-sm transition hover:border-turquoise hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              אחרי
            </button>
          </div>
        </div>

        <div className="px-2 py-4 sm:px-3 sm:py-5">
          <h3 className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 theme-muted sm:text-base sm:leading-7">
            {description}
          </p>
        </div>
      </article>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeLabel} - ${title}`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/88 p-4 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] p-3 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="סגירת תמונה"
              className="absolute left-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-navy/78 text-xl font-black text-white backdrop-blur transition hover:bg-turquoise hover:text-navy focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              ×
            </button>
            <div
              className="relative aspect-[4/3] touch-pan-y overflow-hidden rounded-[1.5rem] sm:aspect-[16/10]"
              onPointerDown={handleModalPointerDown}
              onPointerUp={handleModalPointerUp}
            >
              <ImageWithFallback
                src={activeImage}
                alt={activeAlt}
                fallbackLabel={activeLabel}
                className="image-reveal absolute inset-0 h-full w-full"
                imageClassName="object-cover"
                fallbackClassName={
                  lightbox === "before"
                    ? "from-slate-800 via-slate-600 to-slate-950 text-white"
                    : "from-turquoise via-white to-cyan-100 text-navy"
                }
                sizes="95vw"
                priority
              />
              <span className="absolute right-5 top-5 rounded-full border border-turquoise/35 bg-turquoise px-4 py-1.5 text-sm font-black text-navy shadow-sm">
                {activeLabel}
              </span>
              <div className="absolute inset-x-5 bottom-5 flex justify-center gap-2">
                {(["before", "after"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLightbox(mode)}
                    aria-label={`הצגת תמונת ${mode === "before" ? "לפני" : "אחרי"}`}
                    className={`rounded-full border px-4 py-1.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-turquoise ${
                      lightbox === mode
                        ? "border-turquoise bg-turquoise text-navy"
                        : "border-white/20 bg-navy/62 text-white hover:border-turquoise hover:text-turquoise"
                    }`}
                  >
                    {mode === "before" ? "לפני" : "אחרי"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
