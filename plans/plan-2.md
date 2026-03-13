# Threadcount Plan 2: Core Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Browse (brands, items, item detail), Add to Closet, Pairwise Comparison with score tracking, and Closet view with scores.

**Architecture:** Each feature follows the same pattern: service module (raw Supabase queries) → custom hook (data fetching + state) → screen (renders hook data). The comparison queue is built in-memory per session. Scores are updated incrementally (wins/losses += 1) via a dedicated `scoreService` called by the `comparisonService` after each comparison write.

**Tech Stack:** Expo SDK 52, React Native, TypeScript, NativeWind v4, Supabase JS v2, React Navigation v6.

**Prerequisite:** Plan 1 complete — Supabase schema applied, Expo app running, auth working.

---

## Chunk 1: Browse

### File Map

- Create: `src/services/brandService.ts`
- Create: `src/services/itemService.ts`
- Create: `src/__tests__/services/brandService.test.ts`
- Create: `src/__tests__/services/itemService.test.ts`
- Create: `src/hooks/useBrands.ts`
- Create: `src/hooks/useItems.ts`
- Create: `src/hooks/useItem.ts`
- Modify: `src/screens/browse/BrowseScreen.tsx`
- Modify: `src/screens/browse/BrandScreen.tsx` (replace placeholder)
- Create: `src/screens/browse/ItemScreen.tsx`
- Modify: `src/navigation/MainTabs.tsx` (add BrandScreen and ItemScreen to Browse stack)

---

### Task 1: brandService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/brandService.test.ts`:

```typescript
import { getBrands } from "../../services/brandService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;

describe("getBrands", () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [
              { id: "1", name: "Nike", logo_url: null, slug: "nike" },
              { id: "2", name: "Adidas", logo_url: null, slug: "adidas" },
            ],
            error: null,
            count: 2,
          }),
        }),
      }),
    });
  });

  it("fetches brands with pagination", async () => {
    const result = await getBrands({ page: 0, pageSize: 20 });
    expect(supabase.from).toHaveBeenCalledWith("brands");
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it("returns error when query fails", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Connection failed" },
            count: null,
          }),
        }),
      }),
    });

    const result = await getBrands({ page: 0, pageSize: 20 });
    expect(result.error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/brandService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/brandService.ts`**

```typescript
import { supabase } from "../lib/supabase";

export type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
};

type PaginationOptions = { page: number; pageSize: number };
type QueryResult<T> = { data: T | null; error: { message: string } | null; count: number };

export async function getBrands(
  { page, pageSize }: PaginationOptions
): Promise<QueryResult<Brand[]>> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("brands")
    .select("id, name, logo_url, slug", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  return { data, error, count: count ?? 0 };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/brandService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/brandService.ts src/__tests__/services/brandService.test.ts
git commit -m "feat: add brandService with paginated getBrands"
```

---

### Task 2: itemService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/itemService.test.ts`:

```typescript
import { getItemsByBrand, getItemById, getItemAggregateScores, searchItems } from "../../services/itemService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

const mockItem = {
  id: "item-1",
  model_name: "Air Force 1",
  category: "footwear",
  is_active: true,
  subtype_id: "sub-1",
  brand_id: "brand-1",
  subtypes: { name: "Sneaker" },
  brands: { name: "Nike", slug: "nike" },
};

describe("getItemsByBrand", () => {
  it("fetches active items for a brand", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [mockItem], error: null }),
        }),
      }),
    });

    const result = await getItemsByBrand("brand-1");
    expect(supabase.from).toHaveBeenCalledWith("items");
    expect(result.data).toHaveLength(1);
  });
});

describe("getItemById", () => {
  it("fetches a single item with brand and subtype", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
        }),
      }),
    });

    const result = await getItemById("item-1");
    expect(result.data?.id).toBe("item-1");
  });
});

describe("searchItems", () => {
  it("returns empty array for blank query", async () => {
    const result = await searchItems("");
    expect(result.brands).toEqual([]);
    expect(result.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/itemService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/itemService.ts`**

```typescript
import { supabase } from "../lib/supabase";
import type { Brand } from "./brandService";

export type Item = {
  id: string;
  model_name: string;
  category: "top" | "bottom" | "footwear";
  is_active: boolean;
  subtype_id: string;
  brand_id: string;
  subtypes: { name: string } | null;
  brands: Pick<Brand, "name" | "slug"> | null;
};

export type ItemWithScores = Item & {
  avg_overall_score: number | null;
  avg_category_score: number | null;
  scorer_count: number;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function getItemsByBrand(brandId: string): Promise<QueryResult<Item[]>> {
  const { data, error } = await supabase
    .from("items")
    .select("*, subtypes(name), brands(name, slug)")
    .eq("brand_id", brandId)
    .eq("is_active", true);

  return { data, error };
}

export async function getItemById(itemId: string): Promise<QueryResult<Item>> {
  const { data, error } = await supabase
    .from("items")
    .select("*, subtypes(name), brands(name, slug)")
    .eq("id", itemId)
    .single();

  return { data, error };
}

export async function getItemAggregateScores(
  itemId: string
): Promise<{ avg_overall: number | null; avg_category: number | null; scorer_count: number }> {
  const { data, error } = await supabase
    .from("scores")
    .select("overall_score, category_score")
    .eq("item_id", itemId);

  if (error || !data || data.length < 3) {
    return { avg_overall: null, avg_category: null, scorer_count: data?.length ?? 0 };
  }

  const avg_overall = data.reduce((sum, r) => sum + Number(r.overall_score), 0) / data.length;
  const avg_category = data.reduce((sum, r) => sum + Number(r.category_score), 0) / data.length;

  return { avg_overall, avg_category, scorer_count: data.length };
}

export async function searchItems(
  query: string
): Promise<{ brands: Brand[]; items: Item[] }> {
  if (!query.trim()) return { brands: [], items: [] };

  const q = `%${query.trim()}%`;

  const [brandsResult, itemsResult] = await Promise.all([
    supabase.from("brands").select("id, name, logo_url, slug").ilike("name", q).limit(20),
    supabase
      .from("items")
      .select("*, subtypes(name), brands(name, slug)")
      .ilike("model_name", q)
      .eq("is_active", true)
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
npx jest src/__tests__/services/itemService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/itemService.ts src/__tests__/services/itemService.test.ts
git commit -m "feat: add itemService with getItemsByBrand, getItemById, getItemAggregateScores, searchItems"
```

---

### Task 3: Browse hooks

- [ ] **Step 1: Create `src/hooks/useBrands.ts`**

