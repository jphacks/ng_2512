import React, { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "@/navigation/RootNavigator";

declare global {
  interface Window {
    __APP_TEST_INFO?: {
      firebaseStatus: "not_configured" | "initialized";
      apiBaseUrl: string;
      timestamp: string;
    };
  }
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f7f9fc"
  }
};

export default function App(): JSX.Element {
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.__APP_TEST_INFO = {
        firebaseStatus:
          process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "1"
            ? "initialized"
            : "not_configured",
        apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000",
        timestamp: new Date().toISOString()
      };
    }
  }, []);

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}
