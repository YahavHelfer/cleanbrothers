// Owner-approved 2026-10-29 price revision. Old published CMS snapshots can
// contain the previous prices; reconcile only their exact money phrases while
// retaining all other copy, media and revision identities. No CMS write occurs.
export function applyAcPriceRevision<T>(value: T): T {
  function visit(item: unknown): unknown {
    if (typeof item === "string") return item
      .replaceAll("מזגן עד 2 כ״ס: 199 ₪, מעל 2 כ״ס: 249 ₪", "מזגן עילי בכל הספק: 199 ₪")
      .replaceAll("מזגן עד 2 כ״ס ב־199 ₪", "מזגן עילי ב־199 ₪")
      .replace(/(?<!\d)550\s*₪/g, "450 ₪")
      .replace(/(?<!\d)(?:100|150)\s*₪\s*(?:לכל\s+|ל)תעלה/g, "250 ₪ לכל התעלות יחד");
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object") return Object.fromEntries(
      Object.entries(item).map(([key, entry]) => [key, visit(entry)]),
    );
    return item;
  }
  return visit(value) as T;
}