```typescript
import { useState, useEffect, useCallback } from "react";
import { getBrands, type Brand } from "../services/brandService";

const PAGE_SIZE = 20;

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(pageNum: number, append: boolean) {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const result = await getBrands({ page: pageNum, pageSize: PAGE_SIZE });

    if (result.error) {
      setError(result.error.message);
    } else {
      const newBrands = result.data ?? [];
      setBrands(prev => (append ? [...prev, ...newBrands] : newBrands));
      setHasMore(newBrands.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => { loadPage(0, false); }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, true);
  }, [loadingMore, hasMore, page]);

  return { brands, loading, loadingMore, hasMore, loadMore, error };
}
```

- [ ] **Step 2: Create `src/hooks/useItems.ts`**

```typescript
import { useState, useEffect } from "react";
import { getItemsByBrand, type Item } from "../services/itemService";

export function useItems(brandId: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getItemsByBrand(brandId).then(result => {
      if (result.error) setError(result.error.message);
      else setItems(result.data ?? []);
      setLoading(false);
    });
  }, [brandId]);

  return { items, loading, error };
}
```

- [ ] **Step 3: Create `src/hooks/useItem.ts`**

```typescript
import { useState, useEffect } from "react";
import { getItemById, getItemAggregateScores, type Item } from "../services/itemService";

type AggregateScores = {
  avg_overall: number | null;
  avg_category: number | null;
  scorer_count: number;
};

export function useItem(itemId: string) {
  const [item, setItem] = useState<Item | null>(null);
  const [scores, setScores] = useState<AggregateScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getItemById(itemId), getItemAggregateScores(itemId)]).then(
      ([itemResult, scoresResult]) => {
        if (itemResult.error) setError(itemResult.error.message);
        else {
          setItem(itemResult.data);
          setScores(scoresResult);
        }
        setLoading(false);
      }
    );
  }, [itemId]);

  return { item, scores, loading, error };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useBrands.ts src/hooks/useItems.ts src/hooks/useItem.ts
git commit -m "feat: add useBrands, useItems, useItem hooks"
```

---

### Task 4: Browse navigation + screens

- [ ] **Step 1: Create placeholder `src/screens/closet/ItemDetailScreen.tsx`** (must exist before MainTabs.tsx imports it)

```typescript
import React from "react";
import { View, Text } from "react-native";

export default function ItemDetailScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text>Item Detail</Text>
    </View>
  );
}
```

- [ ] **Step 2: Update navigation to use a stack for Browse tab**

Replace `src/navigation/MainTabs.tsx` to nest a stack inside the Browse tab:

```typescript
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ForYouFeedScreen from "../screens/feed/ForYouFeedScreen";
import BrowseScreen from "../screens/browse/BrowseScreen";
import BrandScreen from "../screens/browse/BrandScreen";
import ItemScreen from "../screens/browse/ItemScreen";
import ClosetScreen from "../screens/closet/ClosetScreen";
import ItemDetailScreen from "../screens/closet/ItemDetailScreen";
import ComparisonScreen from "../screens/compare/ComparisonScreen";
import SearchScreen from "../screens/search/SearchScreen";

export type BrowseStackParamList = {
  BrowseList: undefined;
  Brand: { brandId: string; brandName: string };
  Item: { itemId: string };
};

export type ClosetStackParamList = {
  ClosetList: undefined;
  ItemDetail: { closetEntryId: string };
};

export type MainTabsParamList = {
  Home: undefined;
  Browse: undefined;
  Closet: undefined;
  Compare: undefined;
  Search: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const ClosetStack = createNativeStackNavigator<ClosetStackParamList>();

function BrowseNavigator() {
  return (
    <BrowseStack.Navigator>
      <BrowseStack.Screen name="BrowseList" component={BrowseScreen} options={{ title: "Browse" }} />
      <BrowseStack.Screen name="Brand" component={BrandScreen} options={({ route }) => ({ title: route.params.brandName })} />
      <BrowseStack.Screen name="Item" component={ItemScreen} options={{ title: "Item" }} />
    </BrowseStack.Navigator>
  );
}

function ClosetNavigator() {
  return (
    <ClosetStack.Navigator>
      <ClosetStack.Screen name="ClosetList" component={ClosetScreen} options={{ title: "My Closet" }} />
      <ClosetStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item Details" }} />
    </ClosetStack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={ForYouFeedScreen} />
      <Tab.Screen name="Browse" component={BrowseNavigator} />
      <Tab.Screen name="Closet" component={ClosetNavigator} />
      <Tab.Screen name="Compare" component={ComparisonScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Implement `src/screens/browse/BrowseScreen.tsx`**

```typescript
import React from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useBrands } from "../../hooks/useBrands";

type Props = {
  navigation: NativeStackNavigationProp<BrowseStackParamList, "BrowseList">;
};

export default function BrowseScreen({ navigation }: Props) {
  const { brands, loading, loadingMore, loadMore, error } = useBrands();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-white"
      data={brands}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="p-4 gap-3"
      columnWrapperClassName="gap-3"
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" /> : null}
      renderItem={({ item }) => (
        <TouchableOpacity
          className="flex-1 bg-gray-50 rounded-xl p-4 items-center"
          onPress={() => navigation.navigate("Brand", { brandId: item.id, brandName: item.name })}
        >
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} className="w-16 h-16 mb-2" resizeMode="contain" />
          ) : (
            <View className="w-16 h-16 mb-2 bg-gray-200 rounded-lg items-center justify-center">
              <Text className="text-gray-400 text-xs">No logo</Text>
            </View>
          )}
          <Text className="font-semibold text-sm text-center" numberOfLines={2}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
```

- [ ] **Step 4: Implement `src/screens/browse/BrandScreen.tsx`**

```typescript
import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItems } from "../../hooks/useItems";

type Props = {
  navigation: NativeStackNavigationProp<BrowseStackParamList, "Brand">;
  route: RouteProp<BrowseStackParamList, "Brand">;
};

