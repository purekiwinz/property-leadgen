import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function pushToHubSpot(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  timeline: string;
  buyingNext: string;
}) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return;

  // Create or update contact
  const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        hs_lead_status: "NEW",
        lifecyclestage: "lead",
      },
    }),
  });

  if (!contactRes.ok) {
    const err = await contactRes.json();
    // If contact already exists (409), fetch and update instead
    if (contactRes.status === 409) {
      const existingId = err.message?.match(/ID: (\d+)/)?.[1];
      if (existingId) {
        // Don't overwrite address on existing contacts — keep their record as-is
        await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            properties: {
              phone: data.phone,
              hs_lead_status: "NEW",
              lifecyclestage: "lead",
            },
          }),
        });
        // Still create the task for existing contacts
        const contact = { id: existingId };
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        await fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            properties: {
              hs_task_subject: `Appraisal follow-up — ${data.address}`,
              hs_task_body: `Contact: ${data.firstName} ${data.lastName}\nPhone: ${data.phone}\nEmail: ${data.email}\nTimeline: ${data.timeline}\nBuying next: ${data.buyingNext}`,
              hs_timestamp: tomorrow.toISOString(),
              hs_task_status: "NOT_STARTED",
              hs_task_priority: "HIGH",
              hs_task_type: "TODO",
              hubspot_owner_id: "91412149",
            },
            associations: [
              { to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }] },
            ],
          }),
        });
      }
      return;
    }
    console.error("HubSpot contact error:", err);
    return;
  }

  const contact = await contactRes.json();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  // Create appraisal task due tomorrow
  await fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: {
        hs_task_subject: `Appraisal follow-up — ${data.address}`,
        hs_task_body: `Contact: ${data.firstName} ${data.lastName}\nPhone: ${data.phone}\nEmail: ${data.email}\nTimeline: ${data.timeline}\nBuying next: ${data.buyingNext}`,
        hs_timestamp: tomorrow.toISOString(),
        hs_task_status: "NOT_STARTED",
        hs_task_priority: "HIGH",
        hs_task_type: "TODO",
        hubspot_owner_id: "91412149",
      },
      associations: [
        {
          to: { id: contact.id },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }],
        },
      ],
    }),
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const { address, timeline, buyingNext, firstName, lastName, email, phone } = body;

  // Save to Supabase
  const { error } = await supabase.from("appraisal_leads").insert([{
    address, timeline, buying_next: buyingNext,
    first_name: firstName, last_name: lastName,
    email, phone,
    source: "edscanlan",
  }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Push to HubSpot (non-blocking — don't fail the lead if HubSpot is down)
  await pushToHubSpot({ firstName, lastName, email, phone, address, timeline, buyingNext }).catch(
    (e) => console.error("HubSpot push failed:", e)
  );

  return NextResponse.json({ ok: true });
}
