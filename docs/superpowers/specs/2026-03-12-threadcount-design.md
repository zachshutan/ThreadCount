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

**brands**
- id, name, logo_url, slug

**items**
- id, brand_id, model_name, subtype, category (`top | bottom | footwear`), is_active

**closet_entries**
- id, user_id, item_id, entry_type (`owned | interested`), color, created_at

**comparisons**
- id, user_id, winner_entry_id, loser_entry_id, comparison_type (`same_category | cross_category`), created_at

**reviews**
- id, user_id, item_id, body, fit_rating, quality_rating, created_at

**images**
- id, item_id, url, source_type (`seed | user | affiliate`), created_at

**scores**
- id, closet_entry_id, category_score, overall_score, wins, losses, confidence (`low | medium | high`), updated_at

**follows**
- id, follower_id, following_id, created_at

### Score Calculation Rules

- `category_score`: win-rate across same-category comparisons only, normalized to 0–10
- `overall_score`: win-rate across all comparisons (same-category + cross-category), normalized to 0–10
- Formula: `wins / (wins + losses) * 10`
- Confidence thresholds: low = <5 comparisons, medium = 5–15, high = >15
- Scores recalculated synchronously in `scoreService.ts` after every comparison write

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only write their own data
- Closets and reviews are publicly readable

---

## Architecture

### Layered Structure

```
src/
  screens/       # One file per screen
  components/    # Reusable UI components
  hooks/         # Data-fetching hooks (useCloset, useComparisons, useScores, useFeed)
  services/      # Supabase query functions (closetService, scoreService, etc.)
  lib/           # Supabase client, score calculation logic
  navigation/    # Stack and tab navigator config
  types/         # Shared TypeScript types
```

UI components call custom hooks → hooks call service modules → services talk to Supabase. Each layer is independently testable.

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
```

---

## Auth

- Email/password + Google OAuth via Supabase Auth
- Google OAuth uses Expo AuthSession
- Session persisted via Supabase's built-in storage
- Auth state managed via React context (no external state library needed)
- On first login: redirect to empty closet state

---

## MVP Features (Priority Order)

### 1. Auth
- Welcome, Sign Up, Log In screens
- Email/password and Google OAuth

### 2. Browse
- BrowseScreen: grid of all brands (logo + name)
- BrandScreen: list of items for a brand
- ItemScreen: item images, aggregate scores across all users, reviews

### 3. Add to Closet
- From ItemScreen: tap "Add to Closet" → select Owned or Interested + color
- Saves to `closet_entries`
- If Owned: immediately triggers pairwise comparison flow

### 4. Pairwise Comparison
- Triggered automatically after adding an owned item; also accessible on demand from CompareTab
- Full-screen card UI showing two owned items side by side
- User taps their preference; writes to `comparisons`, recalculates scores for both entries
- Primarily same-category comparisons; cross-category comparisons mixed in occasionally
- Only `entry_type = owned` items are eligible
- User can exit the flow at any time

### 5. Closet
- Grid/list of owned and interested items
- Each item shows its score and confidence level
- Tap item → ItemDetailScreen: score breakdown, comparison history, option to write a review

### 6. Reviews
- Written from ItemDetailScreen
- Fields: body text, fit rating, quality rating
- Gated: user must have ≥3 owned items to publish a review
- Reviews displayed on ItemScreen, attributed by username (anonymization deferred post-MVP)

### 7. For You Feed
- Shows recent comparison activity and reviews from followed users
- Toggle at top to show all recent app activity (not just friends)
- Follow/unfollow from any user's public closet
- Follow system is asymmetric (no mutual approval required)

### 8. Search
- Full-text search across brands and item model names
- Implemented via Supabase `ilike` queries

---

## Out of Scope for MVP

- Notifications
- ML recommendations
- Public user profiles (beyond public closets)
- Scraping
- Wear tracking / cost-per-wear
- Review anonymization for non-connections
- Mutual follow / friend request flows
