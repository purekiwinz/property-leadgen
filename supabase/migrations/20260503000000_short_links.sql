-- Short links (URL shortener)
CREATE TABLE IF NOT EXISTS leadgen.short_links (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text    UNIQUE NOT NULL,
  label          text,
  destination_url text   NOT NULL,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,
  qr_color       text    DEFAULT '#387f73',
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Click tracking
CREATE TABLE IF NOT EXISTS leadgen.link_clicks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id    uuid REFERENCES leadgen.short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  referer    text
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION leadgen.update_short_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER short_links_updated_at
  BEFORE UPDATE ON leadgen.short_links
  FOR EACH ROW EXECUTE FUNCTION leadgen.update_short_links_updated_at();

-- RLS
ALTER TABLE leadgen.short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.link_clicks  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_short_links" ON leadgen.short_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_link_clicks" ON leadgen.link_clicks  FOR ALL TO authenticated USING (true);

-- Aggregate stats function (used by admin API)
CREATE OR REPLACE FUNCTION leadgen.get_links_with_stats()
RETURNS TABLE (
  id              uuid,
  code            text,
  label           text,
  destination_url text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,
  qr_color        text,
  is_active       boolean,
  created_at      timestamptz,
  updated_at      timestamptz,
  clicks_total    bigint,
  clicks_today    bigint,
  clicks_week     bigint,
  clicks_month    bigint
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    sl.id, sl.code, sl.label, sl.destination_url,
    sl.utm_source, sl.utm_medium, sl.utm_campaign, sl.utm_content, sl.utm_term,
    sl.qr_color, sl.is_active, sl.created_at, sl.updated_at,
    COUNT(lc.id),
    COUNT(lc.id) FILTER (WHERE lc.clicked_at >= NOW() - INTERVAL '1 day'),
    COUNT(lc.id) FILTER (WHERE lc.clicked_at >= NOW() - INTERVAL '7 days'),
    COUNT(lc.id) FILTER (WHERE lc.clicked_at >= NOW() - INTERVAL '30 days')
  FROM leadgen.short_links sl
  LEFT JOIN leadgen.link_clicks lc ON lc.link_id = sl.id
  GROUP BY sl.id
  ORDER BY sl.created_at DESC
$$;
