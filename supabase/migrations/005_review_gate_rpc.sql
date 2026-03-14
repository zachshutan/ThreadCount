-- Helper RPC for the review gate Edge Function: counts owned active items for a user
CREATE OR REPLACE FUNCTION count_owned_active_items(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*)
  FROM closet_entries ce
  JOIN items i ON i.id = ce.item_id
  WHERE ce.user_id = p_user_id
    AND ce.entry_type = 'owned'
    AND i.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION count_owned_active_items TO authenticated;
