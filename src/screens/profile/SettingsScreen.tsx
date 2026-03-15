import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { signOut } from "../../services/authService";
import { updateUsername } from "../../services/followService";

export default function SettingsScreen() {
  const { user } = useAuth();
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState("");

  async function handleSaveUsername() {
    if (!user || !username.trim()) return;
    const { error } = await updateUsername(user.id, username.trim());
    if (error) {
      Alert.alert("Error", "Could not update username.");
    } else {
      setEditingUsername(false);
      setUsername("");
      Alert.alert("Saved", "Username updated.");
    }
  }

  function handleLogout() {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  const STUB_ITEMS: Array<{ label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { label: "Notifications", icon: "notifications-outline" },
    { label: "Privacy", icon: "lock-closed-outline" },
    { label: "Help", icon: "chatbubble-outline" },
  ];

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Account section */}
      <View className="px-4 pt-6 pb-2">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Account</Text>
        {editingUsername ? (
          <View className="flex-row items-center gap-3">
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
              value={username}
              onChangeText={setUsername}
              autoFocus
              placeholder="New username"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={handleSaveUsername} className="bg-black px-4 py-3 rounded-xl">
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
            onPress={() => setEditingUsername(true)}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-outline" size={20} color="#000" />
              <Text className="font-medium">Edit username</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* More section */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">More</Text>
        {STUB_ITEMS.map(({ label, icon }) => (
          <TouchableOpacity
            key={label}
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
            onPress={() => Alert.alert(label, "Coming soon.")}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name={icon} size={20} color="#000" />
              <Text className="font-medium">{label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View className="px-4 pt-6">
        <TouchableOpacity onPress={handleLogout}>
          <Text className="text-red-500 font-semibold text-base">Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
