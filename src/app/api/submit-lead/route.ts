import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function createHubSpotNote(token: string, contactId: string, suburb: string, medium: string) {
  const channel = medium === 'print' ? 'mailbox drop' : 'Meta';
  await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      properties: {
        hs_note_body: `Ad source: ${suburb} suburb campaign (${channel})`,
        hs_timestamp: new Date().toISOString(),
      },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
      }],
    }),
  });
}

async function pushToHubSpot(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  timeline: string;
  buyingNext: string;
  optInMarketing: boolean;
  suburb: string;
  medium: string;
}) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return;

  const suburbTag = data.suburb ? ` [${data.suburb}]` : '';
  const taskBody = [
    `Contact: ${data.firstName} ${data.lastName}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email}`,
    `Timeline: ${data.timeline}`,
    `Buying next: ${data.buyingNext}`,
    `Marketing opt-in: ${data.optInMarketing ? 'Yes — Quarterly Market Update' : 'No'}`,
    data.suburb ? `Ad suburb: ${data.suburb}` : '',
  ].filter(Boolean).join('\n');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  // Create or update contact
  const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    if (contactRes.status === 409) {
      const existingId = err.message?.match(/ID: (\d+)/)?.[1];
      if (existingId) {
        await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            properties: { phone: data.phone, hs_lead_status: "NEW", lifecyclestage: "lead" },
          }),
        });
        await Promise.all([
          fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              properties: {
                hs_task_subject: `Appraisal follow-up — ${data.address}${suburbTag}`,
                hs_task_body: taskBody,
                hs_timestamp: tomorrow.toISOString(),
                hs_task_status: "NOT_STARTED",
                hs_task_priority: "HIGH",
                hs_task_type: "TODO",
                hubspot_owner_id: "91412149",
              },
              associations: [
                { to: { id: existingId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }] },
              ],
            }),
          }),
          data.suburb ? createHubSpotNote(token, existingId, data.suburb, data.medium) : Promise.resolve(),
        ]);
      }
      return;
    }
    console.error("HubSpot contact error:", err);
    return;
  }

  const contact = await contactRes.json();

  await Promise.all([
    fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        properties: {
          hs_task_subject: `Appraisal follow-up — ${data.address}${suburbTag}`,
          hs_task_body: taskBody,
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
    }),
    data.suburb ? createHubSpotNote(token, contact.id, data.suburb, data.medium) : Promise.resolve(),
  ]);
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const { address, timeline, buyingNext, firstName, lastName, email, phone, optInMarketing, suburb, medium } = body;

  const { error } = await supabase.from("appraisal_leads").insert([{
    address, timeline, buying_next: buyingNext,
    first_name: firstName, last_name: lastName,
    email, phone,
    source: medium === 'print' ? 'dle' : 'edscanlan',
    ad_suburb: suburb || null,
  }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await pushToHubSpot({ firstName, lastName, email, phone, address, timeline, buyingNext, optInMarketing: !!optInMarketing, suburb: suburb || '', medium: medium || '' }).catch(
    (e) => console.error("HubSpot push failed:", e)
  );

  return NextResponse.json({ ok: true });
}
