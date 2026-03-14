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
