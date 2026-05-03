# Property Leadgen — LLM Context Guide

> Keep this file updated whenever you make architectural decisions, add dependencies, or change established patterns. It is the primary reference for any LLM picking up work on this project.

---

## Project Purpose

A high-converting property appraisal lead-generation landing page for **Ed Scanlan**, a real estate agent with **Arizto** on the **Hibiscus Coast, New Zealand**. Leads are captured, stored in Supabase, and emailed to Ed via SendGrid. An admin panel allows Ed (or his team) to manage recent sales listings.

Live URL: `https://leads.automate.pure-kiwi.com`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15+ (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`sale-images` bucket, public) |
| Edge Functions | Supabase Deno Edge Functions |
| Email | SendGrid API v3 |
| Address autocomplete | Mapbox Geocoding API v5 |
| Image processing | `sharp` (server-side WebP conversion) |
| Containerisation | Docker (multi-stage, `node:22-alpine`, `linux/amd64`) |
| Container registry | GitHub Container Registry (`ghcr.io/purekiwinz/property-leadgen:latest`) |
| Reverse proxy | Traefik on Hostinger VPS |

---

## Brand Colours

| Token | Hex | Usage |
|---|---|---|
| Primary green | `#387f73` | Header, email header, card headers |
| Accent green | `#20C888` | CTA buttons, progress bar, links, scroll-to-top |
| Dark green | `#2c6561` | Info card header rows in email |
| Dark navy | `#1e293b` | Footer background |
| Slate | `#0f172a` | Body text |

**Logos:**
- Colour logo: `/public/logo.svg` — use on light/white backgrounds
- White logo: `/public/logo-white.svg` — use on green/dark backgrounds (mobile header, email)

---

## Key Files

```
src/
  app/
    page.tsx                   # Landing page (server component + client islands)
    admin/page.tsx             # Admin panel (leads + recent sales CRUD)
    api/
      upload-image/route.ts    # POST: receives image, converts to WebP via sharp, uploads to Supabase
    privacy/page.tsx           # NZ Privacy Act 2020 compliant privacy policy
    terms/page.tsx             # Terms of service
  components/
    LeadGenForm.tsx            # Multi-step lead capture form (5 steps, Framer Motion)
    AddressAutocomplete.tsx    # Mapbox address input + geolocation pre-fill
    ScrollToTop.tsx            # Fixed scroll-to-top button, repositions above footer

supabase/
  functions/
    send-appraisal-email/
      index.ts                 # Deno Edge Function: formats + sends branded HTML email via SendGrid
    meta-webhook/
      index.ts                 # Deno Edge Function: receives Meta Lead Ads webhook, stores leads
  migrations/
    *.sql                      # All schema migrations (run in order)

public/
  logo.svg                     # Colour logo
  logo-white.svg               # White logo (email, mobile header)
  agent_transparent.png        # Agent profile photo (high-res, transparent background)
  top-background.jpg           # Hero background image

next.config.ts                 # Includes Supabase storage remote image pattern
docker-compose.yml             # Local dev
docker-compose.prod.yml        # Production (Hostinger VPS)
Dockerfile                     # Multi-stage build, standalone output
complete_schema.sql            # Full DB schema snapshot (reference only, use migrations for changes)
docs/                          # PDFs and extracted text from briefing documents
```

---

## Database Schema (key tables)

### `appraisal_leads`
Stores every lead submitted via the landing page form.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| first_name, last_name | text | |
| email | text | |
| phone | text | |
| address | text | Property address from Mapbox |
| timeline | text | "Ready now", "1–3 months", etc. |
| buying_next | text | "Yes", "No", "Not sure" |
| created_at | timestamptz | |

### `recent_sales`
Shown in the "Recent Sales" section on the landing page; managed via admin panel.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| address | text | |
| price | text | Display string e.g. "$1,250,000" |
| days | text | Month sold — stored as **long format** e.g. `"December 2025"` |
| image_url | text | Public URL from `sale-images` Supabase bucket |
| updated_at | timestamptz | Auto-updated by trigger — used for sort tiebreaking |

**Sort rule:** newest month first, tiebreak by `updated_at` DESC.

### `site_settings` (id = 1)
Single row holding runtime-configurable content.

| Column | Notes |
|---|---|
| agent_name | e.g. `"Ed Scanlan"` |
| agent_phone | e.g. `"+64 21 123 4567"` |
| agent_email | e.g. `"ed.scanlan@arizto.co.nz"` |
| lead_notification_email | Where lead emails are sent |
| agent_bio | Bio text for Meet Ed section |
| agent_tagline | Tagline text |

---

## Environment Variables