export default function BrandScreen({ navigation, route }: Props) {
  const { brandId } = route.params;
  const { items, loading, error } = useItems(brandId);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-white"
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerClassName="p-4 gap-3"
      ListEmptyComponent={
        <Text className="text-center text-gray-400 py-8">No items yet.</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
          onPress={() => navigation.navigate("Item", { itemId: item.id })}
        >
          <View>
            <Text className="font-semibold">{item.model_name}</Text>
            <Text className="text-sm text-gray-500 capitalize">
              {item.subtypes?.name ?? item.category}
            </Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </TouchableOpacity>
      )}
    />
  );
}
```

- [ ] **Step 5a: Create stub hooks and component that `ItemScreen` depends on** (must exist before the screen is written)

`src/hooks/useItemImages.ts`:
```typescript
export function useItemImages(_itemId: string) {
  return { images: [] as { id: string; url: string; sort_order: number }[] };
}
```

`src/hooks/useItemReviews.ts`:
```typescript
export function useItemReviews(_itemId: string) {
  return { reviews: [] as any[] };
}
```

`src/components/AddToClosetButton.tsx`:
```typescript
import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function AddToClosetButton({ itemId: _ }: { itemId: string }) {
  return (
    <TouchableOpacity className="bg-black py-4 rounded-xl items-center">
      <Text className="text-white font-semibold">Add to Closet</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 5b: Implement `src/screens/browse/ItemScreen.tsx`**

```typescript
import React from "react";
import {
  View, Text, ScrollView, ActivityIndicator, Image, FlatList,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItem } from "../../hooks/useItem";
import { useItemImages } from "../../hooks/useItemImages";
import { useItemReviews } from "../../hooks/useItemReviews";
import AddToClosetButton from "../../components/AddToClosetButton";

type Props = {
  route: RouteProp<BrowseStackParamList, "Item">;
};

export default function ItemScreen({ route }: Props) {
  const { itemId } = route.params;
  const { item, scores, loading, error } = useItem(itemId);
  const { images } = useItemImages(itemId);
  const { reviews } = useItemReviews(itemId);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (error || !item) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error ?? "Item not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Primary image */}
      {images[0] ? (
        <Image source={{ uri: images[0].url }} className="w-full h-72" resizeMode="cover" />
      ) : (
        <View className="w-full h-72 bg-gray-100 items-center justify-center">
          <Text className="text-gray-400">No image</Text>
        </View>
      )}

      <View className="p-4">
        <Text className="text-2xl font-bold mb-1">{item.model_name}</Text>
        <Text className="text-gray-500 mb-4">
          {item.brands?.name} · {item.subtypes?.name ?? item.category}
        </Text>

        {/* Aggregate scores */}
        {scores && scores.scorer_count >= 3 ? (
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">
                {scores.avg_overall?.toFixed(1) ?? "—"}
              </Text>
              <Text className="text-xs text-gray-500">Overall</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">
                {scores.avg_category?.toFixed(1) ?? "—"}
              </Text>
              <Text className="text-xs text-gray-500 capitalize">{item.category}</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">{scores.scorer_count}</Text>
              <Text className="text-xs text-gray-500">Rated by</Text>
            </View>
          </View>
        ) : (
          <Text className="text-sm text-gray-400 mb-6">
            Not enough ratings yet.
          </Text>
        )}

        <AddToClosetButton itemId={itemId} />

        {/* Reviews */}
        <Text className="text-lg font-semibold mt-6 mb-3">Reviews</Text>
        {reviews.length === 0 ? (
          <Text className="text-gray-400 text-sm">No reviews yet.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} className="border-b border-gray-100 pb-4 mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="font-semibold text-sm">{review.profiles?.username ?? "Unknown"}</Text>
                <Text className="text-xs text-gray-400">
                  Fit {review.fit_rating}/5 · Quality {review.quality_rating}/5
                </Text>
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

*Note: `useItemImages`, `useItemReviews`, and `AddToClosetButton` are created in Tasks 5–6 and Chunk 2 respectively. Create placeholder stubs for them now so the screen compiles:*

`src/hooks/useItemImages.ts`:
```typescript
export function useItemImages(_itemId: string) {
  return { images: [] as { id: string; url: string; sort_order: number }[] };
}
```

`src/hooks/useItemReviews.ts`:
```typescript
export function useItemReviews(_itemId: string) {
  return { reviews: [] as any[] };
}
```

`src/components/AddToClosetButton.tsx`:
```typescript
import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function AddToClosetButton({ itemId: _ }: { itemId: string }) {
  return (
    <TouchableOpacity className="bg-black py-4 rounded-xl items-center">
      <Text className="text-white font-semibold">Add to Closet</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 6: Create image and review service + hooks**

Create `src/services/imageService.ts`:

```typescript
import { supabase } from "../lib/supabase";

export type ItemImage = {
  id: string;
  url: string;
  sort_order: number;
};

export async function getItemImages(itemId: string): Promise<ItemImage[]> {
  const { data } = await supabase
    .from("images")
    .select("id, url, sort_order")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return data ?? [];
}
```

Create `src/services/reviewService.ts`:

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
  profiles: { username: string } | null;
};

export async function getReviewsForItem(itemId: string): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles(username)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
```

Replace the `useItemImages` stub with the real implementation:

```typescript
// src/hooks/useItemImages.ts
import { useState, useEffect } from "react";
import { getItemImages, type ItemImage } from "../services/imageService";

export function useItemImages(itemId: string) {
  const [images, setImages] = useState<ItemImage[]>([]);

  useEffect(() => {
    getItemImages(itemId).then(setImages);
  }, [itemId]);

  return { images };
}
```

Replace the `useItemReviews` stub with the real implementation:

```typescript
// src/hooks/useItemReviews.ts
import { useState, useEffect } from "react";
import { getReviewsForItem, type Review } from "../services/reviewService";

export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    getReviewsForItem(itemId).then(setReviews);
  }, [itemId]);

  return { reviews };
}
```

- [ ] **Step 7: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/ src/hooks/ src/screens/browse/ src/screens/closet/ItemDetailScreen.tsx src/components/ src/navigation/MainTabs.tsx
git commit -m "feat: implement Browse screens (brands, brand items, item detail) with services and hooks"
```

---

## Chunk 2: Add to Closet

### File Map

- Create: `src/services/closetService.ts`
- Create: `src/__tests__/services/closetService.test.ts`
- Create: `src/hooks/useCloset.ts`
- Create: `src/hooks/useClosetEntry.ts`
- Create: `src/screens/browse/AddToClosetModal.tsx`
- Modify: `src/components/AddToClosetButton.tsx` (replace stub)
- Modify: `src/navigation/MainTabs.tsx` (add modal)

---

### Task 5: closetService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/closetService.test.ts`:

```typescript
import {
  getCloset,
  addToCloset,
  upgradeToOwned,
} from "../../services/closetService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

const mockFrom = supabase.from as jest.Mock;

const mockEntry = {
  id: "entry-1",
  user_id: "user-1",
  item_id: "item-1",
  entry_type: "owned",
  color: "black",
  created_at: "2026-01-01",
};

describe("getCloset", () => {
  it("fetches closet entries for a user", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockEntry], error: null }),
        }),
      }),
    });

    const result = await getCloset("user-1");
    expect(supabase.from).toHaveBeenCalledWith("closet_entries");
    expect(result.data).toHaveLength(1);
  });
});

describe("addToCloset", () => {
  it("inserts a new closet entry", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockEntry, error: null }),
        }),
      }),
    });

    const result = await addToCloset({
      userId: "user-1",
      itemId: "item-1",
      entryType: "owned",
      color: "black",
    });
    expect(result.error).toBeNull();
    expect(result.data?.entry_type).toBe("owned");
  });

  it("returns error when insert fails", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Duplicate entry" },
          }),
        }),
      }),
    });

    const result = await addToCloset({
      userId: "user-1",
      itemId: "item-1",
      entryType: "owned",
      color: "black",
    });
    expect(result.error).not.toBeNull();
  });
});

describe("upgradeToOwned", () => {
  it("updates entry_type to owned and applies selected color", async () => {
    const updatedEntry = { ...mockEntry, entry_type: "owned", color: "navy" };
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: updatedEntry, error: null }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const result = await upgradeToOwned("entry-1", "navy");
    expect(result.error).toBeNull();
    expect(result.data?.entry_type).toBe("owned");
    expect(result.data?.color).toBe("navy");
    expect(updateMock).toHaveBeenCalledWith({ entry_type: "owned", color: "navy" });
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/closetService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/closetService.ts`**

