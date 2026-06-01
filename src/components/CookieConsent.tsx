"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = "cleanbrothers-cookie-consent";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsVisible(localStorage.getItem(storageKey) !== "approved");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function approve() {
    localStorage.setItem(storageKey, "approved");
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="הודעת שימוש בקוקיז"
      className="fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-3xl rounded-[1.25rem] border border-[var(--card-border)] bg-[var(--card)] p-3.5 text-[var(--foreground)] shadow-[0_18px_44px_rgba(8,19,31,0.18)] sm:bottom-5 sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="text-sm font-bold leading-6 theme-muted">
          אנחנו משתמשים בקוקיז בסיסיים לשיפור חוויית המשתמש, מדידת שימוש באתר
          ופנייה נוחה בוואטסאפ. המשך שימוש באתר מהווה הסכמה למדיניות הפרטיות
          והשימוש בקוקיז.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={approve}
            className="btn-primary inline-flex min-h-10 px-4 py-2 text-xs"
          >
            אישור
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
