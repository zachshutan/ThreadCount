import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { useCloset } from "../../hooks/useCloset";
import { useItemReviews } from "../../hooks/useItemReviews";

type ItemDetailRouteParams = { closetEntryId: string };

function toOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ItemDetailScreen() {
  const route = useRoute<RouteProp<{ ItemDetail: ItemDetailRouteParams }, "ItemDetail">>();
  const navigation = useNavigation<any>();
  const { closetEntryId } = route.params;

  const { entries, loading: closetLoading } = useCloset();

  const entry = entries.find((e) => e.id === closetEntryId);

  const { reviews, loading: reviewsLoading } = useItemReviews(entry?.item_id ?? "");

  if (closetLoading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Entry not found.</Text>
      </View>
    );
  }

  const score = entry.scores;

  // Category ranking: how many owned items in the same category have a rank?
  const categoryRankedItems = entries.filter(
    (e) =>
      e.entry_type === "owned" &&
      e.items?.category === entry.items?.category &&
      e.scores?.category_rank !== null
  );
  const categoryTotal = categoryRankedItems.length;

  // Subcategory ranking: sort owned items in the same subtype by category_rank ascending
  const subtypeName = entry.items?.subtypes?.name ?? "Other";
  const subtypeItems = entries
    .filter(
      (e) =>
        e.entry_type === "owned" &&
        (e.items?.subtypes?.name ?? "Other") === subtypeName &&
        e.scores?.category_rank !== null
    )
    .sort((a, b) => {
      const ra = a.scores?.category_rank ?? 9999;
      const rb = b.scores?.category_rank ?? 9999;
      return ra - rb;
    });
  const subtypeRankPosition =
    subtypeItems.findIndex((e) => e.id === closetEntryId) + 1;
  const showSubtypeRank = subtypeItems.length >= 2 && subtypeRankPosition > 0;

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-1">{entry.items?.model_name}</Text>
      <Text className="text-gray-500 mb-6">
        {entry.items?.brands?.name}{entry.color ? ` · ${entry.color}` : ""}
      </Text>

      {/* Score badges */}
      {score ? (
        <View className="flex-row gap-3 mb-6">
          {/* Overall score */}
          <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
            <Text className="text-3xl font-bold">
              {score.overall_score !== null ? score.overall_score.toFixed(1) : "—"}
            </Text>
            <Text className="text-xs text-gray-500 text-center">Overall score</Text>
          </View>

          {/* Category ranking */}
          {score.category_rank !== null && (
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-3xl font-bold">{toOrdinal(score.category_rank)}</Text>
              <Text className="text-xs text-gray-500 text-center capitalize">
                of {categoryTotal} {entry.items?.category}
              </Text>
            </View>
          )}

          {/* Subcategory ranking */}
          {showSubtypeRank && (
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-3xl font-bold">{toOrdinal(subtypeRankPosition)}</Text>
              <Text className="text-xs text-gray-500 text-center">
                of {subtypeItems.length} {subtypeName}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text className="text-gray-400 mb-6">No ranking yet.</Text>
      )}

      {/* Write Review button */}
      <TouchableOpacity
        className="bg-black rounded-xl py-3 items-center mb-4"
        onPress={() => navigation.navigate("WriteReview", { itemId: entry.item_id })}
      >
        <Text className="text-white font-semibold">Write Review</Text>
      </TouchableOpacity>

      {/* Product link placeholder */}
      <View className="border border-dashed border-gray-200 rounded-xl py-3 px-4 items-center mt-2">
        <Text className="text-gray-400 text-sm">Product link — coming soon</Text>
      </View>

      {/* Recent Reviews */}
      <View className="mt-8">
        <Text className="text-lg font-bold mb-3">Recent Reviews</Text>
        {reviewsLoading ? (
          <ActivityIndicator />
        ) : reviews.length === 0 ? (
          <Text className="text-gray-400 text-sm">No reviews yet.</Text>
        ) : (
          reviews.slice(0, 5).map((review) => (
            <View key={review.id} className="bg-gray-50 rounded-xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-sm">@{review.profiles?.username ?? "unknown"}</Text>
                <View className="flex-row gap-3">
                  <Text className="text-xs text-gray-500">Fit {review.fit_rating}/5</Text>
                  <Text className="text-xs text-gray-500">Quality {review.quality_rating}/5</Text>
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
