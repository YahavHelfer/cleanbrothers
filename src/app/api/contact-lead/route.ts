import { NextResponse } from "next/server";

const CRM_LEAD_ENDPOINT =
  "https://cleanbrothers-crm.vercel.app/api/integrations/leads/website";
const SUBMISSION_ERROR =
  "אירעה שגיאה בשליחת הפרטים, נסו שוב או צרו קשר בוואטסאפ.";

type ContactLead = {
  full_name: string;
  phone: string;
  service: string;
  city: string;
  message: string;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "הבקשה אינה תקינה. בדקו את הפרטים ונסו שוב." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "הבקשה אינה תקינה. בדקו את הפרטים ונסו שוב." },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;
  const lead: ContactLead = {
    full_name: readString(data.full_name),
    phone: readString(data.phone),
    service: readString(data.service),
    city: readString(data.city),
    message: readString(data.message),
  };

  if (!lead.full_name || !lead.phone || !lead.service) {
    return NextResponse.json(
      { error: "יש למלא שם מלא, מספר טלפון וסוג שירות." },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.CRM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CRM_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: SUBMISSION_ERROR }, { status: 500 });
  }

  try {
    // Keep the CRM secret on the server and forward only validated lead fields.
    const crmResponse = await fetch(CRM_LEAD_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": webhookSecret,
      },
      body: JSON.stringify(lead),
      cache: "no-store",
    });

    if (!crmResponse.ok) {
      console.error(`CRM lead webhook returned ${crmResponse.status}`);
      return NextResponse.json({ error: SUBMISSION_ERROR }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to forward contact lead to CRM", error);
    return NextResponse.json({ error: SUBMISSION_ERROR }, { status: 502 });
  }
}
