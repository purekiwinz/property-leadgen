import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")
const PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN")

serve(async (req) => {
  const url = new URL(req.url)

  // 1. Webhook Verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified!')
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // 2. Receiving Leads (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json()

      if (body.object === 'page') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadId = change.value.leadgen_id
              
              // Fetch lead details from Facebook Graph API
              if (!PAGE_ACCESS_TOKEN) {
                console.error("META_PAGE_ACCESS_TOKEN is missing")
                return new Response('Server configuration error', { status: 500 })
              }

              const graphResponse = await fetch(`https://graph.facebook.com/v19.0/${leadId}?access_token=${PAGE_ACCESS_TOKEN}`)
              const leadData = await graphResponse.json()

              if (leadData.error) {
                console.error('Error fetching lead from Meta:', leadData.error)
                continue; // Skip this one but don't fail the whole request
              }

              // Extract field values dynamically based on what you ask in your form
              let address = '', timeline = '', buying_next = '', first_name = '', last_name = '', email = '', phone = '';
              
              leadData.field_data.forEach((field: any) => {
                const name = field.name.toLowerCase();
                const value = field.values[0];
                
                if (name.includes('address') || name.includes('street')) address = value;
                if (name.includes('time') || name.includes('when')) timeline = value;
                if (name.includes('buy') || name.includes('next')) buying_next = value;
                if (name === 'first_name') first_name = value;
                if (name === 'last_name') last_name = value;
                if (name === 'full_name' && !first_name && !last_name) {
                  const parts = value.split(' ');
                  first_name = parts[0] || 'Meta';
                  last_name = parts.slice(1).join(' ') || 'Lead';
                }
                if (name === 'email') email = value;
                if (name === 'phone_number' || name === 'phone') phone = value;
              });

              // Fallbacks if mapping fails
              first_name = first_name || 'Facebook';
              last_name = last_name || 'Lead';
              email = email || 'no-email@facebook.com';
              phone = phone || 'Not provided';
              address = address || 'Via Facebook Lead Ad';
              timeline = timeline || 'Not specified';
              buying_next = buying_next || 'Not specified';

              // Initialize Supabase Client using Service Role Key (since it's a backend operation)
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
              const supabase = createClient(supabaseUrl, supabaseKey);

              // Insert the lead into Supabase. 
              // This will automatically trigger the database webhook to send the email to Ed!
              const { error } = await supabase.from('appraisal_leads').insert([{
                address,
                timeline,
                buying_next,
                first_name,
                last_name,
                email,
                phone,
                source: 'facebook'
              }]);

              if (error) {
                console.error('Error inserting lead into database:', error)
              } else {
                console.log(`Successfully processed and saved Meta lead: ${leadId}`)
              }
            }
          }
        }
        return new Response('EVENT_RECEIVED', { status: 200 })
      } else {
        return new Response('Not Found', { status: 404 })
      }
    } catch (error) {
      console.error('Webhook error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})
