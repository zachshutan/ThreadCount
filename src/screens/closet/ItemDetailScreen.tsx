import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { useCloset } from "../../hooks/useCloset";
import { useScores } from "../../hooks/useScores";
import {
  getComparisonHistory,
  type ComparisonHistoryEntry,
} from "../../services/closetService";

type ItemDetailRouteParams = { closetEntryId: string };

export default function ItemDetailScreen() {
  const route = useRoute<RouteProp<{ ItemDetail: ItemDetailRouteParams }, "ItemDetail">>();
  const navigation = useNavigation<any>();
  const { closetEntryId } = route.params;

  const { entries, loading: closetLoading } = useCloset();
  const { score, loading: scoreLoading } = useScores(closetEntryId);

  const [history, setHistory] = useState<ComparisonHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    getComparisonHistory(closetEntryId).then((h) => {
      setHistory(h);
      setHistoryLoading(false);
    });
  }, [closetEntryId]);

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
      <Text className="text-gray-500 mb-4">
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

      {/* Write Review button */}
      <TouchableOpacity
        className="bg-black rounded-xl py-3 items-center mb-6"
        onPress={() => navigation.navigate("WriteReview", { itemId: entry.item_id })}
      >
        <Text className="text-white font-semibold">Write Review</Text>
      </TouchableOpacity>

      {/* Comparison history */}
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
              <Text className="text-xs text-gray-400 capitalize">
                {h.comparisonType.replace("_", " ")}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
