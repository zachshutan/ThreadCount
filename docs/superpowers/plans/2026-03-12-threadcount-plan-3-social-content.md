# Threadcount Plan 3: Social & Content Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Reviews (gated via Supabase Edge Function), Comparison History in ItemDetailScreen, Follows, PublicClosetScreen, For You Feed (cursor-paginated UNION RPC), and Search.

**Architecture:** Same layered pattern as Plans 1–2 (service → hook → screen). The For You Feed uses a Postgres `get_feed` RPC for the cross-table UNION query with cursor pagination. The review gate runs as a Supabase Edge Function that checks ownership and active item count before inserting. All other features use standard Supabase JS queries.

**Tech Stack:** Expo SDK 52, React Native, TypeScript, NativeWind v4, Supabase JS v2, React Navigation v6, Deno (Supabase Edge Functions).

**Prerequisite:** Plan 2 complete — Browse, Add to Closet, Pairwise Comparison, Closet View all working.

---

## Chunk 1: Reviews and Comparison History

### File Map

- Modify: `src/services/closetService.ts` (add `getComparisonHistory`)
- Modify: `src/__tests__/services/closetService.test.ts` (add comparison history tests)
- Modify: `src/screens/closet/ItemDetailScreen.tsx` (add comparison history + review button)
- Create: `supabase/functions/check-review-gate/index.ts`
- Create: `src/services/reviewService.ts`
- Create: `src/__tests__/services/reviewService.test.ts`
- Create: `src/hooks/useItemReviews.ts` (replaces Plan 2 stub)
- Create: `src/screens/closet/WriteReviewScreen.tsx`
- Modify: `src/navigation/MainTabs.tsx` (add WriteReviewScreen to Closet stack)
- Modify: `src/screens/browse/ItemScreen.tsx` (wire real useItemReviews, render reviews list)

---

### Task 1: Comparison history in closetService

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/services/closetService.test.ts`:

```typescript
import {
  getCloset,
  addToCloset,
  upgradeToOwned,
  getComparisonHistory,
} from "../../services/closetService";
// ... existing imports and mocks ...

describe("getComparisonHistory", () => {
  it("fetches comparisons for an entry with joined item names", async () => {
    const mockComparison = {
      id: "comp-1",
      winner_entry_id: "entry-1",
      loser_entry_id: "entry-2",
      comparison_type: "same_category",
      created_at: "2026-01-01T00:00:00Z",
      winner_entry: { item_id: "item-1", items: { model_name: "Air Force 1" } },
      loser_entry: { item_id: "item-2", items: { model_name: "Stan Smith" } },
    };

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        or: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockComparison], error: null }),
        }),
      }),
    });

    const result = await getComparisonHistory("entry-1");
    expect(result).toHaveLength(1);
    expect(result[0].outcome).toBe("win");
    expect(result[0].opponentItemName).toBe("Stan Smith");
  });

  it("returns 'Unknown item' when opponent entry was deleted (null FK)", async () => {
    const mockComparison = {
      id: "comp-2",
      winner_entry_id: "entry-1",
      loser_entry_id: null,
      comparison_type: "cross_category",
      created_at: "2026-01-01T00:00:00Z",
      winner_entry: { item_id: "item-1", items: { model_name: "Air Force 1" } },
      loser_entry: null,
    };

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        or: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockComparison], error: null }),
        }),
      }),
    });

    const result = await getComparisonHistory("entry-1");
    expect(result[0].opponentItemName).toBe("Unknown item");
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/closetService.test.ts --verbose
```

Expected: FAIL with "getComparisonHistory is not a function" (or similar)

- [ ] **Step 3: Implement `getComparisonHistory` in `src/services/closetService.ts`**

Add the type and function:

```typescript
export type ComparisonHistoryEntry = {
  id: string;
  outcome: "win" | "loss";
  comparisonType: "same_category" | "cross_category";
  opponentItemName: string;
  createdAt: string;
};

export async function getComparisonHistory(
  entryId: string
): Promise<ComparisonHistoryEntry[]> {
  const { data, error } = await supabase
    .from("comparisons")
    .select(
      `id, winner_entry_id, loser_entry_id, comparison_type, created_at,
       winner_entry:closet_entries!winner_entry_id(item_id, items(model_name)),
       loser_entry:closet_entries!loser_entry_id(item_id, items(model_name))`
    )
    .or(`winner_entry_id.eq.${entryId},loser_entry_id.eq.${entryId}`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    const isWinner = row.winner_entry_id === entryId;
    const opponentEntry = isWinner ? row.loser_entry : row.winner_entry;
    const opponentName = opponentEntry?.items?.model_name ?? "Unknown item";

    return {
      id: row.id,
      outcome: isWinner ? "win" : "loss",
      comparisonType: row.comparison_type,
      opponentItemName: opponentName,
      createdAt: row.created_at,
    };
  });
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/closetService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Update `src/screens/closet/ItemDetailScreen.tsx` to display comparison history**

Replace the placeholder comment with a real history list. The screen receives `closetEntryId` via route params. Add to the screen's state and render:

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { useCloset } from "../../hooks/useCloset";
import {
  getComparisonHistory,
  type ComparisonHistoryEntry,
} from "../../services/closetService";

type ItemDetailRouteParams = { closetEntryId: string };

