-- Add updated_at to recent_sales for sort tiebreaking
ALTER TABLE public.recent_sales
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recent_sales_updated_at ON public.recent_sales;
CREATE TRIGGER recent_sales_updated_at
  BEFORE UPDATE ON public.recent_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
