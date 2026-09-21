import "server-only";
import { cookies } from "next/headers";
import { createCmsClient } from "./client";
import { cmsCookieOptions, isCmsCookie } from "./config";

export async function createCmsServerClient(writable = false) {
  const store = await cookies();
  return createCmsClient({
    getAll: () => store.getAll(),
    setAll: writable ? (updates) => {
      for (const { name, value, options } of updates) {
        if (isCmsCookie(name)) store.set(name, value, options);
      }
    } : undefined, // Proxy refreshes cookies before Server Components render.
  });
}

export async function clearCmsCookies() {
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (isCmsCookie(name)) store.set(name, "", { ...cmsCookieOptions, maxAge: 0 });
  }
}
