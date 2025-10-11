import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, AppState } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { initializeUser } from "@/utils/user-storage";
import SetupScreen from "./setup";
import { appEvents, APP_EVENTS } from "@/utils/app-events";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );
  const [lastChecked, setLastChecked] = useState(0);

  const checkUserStatus = async () => {
    try {
      setIsLoading(true);
      setInitializationError(null);
      const result = await initializeUser();
      setNeedsSetup(result.needsSetup);
      setIsLoading(false);
      setLastChecked(Date.now());
    } catch (error) {
      console.error("User initialization failed:", error);
      setInitializationError("ユーザーの初期化に失敗しました");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUserStatus();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        // アプリがアクティブになった時に状態をチェック
        // 最後のチェックから1秒以上経過している場合のみ実行
        if (Date.now() - lastChecked > 1000) {
          checkUserStatus();
        }
      }
    };

    const handleLogoutEvent = () => {
      checkUserStatus();
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    appEvents.on(APP_EVENTS.USER_LOGOUT, handleLogoutEvent);

    return () => {
      subscription?.remove();
      appEvents.off(APP_EVENTS.USER_LOGOUT, handleLogoutEvent);
    };
  }, [lastChecked]);

  const handleSetupComplete = () => {
    setNeedsSetup(false);
  };

  // 初期化中の読み込み画面
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
        }}
      >
        {initializationError ? (
          <Text
            style={{
              color: colorScheme === "dark" ? "#fff" : "#000",
              fontSize: 16,
            }}
          >
            {initializationError}
          </Text>
        ) : (
          <>
            <ActivityIndicator
              size="large"
              color={colorScheme === "dark" ? "#fff" : "#007AFF"}
            />
            <Text
              style={{
                color: colorScheme === "dark" ? "#fff" : "#000",
                marginTop: 16,
                fontSize: 16,
              }}
            >
              初期化中...
            </Text>
          </>
        )}
      </View>
    );
  }

  // セットアップが必要な場合はセットアップ画面を表示
  if (needsSetup) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SetupScreen onSetupComplete={handleSetupComplete} />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen
          name="create-proposal"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
