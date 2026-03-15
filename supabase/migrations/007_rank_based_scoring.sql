-- Migration 007: Add exact rank-based scoring columns
-- Adds category_rank to scores (exact position within top/bottom/footwear)
-- Adds website_url to brands
-- Adds 'ranking' comparison type for binary search insertion sessions

-- Add exact rank position to scores (NULL = unranked, needs ranking session)
ALTER TABLE scores ADD COLUMN IF NOT EXISTS category_rank INT;

-- Add brand website URL
ALTER TABLE brands ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add new comparison type for ranking insertion sessions
-- (existing 'same_category' and 'cross_category' values are kept for historical data)
ALTER TYPE comparison_type_enum ADD VALUE IF NOT EXISTS 'ranking';
