"use client";

import { useEffect, useState } from "react";

type Preferences = {
  textScale: number;
  highContrast: boolean;
  highlightLinks: boolean;
};

const storageKey = "cleanbrothers-accessibility-preferences";
const defaultPreferences: Preferences = {
  textScale: 0,
  highContrast: false,
  highlightLinks: false,
};

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function applyPreferences(preferences: Preferences) {
  document.documentElement.style.setProperty(
    "--accessibility-font-scale",
    `${1 + preferences.textScale * 0.08}`,
  );
  document.body.classList.toggle("a11y-high-contrast", preferences.highContrast);
  document.body.classList.toggle("a11y-highlight-links", preferences.highlightLinks);
}

export function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const initialPreferences = readPreferences();
      setPreferences(initialPreferences);
      applyPreferences(initialPreferences);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  function updatePreferences(nextPreferences: Preferences) {
    setPreferences(nextPreferences);
    applyPreferences(nextPreferences);
    localStorage.setItem(storageKey, JSON.stringify(nextPreferences));
  }

  function increaseText() {
    updatePreferences({
      ...preferences,
      textScale: Math.min(preferences.textScale + 1, 3),
    });
  }

  function decreaseText() {
    updatePreferences({
      ...preferences,
      textScale: Math.max(preferences.textScale - 1, -1),
    });
  }

  function reset() {
    updatePreferences(defaultPreferences);
  }

  return (
    <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-3 z-50 sm:bottom-5 sm:right-5">
      {isOpen ? (
        <div
          role="dialog"
          aria-label="אפשרויות נגישות"
          className="mb-2 w-56 rounded-[1.25rem] border border-[var(--card-border)] bg-[var(--card)] p-3 text-[var(--foreground)] shadow-[0_18px_44px_rgba(8,19,31,0.18)]"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-black">כלי נגישות</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="סגירת כלי נגישות"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-turquoise/12 text-sm font-black text-turquoise-dark focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              ×
            </button>
          </div>

          <div className="grid gap-2">
            <button type="button" onClick={increaseText} className="a11y-control-button">
              הגדלת טקסט
            </button>
            <button type="button" onClick={decreaseText} className="a11y-control-button">
              הקטנת טקסט
            </button>
            <button
              type="button"
              onClick={() =>
                updatePreferences({
                  ...preferences,
                  highContrast: !preferences.highContrast,
                })
              }
              aria-pressed={preferences.highContrast}
              className="a11y-control-button"
            >
              ניגודיות גבוהה
            </button>
            <button
              type="button"
              onClick={() =>
                updatePreferences({
                  ...preferences,
                  highlightLinks: !preferences.highlightLinks,
                })
              }
              aria-pressed={preferences.highlightLinks}
              className="a11y-control-button"
            >
              הדגשת קישורים
            </button>
            <button type="button" onClick={reset} className="a11y-control-button">
              איפוס
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="פתיחת כלי נגישות"
        aria-expanded={isOpen}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-turquoise/25 bg-[var(--card)] px-4 py-2 text-xs font-black text-[var(--foreground)] shadow-[0_8px_18px_rgba(8,19,31,0.14)] transition hover:border-turquoise/45 hover:text-turquoise-dark focus:outline-none focus:ring-2 focus:ring-turquoise sm:min-h-11 sm:text-sm"
      >
        נגישות
      </button>
    </div>
  );
}
