import { useMemo } from "react";
import Constants from "expo-constants";

export type AppConfig = {
  apiBaseUrl: string;
  useFirebaseEmulators: boolean;
  firebaseProjectId: string;
};

const FALLBACK: AppConfig = {
  apiBaseUrl: "http://127.0.0.1:8000",
  useFirebaseEmulators: false,
  firebaseProjectId: "recall-dev"
};

export const useAppConfig = (): AppConfig => {
  return useMemo(() => {
    const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppConfig>;
    return {
      apiBaseUrl: extra.apiBaseUrl ?? FALLBACK.apiBaseUrl,
      useFirebaseEmulators: extra.useFirebaseEmulators ?? FALLBACK.useFirebaseEmulators,
      firebaseProjectId: extra.firebaseProjectId ?? FALLBACK.firebaseProjectId
    };
  }, []);
};
