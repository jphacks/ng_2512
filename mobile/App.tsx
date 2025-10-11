import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "@/navigation/RootNavigator";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f7f9fc"
  }
};

export default function App(): JSX.Element {
  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}
