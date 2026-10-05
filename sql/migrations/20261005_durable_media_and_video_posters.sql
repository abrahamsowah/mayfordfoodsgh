-- Persistent public media storage and optional video poster references.
-- Run this against the Supabase project before deploying the storage-backed uploader.

ALTER TABLE IF EXISTS public.advertisement_videos
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

ALTER TABLE IF EXISTS public.community_media
  ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE IF EXISTS public.community_media
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- Older Supabase schema snapshots called this field `media_url`; preserve those
-- records while bringing the column name in line with the API and MySQL schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_media'
      AND column_name = 'media_url'
  ) THEN
    UPDATE public.community_media
       SET file_name = COALESCE(NULLIF(file_name, ''), NULLIF(media_url, ''), 'community1.png')
     WHERE file_name IS NULL OR file_name = '';
    ALTER TABLE public.community_media ALTER COLUMN media_url DROP NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.image_asset_metadata (
  object_key VARCHAR(191) PRIMARY KEY,
  public_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color VARCHAR(16) NOT NULL,
  variants_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE public.image_asset_metadata ENABLE ROW LEVEL SECURITY;

-- The bucket is public-read for storefront media, but writes remain server-side:
-- only the API's service-role client can create short-lived signed upload URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mayford-media',
  'mayford-media',
  TRUE,
  104857600,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