```typescript
import { supabase } from "../lib/supabase";

export type ClosetEntry = {
  id: string;
  user_id: string;
  item_id: string;
  entry_type: "owned" | "interested";
  color: string;
  created_at: string;
  items?: {
    id: string;
    model_name: string;
    category: string;
    brands: { name: string } | null;
    subtypes: { name: string } | null;
  } | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function getCloset(userId: string): Promise<QueryResult<ClosetEntry[]>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .select("*, items(id, model_name, category, brands(name), subtypes(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function addToCloset(params: {
  userId: string;
  itemId: string;
  entryType: "owned" | "interested";
  color: string;
}): Promise<QueryResult<ClosetEntry>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .insert({
      user_id: params.userId,
      item_id: params.itemId,
      entry_type: params.entryType,
      color: params.color,
    })
    .select()
    .single();

  return { data, error };
}

export async function upgradeToOwned(
  entryId: string,
  color: string
): Promise<QueryResult<ClosetEntry>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .update({ entry_type: "owned", color })
    .eq("id", entryId)
    .select()
    .single();

  return { data, error };
}

export async function getClosetEntryForItem(
  userId: string,
  itemId: string
): Promise<ClosetEntry | null> {
  const { data } = await supabase
    .from("closet_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();

  return data ?? null;
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/closetService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/closetService.ts src/__tests__/services/closetService.test.ts
git commit -m "feat: add closetService (getCloset, addToCloset, upgradeToOwned)"
```

---

### Task 6: scoreService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/scoreService.test.ts`:

```typescript
import { createScoreRow, incrementScore } from "../../services/scoreService";
import { supabase } from "../../lib/supabase";
import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
} from "../../lib/scoring";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

describe("createScoreRow", () => {
  it("upserts a scores row with defaults (no-op if row already exists)", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await createScoreRow({
      closetEntryId: "entry-1",
      itemId: "item-1",
      userId: "user-1",
      category: "footwear",
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        closet_entry_id: "entry-1",
        item_id: "item-1",
        user_id: "user-1",
        category: "footwear",
        overall_score: 5.0,
        category_score: 5.0,
        wins: 0,
        losses: 0,
        confidence: "low",
      }),
      { onConflict: "closet_entry_id", ignoreDuplicates: true }
    );
  });
});

describe("incrementScore — winner", () => {
  it("increments wins and recalculates scores for same_category", async () => {
    const existingScore = {
      id: "score-1",
      wins: 3,
      losses: 1,
      category_wins: 2,
      category_losses: 1,
    };

    // Capture updateMock before calling the service so we don't re-invoke mockFrom()
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: existingScore, error: null }),
        }),
      }),
      update: updateMock,
    });

    await incrementScore({
      closetEntryId: "entry-1",
      outcome: "win",
      comparisonType: "same_category",
    });

    const newWins = 4;
    const newLosses = 1;
    const newCatWins = 3;
    const newCatLosses = 1;
    const expectedOverall = calculateOverallScore(newWins, newLosses);
    const expectedCategory = calculateCategoryScore(newCatWins, newCatLosses);
    const expectedConfidence = calculateConfidence(newWins + newLosses);

    const updateArg = updateMock.mock.calls[0][0];
    expect(updateArg.wins).toBe(newWins);
    expect(updateArg.overall_score).toBeCloseTo(expectedOverall);
    expect(updateArg.category_score).toBeCloseTo(expectedCategory);
    expect(updateArg.confidence).toBe(expectedConfidence);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/scoreService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/scoreService.ts`**

```typescript
import { supabase } from "../lib/supabase";
import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
} from "../lib/scoring";

type ScoreRow = {
  id: string;
  wins: number;
  losses: number;
  category_wins: number;
  category_losses: number;
};

export async function createScoreRow(params: {
  closetEntryId: string;
  itemId: string;
  userId: string;
  category: "top" | "bottom" | "footwear";
}): Promise<void> {
  // upsert with ignoreDuplicates: true so a downgrade→upgrade cycle
  // doesn't overwrite existing scores on the second owned promotion
  await supabase.from("scores").upsert({
    closet_entry_id: params.closetEntryId,
    item_id: params.itemId,
    user_id: params.userId,
    category: params.category,
    overall_score: 5.0,
    category_score: 5.0,
    wins: 0,
    losses: 0,
    category_wins: 0,
    category_losses: 0,
    confidence: "low",
    updated_at: new Date().toISOString(),
  }, { onConflict: "closet_entry_id", ignoreDuplicates: true });
}

export async function incrementScore(params: {
  closetEntryId: string;
  outcome: "win" | "loss";
  comparisonType: "same_category" | "cross_category";
}): Promise<void> {
  const { data: existing, error } = await supabase
    .from("scores")
    .select("id, wins, losses, category_wins, category_losses")
    .eq("closet_entry_id", params.closetEntryId)
    .single();

  if (error || !existing) return;

  const row = existing as ScoreRow;
  const isSameCategory = params.comparisonType === "same_category";
  const isWin = params.outcome === "win";

  const newWins = row.wins + (isWin ? 1 : 0);
  const newLosses = row.losses + (isWin ? 0 : 1);
  const newCategoryWins = row.category_wins + (isSameCategory && isWin ? 1 : 0);
  const newCategoryLosses = row.category_losses + (isSameCategory && !isWin ? 1 : 0);

  await supabase
    .from("scores")
    .update({
      wins: newWins,
      losses: newLosses,
      category_wins: newCategoryWins,
      category_losses: newCategoryLosses,
      overall_score: calculateOverallScore(newWins, newLosses),
      category_score: calculateCategoryScore(newCategoryWins, newCategoryLosses),
      confidence: calculateConfidence(newWins + newLosses),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/scoreService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/scoreService.ts src/__tests__/services/scoreService.test.ts
git commit -m "feat: add scoreService (createScoreRow, incrementScore)"
```

---

### Task 7: Add to Closet flow

- [ ] **Step 1: Create `src/hooks/useCloset.ts`**

```typescript
import { useState, useEffect, useCallback } from "react";
import { getCloset, type ClosetEntry } from "../services/closetService";
import { useAuth } from "./useAuth";

export function useCloset() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ClosetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const result = await getCloset(user.id);
    if (result.error) setError(result.error.message);
    else setEntries(result.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const owned = entries.filter((e) => e.entry_type === "owned");
  const interested = entries.filter((e) => e.entry_type === "interested");

  return { entries, owned, interested, loading, error, refresh };
}
```

