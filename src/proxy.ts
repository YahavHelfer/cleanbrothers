import { NextResponse, type NextRequest } from "next/server";
import { createCmsClient } from "@/cms/client";
import { isCmsCookie } from "@/cms/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authenticated = false;
  try {
    const client = createCmsClient({
      getAll: () => request.cookies.getAll(),
      setAll(updates, headers) {
        const cmsUpdates = updates.filter(({ name }) => isCmsCookie(name));
        cmsUpdates.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cmsUpdates.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    });
    const { data, error } = await client.auth.getUser();
    authenticated = !error && !!data.user;
  } catch {
    // Missing config or unavailable Auth must never grant access.
  }
  if (!authenticated && !["/admin/login", "/admin/auth/confirm"].includes(request.nextUrl.pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/login";
    target.search = "";
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

// No public page or business API is included; public cookies remain untouched.
export const config = { matcher: ["/admin/:path*"] };
