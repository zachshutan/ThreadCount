# Threadcount Product Backlog

Features deferred from the Phase A–D rebuild. Use this alongside a Notion page for tracking status.

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
