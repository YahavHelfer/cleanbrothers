import { serializeJsonLd } from "@/lib/json-ld";

type JsonLdProps = {
  data: Record<string, unknown>;
  id: string;
};

export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
