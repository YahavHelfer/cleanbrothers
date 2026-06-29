"use client";

import Image from "next/image";
import { useState } from "react";

type YouTubeLiteEmbedProps = {
  videoId: string;
  title: string;
  poster: string;
  watchUrl: string;
};

export function YouTubeLiteEmbed({
  videoId,
  title,
  poster,
  watchUrl,
}: YouTubeLiteEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="mx-auto mt-7 w-full max-w-sm sm:mt-10">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border border-white/15 bg-black shadow-2xl">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <>
            <Image
              src={poster}
              alt=""
              fill
              className="object-cover object-center"
              sizes="(min-width: 640px) 384px, 100vw"
            />
            <div className="absolute inset-0 bg-navy/30" />
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label={`הפעלת הסרטון: ${title}`}
              className="absolute left-1/2 top-1/2 flex min-h-20 min-w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-turquoise text-navy shadow-xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <span
                aria-hidden="true"
                className="ml-1 block h-0 w-0 border-y-[13px] border-l-[22px] border-y-transparent border-l-navy"
              />
            </button>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-sm leading-6 text-white/70">
        נגן YouTube נטען רק לאחר לחיצה על כפתור ההפעלה.
      </p>
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto mt-3 flex min-h-11 w-fit items-center justify-center font-black text-turquoise underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
      >
        צפייה בסרטון ב-YouTube
      </a>
    </div>
  );
}
