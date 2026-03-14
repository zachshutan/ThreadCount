# Threadcount

A mobile app for rating and ranking your clothing and footwear through pairwise comparison. Instead of giving items a star rating, you compare two items head-to-head and pick the one you prefer. Over time, every item in your closet gets an ELO-style score based on how often it wins.

---

## Project Overview

Threadcount lets you:
- **Browse** brands and items from a catalog
- **Build a closet** by marking items as Owned or adding them to a Wishlist
- **Compare** owned items head-to-head (same-category first, with cross-category comparisons mixed in every 5th slot)
- **See scores** for every owned item — overall score, category score, confidence level (low / medium / high), and comparison history
- **Write reviews** for items you own (gated: you must own ≥3 items first)
- **Follow other users** and browse their public closets
- **See a feed** of what people in the community are adding, comparing, and reviewing
- **Search** for brands or items by name

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile framework | Expo SDK 55 (React Native) |
| Language | TypeScript |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Navigation | React Navigation v6 (native stack + bottom tabs) |
| Database & Auth | Supabase JS v2 (PostgreSQL, Row Level Security, Edge Functions) |
| Google OAuth | expo-auth-session + expo-web-browser (PKCE flow) |
| Testing | Jest 29 + jest-expo + @testing-library/react-native |

---

## How to Run the App Locally

### Prerequisites

You need these installed on your computer before starting:
- **Node.js** (version 18 or higher) — download from nodejs.org
- **npm** (comes with Node.js)
- **Expo Go** app on your phone — search "Expo Go" in the App Store or Google Play

### Step 1: Clone the repo

```bash
git clone https://github.com/zachshutan/ThreadCount.git
cd ThreadCount
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Create your environment file

Create a file called `.env.local` in the root of the project:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

To find these values:
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the **Project URL** and the **anon public** key

### Step 4: Start the development server

```bash
npm start
```

This opens the Expo developer tools in your browser. Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android) to open the app.

---

## Supabase Integration

This app uses [Supabase](https://supabase.com) for everything backend:

- **Database** — PostgreSQL with tables for brands, items, closet entries, comparisons, reviews, scores, follows, and user profiles
- **Auth** — Email/password sign-up and Google OAuth
- **Row Level Security (RLS)** — Every table has policies so users can only read/write their own data
- **Edge Functions** — A serverless function (`check-review-gate`) enforces the review gate before inserting a review
- **Realtime** — Not used in the current MVP

### Database migrations

All schema changes live in `supabase/migrations/`. They are applied in order:

| File | What it does |
|---|---|
| `001_create_tables.sql` | Creates all tables and enums |
| `002_rls_policies.sql` | Enables Row Level Security on all tables |
| `003_triggers.sql` | Auto-creates user profiles on sign-up, validates data integrity |
| `004_seed_subtypes.sql` | Seeds clothing subtypes (sneakers, t-shirts, jeans, etc.) |
| `005_review_gate_rpc.sql` | Adds the `count_owned_active_items` RPC used by the review gate |
| `006_feed_rpc.sql` | Adds the `get_feed` RPC for the For You feed |

To apply migrations to your Supabase project, use the Supabase CLI:

```bash
supabase db push
```

---

## Google OAuth Setup

Google sign-in uses the web OAuth client (not the Android or iOS native clients). The redirect URI uses the app's custom scheme.

- **App scheme:** `threadcount://`
- **Bundle ID (iOS):** `com.threadcount.app`
- **Android package:** `com.threadcount.app`
- **Redirect URI:** `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`

### Setup steps

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** with type **Web application**
3. Add your Supabase callback URL as an authorized redirect URI
4. Copy the **Client ID** and **Client Secret** into your Supabase project: Authentication → Providers → Google

---

## Development Workflow

This project uses a **plan-driven development** approach. All features are specified in advance in numbered plan files before any code is written.

```
plans/
  plan-1.md   ← Foundation: schema, auth, navigation
  plan-2.md   ← Core features: browse, closet, compare
  plan-3.md   ← Social: reviews, follows, feed, search
```

Development follows a strict cycle for every chunk of work:

1. Read and understand the chunk
2. Write failing tests first (TDD)
3. Implement the code
4. Run tests — all must pass
5. Commit with a clear message
6. Push to GitHub

See `CLAUDE.md` for the full rules used when working with an AI assistant.

---

## Running Tests

```bash
# Run all tests
npx jest

# Run tests for a specific file
npx jest src/__tests__/lib/scoring.test.ts --verbose

# Run all tests with verbose output
npx jest --verbose
```

All tests should pass before committing. The current test suite covers services, hooks, and utility functions.
