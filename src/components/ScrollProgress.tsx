"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    function updateProgress() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress =
          scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, nextProgress)));
      });
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[90] h-1 bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full origin-right bg-gradient-to-l from-turquoise via-cyan-200 to-clean-blue shadow-[0_0_18px_rgba(39,211,195,0.45)] transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