- [ ] **Step 2: Create `src/hooks/useClosetEntry.ts`**

```typescript
import { useState, useEffect } from "react";
import { getClosetEntryForItem, type ClosetEntry } from "../services/closetService";
import { useAuth } from "./useAuth";

export function useClosetEntry(itemId: string) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<ClosetEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getClosetEntryForItem(user.id, itemId).then((e) => {
      setEntry(e);
      setLoading(false);
    });
  }, [user, itemId]);

  return { entry, loading, refetch: () => {
    if (user) getClosetEntryForItem(user.id, itemId).then(setEntry);
  }};
}
```

- [ ] **Step 3: Create `src/screens/browse/AddToClosetModal.tsx`**

```typescript
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Modal,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { addToCloset, upgradeToOwned } from "../../services/closetService";
import { createScoreRow } from "../../services/scoreService";
import { getItemById } from "../../services/itemService";
import type { ClosetEntry } from "../../services/closetService";

const COLORS = [
  "black", "white", "grey", "navy", "brown", "tan",
  "red", "blue", "green", "yellow", "orange", "pink",
  "purple", "multicolor", "other",
] as const;

type Props = {
  visible: boolean;
  itemId: string;
  existingEntry: ClosetEntry | null;
  onClose: () => void;
  onAdded: (entry: ClosetEntry, isOwned: boolean) => void;
};

export default function AddToClosetModal({
  visible, itemId, existingEntry, onClose, onAdded,
}: Props) {
  const { user } = useAuth();
  const [selectedColor, setSelectedColor] = useState<string>(
    existingEntry?.color ?? "black"
  );
  const [loading, setLoading] = useState(false);

  async function handleAdd(entryType: "owned" | "interested") {
    if (!user) return;
    setLoading(true);

    try {
      let entry: ClosetEntry | null = null;

      if (existingEntry && existingEntry.entry_type === "interested" && entryType === "owned") {
        // Upgrade interested → owned (also applies selected color)
        const result = await upgradeToOwned(existingEntry.id, selectedColor);
        if (result.error) throw new Error(result.error.message);
        entry = result.data;
      } else if (!existingEntry) {
        const result = await addToCloset({ userId: user.id, itemId, entryType, color: selectedColor });
        if (result.error) throw new Error(result.error.message);
        entry = result.data;
      }

      // Create scores row if this is an owned entry
      if (entry && entryType === "owned") {
        const itemResult = await getItemById(itemId);
        if (itemResult.data) {
          await createScoreRow({
            closetEntryId: entry.id,
            itemId,
            userId: user.id,
            category: itemResult.data.category,
          });
        }
      }

      if (entry) onAdded(entry, entryType === "owned");
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not add to closet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-white rounded-t-3xl p-6">
        <Text className="text-xl font-bold mb-4">Add to Closet</Text>

        {/* Color picker */}
        <Text className="font-semibold mb-2">Color</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              className={`mr-2 px-3 py-2 rounded-full border ${
                selectedColor === color ? "bg-black border-black" : "border-gray-300"
              }`}
              onPress={() => setSelectedColor(color)}
            >
              <Text
                className={`text-sm capitalize ${selectedColor === color ? "text-white" : "text-gray-700"}`}
              >
                {color}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action buttons */}
        {existingEntry?.entry_type === "interested" ? (
          <TouchableOpacity
            className={`bg-black py-4 rounded-xl items-center mb-3 ${loading ? "opacity-50" : ""}`}
            onPress={() => handleAdd("owned")}
            disabled={loading}
          >
            <Text className="text-white font-semibold">Mark as Owned</Text>
          </TouchableOpacity>
        ) : !existingEntry ? (
          <>
            <TouchableOpacity
              className={`bg-black py-4 rounded-xl items-center mb-3 ${loading ? "opacity-50" : ""}`}
              onPress={() => handleAdd("owned")}
              disabled={loading}
            >
              <Text className="text-white font-semibold">I Own This</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`border border-black py-4 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
              onPress={() => handleAdd("interested")}
              disabled={loading}
            >
              <Text className="text-black font-semibold">Add to Wishlist</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text className="text-center text-gray-500">Already in your closet.</Text>
        )}
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: Replace `AddToClosetButton` stub with real implementation**

Replace `src/components/AddToClosetButton.tsx`:

```typescript
import React, { useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { useClosetEntry } from "../hooks/useClosetEntry";
import AddToClosetModal from "../screens/browse/AddToClosetModal";
import type { ClosetEntry } from "../services/closetService";

type Props = {
  itemId: string;
  onOwned?: (entry: ClosetEntry) => void;
};

export default function AddToClosetButton({ itemId, onOwned }: Props) {
  const { entry, loading, refetch } = useClosetEntry(itemId);
  const [modalVisible, setModalVisible] = useState(false);

  if (loading) return null;

  const label = entry
    ? entry.entry_type === "owned"
      ? "In Your Closet ✓"
      : "In Wishlist — Mark as Owned?"
    : "Add to Closet";

  function handleAdded(newEntry: ClosetEntry, isOwned: boolean) {
    refetch();
    if (isOwned) onOwned?.(newEntry);
  }

  return (
    <>
      <TouchableOpacity
        className={`py-4 rounded-xl items-center ${
          entry?.entry_type === "owned" ? "bg-gray-100" : "bg-black"
        }`}
        onPress={() => setModalVisible(true)}
        disabled={entry?.entry_type === "owned"}
      >
        <Text
          className={`font-semibold ${
            entry?.entry_type === "owned" ? "text-gray-500" : "text-white"
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
      <AddToClosetModal
        visible={modalVisible}
        itemId={itemId}
        existingEntry={entry}
        onClose={() => setModalVisible(false)}
        onAdded={handleAdded}
      />
    </>
  );
}
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCloset.ts src/hooks/useClosetEntry.ts src/screens/browse/AddToClosetModal.tsx src/components/AddToClosetButton.tsx
git commit -m "feat: implement Add to Closet flow with color picker and score row creation"
```

---

## Chunk 3: Pairwise Comparison

### File Map

- Create: `src/services/comparisonService.ts`
- Create: `src/__tests__/services/comparisonService.test.ts`
- Create: `src/lib/comparisonQueue.ts`
- Create: `src/__tests__/lib/comparisonQueue.test.ts`
- Create: `src/hooks/useComparisonQueue.ts`
- Modify: `src/screens/compare/ComparisonScreen.tsx`

---

### Task 8: comparisonQueue (in-memory queue logic)

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/lib/comparisonQueue.test.ts`:

