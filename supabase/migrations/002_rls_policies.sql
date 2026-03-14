-- Enable RLS on all tables
alter table profiles        enable row level security;
alter table brands          enable row level security;
alter table items           enable row level security;
alter table subtypes        enable row level security;
alter table closet_entries  enable row level security;
alter table comparisons     enable row level security;
alter table reviews         enable row level security;
alter table images          enable row level security;
alter table scores          enable row level security;
alter table follows         enable row level security;

-- profiles
create policy "profiles_select_public"
  on profiles for select using (true);
create policy "profiles_update_own"
  on profiles for update using (auth.uid() = id);

-- brands, items, subtypes, images: public read, no user writes
create policy "brands_select_public"   on brands   for select using (true);
create policy "items_select_public"    on items    for select using (true);
create policy "subtypes_select_public" on subtypes for select using (true);
create policy "images_select_public"   on images   for select using (true);

-- closet_entries: public read, own writes
create policy "closet_entries_select" on closet_entries for select using (true);
create policy "closet_entries_insert" on closet_entries for insert with check (auth.uid() = user_id);
create policy "closet_entries_update" on closet_entries for update using (auth.uid() = user_id);
create policy "closet_entries_delete" on closet_entries for delete using (auth.uid() = user_id);

-- comparisons: public read, own inserts (trigger validates ownership)
create policy "comparisons_select" on comparisons for select using (true);
create policy "comparisons_insert" on comparisons for insert with check (auth.uid() = user_id);

-- reviews: public read, own inserts only (review gate enforced in Edge Function)
create policy "reviews_select" on reviews for select using (true);
create policy "reviews_insert" on reviews for insert with check (auth.uid() = user_id);

-- scores: public read, service-role writes only (no user-facing write policy)
create policy "scores_select" on scores for select using (true);

-- follows: public read, own insert/delete
create policy "follows_select" on follows for select using (true);
create policy "follows_insert" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on follows for delete using (auth.uid() = follower_id);
