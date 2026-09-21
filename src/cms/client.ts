import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cmsCookieOptions, getCmsConfig, isCmsCookie } from "./config";

export function createCmsClient(cookies: CookieMethodsServer) {
  const { url, key } = getCmsConfig();
  return createServerClient(url, key, {
    cookieOptions: cmsCookieOptions,
    cookies: {
      getAll: async () => (await cookies.getAll() ?? []).filter(({ name }) => isCmsCookie(name)),
      setAll: cookies.setAll,
    },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: "no-store",
        signal: init?.signal ?? AbortSignal.timeout(8000),
      }),
    },
  });
}
