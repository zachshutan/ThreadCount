# Threadcount — MVP Design Spec

**Date:** 2026-03-12
**Stack:** React Native (Expo), Supabase (auth + database), NativeWind (Tailwind CSS)
**Platform:** iOS and Android (native mobile, not web)

---

## Overview

Threadcount is a brand-agnostic clothing and footwear review and ranking platform. Users build a digital closet of items they own, rate items through pairwise comparisons (generating a 0–10 score per item), and write reviews. The goal is a trustworthy review platform where all ratings come from verified owners.

---

## Data Model

### Tables

**profiles** *(public user info — one row per auth.users row, created via trigger on signup)*
- id (uuid, PK, FK → auth.users.id)
- username (text, UNIQUE NOT NULL)
- avatar_url (text)
- created_at (timestamptz, DEFAULT now())

**brands**
- id (uuid, PK)
- name (text, NOT NULL)
- logo_url (text)
- slug (text, UNIQUE NOT NULL)

**items**
- id (uuid, PK)
- brand_id (uuid, FK → brands.id, NOT NULL)
- model_name (text, NOT NULL)
- subtype (text, FK → subtypes.name, NOT NULL)
- category (enum: `top | bottom | footwear`, NOT NULL)
- is_active (boolean, DEFAULT true)
- Trigger (INSERT/UPDATE): `items.category` must match `subtypes.category` for the selected subtype; reject if mismatch

**subtypes** *(lookup table)*
- name (text, PK)
- category (enum: `top | bottom | footwear`, NOT NULL)

*Initial values:*
- footwear: sneaker, boot, sandal, loafer, slipper, other
- top: t-shirt, shirt, jacket, hoodie, sweater, coat, other
- bottom: jeans, pants, shorts, skirt, other

**closet_entries**
- id (uuid, PK)
- user_id (uuid, FK → auth.users.id, NOT NULL)
- item_id (uuid, FK → items.id, NOT NULL)
- entry_type (enum: `owned | interested`, NOT NULL)
- color (enum, NOT NULL)
- created_at (timestamptz, DEFAULT now())
- UNIQUE(user_id, item_id) — one entry per item per user
- Updating `entry_type` from `interested` to `owned` is supported via UPDATE. Downgrade from `owned` to `interested` is also allowed. When upgrading to `owned`: application creates a `scores` row if one does not exist, then triggers the comparison flow.
- Color is the primary colorway. To change color, UPDATE the existing row.

*Color values:* black, white, grey, navy, brown, tan, red, blue, green, yellow, orange, pink, purple, multicolor, other

**comparisons**
- id (uuid, PK)
- user_id (uuid, FK → auth.users.id, NOT NULL)
- winner_entry_id (uuid, **NULLABLE**, FK → closet_entries.id ON DELETE SET NULL)
- loser_entry_id (uuid, **NULLABLE**, FK → closet_entries.id ON DELETE SET NULL)
- comparison_type (enum: `same_category | cross_category`, NOT NULL)
- created_at (timestamptz, DEFAULT now())
- CHECK: `winner_entry_id IS DISTINCT FROM loser_entry_id` (handles NULLs correctly — a row where both are NULL after cascade is permitted; a live insert where both reference the same entry is rejected)
- Trigger (INSERT only — not UPDATE): at insert time, both `winner_entry_id` and `loser_entry_id` must be non-NULL, must reference rows in `closet_entries` where `entry_type = 'owned'` AND `user_id = auth.uid()`. The trigger does not fire on UPDATE, so SET NULL cascades are not blocked.

**reviews**
- id (uuid, PK)
- user_id (uuid, FK → auth.users.id, NOT NULL)
- item_id (uuid, FK → items.id, NOT NULL)
- body (text, NOT NULL)
- fit_rating (integer, CHECK 1–5, NOT NULL)
- quality_rating (integer, CHECK 1–5, NOT NULL)
- created_at (timestamptz, DEFAULT now())
- UNIQUE(user_id, item_id) — one review per user per item
- Reviews are immutable after submission (no UPDATE or DELETE)

**images**
- id (uuid, PK)
- item_id (uuid, FK → items.id, NOT NULL)
- url (text, NOT NULL)
- source_type (enum: `seed`, NOT NULL) *(user-submitted images and affiliate sources deferred post-MVP)*
- sort_order (integer, NOT NULL, DEFAULT 0)
- created_at (timestamptz, DEFAULT now())
- Primary / thumbnail image = lowest `sort_order`; ties broken by `created_at` ASC

**scores** *(one row per owned closet entry only — interested entries have no scores row)*
- id (uuid, PK)
- closet_entry_id (uuid, FK → closet_entries.id, UNIQUE, NOT NULL)
- item_id (uuid, FK → items.id, NOT NULL) *(denormalized at insert from closet_entry → item)*
- user_id (uuid, FK → auth.users.id, NOT NULL) *(denormalized at insert)*
- category (enum: `top | bottom | footwear`, NOT NULL) *(denormalized at insert from item; not updated if item.category changes)*
- category_score (numeric, DEFAULT 5.0)
- overall_score (numeric, DEFAULT 5.0)
- wins (integer, DEFAULT 0, NOT NULL)
- losses (integer, DEFAULT 0, NOT NULL)
- category_wins (integer, DEFAULT 0, NOT NULL)
- category_losses (integer, DEFAULT 0, NOT NULL)
- confidence (enum: `low | medium | high`, DEFAULT 'low')
- updated_at (timestamptz, DEFAULT now())

