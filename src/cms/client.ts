import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cmsCookieOptions, getCmsConfig, isCmsCookie } from "./config";
import { s3MediaEnvironment } from "./media/environment";

const scopedMediaMutationRpcs = new Set([
  "cms_save_service_draft", "cms_publish_service_revision",
  "cms_save_managed_draft", "cms_publish_managed_revision",
  "cms_save_page_draft", "cms_publish_page_revision",
  "cms_save_promotion_draft", "cms_publish_promotion_revision",
  "cms_save_new_page_draft", "cms_publish_new_page", "cms_duplicate_new_page",
  "cms_save_home_draft", "cms_save_home_shared_draft", "cms_publish_home_revision",
]);

export function createCmsClient(cookies: CookieMethodsServer, mediaScopeMutation = false) {
  const { url, key } = getCmsConfig();
  const capability = mediaScopeMutation && s3MediaEnvironment()
    ? process.env.CMS_MEDIA_UPLOAD_CAPABILITY : null;
  if (capability && !/^[0-9a-f]{64}$/.test(capability))
    throw new Error("CMS media scope capability unavailable");
  return createServerClient(url, key, {
    cookieOptions: cmsCookieOptions,
    cookies: {
      getAll: async () => (await cookies.getAll() ?? []).filter(({ name }) => isCmsCookie(name)),
      setAll: cookies.setAll,
    },
    global: {
      fetch: (input, init) => {
        const target = input instanceof Request ? input.url : String(input);
        // Only PostgREST RPC writes receive this server-only proof. Never send
        // it to Auth, Storage, the browser, or an unrelated origin.
        const prefix = `${url}/rest/v1/rpc/`;
        const rpc = target.startsWith(prefix) &&
          scopedMediaMutationRpcs.has(target.slice(prefix.length).split(/[?#]/, 1)[0]);
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
        headers.delete("x-cms-media-scope-capability");
        if (rpc && capability) headers.set("x-cms-media-scope-capability", capability);
        return fetch(input, {
          ...init,
          headers,
          cache: "no-store",
          signal: init?.signal ?? AbortSignal.timeout(8000),
        });
      },
    },
  });
}
