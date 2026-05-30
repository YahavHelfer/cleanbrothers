type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  tone?: "dark" | "light";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "dark",
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "mx-auto text-center" : "text-start";
  const titleColor =
    tone === "light" ? "text-[var(--foreground)]" : "text-[var(--inverse)]";
  const descriptionColor =
    tone === "light" ? "text-[var(--muted)]" : "text-[var(--inverse-muted)]";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p className="text-xs font-bold text-turquoise sm:text-sm">{eyebrow}</p>
      <h2 className={`mt-1.5 text-[1.45rem] font-bold leading-tight sm:mt-3 sm:text-4xl ${titleColor}`}>
        {title}
      </h2>
      {description ? (
        <p className={`mt-2.5 text-[0.95rem] leading-6 sm:mt-4 sm:text-lg sm:leading-8 ${descriptionColor}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
