# Threadcount — Architecture

This document explains how the codebase is structured, where to find things, and how the major features work.

---

## Directory Structure

```
threadcount/
├── App.tsx                        # Entry point — wraps app in AuthProvider and RootNavigator
├── app.json                       # Expo config (name, bundle ID, scheme)
├── global.css                     # NativeWind global stylesheet
├── tailwind.config.js             # Tailwind/NativeWind config
├── plans/                         # Implementation plans (read before coding)
│   ├── plan-1.md
│   ├── plan-2.md
│   ├── plan-3.md
│   └── BACKLOG.md                 # Deferred features (tag filters, brand follows, etc.)
├── supabase/
│   └── migrations/                # SQL files applied to the Supabase database
│       ├── 001_create_tables.sql
│       ├── 002_rls_policies.sql
│       ├── 003_triggers.sql
│       ├── 004_seed_subtypes.sql
│       ├── 005_review_gate_rpc.sql
│       ├── 006_feed_rpc.sql
│       └── 007_rank_based_scoring.sql  # Adds category_rank to scores, website_url to brands
└── src/
    ├── __tests__/                 # All tests (mirror the src structure)
    │   ├── context/
    │   ├── lib/
    │   └── services/
    ├── components/                # Reusable UI pieces used by multiple screens
    ├── context/                   # React context providers (auth state)
    ├── hooks/                     # Custom hooks (data fetching + state)
    ├── lib/                       # Pure utility functions (no React, no Supabase)
    ├── navigation/                # React Navigation stack and tab definitions
    ├── screens/                   # One file per screen, organized by feature
    │   ├── auth/
    │   ├── browse/
    │   ├── closet/
    │   ├── compare/
    │   ├── feed/
    │   └── search/
    ├── services/                  # Supabase query functions (no React, no state)
    └── types/
        └── database.ts            # Auto-generated TypeScript types from Supabase
```

---

## The Core Architecture Pattern

Every feature in this app follows the same three-layer pattern:

```
Service  →  Hook  →  Screen
```

Think of it like this:
- The **service** is a helper that talks to the database. It knows SQL but nothing about the app.
- The **hook** is a middleman that calls the service, tracks whether data is loading, and holds the result in memory.
- The **screen** is what the user sees. It asks the hook for data and renders it.

**Example — browsing items in a brand:**

1. `src/services/itemService.ts` — `getItemsByBrand(brandId)` runs the Supabase query
2. `src/hooks/useItems.ts` — calls `getItemsByBrand`, holds `{ items, loading, error }`
3. `src/screens/browse/BrandScreen.tsx` — calls `useItems(brandId)`, renders the list

This pattern is used consistently throughout the codebase. If you're looking for where data comes from, start with the service. If you're looking for how loading states work, look at the hook.

---

## Services (`src/services/`)

Services contain raw Supabase queries. They are plain async TypeScript functions — no React hooks, no `useState`, no `useEffect`.

| File | What it does |
|---|---|
| `authService.ts` | Sign up, sign in, sign out, Google OAuth |
| `brandService.ts` | Fetch paginated list of brands; fetch a single brand by ID (includes `website_url`) |
| `itemService.ts` | Fetch items by brand, fetch single item, search items, aggregate scores |
| `imageService.ts` | Fetch images for an item |
| `reviewService.ts` | Submit a review (via Edge Function), fetch reviews for an item |
| `closetService.ts` | Fetch user's closet (includes score data in one query), add item, upgrade wishlist→owned, comparison history |
| `comparisonService.ts` | Record a ranking comparison (`recordRankingComparison` — type "ranking") |
| `scoreService.ts` | Create a score row; fetch ranked peers for a category (`fetchRankedPeers`); shift and recalculate all ranks after a change (`recalculateCategoryScores`) |
| `followService.ts` | Follow a user, unfollow, check follow status, get a user's public closet |
| `feedService.ts` | Fetch the For You feed (calls the `get_feed` Supabase RPC) |
| `searchService.ts` | Search brands and items by name using case-insensitive matching |

---

## Hooks (`src/hooks/`)

Hooks wrap services with React state management. They always return an object with at least `loading` and the data.

