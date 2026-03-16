-- Add a direct FK from reviews.user_id → profiles.id so PostgREST can resolve
-- the profiles join. Without this, PostgREST only sees the auth.users FK which
-- lives in a separate schema and is invisible to the public schema cache.
-- This fixes the "recent reviews not populating" bug on the product detail page.
ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
