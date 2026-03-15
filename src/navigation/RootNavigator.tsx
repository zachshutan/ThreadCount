import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import PublicClosetScreen from "../screens/PublicClosetScreen";
import PostDetailScreen from "../screens/feed/PostDetailScreen";
import RankingComparisonScreen from "../screens/compare/RankingComparisonScreen";
import type { FeedEvent } from "../services/feedService";

export type RootStackParamList = {
  MainTabs: undefined;
  PublicCloset: { userId: string };
  PostDetail: { event: FeedEvent };
  RankingComparison: {
    newEntryId: string;
    userId: string;
    category: "top" | "bottom" | "footwear";
    itemName: string;
    subtypeName: string;
    subtypeId: string;
  };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading } = useAuth();
  console.log("[RootNavigator] render — loading=", loading, "session=", session ? "present" : "null");

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen
            name="PublicCloset"
            component={PublicClosetScreen}
            options={{ headerShown: true, title: "Closet", presentation: "modal" }}
          />
          <RootStack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
          <RootStack.Screen
            name="RankingComparison"
            component={RankingComparisonScreen}
            options={{ presentation: "fullScreenModal", gestureEnabled: false }}
          />
        </RootStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