```typescript
import { buildQueue, type QueueEntry } from "../../lib/comparisonQueue";

const makeEntry = (id: string, category: "top" | "bottom" | "footwear"): QueueEntry => ({
  id,
  itemId: `item-${id}`,
  modelName: `Item ${id}`,
  category,
  imageUrl: null,
});

describe("buildQueue", () => {
  it("returns empty array when fewer than 2 owned entries", () => {
    const queue = buildQueue([makeEntry("1", "footwear")]);
    expect(queue).toHaveLength(0);
  });

  it("produces same-category pairs when entries share a category", () => {
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "footwear"),
      makeEntry("3", "footwear"),
    ];
    // 3 footwear entries → 3 same-category pairs (1-2, 1-3, 2-3)
    const queue = buildQueue(entries);
    expect(queue).toHaveLength(3);
    queue.forEach((p) => {
      expect(p.type).toBe("same_category");
      expect(p.a.category).toBe(p.b.category);
    });
  });

  it("injects a cross-category pair at every 5th output position", () => {
    // 4 footwear → 6 same-cat pairs; 1 top + 1 bottom → 1 cross-cat pair
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "footwear"),
      makeEntry("3", "footwear"),
      makeEntry("4", "footwear"),
      makeEntry("5", "top"),
      makeEntry("6", "bottom"),
    ];
    const queue = buildQueue(entries);
    // 6 same-cat + 1 cross-cat (injected at outputIdx 4) = 7 total
    expect(queue).toHaveLength(7);
    expect(queue[4].type).toBe("cross_category");
    // All other positions should be same-category
    queue.forEach((p, i) => {
      if (i !== 4) expect(p.type).toBe("same_category");
    });
  });

  it("all same-category pairs are present (no pairs dropped)", () => {
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "footwear"),
      makeEntry("3", "footwear"),
      makeEntry("4", "top"),
      makeEntry("5", "top"),
      makeEntry("6", "top"),
    ];
    const queue = buildQueue(entries);
    const sameCat = queue.filter((p) => p.type === "same_category");
    // 3 footwear → 3 pairs; 3 top → 3 pairs; total 6 same-cat
    expect(sameCat).toHaveLength(6);
  });

  it("falls back to cross-category when no same-category pairs exist", () => {
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "top"),
    ];
    const queue = buildQueue(entries);
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("cross_category");
  });

  it("returns empty array when only 1 owned entry", () => {
    const queue = buildQueue([makeEntry("1", "footwear")]);
    expect(queue).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/lib/comparisonQueue.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/lib/comparisonQueue.ts`**

```typescript
export type QueueEntry = {
  id: string;         // closet_entry_id
  itemId: string;
  modelName: string;
  category: "top" | "bottom" | "footwear";
  imageUrl: string | null;
};

export type ComparisonPair = {
  a: QueueEntry;
  b: QueueEntry;
  type: "same_category" | "cross_category";
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSameCategoryPairs(entries: QueueEntry[]): ComparisonPair[] {
  const byCategory = new Map<string, QueueEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  const pairs: ComparisonPair[] = [];
  for (const [, group] of byCategory) {
    const shuffled = shuffle(group);
    // All unique C(n,2) pairs within this category
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        pairs.push({ a: shuffled[i], b: shuffled[j], type: "same_category" });
      }
    }
  }
  return shuffle(pairs);
}

function getCrossCategoryPairs(entries: QueueEntry[]): ComparisonPair[] {
  const categories = [...new Set(entries.map((e) => e.category))];
  if (categories.length < 2) return [];

  const pairs: ComparisonPair[] = [];
  const shuffled = shuffle(entries);
  for (let i = 0; i + 1 < shuffled.length; i++) {
    if (shuffled[i].category !== shuffled[i + 1].category) {
      pairs.push({ a: shuffled[i], b: shuffled[i + 1], type: "cross_category" });
    }
  }
  return pairs;
}

/**
 * Builds an in-memory comparison queue for a session.
 * Same-category pairs are the default; every 5th pair is cross-category if available.
 * Falls back to cross-category if no same-category pairs can be formed.
 */
export function buildQueue(entries: QueueEntry[]): ComparisonPair[] {
  if (entries.length < 2) return [];

  const sameCat = getSameCategoryPairs(entries);
  const crossCat = getCrossCategoryPairs(entries);

  if (sameCat.length === 0) return crossCat;

  const result: ComparisonPair[] = [];
  let sameCatIdx = 0;
  let crossIdx = 0;
  let outputIdx = 0;

  // Iterate over same-category pairs; inject one cross-category at every 5th output position
  while (sameCatIdx < sameCat.length) {
    if ((outputIdx + 1) % 5 === 0 && crossIdx < crossCat.length) {
      result.push(crossCat[crossIdx++]);
    } else {
      result.push(sameCat[sameCatIdx++]);
    }
    outputIdx++;
  }

  return result;
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/lib/comparisonQueue.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/comparisonQueue.ts src/__tests__/lib/comparisonQueue.test.ts
git commit -m "feat: add comparisonQueue with same-category-first and every-5th cross-category injection"
```

---

### Task 9: comparisonService

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/comparisonService.test.ts`:

```typescript
import { recordComparison } from "../../services/comparisonService";
import { supabase } from "../../lib/supabase";
import * as scoreService from "../../services/scoreService";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));
jest.mock("../../services/scoreService");

const mockFrom = supabase.from as jest.Mock;
const mockIncrementScore = scoreService.incrementScore as jest.Mock;

describe("recordComparison", () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    mockIncrementScore.mockResolvedValue(undefined);
  });

  it("inserts a comparison row and updates scores for both entries", async () => {
    await recordComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
      comparisonType: "same_category",
    });

    expect(supabase.from).toHaveBeenCalledWith("comparisons");
    expect(mockIncrementScore).toHaveBeenCalledWith({
      closetEntryId: "entry-win",
      outcome: "win",
      comparisonType: "same_category",
    });
    expect(mockIncrementScore).toHaveBeenCalledWith({
      closetEntryId: "entry-lose",
      outcome: "loss",
      comparisonType: "same_category",
    });
  });

  it("returns error if insert fails", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });

    const result = await recordComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
      comparisonType: "same_category",
    });

    expect(result.error).not.toBeNull();
    expect(mockIncrementScore).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/__tests__/services/comparisonService.test.ts --verbose
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/services/comparisonService.ts`**

```typescript
import { supabase } from "../lib/supabase";
import { incrementScore } from "./scoreService";

type ComparisonResult = { error: { message: string } | null };

