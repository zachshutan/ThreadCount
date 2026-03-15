# Threadcount Product Backlog

Features deferred from the Phase A–D rebuild. Use this alongside a Notion page for tracking status.

## Deferred from Polish Pass (Phase 6)

| Feature | Notes | Schema needed |
|---------|-------|---------------|
| Likes on posts | Like any feed event (closet_add, comparison, review). Requires `post_likes (user_id, event_type, event_id, created_at)` table + RLS + likeService + useLikes hook + heart icon + count in EventCard | `post_likes` table |
| Comments on posts | Comment thread per feed event. Requires `post_comments (id, user_id, event_type, event_id, body, created_at)` table + RLS + commentService + useComments hook + comment list + input in PostDetailScreen | `post_comments` table |
| Color on PostDetailScreen | Feed RPC does not currently return item color. Requires updating `get_feed` RPC to join `closet_entries.color` and surfacing it in PostDetailScreen | Feed RPC migration |
| Post images | Allow users to attach photos to feed posts/reviews. User explicitly requested "future version" | `review_images` or `post_images` table |
| Change password | Password reset via Supabase auth flow (`supabase.auth.updateUser({password})` or email-based reset). Add to Settings ACCOUNT section | None |
| Push notifications | Expo push token registration + server-side notification sending. Requires Expo notification library + token storage in profiles + notification triggers | `profiles.push_token TEXT` |
| Email preferences | Control which email types Supabase sends (weekly digest, follow alerts, etc.). Requires Supabase email template config + user preference storage | `profiles.email_prefs JSONB` |
| Closet visibility | Who can see my closet (Everyone / Followers only / Private). Requires RLS policy update on closet_entries + privacy setting in profiles | `profiles.closet_visibility TEXT` |
| Follow permissions | Who can follow me (Anyone / Approval required). Requires follow-request workflow + `follow_requests` table | `follow_requests` table |
| Delete account | Permanently delete user account and all data. Requires Supabase admin API call (service role) or Edge Function that cascades deletes and calls `auth.admin.deleteUser()` | None (schema has cascade deletes) |

---

## Earlier Backlog

| Feature | Notes | Schema needed |
|---------|-------|---------------|
| Tag-based filters (activewear, loungewear, formalwear) | Tags are orthogonal to subtype — a hoodie can be both "top" and "activewear" | New `item_tags` table: `(item_id, tag)` or `items.tags TEXT[]` |
| Favorite brands | User follows brands, sees new/featured items in their feed | `brand_follows (user_id, brand_id, created_at)` |
| Featured/new items from favorite brands | Surfaced in For You feed or a dedicated Brands tab | Feed query extension |
| Batch ranking tournament | When adding 5+ items in the same category, run a mini sort tournament instead of 5 sequential binary searches | Algorithmic — no schema change |
| Product-level links | Direct link to purchase each item (e.g. brand's product page) | `items.product_url TEXT` |
| Animated/emoji avatar | Profile avatar styled with user's top-ranked items | `profiles.avatar_config JSONB` |
| Re-ranking a whole category | Let user manually re-order their tops/bottoms/footwear when preferences change | UX design needed — no schema change |
| OpenBrand / Brandfetch integration | Automated logo + color + website data when brands are added | Paid API dependency — revisit at 200+ brands |
| Brand color theming | Brand page uses the brand's primary color as an accent | `brands.brand_color TEXT` (hex) |
| Item condition tracking | New / Like New / Worn — affects ranking context | `closet_entries.condition` enum |
| Re-ranking item images | Let users upload their own photos for owned items | `closet_entry_images` table |
| Item-level comparison history | Show which items an entry has been compared against, and outcomes | Already stored in `comparisons` table — just needs UI |
| People / friends search | Add a "People" section to `SearchScreen.tsx` querying `profiles.username ILIKE query`. Navigates to `PublicClosetScreen` on tap. Add `searchProfiles(query)` to `searchService.ts`. Update search placeholder to "Search brands, items, or people…" when live. No schema change needed — `profiles` table already exists. | None |
| Recommendations tab (fifth bottom tab) | "For You" or "Discover" tab with personalized item recs. Basic version: query items the user hasn't added, weighted by matching subtypes, owned brands, and community popularity. Add fifth tab to `MainTabs.tsx`, create `RecommendScreen.tsx` and `recommendationService.ts`. Advanced version: collaborative filtering via a `recommendations` table seeded by a scheduled Edge Function or external ML job. | None for basic; `recommendations` table for advanced |
| Dark mode (manual in-app toggle) | ThemeContext + NativeWind `darkMode: 'class'` approach. Persist preference in AsyncStorage. Toggle via sun/moon icon in Closet tab header. Add `dark:` prefix variants to all color classes across every screen and component file. Do this after all product functionality and UX work is complete — it touches every file and should be a dedicated pass. | None |
