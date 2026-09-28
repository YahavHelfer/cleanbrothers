import { NextResponse, type NextRequest } from "next/server";
import { createCmsClient } from "@/cms/client";
import { isCmsCookie } from "@/cms/config";
import { newPagePublicAllowed } from "@/cms/pages/new-environment";

async function localNewPageRoute(request: NextRequest, slug: string): Promise<NextResponse> {
  try {
    const response = await fetch(`${process.env.CMS_SUPABASE_URL}/rest/v1/rpc/cms_resolve_new_page_route`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { apikey: process.env.CMS_SUPABASE_PUBLISHABLE_KEY || "", "Content-Type": "application/json" },
      body: JSON.stringify({ target_slug: slug }),
    });
    if (!response.ok) throw new Error("CMS route unavailable");
    const route = await response.json();
    if (route?.kind === "page") return NextResponse.next();
    if (route?.kind === "redirect" && newPagePublicAllowed(route.destination)) {
      const destination = request.nextUrl.clone();
      destination.pathname = `/${route.destination}`;
      return NextResponse.redirect(destination,308);
    }
  } catch {
    // Public CMS resolution fails closed; never fall through to a stale page.
  }
  return new NextResponse("Not Found", { status: 404, headers: {
    "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow",
  } });
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/admin" && !request.nextUrl.pathname.startsWith("/admin/")) {
    const slug = request.nextUrl.pathname.slice(1);
    if (newPagePublicAllowed(slug)) return localNewPageRoute(request, slug);
    return NextResponse.next();
  }
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

// Only a local, explicitly allowlisted single-segment page gets public route
// resolution. Existing public pages and business APIs remain untouched.
export const config = { matcher: ["/admin/:path*", "/:slug"] };
