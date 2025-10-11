import React from "react";
import { render, screen } from "@testing-library/react-native";
import App from "../App";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: "http://localhost:8000",
        useFirebaseEmulators: true,
        firebaseProjectId: "recall-dev"
      }
    }
  }
}));

describe("App shell", () => {
  it("displays the configured API base URL", () => {
    render(<App />);
    expect(screen.getByTestId("api-base-url")).toHaveTextContent("http://localhost:8000");
  });
});
