import { useMemo } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { AiClient, createAiClient } from "@/services/aiClient";

export const useAiClient = (): AiClient => {
  const config = useAppConfig();
  return useMemo(
    () =>
      createAiClient({
        baseUrl: config.apiBaseUrl,
        apiKey: config.aiApiKey,
        apiSecret: config.aiApiSecret
      }),
    [config.apiBaseUrl, config.aiApiKey, config.aiApiSecret]
  );
};

export default useAiClient;
