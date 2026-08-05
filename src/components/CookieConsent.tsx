"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getStoredConsent,
  subscribeToConsentChanges,
  subscribeToConsentPreferenceRequests,
  updateConsent,
  type ConsentChoice,
} from "@/lib/consent";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>("unknown");
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const hydrationTimeout = window.setTimeout(() => {
      const storedChoice = getStoredConsent();
      setChoice(storedChoice);
      setIsVisible(storedChoice === "unknown");
    }, 0);

    const unsubscribeConsent = subscribeToConsentChanges((nextChoice) => {
      setChoice(nextChoice);
    });
    const unsubscribePreferences = subscribeToConsentPreferenceRequests(() => {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setIsVisible(true);
      window.setTimeout(() => acceptButtonRef.current?.focus(), 0);
    });

    return () => {
      window.clearTimeout(hydrationTimeout);
      unsubscribeConsent();
      unsubscribePreferences();
    };
  }, []);

  function choose(nextChoice: Exclude<ConsentChoice, "unknown">) {
    updateConsent(nextChoice);
    setChoice(nextChoice);
    setIsVisible(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="בחירת העדפות עוגיות"
      aria-modal="false"
      className="fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-3xl rounded-[1.25rem] border border-[var(--card-border)] bg-[var(--card)] p-3.5 text-[var(--foreground)] shadow-[0_18px_44px_rgba(8,19,31,0.18)] sm:bottom-5 sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-bold leading-6 theme-muted">
            ניתן לבחור אם לאפשר כלי מדידה ופרסום. גם ללא הסכמה אפשר לשלוח
            פנייה ולקבל שירות כרגיל. ניתן לשנות את הבחירה בכל עת דרך הקישור
            בתחתית האתר.
          </p>
          {choice !== "unknown" ? (
            <p className="mt-1 text-xs font-bold theme-muted">
              הבחירה הנוכחית: {choice === "accepted" ? "אישור" : "דחייה"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            ref={acceptButtonRef}
            type="button"
            onClick={() => choose("accepted")}
            className="btn-primary inline-flex min-h-10 px-4 py-2 text-xs"
          >
            אישור הכל
          </button>
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="btn-secondary inline-flex min-h-10 px-4 py-2 text-xs"
          >
            דחיית הכל
          </button>
          <Link
            href="/privacy-policy"
            className="btn-secondary inline-flex min-h-10 px-4 py-2 text-xs"
          >
            מדיניות פרטיות
          </Link>
        </div>
      </div>
    </div>
  );
}
