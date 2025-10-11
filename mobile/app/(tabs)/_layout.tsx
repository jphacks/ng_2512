import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#155DFC",
        tabBarInactiveTintColor: "#6A7282",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1.33,
          paddingTop: 8,
          paddingBottom: 8,
          height: 73,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "400",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="proposals"
        options={{
          title: "提案",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={20} name="lightbulb.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "チャット",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={20} name="message.fill" color={color} />
          ),
          tabBarBadge: "2",
        }}
      />
      <Tabs.Screen
        name="album"
        options={{
          title: "アルバム",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={20} name="photo.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "フレンド",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={20} name="person.2.fill" color={color} />
          ),
          tabBarBadge: "2",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={20} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
