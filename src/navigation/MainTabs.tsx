import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ForYouFeedScreen from "../screens/feed/ForYouFeedScreen";
import BrowseScreen from "../screens/browse/BrowseScreen";
import ClosetScreen from "../screens/closet/ClosetScreen";
import ComparisonScreen from "../screens/compare/ComparisonScreen";
import SearchScreen from "../screens/search/SearchScreen";

export type MainTabsParamList = {
  Home: undefined;
  Browse: undefined;
  Closet: undefined;
  Compare: undefined;
  Search: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={ForYouFeedScreen} />
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="Closet" component={ClosetScreen} />
      <Tab.Screen name="Compare" component={ComparisonScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}
