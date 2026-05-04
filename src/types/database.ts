export interface Lead {
  id: string;
  created_at: string;
  address: string | null;
  timeline: string | null;
  buying_next: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  ad_suburb?: string | null;
  source?: string | null;
}

export interface Sale {
  id: string;
  address: string;
  price?: string;
  days: string | null;
  image: string | null;
  display_order: number | null;
  beds: number | null;
  baths: number | null;
  parking: string | null;
  sale_method: string | null;
  updated_at?: string;
}

export interface Link {
  id: string;
  code: string;
  label: string | null;
  destination_url: string;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  qr_color: string | null;
  is_active: boolean;
  created_at: string;
  clicks_total?: number;
  clicks_today?: number;
  clicks_week?: number;
  clicks_month?: number;
}

export interface LinkClick {
  id: string;
  link_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  clicked_at: string;
}