export async function recordComparison(params: {
  userId: string;
  winnerEntryId: string;
  loserEntryId: string;
  comparisonType: "same_category" | "cross_category";
}): Promise<ComparisonResult> {
  const { error } = await supabase.from("comparisons").insert({
    user_id: params.userId,
    winner_entry_id: params.winnerEntryId,
    loser_entry_id: params.loserEntryId,
    comparison_type: params.comparisonType,
  });

  if (error) return { error };

  // Increment scores for both entries (fire-and-forget — don't await serially)
  await Promise.all([
    incrementScore({
      closetEntryId: params.winnerEntryId,
      outcome: "win",
      comparisonType: params.comparisonType,
    }),
    incrementScore({
      closetEntryId: params.loserEntryId,
      outcome: "loss",
      comparisonType: params.comparisonType,
    }),
  ]);

  return { error: null };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/__tests__/services/comparisonService.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/comparisonService.ts src/__tests__/services/comparisonService.test.ts
git commit -m "feat: add comparisonService (recordComparison with score updates)"
```

---

### Task 10: ComparisonScreen

- [ ] **Step 1: Create `src/hooks/useComparisonQueue.ts`**

```typescript
import { useState, useEffect, useMemo } from "react";
import { buildQueue, type ComparisonPair, type QueueEntry } from "../lib/comparisonQueue";
import type { ClosetEntry } from "../services/closetService";
import type { ItemImage } from "../services/imageService";

export function useComparisonQueue(
  ownedEntries: ClosetEntry[],
  primaryImages: Map<string, string>  // itemId → imageUrl
) {
  const queueEntries: QueueEntry[] = useMemo(() => {
    return ownedEntries
      .filter((e) => e.items)
      .map((e) => ({
        id: e.id,
        itemId: e.item_id,
        modelName: e.items!.model_name,
        category: e.items!.category as "top" | "bottom" | "footwear",
        imageUrl: primaryImages.get(e.item_id) ?? null,
      }));
  }, [ownedEntries, primaryImages]);

  // Build queue after async data loads — useState initializer runs once with empty entries
  const [queue, setQueue] = useState<ComparisonPair[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setQueue(buildQueue(queueEntries));
    setIndex(0);
  }, [queueEntries]);

  const currentPair = index < queue.length ? queue[index] : null;
  const progress = queue.length > 0 ? index / queue.length : 0;

  function advance() {
    setIndex((i) => i + 1);
  }

  return { currentPair, progress, totalPairs: queue.length, completedPairs: index, advance };
}
```

- [ ] **Step 2: Implement `src/screens/compare/ComparisonScreen.tsx`**

```typescript
import React, { useMemo } from "react";
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView,
} from "react-native";
import { useCloset } from "../../hooks/useCloset";
import { useComparisonQueue } from "../../hooks/useComparisonQueue";
import { recordComparison } from "../../services/comparisonService";
import { useAuth } from "../../hooks/useAuth";

export default function ComparisonScreen() {
  const { user } = useAuth();
  const { owned, loading } = useCloset();

  // For MVP: use a static empty map (images preloading added in a later polish pass)
  const primaryImages = useMemo(() => new Map<string, string>(), []);
  const { currentPair, progress, totalPairs, completedPairs, advance } =
    useComparisonQueue(owned, primaryImages);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (owned.length < 2) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-bold mb-2">Not enough items</Text>
        <Text className="text-gray-500 text-center">
          Add at least 2 owned items to start comparing.
        </Text>
      </View>
    );
  }

  if (!currentPair) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-bold mb-2">All done!</Text>
        <Text className="text-gray-500 text-center">
          You've compared all pairs for this session.
        </Text>
        <Text className="text-gray-400 mt-2">
          {completedPairs} of {totalPairs} pairs compared.
        </Text>
      </View>
    );
  }

  async function handleChoice(winnerEntryId: string, loserEntryId: string) {
    if (!user) return;
    await recordComparison({
      userId: user.id,
      winnerEntryId,
      loserEntryId,
      comparisonType: currentPair!.type,
    });
    advance();
  }

  const { a, b } = currentPair;

  return (
    <View className="flex-1 bg-white">
      {/* Progress bar */}
      <View className="h-1 bg-gray-100">
        <View className="h-1 bg-black" style={{ width: `${progress * 100}%` }} />
      </View>

      <View className="flex-1 flex-row">
        {/* Item A */}
        <TouchableOpacity
          className="flex-1 items-center justify-center p-6 border-r border-gray-100"
          onPress={() => handleChoice(a.id, b.id)}
        >
          {a.imageUrl ? (
            <Image
              source={{ uri: a.imageUrl }}
              className="w-full h-56 mb-4"
              resizeMode="contain"
            />
          ) : (
            <View className="w-full h-56 mb-4 bg-gray-100 rounded-xl items-center justify-center">
              <Text className="text-gray-400 text-sm">No image</Text>
            </View>
          )}
          <Text className="font-semibold text-center" numberOfLines={2}>{a.modelName}</Text>
          <Text className="text-xs text-gray-400 mt-1 capitalize">{a.category}</Text>
        </TouchableOpacity>

        {/* Item B */}
        <TouchableOpacity
          className="flex-1 items-center justify-center p-6"
          onPress={() => handleChoice(b.id, a.id)}
        >
          {b.imageUrl ? (
            <Image
              source={{ uri: b.imageUrl }}
              className="w-full h-56 mb-4"
              resizeMode="contain"
            />
          ) : (
            <View className="w-full h-56 mb-4 bg-gray-100 rounded-xl items-center justify-center">
              <Text className="text-gray-400 text-sm">No image</Text>
            </View>
          )}
          <Text className="font-semibold text-center" numberOfLines={2}>{b.modelName}</Text>
          <Text className="text-xs text-gray-400 mt-1 capitalize">{b.category}</Text>
        </TouchableOpacity>
      </View>

      {/* Skip button */}
      <TouchableOpacity className="py-4 items-center border-t border-gray-100" onPress={advance}>
        <Text className="text-gray-400 text-sm">Skip this pair</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useComparisonQueue.ts src/screens/compare/ComparisonScreen.tsx
git commit -m "feat: implement ComparisonScreen with pairwise comparison flow"
```

---

## Chunk 4: Closet View

### File Map

- Create: `src/hooks/useScores.ts`
- Modify: `src/screens/closet/ClosetScreen.tsx`
- Modify: `src/screens/closet/ItemDetailScreen.tsx`

---

### Task 11: Closet screen

- [ ] **Step 1: Create `src/hooks/useScores.ts`**

```typescript
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type ScoreData = {
  id: string;
  closet_entry_id: string;
  overall_score: number;
  category_score: number;
  wins: number;
  losses: number;
  confidence: "low" | "medium" | "high";
};

export function useScores(closetEntryId: string | null) {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!closetEntryId) { setLoading(false); return; }

    supabase
      .from("scores")
      .select("*")
      .eq("closet_entry_id", closetEntryId)
      .maybeSingle()
      .then(({ data }) => {
        setScore(data ?? null);
        setLoading(false);
      });
  }, [closetEntryId]);

  return { score, loading };
}
```

- [ ] **Step 2: Implement `src/screens/closet/ClosetScreen.tsx`**

```typescript
import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ClosetStackParamList } from "../../navigation/MainTabs";
import { useCloset } from "../../hooks/useCloset";
import ClosetEntryCard from "../../components/ClosetEntryCard";

