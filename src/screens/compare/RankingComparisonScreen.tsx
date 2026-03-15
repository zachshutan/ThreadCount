import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useRankingSession } from "../../hooks/useRankingSession";
import { calculateScoreFromRank } from "../../lib/scoring";

type Props = NativeStackScreenProps<RootStackParamList, "RankingComparison">;

export default function RankingComparisonScreen({ route }: Props) {
  const { newEntryId, userId, category, itemName, subtypeName } = route.params;
  const navigation = useNavigation();

  const {
    isLoading,
    isFinalizing,
    isDone,
    currentComparator,
    totalComparisons,
    comparisonCount,
    finalRank,
    totalItems,
    handleNewItemWins,
    handlePeerWins,
  } = useRankingSession({ newEntryId, userId, category });

  // Intercept hardware back button (Android) and swipe-back gesture
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBackPress();
      return true; // prevent default
    });
    return () => subscription.remove();
  }, [isDone, isFinalizing]);

  // Navigate back automatically when done
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => navigation.goBack(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isDone]);

  function handleBackPress() {
    if (isDone || isFinalizing) return;
    Alert.alert(
      "Cancel ranking?",
      `If you leave now, "${itemName}" won't be ranked. Your item will be removed from your closet.`,
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Cancel ranking",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-gray-500 text-sm">Loading your {subtypeName}s...</Text>
      </View>
    );
  }

  if (isFinalizing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-gray-500 text-sm">Placing your item...</Text>
      </View>
    );
  }

  if (isDone && finalRank !== null) {
    const score = calculateScoreFromRank(finalRank, totalItems);
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className="w-24 h-24 bg-black rounded-full items-center justify-center mb-6">
          <Text className="text-white text-3xl font-bold">#{finalRank}</Text>
        </View>
        <Text className="text-2xl font-bold text-center mb-2">{itemName}</Text>
        <Text className="text-gray-500 text-center mb-2">
          Ranked #{finalRank} out of {totalItems} {subtypeName}s
        </Text>
        <Text className="text-4xl font-bold mt-4">{score.toFixed(1)}</Text>
        <Text className="text-gray-400 text-sm mt-1">score</Text>
        <Text className="text-gray-400 text-xs mt-6">Taking you back to your closet...</Text>
      </View>
    );
  }

  // Active comparison
  const comparisonNumber = comparisonCount + 1;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 border-b border-gray-100">
        <Text className="text-xs text-gray-400 text-center uppercase tracking-widest mb-1">
          Ranking your {subtypeName}
        </Text>
        {totalComparisons > 0 && (
          <Text className="text-sm text-gray-500 text-center">
            Comparison {comparisonNumber} of {totalComparisons}
          </Text>
        )}
        {/* Progress bar */}
        {totalComparisons > 0 && (
          <View className="h-1 bg-gray-100 rounded-full mt-3 mx-4">
            <View
              className="h-1 bg-black rounded-full"
              style={{ width: `${(comparisonCount / totalComparisons) * 100}%` }}
            />
          </View>
        )}
      </View>

      <Text className="text-center text-xl font-bold mt-8 mb-2 px-6">
        Pick your favorite
      </Text>
      <Text className="text-center text-gray-400 text-sm mb-8 px-6">
        Tap the item you prefer
      </Text>

      {/* Two comparison cards */}
      <View className="flex-1 flex-row px-4 gap-4 mb-8">
        {/* New item card */}
        <TouchableOpacity
          className="flex-1 bg-gray-50 rounded-2xl items-center justify-center p-4 border-2 border-transparent active:border-black"
          onPress={handleNewItemWins}
          activeOpacity={0.85}
        >
          <View className="w-full aspect-square bg-gray-200 rounded-xl mb-3 items-center justify-center">
            <Text className="text-gray-400 text-xs">No image</Text>
          </View>
          <Text className="text-sm font-semibold text-center" numberOfLines={2}>
            {itemName}
          </Text>
          <View className="mt-2 bg-black px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-semibold">New</Text>
          </View>
        </TouchableOpacity>

        {/* Current peer card */}
        <TouchableOpacity
          className="flex-1 bg-gray-50 rounded-2xl items-center justify-center p-4 border-2 border-transparent active:border-black"
          onPress={handlePeerWins}
          activeOpacity={0.85}
        >
          <View className="w-full aspect-square bg-gray-200 rounded-xl mb-3 items-center justify-center">
            <Text className="text-gray-400 text-xs">No image</Text>
          </View>
          <Text className="text-sm font-semibold text-center" numberOfLines={2}>
            {currentComparator?.modelName ?? ""}
          </Text>
          <View className="mt-2 bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-gray-600 text-xs font-semibold">In your closet</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Cancel link at bottom */}
      <TouchableOpacity onPress={handleBackPress} className="items-center pb-10">
        <Text className="text-gray-400 text-sm underline">Cancel ranking</Text>
      </TouchableOpacity>
    </View>
  );
}
