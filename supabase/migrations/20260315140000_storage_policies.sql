-- Storage policies for sale-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-images', 'sale-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'sale-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated updates' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow authenticated updates" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'sale-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow public read" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'sale-images');
  END IF;
END $$;
