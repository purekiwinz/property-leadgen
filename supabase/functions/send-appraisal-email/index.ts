import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { record } = await req.json()
    
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not set in environment variables.");
    }

    // Initialize Supabase Client to fetch settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    
    const leadEmail = settings?.lead_notification_email || "jason.king@pure-kiwi.com";
    const agentName = settings?.agent_name || "Ed Scanlan";
    const firstName = agentName.split(' ')[0];

    const emailData = {
      personalizations: [
        {
          to: [{ email: leadEmail }], 
          subject: `New Lead: ${record.address}`
        }
      ],
      from: { email: "autoagent@mail.automate.pure-kiwi.com", name: `${agentName} - Appraisal Leads` },
      content: [
        {
          type: "text/plain",
          value: `Hi ${firstName},\n\nYou have a new appraisal request from your Hibiscus Coast landing page.\n\nPROPERTY DETAILS:\nAddress: ${record.address}\nTimeline: ${record.timeline}\nBuying Next: ${record.buying_next}\n\nCONTACT DETAILS:\nName: ${record.first_name} ${record.last_name}\nEmail: ${record.email}\nPhone: ${record.phone}\n\nPlease reach out to them soon.`
        }
      ]
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("SendGrid API Error:", text);
      throw new Error(`SendGrid API Error: ${text}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
