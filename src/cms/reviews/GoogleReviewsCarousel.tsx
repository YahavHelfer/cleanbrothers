"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GoogleReviews } from "./model";

export type GoogleReviewsPresentation = {
  eyebrow: string; title: string; description: string; showRatingSummary: boolean;
};

export function GoogleReviewsCarousel({ content, source, preview = false }: {
  content: GoogleReviewsPresentation; source: GoogleReviews; preview?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const count = source.reviews.length;
  const go = useCallback((next: number) => {
    const target = (next + count) % count;
    setIndex(target);
    track.current?.children[target]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || interacted) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => go(index + 1), 5500);
    return () => window.clearInterval(timer);
  }, [count, go, index, interacted, paused]);

  if (!count) return null;
  return <section aria-labelledby="google-reviews-title" data-active-review={index}
    data-paused={paused || interacted} data-attention-paused={paused} dir="rtl" className="overflow-hidden py-14 sm:py-20"
    onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    onPointerDown={() => setInteracted(true)} onTouchStart={() => setInteracted(true)}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="font-bold text-turquoise">{content.eyebrow}</p>
      <h2 id="google-reviews-title" className="mt-2 text-3xl font-black sm:text-4xl">{content.title}</h2>
      <p className="mt-3 max-w-3xl">{content.description}</p>
      {content.showRatingSummary && <div className="mt-5 flex flex-wrap items-center gap-2" aria-label={`דירוג Google ${source.rating} מתוך 5, ${source.userRatingCount} דירוגים`}>
        <strong>{source.rating} / 5</strong><span aria-hidden="true">★</span>
        <span>מתוך {source.userRatingCount} דירוגים ב־Google Maps</span>
      </div>}
      <p className="mt-2 text-sm">מקור: Google Maps · הביקורות מוצגות לפי סדר הרלוונטיות שמוחזר מ־Google Maps</p>
      {preview ? <p className="mt-2 text-sm">צפייה בעסק ב־Google Maps</p> :
        <a href={source.googleMapsUri} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline">צפייה בעסק ב־Google Maps</a>}
      <div className="mt-6 flex items-center justify-end gap-2">
        <button type="button" aria-label="ביקורת קודמת" disabled={count < 2}
          onClick={() => { setInteracted(true); go(index - 1); }}
          className="rounded-full border px-4 py-2 focus-visible:outline-2 focus-visible:outline-turquoise disabled:opacity-50">→</button>
        <button type="button" aria-label="ביקורת הבאה" disabled={count < 2}
          onClick={() => { setInteracted(true); go(index + 1); }}
          className="rounded-full border px-4 py-2 focus-visible:outline-2 focus-visible:outline-turquoise disabled:opacity-50">←</button>
      </div>
      <div ref={track} role="region" aria-label="ביקורות Google" tabIndex={0}
        onKeyDown={event => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault(); setInteracted(true); go(index + (event.key === "ArrowLeft" ? 1 : -1));
          }
        }}
        className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 scroll-smooth">
        {source.reviews.map((review, position) => <article key={`${review.googleMapsUri}-${position}`}
          className="min-w-0 shrink-0 basis-full snap-start rounded-2xl border theme-card p-5 sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]">
          <p aria-label={`${review.rating} כוכבים מתוך 5`}><span aria-hidden="true">{"★".repeat(Math.round(review.rating))}{"☆".repeat(5 - Math.round(review.rating))}</span></p>
          <p className="mt-3 whitespace-pre-wrap break-words">{review.text}</p>
          <div className="mt-5 flex items-center gap-3">
            {review.author.photoUri && <Image src={review.author.photoUri} alt="" width={40} height={40}
              unoptimized className="size-10 rounded-full object-cover" />}
            <div><p className="font-bold">{preview ? review.author.displayName :
              <a href={review.author.uri} target="_blank" rel="noopener noreferrer" className="underline">{review.author.displayName}</a>}</p>
              {review.relativePublishTimeDescription && <p className="text-sm">{review.relativePublishTimeDescription}</p>}
            </div>
          </div>
          {preview ? <p className="mt-4 text-sm">מקור הביקורת: Google Maps</p> :
            <a href={review.googleMapsUri} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm underline">הביקורת ב־Google Maps</a>}
        </article>)}
      </div>
    </div>
  </section>;
}
