"use client";

import { useEffect, useState } from "react";

type TextSize = "base" | "lg" | "xl";

type Preferences = {
  textSize: TextSize;
  highContrast: boolean;
  highlightLinks: boolean;
};

const storageKey = "cleanbrothers-accessibility-preferences";
const accessibilityClasses = [
  "a11y-text-lg",
  "a11y-text-xl",
  "a11y-high-contrast",
  "a11y-highlight-links",
];
const defaultPreferences: Preferences = {
  textSize: "base",
  highContrast: false,
  highlightLinks: false,
};

function normalizePreferences(value: Partial<Preferences> & { textScale?: number }): Preferences {
  let textSize: TextSize = "base";

  if (value.textSize === "lg" || value.textSize === "xl") {
    textSize = value.textSize;
  } else if (typeof value.textScale === "number") {
    textSize = value.textScale >= 2 ? "xl" : value.textScale >= 1 ? "lg" : "base";
  }

  return {
    textSize,
    highContrast: Boolean(value.highContrast),
    highlightLinks: Boolean(value.highlightLinks),
  };
}

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? normalizePreferences(JSON.parse(stored)) : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  root.classList.remove(...accessibilityClasses);

  if (preferences.textSize === "lg") {
    root.classList.add("a11y-text-lg");
  }

  if (preferences.textSize === "xl") {
    root.classList.add("a11y-text-xl");
  }

  if (preferences.highContrast) {
    root.classList.add("a11y-high-contrast");
  }

  if (preferences.highlightLinks) {
    root.classList.add("a11y-highlight-links");
  }
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
      textSize: preferences.textSize === "base" ? "lg" : "xl",
    });
  }

  function decreaseText() {
    updatePreferences({
      ...preferences,
      textSize: preferences.textSize === "xl" ? "lg" : "base",
    });
  }

  function reset() {
    setPreferences(defaultPreferences);
    applyPreferences(defaultPreferences);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-50 sm:bottom-5 sm:right-5">
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
            <button
              type="button"
              onClick={increaseText}
              aria-pressed={preferences.textSize !== "base"}
              className="a11y-control-button"
            >
              הגדלת טקסט
            </button>
            <button
              type="button"
              onClick={decreaseText}
              aria-pressed={preferences.textSize === "base"}
              className="a11y-control-button"
            >
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
