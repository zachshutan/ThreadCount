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
