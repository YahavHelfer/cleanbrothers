"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getServiceImages } from "@/lib/service-images";

const AUTOPLAY_INTERVAL = 4500;
const SWIPE_THRESHOLD = 42;

type ServiceImageCarouselProps = {
  images?: readonly string[];
  src?: string;
  alt: string;
  className: string;
  imageClassName?: string;
  imagePosition?: string;
  imagePositions?: Record<string, string>;
  fallbackLabel?: string;
  fallbackClassName?: string;
  sizes?: string;
  priority?: boolean;
  preload?: boolean;
};

export function ServiceImageCarousel({
  images,
  src,
  alt,
  className,
  imageClassName = "object-cover",
  imagePosition = "object-center",
  imagePositions,
  fallbackLabel,
  fallbackClassName,
  sizes = "100vw",
  priority = false,
  preload = false,
}: ServiceImageCarouselProps) {
  const resolvedImages = useMemo(
    () => getServiceImages({ image: src, images }),
    [images, src],
  );
  const imageCount = resolvedImages.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const carouselId = useId();
  const safeIndex = imageCount ? activeIndex % imageCount : 0;
  const activeImage = resolvedImages[safeIndex];
  const hasMultipleImages = imageCount > 1;
  const isPaused =
    isHovered || isFocused || !isDocumentVisible || prefersReducedMotion;

  const showPrevious = useCallback(() => {
    if (!imageCount) return;
    setActiveIndex((current) => (current - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const showNext = useCallback(() => {
    if (!imageCount) return;
    setActiveIndex((current) => (current + 1) % imageCount);
  }, [imageCount]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () =>
      mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () =>
      setIsDocumentVisible(document.visibilityState === "visible");

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);

    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!hasMultipleImages || isPaused) return;

    const timer = window.setInterval(showNext, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [hasMultipleImages, isPaused, showNext]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(imageCount - 1);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX === undefined) return;

    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  if (!hasMultipleImages) {
    return (
      <ImageWithFallback
        src={activeImage}
        alt={alt}
        fallbackLabel={fallbackLabel}
        className={className}
        imageClassName={`${imageClassName} ${
          (activeImage && imagePositions?.[activeImage]) || imagePosition
        }`}
        fallbackClassName={fallbackClassName}
        sizes={sizes}
        priority={priority}
        preload={preload}
      />
    );
  }

  return (
    <div
      id={carouselId}
      role="region"
      aria-roledescription="carousel"
      aria-label={`גלריית תמונות עבור ${alt}`}
      tabIndex={0}
      className={`touch-pan-y ${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2`}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ImageWithFallback
        key={activeImage}
        src={activeImage}
        alt={`${alt}, תמונה ${safeIndex + 1} מתוך ${imageCount}`}
        fallbackLabel={fallbackLabel}
        className="absolute inset-0 h-full w-full"
        imageClassName={`${imageClassName} ${
          imagePositions?.[activeImage] || imagePosition
        }`}
        fallbackClassName={fallbackClassName}
        sizes={sizes}
        priority={priority && safeIndex === 0}
        preload={preload && safeIndex === 0}
      />

      <button
        type="button"
        aria-label={`התמונה הקודמת של ${alt}`}
        aria-controls={carouselId}
        onClick={showPrevious}
        className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-navy/65 text-xl font-black text-white shadow-lg backdrop-blur transition hover:bg-navy/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-3 sm:h-10 sm:w-10"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        aria-label={`התמונה הבאה של ${alt}`}
        aria-controls={carouselId}
        onClick={showNext}
        className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-navy/65 text-xl font-black text-white shadow-lg backdrop-blur transition hover:bg-navy/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-3 sm:h-10 sm:w-10"
      >
        <span aria-hidden="true">›</span>
      </button>

      <div
        role="group"
        aria-label="בחירת תמונה"
        className="absolute bottom-2 left-1/2 z-20 flex max-w-[calc(100%-5rem)] -translate-x-1/2 items-center justify-center rounded-full bg-navy/55 px-1 backdrop-blur sm:bottom-3"
      >
        {resolvedImages.map((image, index) => (
          <button
            key={image}
            type="button"
            aria-label={`הצגת תמונה ${index + 1} מתוך ${imageCount}`}
            aria-current={index === safeIndex ? "true" : undefined}
            onClick={() => setActiveIndex(index)}
            className="flex h-8 w-7 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span
              aria-hidden="true"
              className={`h-2 rounded-full transition-[width,background-color] ${
                index === safeIndex ? "w-4 bg-turquoise" : "w-2 bg-white/70"
              }`}
            />
          </button>
        ))}
      </div>

      <span
        className="sr-only"
        aria-live={isPaused ? "polite" : "off"}
        aria-atomic="true"
      >
        תמונה {safeIndex + 1} מתוך {imageCount}
      </span>
    </div>
  );
}
