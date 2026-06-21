"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackMetaPixelPageView } from "@/lib/meta-pixel";

type MetaPixelProps = {
  pixelId: string;
};

export function MetaPixel({ pixelId }: MetaPixelProps) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    trackMetaPixelPageView();
  }, [pathname]);

  if (!pixelId) {
    return null;
  }

  const serializedPixelId = JSON.stringify(pixelId);

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        onReady={() => {
          if (process.env.NODE_ENV === "development") {
            console.info("Meta Pixel loaded", pixelId);
          }
        }}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', ${serializedPixelId});
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
