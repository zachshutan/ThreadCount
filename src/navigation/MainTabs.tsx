import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import ForYouFeedScreen from "../screens/feed/ForYouFeedScreen";
import BrowseScreen from "../screens/browse/BrowseScreen";
import BrandScreen from "../screens/browse/BrandScreen";
import ItemScreen from "../screens/browse/ItemScreen";
import ClosetScreen from "../screens/closet/ClosetScreen";
import ItemDetailScreen from "../screens/closet/ItemDetailScreen";
import WriteReviewScreen from "../screens/closet/WriteReviewScreen";
import SearchScreen from "../screens/search/SearchScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import FollowListModal from "../screens/profile/FollowListModal";

export type BrowseStackParamList = {
  BrowseList: undefined;
  Brand: { brandId: string; brandName: string };
  Item: { itemId: string };
};

export type ClosetStackParamList = {
  ClosetList: { initialTab?: "owned" | "interested" } | undefined;
  ItemDetail: { closetEntryId: string };
  WriteReview: { itemId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  FollowList: { type: "followers" | "following"; userId: string };
};

export type MainTabsParamList = {
  Home: undefined;
  Browse: undefined;
  Closet: undefined;
  Search: undefined;
  Profile: undefined;
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<keyof MainTabsParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: "home", inactive: "home-outline" },
  Browse: { active: "compass", inactive: "compass-outline" },
  Closet: { active: "shirt", inactive: "shirt-outline" },
  Search: { active: "search", inactive: "search-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const ClosetStack = createNativeStackNavigator<ClosetStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function BrowseNavigator() {
  return (
    <BrowseStack.Navigator>
      <BrowseStack.Screen name="BrowseList" component={BrowseScreen} options={{ headerShown: false }} />
      <BrowseStack.Screen name="Brand" component={BrandScreen} options={({ route }) => ({ title: route.params.brandName })} />
      <BrowseStack.Screen name="Item" component={ItemScreen} options={{ title: "Item" }} />
    </BrowseStack.Navigator>
  );
}

function ClosetNavigator() {
  return (
    <ClosetStack.Navigator>
      <ClosetStack.Screen name="ClosetList" component={ClosetScreen} options={{ headerShown: false }} />
      <ClosetStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item Details" }} />
      <ClosetStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: "Write Review" }} />
    </ClosetStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <ProfileStack.Screen
        name="FollowList"
        component={FollowListModal}
        options={({ route }) => ({
          title: route.params.type === "followers" ? "Followers" : "Following",
        })}
      />
    </ProfileStack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabsParamList];
          const name = focused ? icons.active : icons.inactive;
          return <Ionicons name={name} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen name="Home" component={ForYouFeedScreen} />
      <Tab.Screen name="Browse" component={BrowseNavigator} />
      <Tab.Screen name="Closet" component={ClosetNavigator} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
