"use client";

import Image from "next/image";
import { useState } from "react";

type ImageWithFallbackProps = {
  src?: string;
  alt: string;
  className: string;
  imageClassName?: string;
  fallbackLabel?: string;
  fallbackClassName?: string;
  priority?: boolean;
  preload?: boolean;
  sizes?: string;
};

export function ImageWithFallback({
  src,
  alt,
  className,
  imageClassName = "object-cover",
  fallbackLabel,
  fallbackClassName = "from-navy-soft via-slate-800 to-ink text-white",
  priority = false,
  preload = false,
  sizes = "100vw",
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldShowImage = Boolean(src) && !hasError;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className={`image-skeleton absolute inset-0 transition-opacity duration-500 ${
          isLoaded || !shouldShowImage ? "opacity-0" : "opacity-100"
        }`}
      />

      {shouldShowImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          preload={preload || priority}
          sizes={sizes}
          decoding="async"
          className={`${imageClassName} transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br p-6 text-center text-lg font-black ${fallbackClassName}`}
        >
          {fallbackLabel || alt}
        </div>
      )}
    </div>
  );
}
