import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonLd } from "../src/lib/json-ld.ts";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

test("JSON-LD strings cannot terminate the script context, including nested and mixed-case payloads", () => {
  const data = {
    "@context": "https://schema.org",
    name: '</script><script>alert("unsafe")</script>',
    nested: [{ text: "</ScRiPt ><img src=x onerror=alert(1)>" }],
    "<!--key-->": "<!-- <script> & > \u2028 \u2029 ניקוי ריפודים",
  };
  const serialized = serializeJsonLd(data);
  assert.equal(serialized.includes("<"), false);
  assert.match(serialized, /\\u003c\/script>/);
  assert.deepEqual(JSON.parse(serialized), data);
});

test("existing structured-data values retain their JSON meaning", () => {
  const load = createSourceLoader();
  const structured = load("src/lib/structured-data.ts");
  for (const data of Object.values(structured)) {
    assert.deepEqual(JSON.parse(serializeJsonLd(data)), plain(data));
  }
  const data = { price: 12.5, enabled: false, absent: null, values: ["עברית", "a & b", "a > b"] };
  assert.equal(serializeJsonLd(data), JSON.stringify(data));
});

test("JsonLd uses the hardened serializer while preserving its script id and MIME type", () => {
  const { JsonLd } = createSourceLoader()("src/components/JsonLd.tsx");
  const data = { name: "</script><script>unsafe</script>" };
  const script = JsonLd({ id: "security-regression", data });
  assert.equal(script.props.id, "security-regression");
  assert.equal(script.props.type, "application/ld+json");
  assert.equal(script.props.dangerouslySetInnerHTML.__html, serializeJsonLd(data));
  assert.equal(script.props.dangerouslySetInnerHTML.__html.includes("<"), false);
});
