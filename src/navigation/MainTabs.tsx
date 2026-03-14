import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ForYouFeedScreen from "../screens/feed/ForYouFeedScreen";
import BrowseScreen from "../screens/browse/BrowseScreen";
import BrandScreen from "../screens/browse/BrandScreen";
import ItemScreen from "../screens/browse/ItemScreen";
import ClosetScreen from "../screens/closet/ClosetScreen";
import ItemDetailScreen from "../screens/closet/ItemDetailScreen";
import ComparisonScreen from "../screens/compare/ComparisonScreen";
import SearchScreen from "../screens/search/SearchScreen";

export type BrowseStackParamList = {
  BrowseList: undefined;
  Brand: { brandId: string; brandName: string };
  Item: { itemId: string };
};

export type ClosetStackParamList = {
  ClosetList: undefined;
  ItemDetail: { closetEntryId: string };
};

export type MainTabsParamList = {
  Home: undefined;
  Browse: undefined;
  Closet: undefined;
  Compare: undefined;
  Search: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const ClosetStack = createNativeStackNavigator<ClosetStackParamList>();

function BrowseNavigator() {
  return (
    <BrowseStack.Navigator>
      <BrowseStack.Screen name="BrowseList" component={BrowseScreen} options={{ title: "Browse" }} />
      <BrowseStack.Screen name="Brand" component={BrandScreen} options={({ route }) => ({ title: route.params.brandName })} />
      <BrowseStack.Screen name="Item" component={ItemScreen} options={{ title: "Item" }} />
    </BrowseStack.Navigator>
  );
}

function ClosetNavigator() {
  return (
    <ClosetStack.Navigator>
      <ClosetStack.Screen name="ClosetList" component={ClosetScreen} options={{ title: "My Closet" }} />
      <ClosetStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item Details" }} />
    </ClosetStack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={ForYouFeedScreen} />
      <Tab.Screen name="Browse" component={BrowseNavigator} />
      <Tab.Screen name="Closet" component={ClosetNavigator} />
      <Tab.Screen name="Compare" component={ComparisonScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}
