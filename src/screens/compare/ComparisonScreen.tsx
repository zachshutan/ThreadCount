import React, { useMemo } from "react";
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator,
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
