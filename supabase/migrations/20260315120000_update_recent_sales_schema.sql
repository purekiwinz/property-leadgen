-- Add richer property fields to recent_sales
ALTER TABLE IF EXISTS public.recent_sales
  ADD COLUMN IF NOT EXISTS beds integer,
  ADD COLUMN IF NOT EXISTS baths numeric(3,1),
  ADD COLUMN IF NOT EXISTS parking text,
  ADD COLUMN IF NOT EXISTS sale_method text DEFAULT 'By Negotiation';

-- Allow days to be null (it stores the sold month label, not always present)
ALTER TABLE IF EXISTS public.recent_sales
  ALTER COLUMN days DROP NOT NULL;

-- Clear existing data and insert the 6 real recent sales from Ed's brief
DELETE FROM public.recent_sales;

INSERT INTO public.recent_sales (address, price, days, image, display_order, beds, baths, parking, sale_method) VALUES
  (
    '6 Kahu Close, Orewa',
    'Sold',
    NULL,
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&q=80&w=600',
    1,
    6,
    5.5,
    '2+3',
    'Auction unless Sold Prior'
  ),
  (
    'Unit 608 The Nautilus, 11 Tamariki Ave, Orewa',
    'Sold',
    'November 2025',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=600',
    2,
    2,
    1,
    '2',
    'By Negotiation'
  ),
  (
    '8/101 Brightside Rd, Stanmore Bay',
    'Sold',
    NULL,
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=600',
    3,
    3,
    1.5,
    '1 Gar/2',
    'By Negotiation'
  ),
  (
    '1/114 The Circle, Manly',
    'Sold',
    'November 2025',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=600',
    4,
    2,
    2,
    '1',
    'By Negotiation'
  ),
  (
    '8 Neaptide Close, Red Beach',
    'Sold',
    'December 2025',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=600',
    5,
    4,
    2,
    '2/2 Gar',
    'By Negotiation'
  ),
  (
    '18 Alverna Heights View, Hobbs Bay',
    'Sold',
    'February 2026',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&q=80&w=600',
    6,
    3,
    2,
    '2/2 Gar',
    'By Negotiation'
  );
