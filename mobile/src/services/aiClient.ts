import buildHmacHeaders from "@/utils/hmacAuth";

export type AiClientOptions = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
};

export type ThemeSuggestionResponse = {
  themes: string[];
  description: string;
  model: string;
};

export type FaceCandidate = {
  user_id: number;
  display_name: string;
  score: number;
};

export type FaceMatchResponse = {
  requester_id: number;
  matched_faces: Array<{
    box: number[];
    candidates: FaceCandidate[];
  }>;
};

export type ProposalDraftResponse = {
  draft: {
    title: string;
    body: string;
    slots: Array<Record<string, string>>;
    audience_user_ids: number[];
  };
  model: string;
};

type RequestBody = Record<string, unknown>;

export type ThemeSuggestParams = {
  assetId: string;
  hints?: string[];
  topK?: number;
};

export type PeopleMatchParams = {
  assetId: string;
  requesterId: number;
  friendUserIds: number[];
  perFaceLimit?: number;
};

export type ProposalAutoParams = {
  assetId: string;
  audienceHints?: number[];
  contextNotes?: string[];
};

const normaliseBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const toErrorMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object") {
    const error = payload.error as Record<string, unknown>;
    const message = error.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
};

const callEndpoint = async <T>(
  baseUrl: string,
  path: string,
  body: RequestBody,
  credentials: { apiKey: string; apiSecret: string }
): Promise<T> => {
  const url = `${normaliseBaseUrl(baseUrl)}${path}`;
  const headers = buildHmacHeaders("POST", path, body, credentials);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const responseText = await response.text();
  let parsed: unknown = {};
  if (responseText) {
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`Invalid JSON response from ${path}: ${(error as Error).message}`);
    }
  }
  if (!response.ok) {
    throw new Error(toErrorMessage(parsed, `Request failed with status ${response.status}`));
  }
  return parsed as T;
};

export const createAiClient = ({ baseUrl, apiKey, apiSecret }: AiClientOptions) => {
  const credentials = { apiKey, apiSecret };

  return {
    suggestThemes: async ({ assetId, hints, topK }: ThemeSuggestParams): Promise<ThemeSuggestionResponse> => {
      const payload: RequestBody = {
        asset_id: assetId
      };
      if (hints && hints.length > 0) {
        payload.hints = hints;
      }
      if (typeof topK === "number") {
        payload.top_k = topK;
      }
      return callEndpoint<ThemeSuggestionResponse>(baseUrl, "/ai/themes/suggest", payload, credentials);
    },

    matchPeople: async ({
      assetId,
      requesterId,
      friendUserIds,
      perFaceLimit
    }: PeopleMatchParams): Promise<FaceMatchResponse> => {
      const payload: RequestBody = {
        asset_id: assetId,
        requester_id: requesterId,
        friend_user_ids: friendUserIds
      };
      if (typeof perFaceLimit === "number") {
        payload.per_face_limit = perFaceLimit;
      }
      return callEndpoint<FaceMatchResponse>(baseUrl, "/ai/people/match", payload, credentials);
    },

    generateProposal: async ({
      assetId,
      audienceHints,
      contextNotes
    }: ProposalAutoParams): Promise<ProposalDraftResponse> => {
      const payload: RequestBody = {
        asset_id: assetId
      };
      if (audienceHints && audienceHints.length > 0) {
        payload.audience_hints = audienceHints;
      }
      if (contextNotes && contextNotes.length > 0) {
        payload.context_notes = contextNotes;
      }
      return callEndpoint<ProposalDraftResponse>(baseUrl, "/ai/proposals/auto", payload, credentials);
    }
  };
};

export type AiClient = ReturnType<typeof createAiClient>;
