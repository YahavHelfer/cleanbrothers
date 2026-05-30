import { Icon } from "@/components/Icon";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-page-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(39,211,195,0.18),_transparent_32%)]" />
      <div className="section-container relative py-10 sm:py-18 lg:py-22">
        <div className="max-w-4xl">
          <p className="reveal stagger-1 mb-4 inline-flex items-center gap-2 rounded-full border border-turquoise/30 bg-turquoise/10 px-3.5 py-1.5 text-xs font-black text-turquoise sm:mb-5 sm:px-4 sm:py-2 sm:text-sm">
            <Icon name="sparkles" className="h-4 w-4" />
            {eyebrow}
          </p>
          <h1 className="reveal stagger-2 text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="reveal stagger-3 mt-4 max-w-3xl text-base leading-7 text-white/78 sm:mt-6 sm:text-xl sm:leading-8">
            {description}
          </p>

          {ctaLabel && ctaHref ? (
            <a
              href={ctaHref}
              aria-label={ctaLabel}
              className="btn-primary reveal stagger-4 mt-6 inline-flex sm:mt-8"
            >
              {ctaLabel}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