**follows**
- id (uuid, PK)
- follower_id (uuid, FK → auth.users.id, NOT NULL)
- following_id (uuid, FK → auth.users.id, NOT NULL)
- created_at (timestamptz, DEFAULT now())
- UNIQUE(follower_id, following_id)
- CHECK(follower_id != following_id)

### Score Calculation Rules

- `overall_score = wins / (wins + losses) * 10`; if `(wins + losses) = 0`, keep default 5.0 (do not divide)
- `category_score = category_wins / (category_wins + category_losses) * 10`; if sum = 0, keep default 5.0
- Scores are updated **incrementally** on each comparison write (service role):
  - Winner entry: `wins += 1`; if `comparison_type = same_category`, also `category_wins += 1`
  - Loser entry: `losses += 1`; if `comparison_type = same_category`, also `category_losses += 1`
  - After incrementing, recalculate and write `overall_score`, `category_score`, `confidence`, `updated_at`
- Confidence is based on `wins + losses` (total comparisons): low = 0–4, medium = 5–15, high = 16+

### Aggregate Item Scores (Browse / ItemScreen)

- Computed as `avg(overall_score)` and `avg(category_score)` across all `scores` rows for a given `item_id`
- Filter: only scores where the backing `closet_entry.entry_type = 'owned'` (since only owned entries have scores rows, this is guaranteed by the data model)
- Score display on ItemScreen is omitted if fewer than 3 distinct users have a scores row for that item
- Computed at query time (no materialized view for MVP)

### Cascade / Deletion Behavior

- Deleting a `closet_entry`: CASCADE deletes associated `scores` row; `winner_entry_id` and `loser_entry_id` in `comparisons` SET NULL (columns are nullable)
- Deleting a user: CASCADE deletes all rows where `user_id = deleted_user_id` across `closet_entries`, `comparisons`, `reviews`, `scores`, `follows`, `profiles`
- Deleting an `item`: RESTRICT — cannot delete if any `closet_entries` reference it

### RLS Policies

- `profiles`: SELECT public; UPDATE restricted to own row; INSERT via service trigger on signup
- `closet_entries`: SELECT public (closets are intentionally public); INSERT/UPDATE/DELETE restricted to own rows
- `comparisons`: SELECT public; INSERT restricted to own `user_id`; trigger validates ownership at insert
- `reviews`: SELECT public; INSERT restricted to own `user_id` + application-layer pre-check (see review gate below); no UPDATE or DELETE
- `scores`: SELECT public; INSERT/UPDATE via service role only
- `follows`: SELECT public; INSERT/DELETE restricted to own `follower_id`
- `brands`, `items`, `images`, `subtypes`: SELECT public; INSERT/UPDATE restricted to admin/service role

### Review Gate (Application-Layer Pre-Check)

The ≥3 owned active items gate and item ownership check are enforced in a Supabase Edge Function (or RPC) called before the review INSERT, rather than in a raw RLS expression, because they require a JOIN between `closet_entries` and `items` to filter by `is_active = true`. The function:
1. Counts `closet_entries` WHERE `user_id = auth.uid()` AND `entry_type = 'owned'` AND `item.is_active = true` → must be ≥ 3
2. Checks `closet_entries` WHERE `user_id = auth.uid()` AND `item_id = :item_id` AND `entry_type = 'owned'` → must exist
3. If both pass, performs the INSERT; otherwise returns an error code the client handles

### items.is_active Behavior

When `is_active = false`: item is hidden from Browse, Search results, and the comparison queue. Existing `closet_entries` remain in the owner's closet with a "discontinued" label. Inactive items do not count toward the ≥3 owned items review gate.

---

## Architecture

### Layered Structure

```
src/
  screens/       # One file per screen
  components/    # Reusable UI components
  hooks/         # Data-fetching hooks (useCloset, useComparisons, useScores, useFeed)
  services/      # Supabase query functions (closetService, scoreService, reviewService, etc.)
  lib/           # Supabase client, score calculation utilities
  navigation/    # Stack and tab navigator config
  types/         # Shared TypeScript types
```

UI components call custom hooks → hooks call service modules → services talk to Supabase. Each layer is independently testable. Auth state managed via React context.

### Navigation

```
RootNavigator
├── AuthStack (unauthenticated)
│   ├── WelcomeScreen
│   ├── SignUpScreen
│   └── LogInScreen
└── MainTabs (authenticated)
    ├── HomeTab      → ForYouFeedScreen
    ├── BrowseTab    → BrowseScreen → BrandScreen → ItemScreen
    ├── ClosetTab    → ClosetScreen → ItemDetailScreen
    ├── CompareTab   → ComparisonScreen
    └── SearchTab    → SearchScreen

Shared modal screens (reachable from multiple tabs):
  PublicClosetScreen  — shown when tapping a user from Feed or ItemScreen reviewer list
```

