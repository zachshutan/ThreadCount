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