export default function ItemDetailScreen() {
  const route = useRoute<RouteProp<{ ItemDetail: ItemDetailRouteParams }, "ItemDetail">>();
  const navigation = useNavigation<any>();
  const { closetEntryId } = route.params;
  const { owned } = useCloset();
  const entry = owned.find((e) => e.id === closetEntryId);
  const item = entry?.items;

  const [history, setHistory] = useState<ComparisonHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    getComparisonHistory(closetEntryId).then((h) => {
      setHistory(h);
      setHistoryLoading(false);
    });
  }, [closetEntryId]);

  if (!entry || !item) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const score = (entry as any).scores;
  const wins = score?.wins ?? 0;
  const losses = score?.losses ?? 0;
  const overallScore = score?.overall_score?.toFixed(1) ?? "5.0";
  const categoryScore = score?.category_score?.toFixed(1) ?? "5.0";
  const confidence = score?.confidence ?? "low";

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-1">{item.model_name}</Text>
      <Text className="text-gray-500 mb-4">{item.brands?.name}</Text>

      <View className="flex-row mb-4 gap-4">
        <View className="flex-1 bg-gray-100 rounded-xl p-3">
          <Text className="text-xs text-gray-500 mb-1">Overall</Text>
          <Text className="text-2xl font-bold">{overallScore}</Text>
          <Text className="text-xs text-gray-400 capitalize">{confidence} confidence</Text>
        </View>
        <View className="flex-1 bg-gray-100 rounded-xl p-3">
          <Text className="text-xs text-gray-500 mb-1">Category</Text>
          <Text className="text-2xl font-bold">{categoryScore}</Text>
          <Text className="text-xs text-gray-400">{wins}W / {losses}L</Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-black rounded-xl py-3 items-center mb-6"
        onPress={() => navigation.navigate("WriteReview", { itemId: item.id })}
      >
        <Text className="text-white font-semibold">Write Review</Text>
      </TouchableOpacity>

      <Text className="text-lg font-semibold mb-3">Comparison History</Text>
      {historyLoading ? (
        <ActivityIndicator />
      ) : history.length === 0 ? (
        <Text className="text-gray-400">No comparisons yet.</Text>
      ) : (
        history.map((h) => (
          <View key={h.id} className="flex-row items-center py-2 border-b border-gray-100">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              h.outcome === "win" ? "bg-green-100" : "bg-red-100"
            }`}>
              <Text className={h.outcome === "win" ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                {h.outcome === "win" ? "W" : "L"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-medium">{h.opponentItemName}</Text>
              <Text className="text-xs text-gray-400 capitalize">{h.comparisonType.replace("_", " ")}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/services/closetService.ts src/__tests__/services/closetService.test.ts src/screens/closet/ItemDetailScreen.tsx
git commit -m "feat: add comparison history to closetService and ItemDetailScreen"
```

---

### Task 2: Review Gate Edge Function

- [ ] **Step 1: Create `supabase/functions/check-review-gate/index.ts`**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { item_id, body, fit_rating, quality_rating } = await req.json();

  if (!item_id || !body || !fit_rating || !quality_rating) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Gate check 1: user owns the item
  const { data: ownershipCheck } = await supabase
    .from("closet_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", item_id)
    .eq("entry_type", "owned")
    .maybeSingle();

  if (!ownershipCheck) {
    return new Response(JSON.stringify({ error: "not_owner" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Gate check 2: user owns ≥3 active items total (requires a JOIN; done via RPC)
  const { data: activeCount } = await supabase.rpc("count_owned_active_items", {
    p_user_id: user.id,
  });

  if (!activeCount || activeCount < 3) {
    return new Response(JSON.stringify({ error: "insufficient_items" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Both gates pass — insert the review
  const { data: review, error: insertError } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      item_id,
      body,
      fit_rating,
      quality_rating,
    })
    .select()
    .single();

  if (insertError) {
    const code = insertError.code === "23505" ? "already_reviewed" : "insert_failed";
    return new Response(JSON.stringify({ error: code }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: review }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Add `count_owned_active_items` RPC to a new migration**

Create `supabase/migrations/005_review_gate_rpc.sql`:

```sql
-- Helper RPC for the review gate Edge Function: counts owned active items for a user
CREATE OR REPLACE FUNCTION count_owned_active_items(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*)
  FROM closet_entries ce
  JOIN items i ON i.id = ce.item_id
  WHERE ce.user_id = p_user_id
    AND ce.entry_type = 'owned'
    AND i.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION count_owned_active_items TO authenticated;
```

- [ ] **Step 3: Deploy the Edge Function**

```bash
supabase functions deploy check-review-gate
```

Expected: "Deployed check-review-gate"

- [ ] **Step 4: Apply migration**

```bash
supabase db push
```

Expected: Migration applied without errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/check-review-gate/index.ts supabase/migrations/005_review_gate_rpc.sql
git commit -m "feat: add review gate Edge Function and count_owned_active_items RPC"
```

---

### Task 3: reviewService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/reviewService.test.ts`:

```typescript
import { submitReview, getReviewsForItem } from "../../services/reviewService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    from: jest.fn(),
  },
}));

const mockInvoke = supabase.functions.invoke as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("submitReview", () => {
  it("invokes the check-review-gate Edge Function with review data", async () => {
    mockInvoke.mockResolvedValue({
      data: { id: "review-1", item_id: "item-1" },
      error: null,
    });

    const result = await submitReview({
      itemId: "item-1",
      body: "Great shoe.",
      fitRating: 4,
      qualityRating: 5,
    });

    expect(mockInvoke).toHaveBeenCalledWith("check-review-gate", {
      body: {
        item_id: "item-1",
        body: "Great shoe.",
        fit_rating: 4,
        quality_rating: 5,
      },
    });
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe("review-1");
  });

  it("returns error when gate rejects (insufficient_items)", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "insufficient_items" },
    });

    const result = await submitReview({
      itemId: "item-1",
      body: "Great shoe.",
      fitRating: 4,
      qualityRating: 5,
    });

    expect(result.error?.message).toBe("insufficient_items");
  });
});

describe("getReviewsForItem", () => {
  it("fetches reviews with reviewer username", async () => {
    const mockReviews = [
      {
        id: "review-1",
        user_id: "user-1",
        item_id: "item-1",
        body: "Great shoe.",
        fit_rating: 4,
        quality_rating: 5,
        created_at: "2026-01-01T00:00:00Z",
        profiles: { username: "sneakerhead99" },
      },
    ];

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockReviews, error: null }),
        }),
      }),
    });

    const result = await getReviewsForItem("item-1");
    expect(result.data).toHaveLength(1);
    expect(result.data![0].profiles?.username).toBe("sneakerhead99");
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/reviewService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/reviewService.ts`**

```typescript
import { supabase } from "../lib/supabase";

export type Review = {
  id: string;
  user_id: string;
  item_id: string;
  body: string;
  fit_rating: number;
  quality_rating: number;
  created_at: string;
  profiles?: { username: string } | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function submitReview(params: {
  itemId: string;
  body: string;
  fitRating: number;
  qualityRating: number;
}): Promise<QueryResult<Review>> {
  const { data, error } = await supabase.functions.invoke("check-review-gate", {
    body: {
      item_id: params.itemId,
      body: params.body,
      fit_rating: params.fitRating,
      quality_rating: params.qualityRating,
    },
  });

  return { data: data ?? null, error: error ?? null };
}

export async function getReviewsForItem(
  itemId: string
): Promise<QueryResult<Review[]>> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(username)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  return { data, error };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/reviewService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/reviewService.ts src/__tests__/services/reviewService.test.ts
git commit -m "feat: add reviewService (submitReview via Edge Function, getReviewsForItem)"
```

---

### Task 4: WriteReviewScreen and navigation wiring

- [ ] **Step 1: Create `src/screens/closet/WriteReviewScreen.tsx`**

```typescript
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { submitReview } from "../../services/reviewService";

type WriteReviewRouteParams = { itemId: string };

function RatingRow({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View className="mb-4">
      <Text className="font-medium mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            className={`w-10 h-10 rounded-full items-center justify-center border ${
              value === n ? "bg-black border-black" : "border-gray-300"
            }`}
          >
            <Text className={value === n ? "text-white font-bold" : "text-gray-700"}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function WriteReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ WriteReview: WriteReviewRouteParams }, "WriteReview">>();
  const { itemId } = route.params;

  const [body, setBody] = useState("");
  const [fitRating, setFitRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) {
      Alert.alert("Missing review", "Please write something about this item.");
      return;
    }
    if (fitRating === 0 || qualityRating === 0) {
      Alert.alert("Missing rating", "Please rate both fit and quality.");
      return;
    }

    setLoading(true);
    const result = await submitReview({ itemId, body: body.trim(), fitRating, qualityRating });
    setLoading(false);

    if (result.error) {
      const messages: Record<string, string> = {
        not_owner: "You must own this item to review it.",
        insufficient_items: "You need at least 3 owned items to write a review.",
        already_reviewed: "You've already reviewed this item.",
      };
      Alert.alert("Cannot submit", messages[result.error.message] ?? "Something went wrong.");
      return;
    }

    navigation.goBack();
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-xl font-bold mb-4">Write a Review</Text>

      <Text className="font-medium mb-2">Your Review</Text>
      <TextInput
        className="border border-gray-200 rounded-xl p-3 mb-4 min-h-[100px] text-base"
        placeholder="What do you think of this item?"
        multiline
        value={body}
        onChangeText={setBody}
      />

      <RatingRow label="Fit (1–5)" value={fitRating} onChange={setFitRating} />
      <RatingRow label="Quality (1–5)" value={qualityRating} onChange={setQualityRating} />

      <TouchableOpacity
        className={`rounded-xl py-3 items-center mt-4 ${loading ? "bg-gray-400" : "bg-black"}`}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">Submit Review</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Add WriteReviewScreen to ClosetTab stack in `src/navigation/MainTabs.tsx`**

In the ClosetTab stack navigator, add WriteReviewScreen after ItemDetailScreen:

```typescript
// Add import at top:
import WriteReviewScreen from "../screens/closet/WriteReviewScreen";

// Inside ClosetTab stack:
<ClosetStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: "Write Review" }} />
```

- [ ] **Step 3: Implement `src/hooks/useItemReviews.ts`** (replaces the stub from Plan 2)

```typescript
import { useState, useEffect } from "react";
import { getReviewsForItem, type Review } from "../services/reviewService";

export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    getReviewsForItem(itemId).then((result) => {
      if (result.data) setReviews(result.data);
      setLoading(false);
    });
  }, [itemId]);

  return { reviews, loading };
}
```

- [ ] **Step 4: Wire reviews into `src/screens/browse/ItemScreen.tsx`**

Replace the `useItemReviews` stub import with the real hook and add reviews section to the render:

```typescript
// Replace stub import — useItemReviews is now a real hook that returns { reviews, loading }
// The existing ItemScreen already imports useItemReviews from "../../hooks/useItemReviews"
// No import change needed — just update the usage below the existing score display.

// Add after the aggregate score display (inside the ScrollView):
{reviewsLoading ? (
  <ActivityIndicator />
) : reviews.length === 0 ? (
  <Text className="text-gray-400 py-4">No reviews yet.</Text>
) : (
  reviews.map((review) => (
    <View key={review.id} className="py-3 border-b border-gray-100">
      <View className="flex-row justify-between mb-1">
        <Text className="font-semibold text-sm">{review.profiles?.username ?? "Anonymous"}</Text>
        <View className="flex-row gap-2">
          <Text className="text-xs text-gray-500">Fit: {review.fit_rating}/5</Text>
          <Text className="text-xs text-gray-500">Quality: {review.quality_rating}/5</Text>
        </View>
      </View>
      <Text className="text-sm text-gray-700">{review.body}</Text>
    </View>
  ))
)}
```

The full updated `ItemScreen.tsx`:

```typescript
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { useItem } from "../../hooks/useItem";
import { useItemImages } from "../../hooks/useItemImages";
import { useItemReviews } from "../../hooks/useItemReviews";
import AddToClosetButton from "../../components/AddToClosetButton";

type ItemScreenRouteParams = { itemId: string };

export default function ItemScreen() {
  const route = useRoute<RouteProp<{ Item: ItemScreenRouteParams }, "Item">>();
  const { itemId } = route.params;

  const { item, aggregateScores, loading } = useItem(itemId);
  const { images } = useItemImages(itemId);
  const { reviews, loading: reviewsLoading } = useItemReviews(itemId);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (!item) {
    return <View className="flex-1 items-center justify-center"><Text>Item not found.</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Image placeholder — real images rendered in a future polish pass */}
      <View className="h-64 bg-gray-100 items-center justify-center">
        <Text className="text-gray-400">Image</Text>
      </View>

      <View className="p-4">
        <Text className="text-2xl font-bold mb-1">{item.model_name}</Text>
        <Text className="text-gray-500 mb-4">{item.brands?.name}</Text>

        {aggregateScores && (
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1 bg-gray-100 rounded-xl p-3">
              <Text className="text-xs text-gray-500 mb-1">Overall</Text>
              <Text className="text-2xl font-bold">{aggregateScores.overallScore.toFixed(1)}</Text>
              <Text className="text-xs text-gray-400">{aggregateScores.reviewerCount} owners</Text>
            </View>
            <View className="flex-1 bg-gray-100 rounded-xl p-3">
              <Text className="text-xs text-gray-500 mb-1">Category</Text>
              <Text className="text-2xl font-bold">{aggregateScores.categoryScore.toFixed(1)}</Text>
            </View>
          </View>
        )}

        <AddToClosetButton itemId={itemId} />

        <Text className="text-lg font-semibold mt-6 mb-3">Reviews</Text>
        {reviewsLoading ? (
          <ActivityIndicator />
        ) : reviews.length === 0 ? (
          <Text className="text-gray-400 py-2">No reviews yet.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} className="py-3 border-b border-gray-100">
              <View className="flex-row justify-between mb-1">
                <Text className="font-semibold text-sm">
                  {review.profiles?.username ?? "Anonymous"}
                </Text>
                <View className="flex-row gap-2">
                  <Text className="text-xs text-gray-500">Fit: {review.fit_rating}/5</Text>
                  <Text className="text-xs text-gray-500">Quality: {review.quality_rating}/5</Text>
                </View>
              </View>
              <Text className="text-sm text-gray-700">{review.body}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/closet/WriteReviewScreen.tsx src/navigation/MainTabs.tsx src/hooks/useItemReviews.ts src/screens/browse/ItemScreen.tsx
git commit -m "feat: add WriteReviewScreen, wire reviews to ItemScreen"
```

---

## Chunk 2: Follows and PublicClosetScreen

### File Map

- Create: `src/services/followService.ts`
- Create: `src/__tests__/services/followService.test.ts`
- Create: `src/hooks/useFollow.ts`
- Create: `src/screens/PublicClosetScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (add PublicClosetScreen as modal)

---

### Task 5: followService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/followService.test.ts`:

```typescript
import { followUser, unfollowUser, isFollowing } from "../../services/followService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const mockFrom = supabase.from as jest.Mock;

const mockCurrentUserId = "user-me";
const mockTargetUserId = "user-them";

beforeEach(() => {
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: mockCurrentUserId } },
    error: null,
  });
});

describe("followUser", () => {
  it("inserts a follows row", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const result = await followUser(mockCurrentUserId, mockTargetUserId);
    expect(insertMock).toHaveBeenCalledWith({
      follower_id: mockCurrentUserId,
      following_id: mockTargetUserId,
    });
    expect(result.error).toBeNull();
  });
});

describe("unfollowUser", () => {
  it("deletes the follows row", async () => {
    const deleteMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockReturnValue({ delete: deleteMock });

    const result = await unfollowUser(mockCurrentUserId, mockTargetUserId);
    expect(deleteMock).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });
});

describe("isFollowing", () => {
  it("returns true when a follows row exists", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: "follow-1" }, error: null }),
          }),
        }),
      }),
    });

    const result = await isFollowing(mockCurrentUserId, mockTargetUserId);
    expect(result).toBe(true);
  });

  it("returns false when no follows row exists", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const result = await isFollowing(mockCurrentUserId, mockTargetUserId);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/followService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/followService.ts`**

```typescript
import { supabase } from "../lib/supabase";

type SimpleResult = { error: { message: string } | null };

export async function followUser(
  followerId: string,
  followingId: string
): Promise<SimpleResult> {
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });
  return { error };
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<SimpleResult> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return { error };
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return data !== null;
}

export async function getPublicCloset(userId: string) {
  const { data, error } = await supabase
    .from("closet_entries")
    .select("*, items(id, model_name, category, brands(name), subtypes(name)), scores(overall_score, category_score, confidence)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", userId)
    .single();
  return { data, error };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/followService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/followService.ts src/__tests__/services/followService.test.ts
git commit -m "feat: add followService (follow, unfollow, isFollowing, getPublicCloset)"
```

---

### Task 6: useFollow hook and PublicClosetScreen

- [ ] **Step 1: Create `src/hooks/useFollow.ts`**

```typescript
import { useState, useEffect } from "react";
import { followUser, unfollowUser, isFollowing } from "../services/followService";
import { useAuth } from "./useAuth";

export function useFollow(targetUserId: string) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId) return;
    isFollowing(user.id, targetUserId).then((result) => {
      setFollowing(result);
      setLoading(false);
    });
  }, [user, targetUserId]);

  async function toggle() {
    if (!user) return;
    setToggling(true);
    if (following) {
      await unfollowUser(user.id, targetUserId);
      setFollowing(false);
    } else {
      await followUser(user.id, targetUserId);
      setFollowing(true);
    }
    setToggling(false);
  }

  return { following, loading, toggling, toggle };
}
```

- [ ] **Step 2: Create `src/screens/PublicClosetScreen.tsx`**

```typescript
import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { getPublicCloset, getProfile } from "../services/followService";
import { useFollow } from "../hooks/useFollow";
import { useAuth } from "../hooks/useAuth";

type PublicClosetRouteParams = { userId: string };

export default function PublicClosetScreen() {
  const route = useRoute<RouteProp<{ PublicCloset: PublicClosetRouteParams }, "PublicCloset">>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { following, loading: followLoading, toggling, toggle } = useFollow(userId);

  useEffect(() => {
    Promise.all([
      getProfile(userId),
      getPublicCloset(userId),
    ]).then(([profileResult, closetResult]) => {
      if (profileResult.data) setProfile(profileResult.data);
      if (closetResult.data) setEntries(closetResult.data);
      setLoadingData(false);
    });
  }, [userId]);

  const isOwnProfile = currentUser?.id === userId;

  if (loadingData) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <View className="flex-1 bg-white">
      <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold">{profile?.username ?? "User"}</Text>
          <Text className="text-gray-500 text-sm">{entries.length} items</Text>
        </View>
        {!isOwnProfile && (
          <TouchableOpacity
            onPress={toggle}
            disabled={followLoading || toggling}
            className={`px-4 py-2 rounded-full border ${
              following ? "border-gray-300 bg-white" : "bg-black border-black"
            }`}
          >
            <Text className={following ? "text-gray-700 font-semibold" : "text-white font-semibold"}>
              {toggling ? "..." : following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: entry }) => (
          <TouchableOpacity
            className="flex-1 m-1 bg-gray-50 rounded-xl p-3"
            onPress={() => navigation.navigate("BrowseTab", {
              screen: "Item",
              params: { itemId: entry.item_id },
            })}
          >
            <Text className="font-medium text-sm" numberOfLines={2}>
              {entry.items?.model_name ?? "Unknown"}
            </Text>
            <Text className="text-xs text-gray-500">{entry.items?.brands?.name}</Text>
            {entry.entry_type === "owned" && entry.scores ? (
              <Text className="text-sm font-bold mt-1">
                {entry.scores.overall_score?.toFixed(1)}
              </Text>
            ) : (
              <Text className="text-xs text-gray-400 mt-1">Wishlist</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 3: Add PublicClosetScreen to `src/navigation/RootNavigator.tsx`**

Wrap MainTabs in a root-level stack so PublicClosetScreen is accessible as a modal from any tab:

```typescript
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import PublicClosetScreen from "../screens/PublicClosetScreen";

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <AuthStack />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen
        name="PublicCloset"
        component={PublicClosetScreen}
        options={{ headerShown: true, title: "Closet", presentation: "modal" }}
      />
    </RootStack.Navigator>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useFollow.ts src/screens/PublicClosetScreen.tsx src/navigation/RootNavigator.tsx
git commit -m "feat: add follows, useFollow hook, PublicClosetScreen accessible from any tab"
```

---

## Chunk 3: For You Feed

### File Map

- Create: `supabase/migrations/006_feed_rpc.sql`
- Create: `src/services/feedService.ts`
- Create: `src/__tests__/services/feedService.test.ts`
- Create: `src/hooks/useFeed.ts`
- Modify: `src/screens/home/ForYouFeedScreen.tsx` (replace placeholder)

---

### Task 7: Feed RPC migration

- [ ] **Step 1: Create `supabase/migrations/006_feed_rpc.sql`**

```sql
-- For You Feed: cursor-paginated UNION query across closet additions, comparisons, and reviews.
-- Cursor = (created_at, id) applied per-subquery before UNION to ensure correct pagination.

CREATE OR REPLACE FUNCTION get_feed(
  p_friends_only boolean DEFAULT false,
  p_cursor_ts timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  event_type  text,
  event_id    uuid,
  user_id     uuid,
  username    text,
  created_at  timestamptz,
  item_id     uuid,
  item_name   text,
  brand_name  text,
  category    text,
  overall_score numeric,
  review_body text,
  fit_rating  integer,
  quality_rating integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (

    -- Owned closet additions
    SELECT
      'closet_add'::text           AS event_type,
      ce.id                        AS event_id,
      ce.user_id,
      p.username,
      ce.created_at,
      ce.item_id,
      i.model_name                 AS item_name,
      b.name                       AS brand_name,
      i.category::text             AS category,
      NULL::numeric                AS overall_score,
      NULL::text                   AS review_body,
      NULL::integer                AS fit_rating,
      NULL::integer                AS quality_rating
    FROM closet_entries ce
    JOIN profiles p ON p.id = ce.user_id
    JOIN items    i ON i.id = ce.item_id
    JOIN brands   b ON b.id = i.brand_id
    WHERE ce.entry_type = 'owned'
      AND (
        NOT p_friends_only
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = ce.user_id
        )
      )
      AND (
        p_cursor_ts IS NULL
        OR (ce.created_at, ce.id) < (p_cursor_ts, p_cursor_id)
      )

    UNION ALL

    -- Comparison results (winner item + current score)
    SELECT
      'comparison'::text           AS event_type,
      c.id                         AS event_id,
      c.user_id,
      p.username,
      c.created_at,
      i.id                         AS item_id,
      i.model_name                 AS item_name,
      b.name                       AS brand_name,
      i.category::text             AS category,
      s.overall_score,
      NULL::text                   AS review_body,
      NULL::integer                AS fit_rating,
      NULL::integer                AS quality_rating
    FROM comparisons c
    JOIN profiles      p  ON p.id  = c.user_id
    LEFT JOIN closet_entries ce ON ce.id = c.winner_entry_id
    LEFT JOIN items    i  ON i.id  = ce.item_id
    LEFT JOIN brands   b  ON b.id  = i.brand_id
    LEFT JOIN scores   s  ON s.closet_entry_id = c.winner_entry_id
    WHERE c.winner_entry_id IS NOT NULL
      AND (
        NOT p_friends_only
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = c.user_id
        )
      )
      AND (
        p_cursor_ts IS NULL
        OR (c.created_at, c.id) < (p_cursor_ts, p_cursor_id)
      )

    UNION ALL

    -- New reviews
    SELECT
      'review'::text               AS event_type,
      r.id                         AS event_id,
      r.user_id,
      p.username,
      r.created_at,
      r.item_id,
      i.model_name                 AS item_name,
      b.name                       AS brand_name,
      i.category::text             AS category,
      NULL::numeric                AS overall_score,
      r.body                       AS review_body,
      r.fit_rating,
      r.quality_rating
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN items    i ON i.id = r.item_id
    JOIN brands   b ON b.id = i.brand_id
    WHERE (
        NOT p_friends_only
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = r.user_id
        )
      )
      AND (
        p_cursor_ts IS NULL
        OR (r.created_at, r.id) < (p_cursor_ts, p_cursor_id)
      )

  ) feed
  ORDER BY created_at DESC, event_id DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_feed TO authenticated;
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```

Expected: Migration applied without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_feed_rpc.sql
git commit -m "feat: add get_feed RPC (cursor-paginated UNION across closet additions, comparisons, reviews)"
```

---

### Task 8: feedService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/feedService.test.ts`:

```typescript
import { getFeed } from "../../services/feedService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

const mockRpc = supabase.rpc as jest.Mock;

const mockEvent = {
  event_type: "closet_add",
  event_id: "entry-1",
  user_id: "user-1",
  username: "sneakerhead99",
  created_at: "2026-01-01T00:00:00Z",
  item_id: "item-1",
  item_name: "Air Force 1",
  brand_name: "Nike",
  category: "footwear",
  overall_score: null,
  review_body: null,
  fit_rating: null,
  quality_rating: null,
};

describe("getFeed", () => {
  it("calls get_feed RPC with friends_only=false by default", async () => {
    mockRpc.mockResolvedValue({ data: [mockEvent], error: null });

    const result = await getFeed({});
    expect(mockRpc).toHaveBeenCalledWith("get_feed", {
      p_friends_only: false,
      p_cursor_ts: null,
      p_cursor_id: null,
      p_limit: 20,
    });
    expect(result.data).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor params when provided", async () => {
    mockRpc.mockResolvedValue({ data: [mockEvent], error: null });

    await getFeed({
      friendsOnly: true,
      cursor: { ts: "2026-01-02T00:00:00Z", id: "entry-5" },
    });

    expect(mockRpc).toHaveBeenCalledWith("get_feed", {
      p_friends_only: true,
      p_cursor_ts: "2026-01-02T00:00:00Z",
      p_cursor_id: "entry-5",
      p_limit: 20,
    });
  });

  it("returns nextCursor when a full page is returned", async () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      ...mockEvent,
      event_id: `entry-${i}`,
      created_at: `2026-01-0${Math.floor(i / 9) + 1}T00:00:00Z`,
    }));
    mockRpc.mockResolvedValue({ data: events, error: null });

    const result = await getFeed({});
    expect(result.nextCursor).not.toBeNull();
    expect(result.nextCursor?.id).toBe("entry-19");
  });

  it("returns error when RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });

    const result = await getFeed({});
    expect(result.error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/feedService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/feedService.ts`**

```typescript
import { supabase } from "../lib/supabase";

export type FeedEvent = {
  event_type: "closet_add" | "comparison" | "review";
  event_id: string;
  user_id: string;
  username: string;
  created_at: string;
  item_id: string | null;
  item_name: string | null;
  brand_name: string | null;
  category: string | null;
  overall_score: number | null;
  review_body: string | null;
  fit_rating: number | null;
  quality_rating: number | null;
};

export type FeedCursor = { ts: string; id: string };

type FeedResult = {
  data: FeedEvent[] | null;
  error: { message: string } | null;
  nextCursor: FeedCursor | null;
};

const PAGE_SIZE = 20;

export async function getFeed(params: {
  friendsOnly?: boolean;
  cursor?: FeedCursor;
}): Promise<FeedResult> {
  const { friendsOnly = false, cursor } = params;

  const { data, error } = await supabase.rpc("get_feed", {
    p_friends_only: friendsOnly,
    p_cursor_ts: cursor?.ts ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: PAGE_SIZE,
  });

  if (error || !data) {
    return { data: null, error: error ?? { message: "Unknown error" }, nextCursor: null };
  }

  const events = data as FeedEvent[];
  const nextCursor =
    events.length === PAGE_SIZE
      ? { ts: events[events.length - 1].created_at, id: events[events.length - 1].event_id }
      : null;

  return { data: events, error: null, nextCursor };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/feedService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/feedService.ts src/__tests__/services/feedService.test.ts
git commit -m "feat: add feedService wrapping get_feed RPC with cursor pagination"
```

---

### Task 9: useFeed hook and ForYouFeedScreen

- [ ] **Step 1: Create `src/hooks/useFeed.ts`**

```typescript
import { useState, useCallback } from "react";
import { getFeed, type FeedEvent, type FeedCursor } from "../services/feedService";

export function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(null);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async (cursor: FeedCursor | undefined, replace: boolean, isFriendsOnly: boolean) => {
      const result = await getFeed({ friendsOnly: isFriendsOnly, cursor });
      if (result.data) {
        setEvents((prev) => (replace ? result.data! : [...prev, ...result.data!]));
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(undefined, true, friendsOnly);
    setRefreshing(false);
  }, [loadPage, friendsOnly]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    await loadPage(nextCursor ?? undefined, false, friendsOnly);
    setLoading(false);
  }, [hasMore, loading, nextCursor, loadPage, friendsOnly]);

  const setFilter = useCallback(
    async (isFriendsOnly: boolean) => {
      setFriendsOnly(isFriendsOnly);
      setRefreshing(true);
      await loadPage(undefined, true, isFriendsOnly);
      setRefreshing(false);
    },
    [loadPage]
  );

  return { events, loading, refreshing, friendsOnly, hasMore, refresh, loadMore, setFilter };
}
```

- [ ] **Step 2: Replace `src/screens/home/ForYouFeedScreen.tsx` placeholder**

```typescript
import React, { useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFeed } from "../../hooks/useFeed";
import type { FeedEvent } from "../../services/feedService";

function EventCard({ event, onUserPress }: { event: FeedEvent; onUserPress: () => void }) {
  const descriptions: Record<FeedEvent["event_type"], string> = {
    closet_add: `added ${event.item_name} to their closet`,
    comparison: `rated ${event.item_name} — ${event.overall_score?.toFixed(1) ?? "?"}/10`,
    review: `reviewed ${event.item_name}`,
  };

  return (
    <View className="p-4 border-b border-gray-100">
      <View className="flex-row items-center mb-1">
        <TouchableOpacity onPress={onUserPress}>
          <Text className="font-semibold text-sm">{event.username}</Text>
        </TouchableOpacity>
        <Text className="text-gray-500 text-sm ml-1">{descriptions[event.event_type]}</Text>
      </View>
      {event.brand_name && (
        <Text className="text-xs text-gray-400">
          {event.brand_name} · {event.category}
        </Text>
      )}
      {event.event_type === "review" && event.review_body && (
        <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
          "{event.review_body}"
        </Text>
      )}
    </View>
  );
}

export default function ForYouFeedScreen() {
  const navigation = useNavigation<any>();
  const { events, loading, refreshing, friendsOnly, hasMore, refresh, loadMore, setFilter } =
    useFeed();

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View className="flex-1 bg-white">
      {/* Toggle */}
      <View className="flex-row p-3 border-b border-gray-100">
        {["Everyone", "Friends"].map((label, i) => {
          const active = i === 0 ? !friendsOnly : friendsOnly;
          return (
            <TouchableOpacity
              key={label}
              className={`flex-1 py-2 rounded-full mr-1 items-center ${
                active ? "bg-black" : "bg-gray-100"
              }`}
              onPress={() => setFilter(i === 1)}
            >
              <Text className={`font-semibold text-sm ${active ? "text-white" : "text-gray-600"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.event_id}
        renderItem={({ item: event }) => (
          <EventCard
            event={event}
            onUserPress={() => navigation.navigate("PublicCloset", { userId: event.user_id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && hasMore ? <ActivityIndicator className="py-4" /> : null
        }
        ListEmptyComponent={
          !loading && !refreshing ? (
            <Text className="text-center text-gray-400 mt-12">
              {friendsOnly ? "Follow someone to see their activity." : "No activity yet."}
            </Text>
          ) : null
        }
      />
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFeed.ts src/screens/home/ForYouFeedScreen.tsx
git commit -m "feat: implement ForYouFeedScreen with friends/everyone toggle and cursor pagination"
```

---

## Chunk 4: Search

### File Map

- Create: `src/services/searchService.ts`
- Create: `src/__tests__/services/searchService.test.ts`
- Create: `src/hooks/useSearch.ts`
- Modify: `src/screens/search/SearchScreen.tsx` (replace placeholder)

---

### Task 10: searchService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/searchService.test.ts`:

```typescript
import { search } from "../../services/searchService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

describe("search", () => {
  it("queries brands and items with ilike and returns both", async () => {
    const brandSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "brand-1", name: "Nike", slug: "nike", logo_url: null }],
            error: null,
          }),
        }),
      }),
    });

    const itemSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "item-1",
                  model_name: "Air Force 1",
                  category: "footwear",
                  brand_id: "brand-1",
                  brands: { name: "Nike", slug: "nike" },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "brands") return { select: brandSelect };
      if (table === "items") return { select: itemSelect };
      return {};
    });

    const result = await search("nike");
    expect(result.brands).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.brands[0].name).toBe("Nike");
    expect(result.items[0].model_name).toBe("Air Force 1");
  });

  it("returns empty arrays when query is blank", async () => {
    const result = await search("  ");
    expect(result.brands).toHaveLength(0);
    expect(result.items).toHaveLength(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/searchService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/searchService.ts`**

```typescript
import { supabase } from "../lib/supabase";
import type { Brand } from "./brandService";
import type { Item } from "./itemService";

export type SearchResults = {
  brands: Brand[];
  items: Item[];
};

export async function search(query: string): Promise<SearchResults> {
  if (!query.trim()) return { brands: [], items: [] };

  const pattern = `%${query.trim()}%`;

  const [brandsResult, itemsResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .ilike("name", pattern)
      .order("name")
      .limit(20),

    supabase
      .from("items")
      .select("id, model_name, category, brand_id, subtype_id, is_active, brands(name, slug)")
      .ilike("model_name", pattern)
      .eq("is_active", true)
      .order("model_name")
      .limit(20),
  ]);

  return {
    brands: brandsResult.data ?? [],
    items: itemsResult.data ?? [],
  };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/searchService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/searchService.ts src/__tests__/services/searchService.test.ts
git commit -m "feat: add searchService (ilike brands + active items, parallel queries)"
```

---

### Task 11: useSearch hook and SearchScreen

- [ ] **Step 1: Create `src/hooks/useSearch.ts`**

```typescript
import { useState, useCallback } from "react";
import { search, type SearchResults } from "../services/searchService";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ brands: [], items: [] });
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults({ brands: [], items: [] });
      return;
    }
    setLoading(true);
    const res = await search(q);
    setResults(res);
    setLoading(false);
  }, []);

  return { query, results, loading, runSearch };
}
```

- [ ] **Step 2: Replace `src/screens/search/SearchScreen.tsx` placeholder**

```typescript
import React from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, SectionList, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSearch } from "../../hooks/useSearch";

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { query, results, loading, runSearch } = useSearch();

  const sections = [
    {
      title: "Brands",
      data: results.brands,
      renderItem: ({ item }: any) => (
        <TouchableOpacity
          className="flex-row items-center py-3 px-4 border-b border-gray-100"
          onPress={() => navigation.navigate("BrowseTab", { screen: "Brand", params: { brandId: item.id, brandName: item.name } })}
        >
          <Text className="font-medium">{item.name}</Text>
        </TouchableOpacity>
      ),
    },
    {
      title: "Items",
      data: results.items,
      renderItem: ({ item }: any) => (
        <TouchableOpacity
          className="flex-row items-center py-3 px-4 border-b border-gray-100"
          onPress={() => navigation.navigate("BrowseTab", { screen: "Item", params: { itemId: item.id } })}
        >
          <View>
            <Text className="font-medium">{item.model_name}</Text>
            <Text className="text-sm text-gray-500">{item.brands?.name} · {item.category}</Text>
          </View>
        </TouchableOpacity>
      ),
    },
  ].filter((s) => s.data.length > 0);

  const hasQuery = query.trim().length > 0;

  return (
    <View className="flex-1 bg-white">
      <View className="p-4 border-b border-gray-100">
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 text-base"
          placeholder="Search brands or items…"
          value={query}
          onChangeText={runSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : !hasQuery ? (
        <Text className="text-center text-gray-400 mt-12">Start typing to search.</Text>
      ) : sections.length === 0 ? (
        <Text className="text-center text-gray-400 mt-12">No results for "{query}"</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <Text className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item, section }: any) => section.renderItem({ item })}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSearch.ts src/screens/search/SearchScreen.tsx
git commit -m "feat: implement SearchScreen with ilike brand + item search and section list"
```

---

### Task 12: Smoke test (all chunks)

- [ ] **Step 1: Run full test suite**

```bash
npx jest --verbose
```

Expected: All tests pass.

- [ ] **Step 2: Run the app and manually verify end-to-end**

```bash
npx expo start
```

Manual verification checklist:
- [ ] ItemDetailScreen shows comparison history with W/L labels and opponent item names
- [ ] ItemDetailScreen "Write Review" button navigates to WriteReviewScreen
- [ ] WriteReviewScreen submits review and navigates back (requires ≥3 owned items)
- [ ] ItemScreen shows reviews list with username, body, fit/quality ratings
- [ ] Following a user from PublicClosetScreen shows "Following" state
- [ ] ForYouFeedScreen loads "Everyone" events; toggling to "Friends" filters by follows
- [ ] Scrolling to end of feed loads the next page
- [ ] SearchScreen returns brands and items for a partial name match; inactive items excluded
- [ ] Tapping a search result brand navigates to BrandScreen; tapping an item navigates to ItemScreen

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: plan 3 complete — reviews, comparison history, follows, feed, search all implemented"
```
