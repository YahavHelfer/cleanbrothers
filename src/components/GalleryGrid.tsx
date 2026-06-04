"use client";

import { useMemo, useState } from "react";
import { BeforeAfterCard } from "@/components/BeforeAfterCard";
import { galleryItems } from "@/data/site";

const filters = [
  { label: "הכל", value: "all" },
  { label: "ספות", value: "sofas" },
  { label: "מזרנים", value: "mattresses" },
  { label: "רכבים", value: "cars" },
  { label: "שטיחים", value: "carpets" },
] as const;

type FilterValue = (typeof filters)[number]["value"];

export function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") {
      return galleryItems;
    }

    return galleryItems.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  return (
    <div>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mb-8 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              aria-pressed={isActive}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition duration-300 focus:outline-none focus:ring-2 focus:ring-turquoise ${
                isActive
                  ? "border-turquoise bg-turquoise text-navy shadow-lg shadow-turquoise/20"
                  : "theme-glass text-[var(--foreground)] hover:border-turquoise/45 hover:text-turquoise-dark"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {filteredItems.map((item, index) => (
          <BeforeAfterCard
            key={item.title}
            className={`reveal stagger-${(index % 4) + 1}`}
            title={item.title}
            description={item.description}
            beforeImage={item.beforeImage}
            afterImage={item.afterImage}
            beforeAlt={item.beforeAlt}
            afterAlt={item.afterAlt}
            variant="gallery"
          />
        ))}
      </div>
    </div>
  );
}
