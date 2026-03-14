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
│   └── plan-3.md
├── supabase/
│   └── migrations/                # SQL files applied to the Supabase database
│       ├── 001_create_tables.sql
│       ├── 002_rls_policies.sql
│       ├── 003_triggers.sql
│       ├── 004_seed_subtypes.sql
│       ├── 005_review_gate_rpc.sql
│       └── 006_feed_rpc.sql
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
| `brandService.ts` | Fetch paginated list of brands |
| `itemService.ts` | Fetch items by brand, fetch single item, search items, aggregate scores |
| `imageService.ts` | Fetch images for an item |
| `reviewService.ts` | Submit a review (via Edge Function), fetch reviews for an item |
| `closetService.ts` | Fetch user's closet, add item, upgrade wishlist→owned, comparison history |
| `comparisonService.ts` | Record a comparison result and update scores for both items |
| `scoreService.ts` | Create a new score row for an owned item, increment win/loss counts |
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
| `useCloset.ts` | `{ entries, owned, interested, loading, error, refresh }` — current user's full closet |
| `useClosetEntry.ts` | `{ entry, loading, refetch }` — a single item's closet status for the current user |
| `useComparisonQueue.ts` | `{ currentPair, progress, totalPairs, completedPairs, advance }` — session comparison queue |
| `useScores.ts` | `{ score, loading }` — score row for a given closet entry |
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
- `ClosetScreen.tsx` — Owned / Wishlist tabs with scores on each card
- `ItemDetailScreen.tsx` — score breakdown + comparison history for one owned item
- `WriteReviewScreen.tsx` — form to write a review (body text + fit/quality ratings 1–5)

### Compare screen (`src/screens/compare/`)
- `ComparisonScreen.tsx` — two items side-by-side; tap one to pick it; progress bar at top

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
| `ClosetEntryCard.tsx` | A single row in the Closet list — shows item name, brand, color, score (if owned), or Wishlist badge |

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
    ├── MainTabs
    │   ├── Home tab → ForYouFeedScreen
    │   ├── Browse tab → BrowseStack
    │   │   ├── BrowseScreen
    │   │   ├── BrandScreen
    │   │   └── ItemScreen
    │   ├── Closet tab → ClosetStack
    │   │   ├── ClosetScreen
    │   │   ├── ItemDetailScreen
    │   │   └── WriteReviewScreen
    │   ├── Compare tab → ComparisonScreen
    │   └── Search tab → SearchScreen
    └── PublicClosetScreen (modal, accessible from any tab)
```

Type definitions for navigation params live in `src/navigation/MainTabs.tsx`:
- `BrowseStackParamList` — params for Browse tab screens
- `ClosetStackParamList` — params for Closet tab screens
- `MainTabsParamList` — the five bottom tabs

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
| `scores` | ELO-style scores per owned item (updated after each comparison) |
| `comparisons` | Every head-to-head comparison a user has made |
| `reviews` | Text reviews with fit and quality ratings |
| `follows` | Follow relationships between users |

---

## Scoring System

The scoring system lives in `src/lib/scoring.ts` (pure math, no React or Supabase).

- Every owned item starts at `5.0` overall and `5.0` category score
- After each comparison, wins and losses are incremented and scores are recalculated
- `calculateOverallScore(wins, losses)` — maps win rate to a 0–10 scale
- `calculateCategoryScore(categoryWins, categoryLosses)` — same formula for within-category matchups
- `calculateConfidence(totalComparisons)` — returns "low" (0–4), "medium" (5–15), or "high" (16+)

Score updates happen in `scoreService.incrementScore()`, which is called automatically by `comparisonService.recordComparison()` after every comparison.

---

## Comparison Queue

The in-memory comparison queue lives in `src/lib/comparisonQueue.ts` (pure TypeScript, no React or Supabase).

`buildQueue(entries)` takes a list of owned items and produces an ordered list of comparison pairs:
1. All same-category pairs are generated first (e.g., all sneaker vs. sneaker matchups)
2. Cross-category pairs (e.g., sneaker vs. t-shirt) are injected at every 5th position
3. If no same-category pairs exist, only cross-category pairs are used
4. The queue is rebuilt from scratch each session — no persistent order

The queue is consumed by `useComparisonQueue` (hook) and `ComparisonScreen` (UI).

---

## Key Files at a Glance

| What you're looking for | Where to find it |
|---|---|
| App entry point | `App.tsx` |
| Supabase client setup | `src/lib/supabase.ts` |
| Auth state | `src/context/AuthContext.tsx` |
| Google sign-in | `src/services/authService.ts` |
| Database schema | `supabase/migrations/001_create_tables.sql` |
| Scoring math | `src/lib/scoring.ts` |
| Comparison queue algorithm | `src/lib/comparisonQueue.ts` |
| Auto-generated DB types | `src/types/database.ts` |
| Navigation structure | `src/navigation/RootNavigator.tsx` + `src/navigation/MainTabs.tsx` |
| Implementation plans | `plans/plan-1.md`, `plan-2.md`, `plan-3.md` |
