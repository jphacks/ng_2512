import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_NAME = "Recall";
const SLUG = "recall";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: SLUG,
  version: "0.1.0",
  orientation: "portrait",
  scheme: "recall",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false
  },
  android: {},
  web: {
    bundler: "metro",
    output: "static"
  },
  experiments: {
    tsconfigPaths: true
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000",
    useFirebaseEmulators: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "1",
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "recall-dev",
    aiApiKey: process.env.EXPO_PUBLIC_AI_API_KEY ?? "dev-key",
    aiApiSecret: process.env.EXPO_PUBLIC_AI_API_SECRET ?? "dev-secret"
  },
  updates: {
    url: process.env.EXPO_UPDATES_URL
  },
  runtimeVersion: {
    policy: "sdkVersion"
  }
});
