-- Trigger 1: Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter       integer := 0;
begin
  -- Derive username from email local part, strip non-alphanumeric
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g'));
  -- Ensure minimum length
  if length(base_username) < 3 then
    base_username := 'user' || base_username;
  end if;
  final_username := base_username;
  -- Resolve conflicts
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, final_username);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Trigger 2: Validate items.category matches subtypes.category
create or replace function validate_item_subtype_category()
returns trigger
language plpgsql
as $$
declare
  expected_category item_category;
begin
  select category into expected_category
  from public.subtypes
  where id = new.subtype_id;

  if expected_category is null then
    raise exception 'subtype_id % not found', new.subtype_id;
  end if;

  if expected_category != new.category then
    raise exception 'item category % does not match subtype category %',
      new.category, expected_category;
  end if;
  return new;
end;
$$;

create trigger validate_item_subtype_category_trigger
  before insert or update on items
  for each row execute function validate_item_subtype_category();

-- Trigger 3: Validate comparison entries on INSERT only
-- (not on UPDATE, so ON DELETE SET NULL cascades from closet_entries are not blocked)
-- Note: auth.uid() returns NULL in a service-role context. This trigger is scoped to
-- user-facing inserts only. Service-role operations should never insert into comparisons
-- directly — comparisons are always user-initiated.
create or replace function validate_comparison_entries()
returns trigger
language plpgsql
as $$
declare
  winner_user_id  uuid;
  winner_type     entry_type_enum;
  loser_user_id   uuid;
  loser_type      entry_type_enum;
begin
  -- Both must be non-null at insert time
  if new.winner_entry_id is null or new.loser_entry_id is null then
    raise exception 'winner_entry_id and loser_entry_id cannot be null on insert';
  end if;

  select user_id, entry_type into winner_user_id, winner_type
  from public.closet_entries where id = new.winner_entry_id;
  if not found then
    raise exception 'winner closet entry % not found', new.winner_entry_id;
  end if;

  select user_id, entry_type into loser_user_id, loser_type
  from public.closet_entries where id = new.loser_entry_id;
  if not found then
    raise exception 'loser closet entry % not found', new.loser_entry_id;
  end if;

  if winner_type != 'owned' or loser_type != 'owned' then
    raise exception 'both comparison entries must have entry_type = owned';
  end if;

  if winner_user_id != auth.uid() or loser_user_id != auth.uid() then
    raise exception 'comparison entries must belong to the authenticated user';
  end if;

  return new;
end;
$$;

create trigger validate_comparison_entries_trigger
  before insert on comparisons
  for each row execute function validate_comparison_entries();