*PublicClosetScreen:* Displays another user's public closet (their owned + interested items with scores). Includes a Follow/Unfollow button. Tapping an item navigates to ItemScreen.

---

## Auth

- Email/password + Google OAuth via Supabase Auth
- Google OAuth uses Expo AuthSession; requires separate iOS and Android OAuth client IDs registered in Google Cloud Console; custom URI scheme registered in `app.json`
- On signup, a trigger creates a corresponding `profiles` row; username defaults to a sanitized form of the email local part and must be unique
- Session persisted via Supabase's built-in AsyncStorage adapter
- Auth state managed via React context
- On first login: redirect to ClosetTab (empty state)

---

## MVP Features (Priority Order)

### 1. Auth
- Welcome, Sign Up, Log In screens
- Email/password and Google OAuth

### 2. Browse
- BrowseScreen: paginated grid of all brands (logo + name), 20 per page
- BrandScreen: list of active items for a brand
- ItemScreen: images (sorted by `sort_order`), aggregate avg overall score + avg category score (omitted if < 3 scorers), all public reviews with reviewer username

### 3. Add to Closet
- From ItemScreen: "Add to Closet" → select Owned or Interested + color (required)
- Saves `closet_entry`
- If Owned: also creates `scores` row (zeros, defaults to 5.0, confidence = low); triggers comparison flow (skippable)
- Interested: saves entry only; no scores row created
- Upgrading an Interested entry to Owned: UPDATE `entry_type`; application creates `scores` row if absent; triggers comparison flow

### 4. Pairwise Comparison
- Triggered automatically after adding/upgrading an owned item (skippable); also accessible on demand from CompareTab
- Full-screen card UI showing two owned items side by side; user taps their preference
- On choice: writes `comparisons` row (INSERT only); service incrementally updates `scores` for both entries
- Comparison queue algorithm (in-memory per session; counter resets on session start):
  - Default: draw same-category pairs (shuffle all eligible owned pairs within the same category)
  - Every 5th comparison in a session is cross-category, IF the user owns items in ≥2 different categories
  - If no same-category pairs are available (only 1 owned item in a category), fall back to cross-category
  - If no valid pairs of any type exist, show empty state and exit
- Only `entry_type = owned` items are eligible; enforced at both UI level and DB trigger level
- User can exit at any time; all completed comparisons are persisted

### 5. Closet
- Grid/list of all closet entries (owned and interested)
- Owned items: show overall score + confidence badge
- Interested items: show no score (no scores row exists); display "Wishlist" label
- Tap owned item → ItemDetailScreen: overall score, category score, wins/losses, comparison history (opponent item name + outcome; shows "Unknown item" if opponent's entry was deleted), option to write review
- Tap interested item → ItemScreen for that item

### 6. Reviews
- Accessible from ItemDetailScreen (only shown if user owns the item)
- Fields: body text (required), fit rating 1–5 (required), quality rating 1–5 (required)
- Gated via Edge Function/RPC: user must own the item AND have ≥3 total active owned items
- Immutable after submission
- Displayed on ItemScreen with reviewer's username (from `profiles`)

### 7. For You Feed
- Activity event types: owned closet addition, comparison result (item name + new score), new review
- Feed assembled via a UNION query across `closet_entries` (owned adds only), `comparisons`, and `reviews`
- Cursor-based pagination:
  - Cursor = `(created_at, id)` pair from the last row on the current page
  - Cursor filter applied within each subquery before the UNION: `WHERE (created_at, id) < (:cursor_ts, :cursor_id)`, then UNION ALL, then ORDER BY created_at DESC, id DESC LIMIT 20
  - This ensures correct cross-table pagination without over-fetching
- Friends toggle: adds `AND user_id IN (SELECT following_id FROM follows WHERE follower_id = auth.uid())` to each subquery
- Everyone toggle: no user filter; returns all app activity
- Follow/Unfollow accessible from PublicClosetScreen

### 8. Search
- `ilike` queries on `brands.name` and `items.model_name` (active items only: `WHERE is_active = true`)
- Results displayed in two sections: Brands, Items

---

## Known Gaps / Pre-Launch Requirements

- **Account deletion UI:** Apple App Store and Google Play require an in-app deletion path for apps with account creation. Must be built before first public release. Deferred from MVP build.
- **Review anonymization:** All reviews currently show reviewer username. Post-MVP: anonymize for non-connections.
- **User-submitted images:** `source_type = 'user'` deferred; `images` table only accepts `seed` for MVP.
- **Comparison history orphans:** Deleted closet entries show as "Unknown item" in comparison history.

---

## Out of Scope for MVP

- Notifications
- ML recommendations
- Dedicated public profile pages (public closets viewable via PublicClosetScreen; no standalone profile page)
- Scraping
- Wear tracking / cost-per-wear
- Review anonymization for non-connections
- Mutual follow / friend request flows
- Affiliate or user-submitted images
- Account deletion UI (required pre-launch; not in MVP build scope)
