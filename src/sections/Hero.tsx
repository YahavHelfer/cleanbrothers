import Image from "next/image";
import { ImageWithFallback } from "@/components/ImageWithFallback";

const trustChips = [
  "שירות עד הבית",
  "הצעת מחיר מהירה",
  "תוצאה נקייה",
];

const mascotAlt = "CleanBrothers cleaning professionals mascots";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-page-hero">
      <ImageWithFallback
        src="/images/hero/hero-sofa-cleaning.jpg"
        alt="ניקוי ספה מקצועי בבית הלקוח"
        className="image-reveal absolute inset-0 h-full w-full"
        imageClassName="object-cover object-[58%_48%] sm:object-[55%_45%] lg:object-[50%_45%]"
        fallbackLabel=""
        fallbackClassName="from-navy via-navy-soft to-ink"
        preload
      />
      <div className="absolute inset-0 bg-navy/14" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,_rgba(8,19,31,0.02)_0%,_rgba(8,19,31,0.22)_54%,_rgba(8,19,31,0.5)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(8,19,31,0.10)_0%,_rgba(8,19,31,0.14)_42%,_rgba(8,19,31,0.52)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-turquoise/45 to-transparent" />

      <div className="section-container relative flex min-h-[calc(100svh-74px)] items-center justify-center py-8 pb-12 sm:py-18 lg:min-h-[calc(100vh-168px)] lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-7 [direction:ltr] lg:grid-cols-[0.86fr_1.14fr] lg:gap-12">
          <div className="reveal-soft stagger-1 relative mx-auto mb-1 w-full max-w-[16rem] sm:max-w-[20rem] lg:mb-0 lg:max-w-[34rem]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(39,211,195,0.26)_0%,_rgba(47,128,237,0.12)_45%,_transparent_72%)] blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[22%] w-[68%] -translate-x-1/2 rounded-full bg-turquoise/14 blur-2xl" />
            <Image
              src="/images/mascots/cleanbrothers-mascots.png"
              alt={mascotAlt}
              width={1536}
              height={1024}
              className="mascot-float relative h-auto w-full object-contain"
              sizes="(min-width: 1024px) 544px, (min-width: 640px) 320px, 256px"
              priority
            />
          </div>

          <div className="mx-auto max-w-4xl text-center [direction:rtl] lg:text-right">
          <Image
            src="/images/logo/cleanbrothers-logo.png"
            alt="CleanBrothers"
            width={280}
            height={160}
            className="reveal-soft stagger-1 mx-auto mb-5 hidden h-auto w-[12.5rem] object-contain drop-shadow-[0_16px_42px_rgba(8,19,31,0.46)] sm:block lg:mx-0 lg:mb-6 lg:w-[16rem]"
            sizes="(min-width: 1024px) 256px, 200px"
            preload
          />

          <p className="reveal stagger-2 mb-3 inline-flex rounded-full border border-white/18 bg-navy/30 px-3 py-1.5 text-xs font-bold text-turquoise backdrop-blur sm:mb-5 sm:px-4 sm:py-2 sm:text-sm lg:mb-4">
            CleanBrothers
          </p>

          <h1 className="reveal stagger-3 mx-auto max-w-4xl text-[2rem] font-black leading-[1.13] text-white min-[380px]:text-[2.18rem] sm:text-5xl lg:mx-0 lg:text-[4.05rem]">
            ניקוי ספות, מזרנים, שטיחים ורכבים ברמה מקצועית
          </h1>

          <p className="reveal stagger-4 mx-auto mt-4 max-w-2xl text-base leading-7 text-white/86 sm:mt-6 sm:text-xl sm:leading-9 lg:mx-0">
            CleanBrothers מגיעים עד אליכם עם ציוד מקצועי, חומרי ניקוי איכותיים
            ושירות אמין שמחזיר לריפודים את המראה הנקי והחדש.
          </p>

          <div className="reveal stagger-5 mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-1.5 sm:mt-8 sm:gap-2 lg:mx-0 lg:justify-start">
            {trustChips.map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/12 bg-navy/26 px-2.5 py-1 text-[0.7rem] font-black text-white/84 backdrop-blur-md transition duration-300 hover:border-turquoise/35 hover:text-turquoise sm:px-3 sm:py-1.5 sm:text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