| File | What it returns |
|---|---|
| `useAuth.ts` | `{ session, user, loading }` — re-exports from AuthContext |
| `useBrands.ts` | `{ brands, loading, loadMore }` — paginated list of brands |
| `useItems.ts` | `{ items, loading }` — items for a given brand |
| `useItem.ts` | `{ item, aggregateScores, loading }` — single item with community scores |
| `useItemImages.ts` | `{ images, loading }` — images for an item |
| `useItemReviews.ts` | `{ reviews, loading }` — reviews for an item |
| `useCloset.ts` | `{ entries, owned, interested, ownedBySubtype, subtypeNames, loading, error, refresh }` — full closet; score data fetched in the same query (no N+1); `ownedBySubtype` is a grouped + sorted list ready for SectionList |
| `useClosetEntry.ts` | `{ entry, loading, refetch }` — a single item's closet status for the current user |
| `useRankingSession.ts` | `{ isLoading, isFinalizing, isDone, currentComparator, totalComparisons, comparisonCount, finalRank, totalItems, handleNewItemWins, handlePeerWins }` — drives the binary search ranking flow after an item is added |
| `useScores.ts` | `{ score, loading }` — score row for a given closet entry (still used in ItemDetailScreen) |
| `useFollow.ts` | `{ following, loading, toggling, toggle }` — follow state for a given user |
| `useFeed.ts` | `{ events, loading, refreshing, hasMore, refresh, loadMore, setFilter }` — For You feed |
| `useSearch.ts` | `{ query, results, loading, runSearch }` — search state |

---

## Screens (`src/screens/`)

Screens are organized by feature tab. Each screen file renders one view.

### Auth screens (`src/screens/auth/`)
- `WelcomeScreen.tsx` — first screen shown to logged-out users; links to sign up, log in, Google
- `SignUpScreen.tsx` — email + password sign-up form
- `LogInScreen.tsx` — email + password log-in form

### Browse screens (`src/screens/browse/`)
- `BrowseScreen.tsx` — 2-column grid of all brands, infinite scroll
- `BrandScreen.tsx` — list of items for a selected brand
- `ItemScreen.tsx` — item detail: image, community scores, Add to Closet button, reviews list
- `AddToClosetModal.tsx` — bottom sheet for choosing a color and adding an item to your closet

### Closet screens (`src/screens/closet/`)
- `ClosetScreen.tsx` — Owned tab shows a SectionList grouped by subtype (T-Shirt, Sneaker, etc.) sorted by rank; horizontal filter pills at the top let the user narrow to one subtype. Wishlist tab unchanged.
- `ItemDetailScreen.tsx` — score breakdown + comparison history for one owned item
- `WriteReviewScreen.tsx` — form to write a review (body text + fit/quality ratings 1–5)

### Compare screen (`src/screens/compare/`)
- `RankingComparisonScreen.tsx` — full-screen modal that launches automatically after an item is added to the closet. Shows a binary search ranking session: "Pick your favorite" between the new item and an existing item. Progress bar shows how many comparisons remain. After the last comparison, shows the item's final rank and score. Cannot be dismissed mid-session without cancelling (which removes the item from the closet).

### Feed screen (`src/screens/feed/`)
- `ForYouFeedScreen.tsx` — activity feed with Everyone / Friends toggle; cursor-paginated

### Search screen (`src/screens/search/`)
- `SearchScreen.tsx` — text input with real-time brand and item results in a section list

---

## Components (`src/components/`)

Reusable UI pieces shared by multiple screens.

