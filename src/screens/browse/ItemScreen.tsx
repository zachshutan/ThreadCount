import React, { useEffect } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, Image,
} from "react-native";
import { RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItem } from "../../hooks/useItem";
import { useItemImages } from "../../hooks/useItemImages";
import { useItemReviews } from "../../hooks/useItemReviews";
import AddToClosetButton from "../../components/AddToClosetButton";
import SubcategoryPlaceholder from "../../components/SubcategoryPlaceholder";

type Props = {
  route: RouteProp<BrowseStackParamList, "Item">;
};

export default function ItemScreen({ route }: Props) {
  const { itemId } = route.params;
  const navigation = useNavigation();
  const { item, scores, loading, error } = useItem(itemId);
  const { images } = useItemImages(itemId);
  const { reviews, loading: reviewsLoading, refresh: refreshReviews } = useItemReviews(itemId);

  // Update navigator header title to show the actual item name once loaded.
  // This gives the back button proper context (e.g. "< ABC Jogger").
  useEffect(() => {
    if (item?.model_name) {
      navigation.setOptions({ title: item.model_name });
    }
  }, [item?.model_name, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      refreshReviews();
    }, [refreshReviews])
  );

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

  const subtypeName = item.subtypes?.name ?? null;

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Image area — use SubcategoryPlaceholder when no real image */}
      {images[0] ? (
        <Image source={{ uri: images[0].url }} className="w-full h-72" resizeMode="cover" />
      ) : (
        <View className="w-full h-72 bg-gray-100 items-center justify-center">
          <SubcategoryPlaceholder subtypeName={subtypeName ?? item.category} size={120} />
        </View>
      )}

      <View className="px-4 pt-5 pb-10">
        {/* Title + metadata */}
        <Text className="text-2xl font-bold mb-1">{item.model_name}</Text>
        <Text className="text-base text-gray-500 mb-5">
          {item.brands?.name}{subtypeName ? ` · ${subtypeName}` : ""}
        </Text>

        {/* Ratings summary — always show something */}
        {scores && scores.scorer_count >= 3 ? (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {/* Top score tile — warm amber tint */}
            <View style={{
              flex: 1, backgroundColor: "#FFF8E7", borderRadius: 14,
              padding: 14, alignItems: "center",
              borderWidth: 1, borderColor: "#F0D88A",
            }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: "#C8941A" }}>
                {scores.avg_overall?.toFixed(1) ?? "—"}
              </Text>
              <Text style={{ fontSize: 11, color: "#A07820", marginTop: 2, fontWeight: "600" }}>Avg score</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FAFAF8", borderRadius: 14, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: "#111" }}>{scores.scorer_count}</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Ratings</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FAFAF8", borderRadius: 14, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: "#111" }}>{reviews.length}</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Reviews</Text>
            </View>
          </View>
        ) : (
          <View style={{
            flexDirection: "row", alignItems: "center", marginBottom: 24,
            backgroundColor: "#FAFAF8", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
          }}>
            <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
              {scores && scores.scorer_count > 0
                ? `${scores.scorer_count} rating${scores.scorer_count === 1 ? "" : "s"}`
                : "No ratings yet"}
              {reviews.length > 0
                ? `  ·  ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                : ""}
            </Text>
          </View>
        )}

        {/* Primary action */}
        <AddToClosetButton itemId={itemId} />

        {/* Reviews section */}
        <View style={{ marginTop: 32 }}>
          {/* Section header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1.2, textTransform: "uppercase" }}>
              Reviews
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#F0EDE8", marginLeft: 10 }} />
          </View>

          {reviewsLoading ? (
            <ActivityIndicator />
          ) : reviews.length === 0 ? (
            <View style={{ backgroundColor: "#FAFAF8", borderRadius: 14, padding: 20, alignItems: "center" }}>
              <Text style={{ fontWeight: "600", fontSize: 15, color: "#374151", marginBottom: 6 }}>Be the first to review</Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 18 }}>
                Add this item to your closet, then share how it fits, feels, and holds up.
              </Text>
            </View>
          ) : (
            reviews.map((review) => {
              const initials = (review.profiles?.username ?? "?").slice(0, 2).toUpperCase();
              return (
                <View
                  key={review.id}
                  style={{
                    backgroundColor: "#FAFAF8",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  {/* Reviewer row */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    {/* Initials avatar */}
                    <View style={{
                      width: 34, height: 34, borderRadius: 17,
                      backgroundColor: "#E8E4DC", alignItems: "center", justifyContent: "center",
                      marginRight: 10,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B5F45" }}>{initials}</Text>
                    </View>
                    <Text style={{ fontWeight: "600", fontSize: 14, color: "#111", flex: 1 }}>
                      @{review.profiles?.username ?? "Unknown"}
                    </Text>
                    {/* Fit + Quality pills */}
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <View style={{ backgroundColor: "#F3F0EA", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, color: "#6B5F45", fontWeight: "600" }}>
                          Fit {review.fit_rating}/5
                        </Text>
                      </View>
                      <View style={{ backgroundColor: "#F3F0EA", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, color: "#6B5F45", fontWeight: "600" }}>
                          Quality {review.quality_rating}/5
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>{review.body}</Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}
