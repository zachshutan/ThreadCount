import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { addToCloset, upgradeToOwned } from "../../services/closetService";
import { createScoreRow } from "../../services/scoreService";
import { getItemById } from "../../services/itemService";
import type { ClosetEntry } from "../../services/closetService";
import type { RootStackParamList } from "../../navigation/RootNavigator";

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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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

          // Fire onAdded callback (updates button state) then close modal
          onAdded(entry, true);
          onClose();

          // Navigate to ranking session
          navigation.navigate("RankingComparison", {
            newEntryId: entry.id,
            userId: user.id,
            category: itemResult.data.category,
            itemName: itemResult.data.model_name,
            subtypeName: itemResult.data.subtypes?.name ?? itemResult.data.category,
          });
          return;
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
