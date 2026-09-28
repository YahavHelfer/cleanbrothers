import { NextResponse } from "next/server";
import { getCmsAppOrigin } from "@/cms/config";
import { cmsInvitationRequestUrl, confirmCmsInvitation } from "@/cms/invitation";
import { clearCmsCookies, createCmsServerClient } from "@/cms/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let destination = "/admin/login?error=invite";
  try {
    // Validate before creating a client or consuming a one-use invitation.
    const invitationUrl = cmsInvitationRequestUrl(request.url, request.headers.get("host"), request.headers.get("x-forwarded-proto"));
    const client = await createCmsServerClient(true);
    try {
      await confirmCmsInvitation(client, invitationUrl);
      destination = "/admin/onboarding/password";
    } catch {
      try { await client.auth.signOut({ scope: "local" }); }
      finally { await clearCmsCookies(); }
    }
  } catch {
    // Deliberately no Auth details, token hashes or URL logging.
  }
  // Configured origin only; never reflect Host, next, redirect_to or fragments.
  let origin: string;
  try { origin = getCmsAppOrigin(); } catch {
    return new Response("הכניסה אינה זמינה כרגע.", { status: 503, headers: {
      "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer",
    } });
  }
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
