-- Make color optional on closet_entries.
-- Wishlist items do not need a color; only owned items optionally have one.
ALTER TABLE closet_entries ALTER COLUMN color DROP NOT NULL;
