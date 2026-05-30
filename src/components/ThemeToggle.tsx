"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem("cleanbrothers-theme") === "dark"
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("cleanbrothers-theme", nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      aria-pressed={isDark}
      className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass)] text-[var(--foreground)] shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-turquoise/45 hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise focus:ring-offset-2 focus:ring-offset-[var(--background)] sm:h-11 sm:w-11"
    >
      <svg
        className="h-5 w-5 transition duration-300 group-hover:scale-105"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {isDark ? (
          <>
            <path
              d="M12 5V3M12 21v-2M5 12H3M21 12h-2M6.8 6.8 5.4 5.4M18.6 18.6l-1.4-1.4M17.2 6.8l1.4-1.4M5.4 18.6l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </>
        ) : (
          <path
            d="M20 14.2A7.4 7.4 0 0 1 9.8 4 8 8 0 1 0 20 14.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
