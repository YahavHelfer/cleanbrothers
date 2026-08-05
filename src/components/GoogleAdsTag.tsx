import Script from "next/script";

type GoogleAdsTagProps = {
  adsId: string;
};

export function GoogleAdsTag({ adsId }: GoogleAdsTagProps) {
  return (
    <Script id="google-ads-gtag-config" strategy="afterInteractive">
      {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
          if (!document.getElementById('google-ads-gtag-loader')) {
            var googleTagLoader = document.createElement('script');
            googleTagLoader.id = 'google-ads-gtag-loader';
            googleTagLoader.async = true;
            googleTagLoader.src = 'https://www.googletagmanager.com/gtag/js?id=${adsId}';
            document.head.appendChild(googleTagLoader);
          }
          window.gtag('js', new Date());
          window.gtag('config', '${adsId}');
        `}
    </Script>
  );
}
