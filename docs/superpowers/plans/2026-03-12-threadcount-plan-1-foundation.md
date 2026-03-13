# Threadcount Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the full Supabase schema, scaffold the Expo app with NativeWind, connect it to Supabase, and implement working email/password + Google OAuth authentication.

**Architecture:** Layered React Native app — screens call hooks, hooks call service modules, services talk to Supabase. Auth state lives in a React context accessible throughout the app. Navigation splits into an AuthStack (unauthenticated) and MainTabs (authenticated) controlled by the auth context.

**Tech Stack:** Expo SDK 52, React Native, TypeScript, NativeWind v4 (Tailwind CSS), Supabase JS v2, React Navigation v6, Expo AuthSession (Google OAuth), Jest + React Native Testing Library.

**Prerequisite:** A Supabase project must exist before running this plan. Use the Supabase MCP `create_project` tool or create one manually at supabase.com. Record the project ref, URL, and anon key — you will need them in Chunk 2.

---

## Chunk 1: Supabase Schema

### File Map

- Create: `supabase/migrations/001_create_tables.sql`
- Create: `supabase/migrations/002_rls_policies.sql`
- Create: `supabase/migrations/003_triggers.sql`
- Create: `supabase/migrations/004_seed_subtypes.sql`

---

### Task 1: Create migration 001 — all tables

**Files:**
- Create: `supabase/migrations/001_create_tables.sql`

- [ ] **Step 1: Create the migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write migration 001**

Create `supabase/migrations/001_create_tables.sql`:

```sql
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
```

---

### Task 2: Create migration 002 — RLS policies

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

- [ ] **Step 1: Write migration 002**

Create `supabase/migrations/002_rls_policies.sql`:

```sql
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
```

---

### Task 3: Create migration 003 — triggers

**Files:**
- Create: `supabase/migrations/003_triggers.sql`

- [ ] **Step 1: Write migration 003**

Create `supabase/migrations/003_triggers.sql`:

```sql
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
```

---

### Task 4: Create migration 004 — seed subtypes

**Files:**
- Create: `supabase/migrations/004_seed_subtypes.sql`

- [ ] **Step 1: Write migration 004**

Create `supabase/migrations/004_seed_subtypes.sql`:

```sql
insert into subtypes (name, category) values
  -- footwear
  ('Sneaker',  'footwear'),
  ('Boot',     'footwear'),
  ('Sandal',   'footwear'),
  ('Loafer',   'footwear'),
  ('Slipper',  'footwear'),
  ('Other',    'footwear'),
  -- tops
  ('T-Shirt',  'top'),
  ('Shirt',    'top'),
  ('Jacket',   'top'),
  ('Hoodie',   'top'),
  ('Sweater',  'top'),
  ('Coat',     'top'),
  ('Other',    'top'),
  -- bottoms
  ('Jeans',    'bottom'),
  ('Pants',    'bottom'),
  ('Shorts',   'bottom'),
  ('Skirt',    'bottom'),
  ('Other',    'bottom');
```

*Note: "Other" appears once per category — the composite unique(name, category) constraint on `subtypes` allows this.*

---

### Task 5: Apply all migrations

- [ ] **Step 1: Apply migration 001 using Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with the contents of `supabase/migrations/001_create_tables.sql`.
Name the migration: `create_tables`

- [ ] **Step 2: Apply migration 002**

Use `mcp__claude_ai_Supabase__apply_migration` with `002_rls_policies.sql`.
Name: `rls_policies`

- [ ] **Step 3: Apply migration 003**

Use `mcp__claude_ai_Supabase__apply_migration` with `003_triggers.sql`.
Name: `triggers`

- [ ] **Step 4: Apply migration 004**

Use `mcp__claude_ai_Supabase__apply_migration` with `004_seed_subtypes.sql`.
Name: `seed_subtypes`

- [ ] **Step 5: Verify schema via Supabase MCP**

Use `mcp__claude_ai_Supabase__list_tables` and confirm these tables exist:
`profiles`, `brands`, `items`, `subtypes`, `closet_entries`, `comparisons`, `reviews`, `images`, `scores`, `follows`

- [ ] **Step 6: Commit migration files**

```bash
git add supabase/migrations/
git commit -m "feat: add Supabase schema migrations"
```

---

## Chunk 2: Expo App Scaffold

### File Map

