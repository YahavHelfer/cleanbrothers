import Script from "next/script";
import { serializeJsonLd } from "@/lib/json-ld";

type JsonLdProps = {
  data: Record<string, unknown>;
  id: string;
};

export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