type Props = {
  navigation: NativeStackNavigationProp<ClosetStackParamList, "ClosetList">;
};

type Tab = "owned" | "interested";

export default function ClosetScreen({ navigation }: Props) {
  const { owned, interested, loading, error } = useCloset();
  const [activeTab, setActiveTab] = useState<Tab>("owned");

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  const items = activeTab === "owned" ? owned : interested;

  return (
    <View className="flex-1 bg-white">
      {/* Tabs */}
      <View className="flex-row border-b border-gray-100 px-4">
        {(["owned", "interested"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`mr-6 py-3 border-b-2 ${activeTab === tab ? "border-black" : "border-transparent"}`}
            onPress={() => setActiveTab(tab)}
          >
            <Text className={`font-semibold capitalize ${activeTab === tab ? "text-black" : "text-gray-400"}`}>
              {tab === "owned" ? "Owned" : "Wishlist"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <Text className="text-red-500 text-center mt-8">{error}</Text>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-center">
            {activeTab === "owned"
              ? "You haven't added any owned items yet. Browse brands to get started."
              : "Your wishlist is empty."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-3"
          renderItem={({ item }) => (
            <ClosetEntryCard
              entry={item}
              onPress={() =>
                activeTab === "owned"
                  ? navigation.navigate("ItemDetail", { closetEntryId: item.id })
                  : null
              }
            />
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create `src/components/ClosetEntryCard.tsx`**

```typescript
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ClosetEntry } from "../services/closetService";
import { useScores } from "../hooks/useScores";

const CONFIDENCE_COLOR = {
  low: "text-gray-400",
  medium: "text-yellow-500",
  high: "text-green-600",
};

type Props = {
  entry: ClosetEntry;
  onPress: (() => void) | null;
};

export default function ClosetEntryCard({ entry, onPress }: Props) {
  const { score } = useScores(entry.entry_type === "owned" ? entry.id : null);

  return (
    <TouchableOpacity
      className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
      onPress={onPress ?? undefined}
      disabled={!onPress}
    >
      <View className="flex-1">
        <Text className="font-semibold" numberOfLines={1}>
          {entry.items?.model_name ?? "Unknown item"}
        </Text>
        <Text className="text-sm text-gray-500 capitalize">
          {entry.items?.brands?.name} · {entry.color}
        </Text>
      </View>

      {entry.entry_type === "owned" && score ? (
        <View className="items-end">
          <Text className="text-xl font-bold">{score.overall_score.toFixed(1)}</Text>
          <Text className={`text-xs ${CONFIDENCE_COLOR[score.confidence]}`}>
            {score.confidence}
          </Text>
        </View>
      ) : entry.entry_type === "interested" ? (
        <Text className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Wishlist</Text>
      ) : null}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 4: Implement `src/screens/closet/ItemDetailScreen.tsx`**

```typescript
import React from "react";
import {
  View, Text, ScrollView, ActivityIndicator,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ClosetStackParamList } from "../../navigation/MainTabs";
import { useScores } from "../../hooks/useScores";
import { useCloset } from "../../hooks/useCloset";

type Props = {
  route: RouteProp<ClosetStackParamList, "ItemDetail">;
  navigation: NativeStackNavigationProp<ClosetStackParamList, "ItemDetail">;
};

export default function ItemDetailScreen({ route }: Props) {
  const { closetEntryId } = route.params;
  const { entries, loading: closetLoading } = useCloset();
  const { score, loading: scoreLoading } = useScores(closetEntryId);

  const entry = entries.find((e) => e.id === closetEntryId);

  if (closetLoading || scoreLoading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Entry not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-1">{entry.items?.model_name}</Text>
      <Text className="text-gray-500 mb-6">
        {entry.items?.brands?.name} · {entry.color}
      </Text>

      {/* Score breakdown */}
      {score ? (
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Scores</Text>
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-3xl font-bold">{score.overall_score.toFixed(1)}</Text>
              <Text className="text-xs text-gray-500">Overall</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-3xl font-bold">{score.category_score.toFixed(1)}</Text>
              <Text className="text-xs text-gray-500 capitalize">{entry.items?.category}</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-3xl font-bold">{score.wins + score.losses}</Text>
              <Text className="text-xs text-gray-500">Comparisons</Text>
            </View>
          </View>
          <Text className="text-sm text-gray-500">
            {score.wins}W – {score.losses}L · Confidence:{" "}
            <Text className="capitalize font-medium">{score.confidence}</Text>
          </Text>
        </View>
      ) : (
        <Text className="text-gray-400 mb-6">No comparisons yet.</Text>
      )}

      {/* Placeholder for comparison history — populated in a later pass */}
      <Text className="text-lg font-semibold mb-2">Comparison History</Text>
      <Text className="text-gray-400 text-sm">
        Comparison history will appear here after you make comparisons.
      </Text>

      {/* Review option — implemented in Plan 3 */}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useScores.ts src/screens/closet/ src/components/ClosetEntryCard.tsx
git commit -m "feat: implement Closet screen and ItemDetailScreen with score display"
```

---

### Task 12: Integration smoke test — core features

- [ ] **Step 1: Start the development server**

```bash
npx expo start
```

- [ ] **Step 2: Verify Browse flow**

1. Tap Browse tab → grid of brands loads (or empty state if none seeded)
2. Seed at least one brand and item in Supabase if empty: use `mcp__claude_ai_Supabase__execute_sql` to insert test data:

```sql
INSERT INTO brands (name, slug) VALUES ('Nike', 'nike');
INSERT INTO items (brand_id, model_name, subtype_id, category)
  SELECT b.id, 'Air Force 1',
    (SELECT id FROM subtypes WHERE name = 'Sneaker' AND category = 'footwear'),
    'footwear'
  FROM brands b WHERE b.slug = 'nike';
```

3. Tap a brand → items list renders
4. Tap an item → ItemScreen renders with "Add to Closet" button
5. Tap "Add to Closet" → modal opens with color picker
6. Select "Owned" → modal closes, button shows "In Your Closet ✓"
7. Confirm in Supabase: `closet_entries` has the row; `scores` has a row with default 5.0 scores

- [ ] **Step 3: Verify Comparison flow**

1. Tap Compare tab → if < 2 owned items, empty state shown
2. Add a second owned item via Browse
3. Return to Compare tab → two items shown side by side
4. Tap one → comparison recorded, next pair shown or "All done" state
5. Confirm in Supabase: `comparisons` has a row; `scores` rows have updated wins/losses

- [ ] **Step 4: Verify Closet flow**

1. Tap Closet tab → owned items list with scores visible
2. Tap an owned item → ItemDetailScreen shows score breakdown
3. Switch to Wishlist tab → interested items show "Wishlist" badge

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add src/
git commit -m "fix: resolve core features integration issues from smoke test"
```

---

*Plan 2 complete. Proceed to Plan 3 (Social & Content) once core features are verified working.*
