-- For You Feed: cursor-paginated UNION query across closet additions, comparisons, and reviews.
-- Cursor = (created_at, id) applied per-subquery before UNION to ensure correct pagination.

CREATE OR REPLACE FUNCTION get_feed(
  p_friends_only boolean DEFAULT false,
  p_cursor_ts timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  event_type     text,
  event_id       uuid,
  user_id        uuid,
  username       text,
  created_at     timestamptz,
  item_id        uuid,
  item_name      text,
  brand_name     text,
  category       text,
  overall_score  numeric,
  review_body    text,
  fit_rating     integer,
  quality_rating integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (

    -- Owned closet additions
    SELECT
      'closet_add'::text           AS event_type,
      ce.id                        AS event_id,
      ce.user_id,
      p.username,
      ce.created_at,
      ce.item_id,
      i.model_name                 AS item_name,
      b.name                       AS brand_name,
      i.category::text             AS category,
      NULL::numeric                AS overall_score,
      NULL::text                   AS review_body,
      NULL::integer                AS fit_rating,
      NULL::integer                AS quality_rating
    FROM closet_entries ce
    JOIN profiles p ON p.id = ce.user_id
    JOIN items    i ON i.id = ce.item_id
    JOIN brands   b ON b.id = i.brand_id
    WHERE ce.entry_type = 'owned'
      AND (
        NOT p_friends_only
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = ce.user_id
        )
      )
      AND (
        p_cursor_ts IS NULL
        OR (ce.created_at, ce.id) < (p_cursor_ts, p_cursor_id)
      )

    UNION ALL

    -- Comparison results (winner item + current score)
    SELECT
      'comparison'::text           AS event_type,
      c.id                         AS event_id,
      c.user_id,
      p.username,
      c.created_at,
      i.id                         AS item_id,
      i.model_name                 AS item_name,
      b.name                       AS brand_name,
      i.category::text             AS category,
      s.overall_score,
      NULL::text                   AS review_body,
      NULL::integer                AS fit_rating,
      NULL::integer                AS quality_rating
    FROM comparisons c
    JOIN profiles      p  ON p.id  = c.user_id
    LEFT JOIN closet_entries ce ON ce.id = c.winner_entry_id
    LEFT JOIN items    i  ON i.id  = ce.item_id
    LEFT JOIN brands   b  ON b.id  = i.brand_id
    LEFT JOIN scores   s  ON s.closet_entry_id = c.winner_entry_id
    WHERE c.winner_entry_id IS NOT NULL
      AND (
        NOT p_friends_only
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = c.user_id
        )
      )
      AND (
        p_cursor_ts IS NULL
        OR (c.created_at, c.id) < (p_cursor_ts, p_cursor_id)
      )

    UNION ALL

    -- New reviews
    SELECT
      'review'::text               AS event_type,
      r.id                         AS event_id,
      r.user_id,
      p.username,
      r.created_at,
      r.item_id,
      i.model_name                 AS item_name,
      b.name                       AS brand_name,
      i.category::text             AS category,
      NULL::numeric                AS overall_score,
      r.body                       AS review_body,
      r.fit_rating,
      r.quality_rating
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN items    i ON i.id = r.item_id
    JOIN brands   b ON b.id = i.brand_id
    WHERE (
        NOT p_friends_only
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = r.user_id
        )
      )
      AND (
        p_cursor_ts IS NULL
        OR (r.created_at, r.id) < (p_cursor_ts, p_cursor_id)
      )

  ) feed
  ORDER BY created_at DESC, event_id DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_feed TO authenticated;
