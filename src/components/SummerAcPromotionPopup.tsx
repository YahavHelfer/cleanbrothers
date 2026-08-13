"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackGoogleAnalyticsEvent } from "@/lib/google-analytics";
import { getWhatsAppLink } from "@/lib/whatsapp";

const STORAGE_KEY = "cleanbrothers:summer-ac-promotion-shown";
const POPUP_DELAY_MS = 10_000;
const SCROLL_TRIGGER_DEPTH = 0.3;
const whatsappHref = getWhatsAppLink(
  "היי CleanBrothers, הגעתי ממבצע הקיץ לניקוי מזגנים ואשמח לקבל הצעת מחיר.",
);

export function SummerAcPromotionPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const showPopup = useCallback(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // The promotion can still be shown when storage is unavailable.
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
    trackGoogleAnalyticsEvent("promotion_popup_impression");
  }, []);

  const closePopup = useCallback(() => {
    setIsOpen(false);
    trackGoogleAnalyticsEvent("promotion_popup_close");
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Continue with the in-memory lifecycle when storage is unavailable.
    }

    const timer = window.setTimeout(showPopup, POPUP_DELAY_MS);
    const handleScroll = () => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      if (window.scrollY / scrollableHeight >= SCROLL_TRIGGER_DEPTH) {
        showPopup();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showPopup]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePopup, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/55 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summer-ac-promotion-title"
        aria-describedby="summer-ac-promotion-description"
        className="theme-card relative max-h-[calc(100svh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-turquoise/30 p-5 shadow-[0_28px_90px_rgba(8,19,31,0.32)] sm:rounded-[2rem] sm:p-8"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closePopup}
          aria-label="סגירת מבצע הקיץ"
          className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card)] text-xl font-black theme-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise sm:left-4 sm:top-4"
        >
          ×
        </button>

        <div className="pr-0 text-center sm:px-3">
          <p className="inline-flex rounded-full border border-turquoise/25 bg-turquoise/10 px-3 py-1.5 text-xs font-black text-turquoise-dark sm:text-sm">
            מבצע קיץ ☀️
          </p>
          <h2
            id="summer-ac-promotion-title"
            className="mx-auto mt-3 max-w-md text-3xl font-black leading-tight sm:text-4xl"
          >
            ניקוי מזגן החל מ־<span className="text-turquoise-dark">199 ₪</span>
          </h2>
          <p className="mt-1.5 text-sm font-bold theme-muted">
            במקום <span className="line-through decoration-2">250 ₪</span>
          </p>

          <div className="mt-4 rounded-2xl border border-turquoise/25 bg-turquoise/[0.08] px-4 py-3 sm:mt-5">
            <p className="text-lg font-black sm:text-xl">
              מנקים 5 מזגנים — המזגן ה־6 עלינו!
            </p>
          </div>

          <p
            id="summer-ac-promotion-description"
            className="mx-auto mt-4 max-w-md text-sm leading-6 theme-muted sm:text-base sm:leading-7"
          >
            שלחו לנו תמונות של המזגנים בוואטסאפ וקבלו הצעת מחיר מדויקת.
          </p>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackGoogleAnalyticsEvent("promotion_whatsapp_click")
            }
            className="btn-primary mt-4 inline-flex min-h-12 w-full px-5 text-base sm:mt-5"
          >
            שלחו תמונות וקבלו מחיר
          </a>

          <p className="mt-4 text-right text-[0.7rem] leading-5 theme-muted sm:text-xs">
            המחיר הסופי נקבע לפי סוג המזגן, מצבו, הנגישות ומיקום השירות. מבצע
            המזגן השישי מתייחס לניקוי במסגרת אותו ביקור ובאותה כתובת, בכפוף
            להתאמת המזגנים לשירות.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