- Create: `package.json` (via create-expo-app, then modified)
- Create: `app.json`
- Create: `babel.config.js`
- Create: `metro.config.js`
- Create: `tailwind.config.js`
- Create: `tsconfig.json`
- Create: `.env` (gitignored)
- Create: `src/lib/supabase.ts`
- Create: `src/types/database.ts`
- Create: `src/navigation/RootNavigator.tsx`
- Create: `src/navigation/AuthStack.tsx`
- Create: `src/navigation/MainTabs.tsx`
- Create: `src/screens/auth/WelcomeScreen.tsx` (placeholder)
- Create: `src/screens/browse/BrowseScreen.tsx` (placeholder)
- Create: `src/screens/closet/ClosetScreen.tsx` (placeholder)
- Create: `src/screens/compare/ComparisonScreen.tsx` (placeholder)
- Create: `src/screens/search/SearchScreen.tsx` (placeholder)
- Create: `src/screens/feed/ForYouFeedScreen.tsx` (placeholder)
- Modify: `.gitignore` (add .env)

---

### Task 6: Initialize Expo app

- [ ] **Step 1: Scaffold Expo app in the existing repo directory**

```bash
npx create-expo-app@latest . --template blank-typescript
```

When prompted about existing files, keep the existing ones (LICENSE, README.md, docs/).

- [ ] **Step 2: Verify the project was created**

```bash
npx expo --version
```

Expected: prints Expo CLI version (e.g., `0.22.x`)

---

### Task 7: Install all dependencies

- [ ] **Step 1: Install NativeWind and Tailwind**

```bash
npm install nativewind@^4.0.0
npm install --save-dev tailwindcss@^3.4.0
```

- [ ] **Step 2: Install Supabase JS client**

```bash
npm install @supabase/supabase-js
npx expo install @react-native-async-storage/async-storage expo-secure-store
```

- [ ] **Step 3: Install React Navigation**

```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
```

- [ ] **Step 4: Install Google OAuth dependencies**

```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
```

- [ ] **Step 5: Install testing dependencies**

```bash
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

---

### Task 8: Configure NativeWind

- [ ] **Step 1: Initialize Tailwind config**

```bash
npx tailwindcss init
```

- [ ] **Step 2: Update `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 3: Update `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

- [ ] **Step 4: Update `metro.config.js`** (create if it doesn't exist)

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 5: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Import `global.css` in `App.tsx`**

Add as the first line of `App.tsx`:

```typescript
import "./global.css";
```

---

### Task 9: Configure Supabase client

- [ ] **Step 1: Create `.env` file (never commit this)**

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Replace values with your project's URL and anon key from the Supabase dashboard (Settings → API).

- [ ] **Step 2: Add `.env` to `.gitignore`**

Append to `.gitignore`:
```
.env
.env.local
```

- [ ] **Step 3: Create `src/lib/supabase.ts`**

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: Create `src/types/database.ts`**

Use `mcp__claude_ai_Supabase__generate_typescript_types` to generate types and paste the output into `src/types/database.ts`.

If MCP is not available, create a minimal placeholder:

```typescript
// Generated types — run `npx supabase gen types typescript` to regenerate
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Full generated types go here after running supabase gen types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string; avatar_url: string | null; created_at: string };
        Insert: { id: string; username: string; avatar_url?: string | null };
        Update: { username?: string; avatar_url?: string | null };
      };
      // Add remaining tables as needed
    };
  };
};
```

---

### Task 10: Set up navigation shell

- [ ] **Step 1: Create `src/navigation/AuthStack.tsx`**

```typescript
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/auth/WelcomeScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      {/* SignUpScreen and LogInScreen added in Chunk 3 */}
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

Create each of the following with identical placeholder content (substitute the screen name):

`src/screens/auth/WelcomeScreen.tsx`:
```typescript
import React from "react";
import { View, Text } from "react-native";

export default function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-semibold">Welcome</Text>
    </View>
  );
}
```

Create the same pattern for:
- `src/screens/browse/BrowseScreen.tsx` (text: "Browse")
- `src/screens/closet/ClosetScreen.tsx` (text: "Closet")
- `src/screens/compare/ComparisonScreen.tsx` (text: "Compare")
- `src/screens/search/SearchScreen.tsx` (text: "Search")
- `src/screens/feed/ForYouFeedScreen.tsx` (text: "For You")

- [ ] **Step 3: Create `src/navigation/MainTabs.tsx`**