### `.env.local` (Next.js)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Used in /api/upload-image (server-only)
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=
```

### Supabase Edge Function Secrets
Set via `supabase secrets set` or Supabase dashboard:
```
SENDGRID_API_KEY=
SUPABASE_URL=                       # Auto-injected by Supabase
SUPABASE_ANON_KEY=                  # Auto-injected by Supabase
META_WEBHOOK_VERIFY_TOKEN=          # For meta-webhook verification
```

---

## Deployment Pipeline

1. **Build & push Docker image:**
   `NEXT_PUBLIC_` vars must be passed as build args — they are baked into the bundle at build time, not read at runtime.
   ```bash
   docker buildx build --platform linux/amd64 \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://wbncgzpzctoqwzbrbfdg.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_.env.local> \
     --build-arg NEXT_PUBLIC_MAPBOX_API_KEY=<mapbox_token_from_.env.local> \
     -t ghcr.io/purekiwinz/property-leadgen:latest --push .
   ```

2. **Deploy on Hostinger VPS** (SSH to `root@147.93.60.57`):
   ```bash
   cd /docker/autoagent && docker compose pull leadgen && docker compose up -d leadgen
   ```
   > **Note:** SSH from local machine (port 22) often times out. Connect via Hostinger hPanel terminal if needed.

3. **Supabase migrations:**
   ```bash
   npx supabase db push --project-ref wbncgzpzctoqwzbrbfdg
   ```

4. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy send-appraisal-email --project-ref wbncgzpzctoqwzbrbfdg
   npx supabase functions deploy meta-webhook --project-ref wbncgzpzctoqwzbrbfdg
   ```

---

## Key Patterns & Decisions

### Form (LeadGenForm.tsx)
- 5-step multi-step quiz with Framer Motion `AnimatePresence` transitions
- All steps must fit first fold on mobile without scrolling — use `sm:` breakpoints to restore desktop sizes
- Progress bar is an **in-flow block element** (not `absolute`) inside the card; card has `overflow-hidden` to clip it
- Step 4 collects contact details; step 5 is the confirmation screen

### Address Autocomplete (AddressAutocomplete.tsx)
- On mount: requests browser geolocation, reverse-geocodes if within Hibiscus Coast bounding box
- HC bounding box: `minLon: 174.5, maxLon: 174.95, minLat: -36.82, maxLat: -36.44`
- HC centre for proximity bias: `"174.6955,-36.6016"`
- Mapbox results limited to `limit=2` (supports mobile UX)
- Shows `LocateFixed` icon with `animate-pulse` while locating

### Image Upload (/api/upload-image/route.ts)
- `supabaseAdmin` client is initialised **inside** the POST handler — NOT at module level
- Module-level init causes build-time crash: "supabaseKey is required"
- Resizes to 1400px wide, WebP at 82% quality via `sharp`

### Recent Sales Sort
- Sort is applied **both** in the server component (`page.tsx`) and after every save in the admin panel
- `days` field stores `"December 2025"` (long format). Admin dropdown shows abbreviated `"Dec 2025"` labels but stores/reads long format values.

### Email (send-appraisal-email)
- Full branded HTML email with base64-embedded SVG logo (avoids Outlook blocking external images)
- Logo is embedded as `data:image/svg+xml;base64,...` in an `<img>` tag, `max-width:20%`, centred
- Subject line includes 🏡 emoji: `🏡 New Lead: {firstName} {lastName} — {address}`
- Copyright footer: `© {year} {agentName} — Licensed Real Estate Professional (REAA 2008)`

### Mobile Header
- On mobile: `bg-[#387f73]` green header with white logo (`logo-white.svg`)
- On desktop: transparent header overlaid on hero image with colour logo
- Same padding (`p-6`) on both breakpoints for visual consistency

### Scroll-to-Top Button (ScrollToTop.tsx)
- `position: fixed`, dynamically adjusts `bottom` to ride above the footer
- When footer is visible: `bottom = viewportH - footerTop + 16`
- When footer off-screen: `bottom = 32`

---

## Marketing & Analytics

- **Meta (Facebook) Pixel** — fires `Lead` event on form completion (step 5)
- **LinkedIn Insight Tag** — global tracking
- **Meta Lead Ads Webhook** (`meta-webhook` edge function) — syncs native Facebook leads into `appraisal_leads` table

---

## Admin Panel (/admin)

- Protected by Supabase Auth (email/password)
- View and search all leads
- CRUD for recent sales (address, price, month sold, photo)
- Image upload goes to `/api/upload-image` → Supabase `sale-images` bucket

---

## Legal

- `/privacy` — NZ Privacy Act 2020 compliant privacy policy
- `/terms` — Terms of service
- Both pages reference Ed Scanlan and Arizto branding

---

## Known Issues / Pending

- SSH from developer machine to `147.93.60.57:22` intermittently times out — use Hostinger hPanel web terminal as fallback
- `updated_at` migration (`20260315150000_recent_sales_updated_at.sql`) needs to be applied to production Supabase if not already done: `npx supabase db push --project-ref wbncgzpzctoqwzbrbfdg`
