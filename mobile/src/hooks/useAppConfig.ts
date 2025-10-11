import { useMemo } from "react";
import Constants from "expo-constants";

export type AppConfig = {
  apiBaseUrl: string;
  useFirebaseEmulators: boolean;
  firebaseProjectId: string;
  aiApiKey: string;
  aiApiSecret: string;
};

const FALLBACK: AppConfig = {
  apiBaseUrl: "http://127.0.0.1:8000",
  useFirebaseEmulators: false,
  firebaseProjectId: "recall-dev",
  aiApiKey: "dev-key",
  aiApiSecret: "dev-secret"
};

export const useAppConfig = (): AppConfig => {
  return useMemo(() => {
    const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppConfig>;
    return {
      apiBaseUrl: extra.apiBaseUrl ?? FALLBACK.apiBaseUrl,
      useFirebaseEmulators: extra.useFirebaseEmulators ?? FALLBACK.useFirebaseEmulators,
      firebaseProjectId: extra.firebaseProjectId ?? FALLBACK.firebaseProjectId,
      aiApiKey: extra.aiApiKey ?? FALLBACK.aiApiKey,
      aiApiSecret: extra.aiApiSecret ?? FALLBACK.aiApiSecret
    };
  }, []);
};