```typescript
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ForYouFeedScreen from "../screens/feed/ForYouFeedScreen";
import BrowseScreen from "../screens/browse/BrowseScreen";
import ClosetScreen from "../screens/closet/ClosetScreen";
import ComparisonScreen from "../screens/compare/ComparisonScreen";
import SearchScreen from "../screens/search/SearchScreen";

export type MainTabsParamList = {
  Home: undefined;
  Browse: undefined;
  Closet: undefined;
  Compare: undefined;
  Search: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={ForYouFeedScreen} />
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="Closet" component={ClosetScreen} />
      <Tab.Screen name="Compare" component={ComparisonScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3b: Create a stub `src/context/AuthContext.tsx`**

`RootNavigator` and `App.tsx` import from `AuthContext`, which is fully implemented in Chunk 3.
Create this stub now so the scaffold compiles:

```typescript
// Stub — replaced in Chunk 3, Task 13
import React, { createContext, useContext, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = { session: Session | null; user: User | null; loading: boolean };
const AuthContext = createContext<AuthContextValue>({ session: null, user: null, loading: false });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={{ session: null, user: null, loading: false }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { return useContext(AuthContext); }
```

- [ ] **Step 4: Create `src/navigation/RootNavigator.tsx`**

```typescript
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

- [ ] **Step 5: Update `App.tsx`**

```typescript
import "./global.css";
import React from "react";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

---

### Task 11: Configure Jest

- [ ] **Step 1: Add Jest config to `package.json`**

Add the following `jest` key to `package.json`:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

*Note: The correct Jest key name for post-framework setup files has changed across Jest versions. The key shown above (`setupFilesAfterFramework`) may not be recognized — verify it works by running `npx jest --showConfig | grep -i setup`. If the extend-expect matchers aren't available in tests, the correct key for your version is likely `setupFilesAfterEach` or can be found in the jest-expo and @testing-library/jest-native README.*

- [ ] **Step 2: Verify Jest runs**

```bash
npx jest --passWithNoTests
```

Expected: "Test Suites: 0 skipped" and exit code 0.

- [ ] **Step 3: Commit scaffold**

```bash
git add App.tsx app.json babel.config.js metro.config.js tailwind.config.js tsconfig.json global.css package.json src/
git commit -m "feat: scaffold Expo app with NativeWind, Supabase client, and navigation shell"
```

---

## Chunk 3: Auth

### File Map

- Create: `src/lib/scoring.ts`
- Create: `src/__tests__/lib/scoring.test.ts`
- Create: `src/context/AuthContext.tsx`
- Create: `src/__tests__/context/AuthContext.test.tsx`
- Create: `src/services/authService.ts`
- Create: `src/__tests__/services/authService.test.ts`
- Create: `src/hooks/useAuth.ts`
- Modify: `src/screens/auth/WelcomeScreen.tsx`
- Create: `src/screens/auth/SignUpScreen.tsx`
- Create: `src/screens/auth/LogInScreen.tsx`
- Modify: `src/navigation/AuthStack.tsx`

---

### Task 12: TDD — scoring utility

- [ ] **Step 1: Write failing tests for scoring.ts**

Create `src/__tests__/lib/scoring.test.ts`:

```typescript
import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
} from "../../lib/scoring";

describe("calculateOverallScore", () => {
  it("returns 5.0 when no comparisons have been made", () => {
    expect(calculateOverallScore(0, 0)).toBe(5.0);
  });

  it("returns 10.0 when all comparisons are wins", () => {
    expect(calculateOverallScore(10, 0)).toBe(10.0);
  });

  it("returns 0.0 when all comparisons are losses", () => {
    expect(calculateOverallScore(0, 10)).toBe(0.0);
  });

  it("returns 5.0 when wins equal losses", () => {
    expect(calculateOverallScore(5, 5)).toBe(5.0);
  });

  it("returns 8.0 for 4 wins and 1 loss", () => {
    expect(calculateOverallScore(4, 1)).toBe(8.0);
  });
});

describe("calculateCategoryScore", () => {
  it("returns 5.0 when no category comparisons made", () => {
    expect(calculateCategoryScore(0, 0)).toBe(5.0);
  });

  it("returns 10.0 when all category comparisons are wins", () => {
    expect(calculateCategoryScore(3, 0)).toBe(10.0);
  });

  it("returns correct value for mixed results", () => {
    expect(calculateCategoryScore(3, 1)).toBe(7.5);
  });
});

describe("calculateConfidence", () => {
  it("returns low for 0 comparisons", () => {
    expect(calculateConfidence(0)).toBe("low");
  });

  it("returns low for 4 comparisons", () => {
    expect(calculateConfidence(4)).toBe("low");
  });

  it("returns medium for 5 comparisons", () => {
    expect(calculateConfidence(5)).toBe("medium");
  });

  it("returns medium for 15 comparisons", () => {
    expect(calculateConfidence(15)).toBe("medium");
  });

  it("returns high for 16 comparisons", () => {
    expect(calculateConfidence(16)).toBe("high");
  });

  it("returns high for 100 comparisons", () => {
    expect(calculateConfidence(100)).toBe("high");
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx jest src/__tests__/lib/scoring.test.ts --verbose
```

Expected: All tests FAIL with "Cannot find module '../../lib/scoring'"

- [ ] **Step 3: Implement `src/lib/scoring.ts`**

```typescript
export type ConfidenceLevel = "low" | "medium" | "high";

/**
 * Calculates overall score (0–10) from wins and losses.
 * Returns 5.0 if no comparisons have been made (avoids division by zero).
 */
export function calculateOverallScore(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 5.0;
  return (wins / total) * 10;
}

/**
 * Calculates category score (0–10) from category-scoped wins and losses.
 * Returns 5.0 if no category comparisons have been made.
 */
export function calculateCategoryScore(
  categoryWins: number,
  categoryLosses: number
): number {
  const total = categoryWins + categoryLosses;
  if (total === 0) return 5.0;
  return (categoryWins / total) * 10;
}

/**
 * Returns confidence level based on total comparison count.
 * low: 0–4, medium: 5–15, high: 16+
 */
export function calculateConfidence(totalComparisons: number): ConfidenceLevel {
  if (totalComparisons <= 4) return "low";
  if (totalComparisons <= 15) return "medium";
  return "high";
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx jest src/__tests__/lib/scoring.test.ts --verbose
```

Expected: All 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/__tests__/lib/scoring.test.ts
git commit -m "feat: add scoring utility with full test coverage"
```

---

### Task 13: AuthContext

- [ ] **Step 1: Write failing test for AuthContext first (TDD)**

Create `src/__tests__/context/AuthContext.test.tsx`:

```typescript
import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "../../context/AuthContext";

// Mock Supabase client
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

function TestConsumer() {
  const { session, user, loading } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="session">{session ? "has-session" : "no-session"}</Text>
      <Text testID="user">{user ? "has-user" : "no-user"}</Text>
    </>
  );
}

describe("AuthContext", () => {
  it("renders without crashing", async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await act(async () => {});
    expect(getByTestId("session").props.children).toBe("no-session");
    expect(getByTestId("user").props.children).toBe("no-user");
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/context/AuthContext.test.tsx --verbose
```

Expected: FAIL with "Cannot find module '../../context/AuthContext'"

- [ ] **Step 3: Implement `src/context/AuthContext.tsx`** (replaces the stub created in Chunk 2)

```typescript
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(() => {
        // Session fetch failed — treat as unauthenticated
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
```

- [ ] **Step 4: Create `src/hooks/useAuth.ts`**

```typescript
// Re-export from context for convenient import
export { useAuth } from "../context/AuthContext";
```

- [ ] **Step 5: Run test — confirm it passes**

```bash
npx jest src/__tests__/context/AuthContext.test.tsx --verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/context/AuthContext.tsx src/hooks/useAuth.ts src/__tests__/context/AuthContext.test.tsx
git commit -m "feat: add AuthContext and useAuth hook"
```

---

### Task 14: authService (email/password)

- [ ] **Step 1: Write failing tests for authService**

Create `src/__tests__/services/authService.test.ts`:

```typescript
import { signUp, signIn, signOut } from "../../services/authService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe("signUp", () => {
  it("calls supabase.auth.signUp with email and password", async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "123" }, session: null },
      error: null,
    });

    const result = await signUp("test@example.com", "password123");
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });

  it("returns error when supabase returns error", async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: "Email already in use" },
    });

    const result = await signUp("taken@example.com", "password123");
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe("Email already in use");
  });
});

describe("signIn", () => {
  it("calls supabase.auth.signInWithPassword", async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const result = await signIn("test@example.com", "password123");
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });
});

describe("signOut", () => {
  it("calls supabase.auth.signOut", async () => {
    (mockSupabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });
    await signOut();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest src/__tests__/services/authService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/authService.ts`**

```typescript
import { AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthResult = { error: AuthError | null };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest src/__tests__/services/authService.test.ts --verbose
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/authService.ts src/__tests__/services/authService.test.ts
git commit -m "feat: add authService with email/password sign up, sign in, sign out"
```

---

### Task 15: Auth screens (email/password)

- [ ] **Step 1: Implement `src/screens/auth/WelcomeScreen.tsx`**

```typescript
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthStack";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Welcome">;
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-4xl font-bold mb-2">Threadcount</Text>
      <Text className="text-base text-gray-500 mb-12 text-center">
        Rate what you own. Discover what's next.
      </Text>
      <TouchableOpacity
        className="w-full bg-black py-4 rounded-xl mb-3 items-center"
        onPress={() => navigation.navigate("SignUp")}
      >
        <Text className="text-white font-semibold text-base">Create account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-full border border-black py-4 rounded-xl items-center"
        onPress={() => navigation.navigate("LogIn")}
      >
        <Text className="text-black font-semibold text-base">Log in</Text>
      </TouchableOpacity>
    </View>
  );
}
```

*Note: Steps 2 and 3 import `AuthStackParamList` types that include `SignUp` and `LogIn`. The Chunk 2 stub only defined `Welcome`. TypeScript will show errors until Step 4 updates `AuthStack.tsx` with the full param list — this is expected and resolved by Step 4.*

- [ ] **Step 2: Implement `src/screens/auth/SignUpScreen.tsx`**

```typescript
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { signUp } from "../../services/authService";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "SignUp">;
};

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter an email and password.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    }
    // On success, AuthContext detects the new session and navigates automatically
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <TouchableOpacity className="mb-8" onPress={() => navigation.goBack()}>
          <Text className="text-gray-500">← Back</Text>
        </TouchableOpacity>
        <Text className="text-3xl font-bold mb-8">Create account</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <TouchableOpacity
          className={`w-full bg-black py-4 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Creating account…" : "Create account"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Implement `src/screens/auth/LogInScreen.tsx`**

```typescript
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { signIn } from "../../services/authService";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "LogIn">;
};

export default function LogInScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogIn() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      Alert.alert("Log in failed", error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <TouchableOpacity className="mb-8" onPress={() => navigation.goBack()}>
          <Text className="text-gray-500">← Back</Text>
        </TouchableOpacity>
        <Text className="text-3xl font-bold mb-8">Log in</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <TouchableOpacity
          className={`w-full bg-black py-4 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
          onPress={handleLogIn}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Logging in…" : "Log in"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 4: Register SignUp and LogIn screens in AuthStack**

Update `src/navigation/AuthStack.tsx`:

```typescript
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import LogInScreen from "../screens/auth/LogInScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="LogIn" component={LogInScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 5: Smoke-test auth screens render**

```bash
npx jest src/__tests__/ --verbose
```

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/auth/ src/navigation/AuthStack.tsx
git commit -m "feat: implement auth screens (welcome, sign up, log in)"
```

---

### Task 16: Google OAuth

- [ ] **Step 1: Configure Google OAuth in Supabase dashboard**

In the Supabase dashboard → Authentication → Providers → Google:
- Enable Google provider
- Add the OAuth client IDs for iOS and Android (from Google Cloud Console)
- Copy the "Callback URL" shown — you'll need it in Google Cloud Console

In Google Cloud Console (create credentials for each platform separately):
- **iOS:** Create an OAuth 2.0 client ID of type "iOS". Set the Bundle ID to your `expo.ios.bundleIdentifier` value. No redirect URI needed for iOS native auth.
- **Android:** Create an OAuth 2.0 client ID of type "Android". Set the Package name and the SHA-1 certificate fingerprint (run `expo fetch:android:hashes` or use the debug keystore fingerprint for dev builds).
- The Supabase Callback URL shown in the dashboard is used for web OAuth only — do not add it as a native redirect URI for iOS/Android.

- [ ] **Step 2: Configure redirect scheme in `app.json`**

Add scheme to `app.json`:

```json
{
  "expo": {
    "scheme": "threadcount",
    "ios": {
      "bundleIdentifier": "com.yourname.threadcount"
    },
    "android": {
      "package": "com.yourname.threadcount"
    }
  }
}
```

Replace `com.yourname.threadcount` with your actual bundle identifier.

- [ ] **Step 3: Add `signInWithGoogle` to `src/services/authService.ts`**

Append to `authService.ts`. Supabase JS v2 handles PKCE internally — no manual code verifier needed:

```typescript
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: "threadcount" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) return { error: error ?? { message: "No OAuth URL returned" } as AuthError };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type === "success" && result.url) {
      // Extract the authorization code from the redirect URL and exchange it for a session
      const code = new URL(result.url).searchParams.get("code");
      if (code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        return { error: sessionError };
      }
    }

    return { error: null };
  } catch (e) {
    return { error: { message: String(e) } as AuthError };
  }
}
```

- [ ] **Step 3b: Call `maybeCompleteAuthSession` in `App.tsx`**

`WebBrowser.maybeCompleteAuthSession()` must be called inside a rendered React component, not a service module, so the OAuth browser session is properly dismissed. Add it to `App.tsx`:

```typescript
import "./global.css";
import React from "react";
import * as WebBrowser from "expo-web-browser";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

// Called at module level (not inside a component) — required by Expo to
// dismiss the auth browser session on Android when the app is reopened via redirect.
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Replace `src/screens/auth/WelcomeScreen.tsx` with full Google OAuth version**

```typescript
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { signInWithGoogle } from "../../services/authService";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Welcome">;
};

export default function WelcomeScreen({ navigation }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert("Google sign in failed", error.message);
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-4xl font-bold mb-2">Threadcount</Text>
      <Text className="text-base text-gray-500 mb-12 text-center">
        Rate what you own. Discover what's next.
      </Text>
      <TouchableOpacity
        className="w-full bg-black py-4 rounded-xl mb-3 items-center"
        onPress={() => navigation.navigate("SignUp")}
      >
        <Text className="text-white font-semibold text-base">Create account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-full border border-black py-4 rounded-xl items-center mb-6"
        onPress={() => navigation.navigate("LogIn")}
      >
        <Text className="text-black font-semibold text-base">Log in</Text>
      </TouchableOpacity>
      <View className="flex-row items-center w-full mb-6">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="mx-3 text-gray-400 text-sm">or</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>
      <TouchableOpacity
        className={`w-full border border-gray-300 py-4 rounded-xl items-center ${
          googleLoading ? "opacity-50" : ""
        }`}
        onPress={handleGoogleSignIn}
        disabled={googleLoading}
      >
        <Text className="font-semibold text-base">
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add App.tsx src/services/authService.ts src/screens/auth/WelcomeScreen.tsx app.json
git commit -m "feat: add Google OAuth sign in via Expo AuthSession"
```

---

### Task 17: End-to-end auth smoke test

- [ ] **Step 1: Start the development server**

```bash
npx expo start
```

- [ ] **Step 2: Open in iOS Simulator or Android Emulator**

Press `i` for iOS or `a` for Android in the Expo CLI.

- [ ] **Step 3: Verify email/password auth flow**

1. App opens to WelcomeScreen — "Threadcount" title, "Create account", "Log in", and "Continue with Google" buttons visible
2. Tap "Create account" → SignUpScreen renders
3. Enter a test email/password → tap "Create account" → app navigates to MainTabs (bottom tabs visible)
4. Confirm in Supabase dashboard → Authentication → Users that the user was created
5. Confirm a `profiles` row was created (the on_auth_user_created trigger should have fired)
6. Tap any tab — placeholder screen renders without crashing
7. Close and reopen the app — user remains signed in (session persists via AsyncStorage)

- [ ] **Step 4: Verify Google OAuth flow**

1. Return to WelcomeScreen (force-close app, or log out if a sign-out button was added)
2. Tap "Continue with Google" → browser/webview opens to Google sign-in
3. Sign in with a Google account → redirected back to app via `threadcount://` scheme
4. App navigates to MainTabs
5. Confirm in Supabase dashboard → Authentication → Users that the Google user was created
6. Confirm a `profiles` row was created for the Google user

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add App.tsx src/context/AuthContext.tsx src/services/authService.ts src/screens/auth/
git commit -m "fix: resolve any auth integration issues found in smoke test"
```

---

*Plan 1 complete. Proceed to Plan 2 (Core Features) once auth is verified working.*
