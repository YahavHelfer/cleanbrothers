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
  referenceId: string;
  marketingAttribution?: MarketingAttribution;
};

type MarketingAttribution = Partial<
  Record<
    | "gclid"
    | "gbraid"
    | "wbraid"
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_content"
    | "utm_term"
    | "landing_page"
    | "referrer",
    string
  >
>;

const MARKETING_ATTRIBUTION_FIELD_LIMITS = {
  gclid: 256,
  gbraid: 256,
  wbraid: 256,
  utm_source: 120,
  utm_medium: 120,
  utm_campaign: 200,
  utm_content: 200,
  utm_term: 200,
  landing_page: 1024,
  referrer: 2048,
} as const;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readLimitedString(value: unknown, maxLength: number) {
  return readString(value).slice(0, maxLength);
}

function sanitizeMarketingAttribution(value: unknown): MarketingAttribution {
  if (!value || typeof value !== "object") {
    return {};
  }

  const data = value as Record<string, unknown>;
  const attribution: MarketingAttribution = {};

  for (const [field, maxLength] of Object.entries(
    MARKETING_ATTRIBUTION_FIELD_LIMITS,
  ) as Array<
    [
      keyof typeof MARKETING_ATTRIBUTION_FIELD_LIMITS,
      (typeof MARKETING_ATTRIBUTION_FIELD_LIMITS)[keyof typeof MARKETING_ATTRIBUTION_FIELD_LIMITS],
    ]
  >) {
    const fieldValue = readLimitedString(data[field], maxLength);

    if (fieldValue) {
      attribution[field] = fieldValue;
    }
  }

  return attribution;
}

function readIdentifier(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function readNestedIdentifier(
  data: Record<string, unknown>,
  path: readonly string[],
) {
  let current: unknown = data;

  for (const key of path) {
    if (!current || typeof current !== "object") {
      return "";
    }

    current = (current as Record<string, unknown>)[key];
  }

  return readIdentifier(current);
}

function extractStableLeadId(data: unknown, fallbackLeadId: string) {
  if (!data || typeof data !== "object") {
    return fallbackLeadId;
  }

  const responseData = data as Record<string, unknown>;
  const candidate =
    readIdentifier(responseData.leadId) ||
    readIdentifier(responseData.id) ||
    readIdentifier(responseData.crmLeadId) ||
    readIdentifier(responseData.referenceId) ||
    readNestedIdentifier(responseData, ["lead", "id"]) ||
    readNestedIdentifier(responseData, ["lead", "leadId"]) ||
    readNestedIdentifier(responseData, ["lead", "crmLeadId"]) ||
    readNestedIdentifier(responseData, ["lead", "referenceId"]) ||
    readNestedIdentifier(responseData, ["data", "id"]) ||
    readNestedIdentifier(responseData, ["data", "leadId"]) ||
    readNestedIdentifier(responseData, ["data", "crmLeadId"]) ||
    readNestedIdentifier(responseData, ["data", "referenceId"]);

  return candidate || fallbackLeadId;
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
  const referenceId = crypto.randomUUID();
  const marketingAttribution = sanitizeMarketingAttribution(
    data.marketingAttribution,
  );
  const lead: ContactLead = {
    full_name: readString(data.full_name),
    phone: readString(data.phone),
    service: readString(data.service),
    city: readString(data.city),
    message: readString(data.message),
    referenceId,
  };

  if (Object.keys(marketingAttribution).length > 0) {
    lead.marketingAttribution = marketingAttribution;
  }

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

    const crmResult = (await crmResponse.json().catch(() => null)) as unknown;
    const leadId = extractStableLeadId(crmResult, referenceId);

    return NextResponse.json({ success: true, leadId });
  } catch (error) {
    console.error("Failed to forward contact lead to CRM", error);
    return NextResponse.json({ error: SUBMISSION_ERROR }, { status: 502 });
  }
}
