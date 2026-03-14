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
