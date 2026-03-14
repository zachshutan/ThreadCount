-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Enums
create type item_category as enum ('top', 'bottom', 'footwear');
create type entry_type_enum as enum ('owned', 'interested');
create type color_value as enum (
  'black', 'white', 'grey', 'navy', 'brown', 'tan', 'red', 'blue',
  'green', 'yellow', 'orange', 'pink', 'purple', 'multicolor', 'other'
);
create type comparison_type_enum as enum ('same_category', 'cross_category');
create type image_source_type as enum ('seed');
create type confidence_level as enum ('low', 'medium', 'high');

-- profiles: public user info, one row per auth user
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- brands
create table brands (
  id       uuid primary key default uuid_generate_v4(),
  name     text not null,
  logo_url text,
  slug     text unique not null
);

-- subtypes: lookup table.
-- Note: The spec defines subtypes with name as text PK and items.subtype as FK → subtypes.name.
-- This plan intentionally uses a UUID surrogate PK and composite unique(name, category) instead,
-- so "Other" can exist for each category without collision. items.subtype_id is a UUID FK.
-- This diverges from the spec's column name (subtype → subtype_id) but is equivalent in semantics.
create table subtypes (
  id       uuid primary key default uuid_generate_v4(),
  name     text not null,
  category item_category not null,
  unique(name, category)
);

-- items
create table items (
  id          uuid primary key default uuid_generate_v4(),
  brand_id    uuid not null references brands(id),
  model_name  text not null,
  subtype_id  uuid not null references subtypes(id),
  category    item_category not null,
  is_active   boolean not null default true
);

-- closet_entries: one entry per user per item
create table closet_entries (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null references items(id),
  entry_type entry_type_enum not null,
  color      color_value not null,
  created_at timestamptz default now(),
  unique(user_id, item_id)
);

-- comparisons: nullable FKs so entries can be deleted without orphaning history
create table comparisons (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  winner_entry_id uuid references closet_entries(id) on delete set null,
  loser_entry_id  uuid references closet_entries(id) on delete set null,
  comparison_type comparison_type_enum not null,
  created_at      timestamptz default now(),
  check (winner_entry_id is distinct from loser_entry_id)
);

-- reviews: one per user per item, immutable
create table reviews (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  item_id         uuid not null references items(id),
  body            text not null,
  fit_rating      integer not null check (fit_rating between 1 and 5),
  quality_rating  integer not null check (quality_rating between 1 and 5),
  created_at      timestamptz default now(),
  unique(user_id, item_id)
);

-- images: sort_order ascending, lowest = primary
create table images (
  id          uuid primary key default uuid_generate_v4(),
  item_id     uuid not null references items(id),
  url         text not null,
  source_type image_source_type not null default 'seed',
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

-- scores: only created for owned closet entries
create table scores (
  id                uuid primary key default uuid_generate_v4(),
  closet_entry_id   uuid not null unique references closet_entries(id) on delete cascade,
  item_id           uuid not null references items(id),
  user_id           uuid not null references auth.users(id) on delete cascade,
  category          item_category not null,
  category_score    numeric not null default 5.0,
  overall_score     numeric not null default 5.0,
  wins              integer not null default 0,
  losses            integer not null default 0,
  category_wins     integer not null default 0,
  category_losses   integer not null default 0,
  confidence        confidence_level not null default 'low',
  updated_at        timestamptz default now()
);

-- follows: asymmetric, no self-follows
create table follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(follower_id, following_id),
  check(follower_id != following_id)
);
