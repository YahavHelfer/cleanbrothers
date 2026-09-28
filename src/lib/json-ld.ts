export function serializeJsonLd(data: Record<string, unknown>): string {
  // HTML parses script contents before JSON: removing literal '<' prevents a
  // value such as '</script>' from closing the element. JSON.parse is unchanged.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
