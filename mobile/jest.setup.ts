import React from "react";
import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";

jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");
jest.mock("@react-navigation/native-stack", () => {
  const actual = jest.requireActual("@react-navigation/native-stack");
  return {
    ...actual,
    createNativeStackNavigator: jest.fn(() => ({
      Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>
    }))
  };
});