| File | What it does |
|---|---|
| `AddToClosetButton.tsx` | Shows current closet state for an item ("Add to Closet", "In Your Closet ✓", "In Wishlist — Mark as Owned?") and opens the AddToClosetModal |
| `ClosetEntryCard.tsx` | A single row in the Closet list — shows item name, brand, color; for owned items shows a rank badge (#1, #2, etc.) and score (e.g. "8.5"); for unranked items shows "Unranked · Tap to rank"; for wishlist items shows a Wishlist badge. Score data comes from the closet query — no separate network call per card. |
| `SubcategoryPlaceholder.tsx` | Animated SVG silhouette shown in the ranking comparison cards when no product image is available. Accepts a `subtypeName` prop (e.g. "T-Shirt", "Sneaker") and renders a matching line-art illustration with a slow breathing opacity animation. Covers all 15 subtypes plus a generic fallback. |

---

## Navigation (`src/navigation/`)

The app uses React Navigation with a root navigator that switches between auth and the main app based on login state.

```
RootNavigator
├── AuthStack (shown when logged out)
│   ├── WelcomeScreen
│   ├── SignUpScreen
│   └── LogInScreen
└── Root stack (shown when logged in)
    ├── MainTabs  ← 4 tabs (Home, Browse, Closet, Search) with Ionicons
    │   ├── Home tab → ForYouFeedScreen
    │   ├── Browse tab → BrowseStack
    │   │   ├── BrowseScreen
    │   │   ├── BrandScreen
    │   │   └── ItemScreen
    │   ├── Closet tab → ClosetStack
    │   │   ├── ClosetScreen
    │   │   ├── ItemDetailScreen
    │   │   └── WriteReviewScreen
    │   └── Search tab → SearchScreen
    ├── PublicClosetScreen (modal, accessible from any tab)
    └── RankingComparisonScreen (full-screen modal, launched automatically after adding an owned item)
```

Type definitions for navigation params live in two files:
- `src/navigation/RootNavigator.tsx` exports `RootStackParamList` — includes `MainTabs`, `PublicCloset`, and `RankingComparison` (with params: `newEntryId`, `userId`, `category`, `itemName`, `subtypeName`)
- `src/navigation/MainTabs.tsx` exports `BrowseStackParamList`, `ClosetStackParamList`, and `MainTabsParamList` (the four bottom tabs)

---

## Authentication

Auth state is managed in `src/context/AuthContext.tsx` and exposed via `src/hooks/useAuth.ts`.

**How it works:**
1. `AuthContext` calls `supabase.auth.getSession()` when the app loads to restore any existing session
2. It subscribes to `supabase.auth.onAuthStateChange` to react to sign-in and sign-out events
3. `RootNavigator` reads `{ user, loading }` from `useAuth` to decide whether to show `AuthStack` or `MainTabs`
4. When `loading` is true (checking for an existing session), the navigator returns `null` so nothing flickers

**Sign in with email/password:**
- `authService.signIn(email, password)` calls `supabase.auth.signInWithPassword`
- The session is automatically persisted to device storage via AsyncStorage

**Sign in with Google:**
- `authService.signInWithGoogle()` uses `expo-auth-session` to open a browser popup
- It uses the PKCE flow: generates a code verifier/challenge, opens Supabase's OAuth URL, exchanges the returned code for a session
- Redirect URI: `threadcount://` (the app's custom scheme)

**User profiles:**
- When a new user signs up, a Postgres trigger (`handle_new_user`) automatically creates a row in the `profiles` table
- The `profiles` table holds `username`, `avatar_url`, and `bio`

---

## Supabase Setup

The Supabase client is created once in `src/lib/supabase.ts`:
- URL and anon key come from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables
- Sessions are persisted to device storage using AsyncStorage so users stay logged in

**Row Level Security (RLS):**
- Every table has RLS enabled
- Public data (brands, items, reviews, profiles) is readable by anyone
- Private data (closet entries, comparisons, scores) is only readable by the owner
- Write operations are restricted to the authenticated user's own rows

**Database tables:**

| Table | Purpose |
|---|---|
| `profiles` | User display name and avatar |
| `brands` | Clothing/footwear brands |
| `subtypes` | Item subtypes (e.g. Sneaker, T-Shirt, Jeans) |
| `items` | Individual products with brand and category |
| `images` | Product images linked to items |
| `closet_entries` | A user's owned or wishlisted items |
| `scores` | Rank-based scores per owned item — `category_rank` (integer position within the category) drives the score formula |
| `comparisons` | Every head-to-head comparison a user has made |
| `reviews` | Text reviews with fit and quality ratings |
| `follows` | Follow relationships between users |

---

## Scoring System

The scoring system lives in `src/lib/scoring.ts` (pure math, no React or Supabase).

Scores are based on **exact rank position** within a category (top / bottom / footwear), not win/loss ratio.

**Formula:**
```
score = 10 - ((rank - 1) / max(totalInCategory - 1, 1)) * 9
```

Examples:
- Rank 1 of 1 → 10.0 (only item in the category)
- Rank 1 of 5 → 10.0 (best in category)
- Rank 3 of 5 → 5.5
- Rank 5 of 5 → 1.0 (last in category)
- Always displayed as one decimal place (e.g., 8.5, not 8.50)

**Key function:** `calculateScoreFromRank(rank, totalInCategory)` in `src/lib/scoring.ts`

**How ranks are assigned:**
1. When an owned item is added, a binary search ranking session launches automatically (see Ranking Flow below)
2. The session finds the item's insertion point among existing ranked items in the same **category**
3. `scoreService.recalculateCategoryScores(userId, category)` is called after any rank change — it renumbers all ranks and recomputes all scores for every item in the category in one operation

**Ranking scope:** Category level only — tops compete against other tops, bottoms against bottoms, footwear against footwear. The subtype (T-Shirt, Hoodie, Sneaker, etc.) is display and grouping metadata only, not a ranking boundary.

**Unranked items:** Items with a `NULL` `category_rank` are shown as "Unranked · Tap to rank" in the closet. This can happen for items added before the ranking system was introduced.

---

## Ranking Flow

When a user marks an item as owned, the app immediately launches a ranking session to determine where the new item belongs among their existing items.

**Algorithm: Binary Search Insertion Sort**

The logic lives in `src/lib/binarySearchRanker.ts` (pure TypeScript, no React or Supabase).

1. Fetch all existing owned items in the same category, sorted by `category_rank ASC`
2. If 0 existing items → auto-assign rank 1, score 10.0. No comparisons needed.
3. If N existing items → binary search:
   - Compare the new item vs. the item at the midpoint of the current search range
   - "Pick your favorite: [new item] vs [existing item]?"
   - If the new item wins → search the better half; if it loses → search the other half
   - Repeat until the exact insertion position is found
   - Maximum comparisons = `ceil(log₂(N + 1))` — for 10 items, at most 4 comparisons
4. Insert the new item at the found position; all items below it shift down by 1
5. Recalculate scores for every item in the category from their new ranks

**Session state** is managed by `src/hooks/useRankingSession.ts`, which drives `RankingComparisonScreen`.

**Comparison records:** Each head-to-head choice is written to the `comparisons` table with `comparison_type = 'ranking'` via `comparisonService.recordRankingComparison()`. These are stored for history but do not affect scores — only ranks do.

**Abandoning mid-session:** If the user tries to navigate away, a native alert warns them that the item won't be ranked. If they confirm cancellation, the closet entry is deleted (rollback). The closet never contains partially-configured items.

---

## Key Files at a Glance

| What you're looking for | Where to find it |
|---|---|
| App entry point | `App.tsx` |
| Supabase client setup | `src/lib/supabase.ts` |
| Auth state | `src/context/AuthContext.tsx` |
| Google sign-in | `src/services/authService.ts` |
| Database schema | `supabase/migrations/001_create_tables.sql` |
| Rank-based scoring math | `src/lib/scoring.ts` — `calculateScoreFromRank(rank, total)` |
| Binary search ranking algorithm | `src/lib/binarySearchRanker.ts` |
| Closet grouping helpers | `src/lib/closetUtils.ts` — `groupOwnedBySubtype`, `getOwnedSubtypeNames` |
| Ranking session state machine | `src/hooks/useRankingSession.ts` |
| Ranking UI (comparison cards) | `src/screens/compare/RankingComparisonScreen.tsx` |
| Animated SVG placeholders | `src/components/SubcategoryPlaceholder.tsx` |
| Auto-generated DB types | `src/types/database.ts` |
| Navigation structure | `src/navigation/RootNavigator.tsx` + `src/navigation/MainTabs.tsx` |
| Implementation plans | `plans/plan-1.md`, `plan-2.md`, `plan-3.md` |
| Deferred feature backlog | `plans/BACKLOG.md` |
